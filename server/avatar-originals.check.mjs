import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {once} from 'node:events';
import {createHash} from 'node:crypto';
import {createCompetitionHandler} from './competition-api.mjs';
test('私人原圖只准管理員讀寫，縮圖雜湊綁定且拒絕任意圖片網址',async t=>{
 const records=new Map();let writes=0;
 const store={async get(key){if(!records.has(key))throw Object.assign(Error('not found'),{status:404});return {value:records.get(key)};},async create(key,value){if(records.has(key))throw Object.assign(Error('exists'),{status:412});records.set(key,value);writes++;}};
 const server=http.createServer(createCompetitionHandler({store,origins:['https://zh-tw.web.app'],authenticate:async req=>({uid:'test',admin:req.headers.authorization==='Bearer admin',email:'test@example.com'})}));
 server.listen(0,'127.0.0.1');await once(server,'listening');t.after(()=>server.close());
 const base=`http://127.0.0.1:${server.address().port}/api/structure/competition/avatar-originals`;
 const thumbnail='data:image/jpeg;base64,/9j/AA==',original='data:image/png;base64,iVBORw0KGgo=';
 const id=createHash('sha256').update(thumbnail).digest('hex');
 const headers={authorization:'Bearer admin',origin:'https://zh-tw.web.app','X-Notebook-Request':'competition-room','Content-Type':'application/json'};
 assert.equal((await fetch(base,{method:'POST',headers,body:JSON.stringify({thumbnail,original})})).status,200);
 assert.equal(writes,1);assert.equal((await (await fetch(base+'/'+id,{headers})).json()).avatar,original);
 assert.equal((await fetch(base+'/'+id)).status,403);
 assert.equal((await fetch(base,{method:'POST',headers,body:JSON.stringify({thumbnail,original:'https://bad.example/a.png'})})).status,400);
 for(const transparent of ['data:image/png;base64,iVBORw0KGgoAAA==','data:image/webp;base64,UklGRgAA']){
  assert.equal((await fetch(base,{method:'POST',headers,body:JSON.stringify({thumbnail:transparent,original})})).status,200);
 }
 assert.equal(writes,3);
 assert.equal((await (await fetch(base+'/'+'a'.repeat(64),{headers})).json()).avatar,null);
});
