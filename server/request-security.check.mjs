import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {once} from 'node:events';
import {readFile} from 'node:fs/promises';
import {createRequestGuard, requestIp, SECURITY_HEADERS} from './request-security.mjs';
import {createStructureServer} from './structure-api.mjs';
import {createCompetitionHandler,makeRoomCode} from './competition-api.mjs';

const req=(patch={})=>({url:'/api/structure/competition/code/AAAA',socket:{remoteAddress:'192.0.2.1'},...patch,headers:{host:'127.0.0.1:5174',...patch.headers}});
function response(){return {headers:{},setHeader(k,v){this.headers[k]=v;},writeHead(status,headers){this.status=status;Object.assign(this.headers,headers);},end(body){this.body=JSON.parse(body);}};}

test('清 Cookie 及偽造身分不會重設來源限流，且到期後恢復',()=>{
 let time=0;const guard=createRequestGuard({now:()=>time,codeLimit:2});
 assert.equal(guard(req(),response()),true);
 assert.equal(guard(req({headers:{cookie:'competition_guest=another'}}),response()),true);
 const blocked=response();assert.equal(guard(req({headers:{authorization:'Bearer forged'}}),blocked),false);
 assert.equal(blocked.status,429);assert.equal(blocked.headers['Retry-After'],'60');
 time=60000;assert.equal(guard(req(),response()),true);
});
test('雲端使用代理附加的最末 IP；本機忽略偽造轉送標頭',()=>{
 const r=req({headers:{'x-forwarded-for':'203.0.113.123, 198.51.100.2'}});
 assert.equal(requestIp(r,true),'198.51.100.2');assert.equal(requestIp(r,false),'192.0.2.1');
 assert.equal(requestIp(req({headers:{'x-forwarded-for':'invalid'}}),true),null);
 const guard=createRequestGuard({cloud:true,codeLimit:1});
 assert.equal(guard(r,response()),true);
 const denied=response();assert.equal(guard(req({headers:{'x-forwarded-for':'203.0.113.9, 198.51.100.2'}}),denied),false);assert.equal(denied.status,429);
});
test('大量不同來源不會使限流快取無限成長；滿載時拒絕新增來源',()=>{
 const guard=createRequestGuard({maxKeys:2});assert.equal(guard(req(),response()),true);
 const denied=response();assert.equal(guard(req({socket:{remoteAddress:'192.0.2.2'}}),denied),false);assert.equal(denied.status,429);
});
test('拒絕跨站 API 與超長網址，包含安全標頭',()=>{
 const guard=createRequestGuard();
 for(const [r,status] of [[req({headers:{'sec-fetch-site':'cross-site'}}),403],[req({url:'/'+ 'x'.repeat(4096)}),414]]){
  const denied=response();assert.equal(guard(r,denied),false);assert.equal(denied.status,status);
  assert.equal(denied.headers['X-Frame-Options'],'DENY');assert.equal(denied.headers['Cache-Control'],'no-store');
 }
 assert.equal(guard(req({headers:{'sec-fetch-site':'same-origin'}}),response()),true);
});
test('SchoolIAM 登入建立獨立來源限制',()=>{
 const guard=createRequestGuard({loginLimit:1});const r=req({url:'/auth/schooliam/login'});
 assert.equal(guard(r,response()),true);const denied=response();assert.equal(guard(r,denied),false);assert.equal(denied.status,429);
});
test('本機 API 在派送子服務前拒絕 DNS 重綁主機',()=>{
 const guard=createRequestGuard();
 for(const host of ['attacker.example:5174','127.0.0.1.attacker.example:5174','127.0.0.1:5174.attacker.example']){
  const denied=response();assert.equal(guard(req({headers:{host}}),denied),false);assert.equal(denied.status,403);
 }
 assert.equal(guard(req({headers:{host:'localhost:5174'}}),response()),true);
});
test('正式網站防嵌入及權限政策保留本機麥克風',async()=>{
 const config=JSON.parse(await readFile(new URL('../firebase.json',import.meta.url),'utf8'));
 const main=config.hosting.find(v=>v.target==='zh-tw');
 const headers=Object.fromEntries(main.headers.find(v=>v.source==='**').headers.map(h=>[h.key,h.value]));
 for(const [name,value] of Object.entries(SECURITY_HEADERS))assert.equal(headers[name],value);
});
test('未登入 API 維持拒絕，跨站在認證與儲存前被擋，並設定慢速請求限制',async t=>{
 let calls=0;
 const server=createStructureServer({cloud:true,authenticate:async()=>{calls++;throw Error('denied');}});
 assert.equal(server.headersTimeout,10000);assert.equal(server.requestTimeout,30000);
 server.listen(0,'127.0.0.1');await once(server,'listening');t.after(()=>server.close());
 const url=`http://127.0.0.1:${server.address().port}/api/structure/settings`;
 const cross=await fetch(url,{headers:{'Sec-Fetch-Site':'cross-site'}});assert.equal(cross.status,403);assert.equal(calls,0);
 const denied=await fetch(url);assert.equal(denied.status,401);assert.equal(calls,1);
 assert.equal(denied.headers.get('x-frame-options'),'DENY');
});
test('非預期後端例外不洩漏內部資訊；代碼仍保持四字格式',async t=>{
 const server=http.createServer(createCompetitionHandler({store:{list:async()=>{throw Error('sensitive-storage-detail');}},origins:['https://test'],authenticate:async()=>({uid:'admin',admin:true})}));
 server.listen(0,'127.0.0.1');await once(server,'listening');t.after(()=>server.close());
 const response=await fetch(`http://127.0.0.1:${server.address().port}/api/structure/competition/rooms`);
 assert.equal(response.status,503);assert.ok(!(await response.text()).includes('sensitive-storage-detail'));
 assert.match(makeRoomCode(),/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{4}$/);
});
test('子服務意外拒絕會回覆安全錯誤，不造成未處理的 Promise 例外',async t=>{
 const server=createStructureServer({writingHandler:async()=>{throw Error('sensitive-runtime-detail');}});
 server.listen(0,'127.0.0.1');await once(server,'listening');t.after(()=>server.close());
 const response=await fetch(`http://127.0.0.1:${server.address().port}/api/structure/writing/anything`);
 assert.equal(response.status,503);assert.ok(!(await response.text()).includes('sensitive-runtime-detail'));
});
