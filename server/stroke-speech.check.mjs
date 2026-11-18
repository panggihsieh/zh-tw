import {test} from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {createStrokeSpeechHandler,strokeFingerprint} from './stroke-speech.mjs';
import {createStructureServer} from './structure-api.mjs';
import {readFile} from 'node:fs/promises';

test('管理者發布、學生免登入讀取、撤回草稿與筆順變更驗證',async t=>{
 const records=new Map();const source=[{track:[{x:0,y:0},{x:100,y:0}],outline:[]}];
 const store={async get(key){if(!records.has(key))throw Object.assign(Error(),{status:404});return structuredClone(records.get(key));},async create(key,value){records.set(key,{value,generation:1});},async update(key,value,generation){assert.equal(generation,records.get(key).generation);records.set(key,{value,generation:generation+1});}};
 const handler=createStrokeSpeechHandler({store,origins:['https://zh-tw.web.app'],authenticate:async req=>{if(req.headers.authorization!=='Bearer admin')throw Error('denied');return 'admin';},loadStrokes:async()=>source});
 const server=http.createServer(handler);await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));t.after(()=>new Promise(resolve=>{server.close(resolve);server.closeAllConnections();}));
 const url=`http://127.0.0.1:${server.address().port}/api/structure/stroke-speech/4e00`;
 const headers={Origin:'https://zh-tw.web.app','Content-Type':'application/json','X-Notebook-Request':'stroke-speech',Authorization:'Bearer admin'};
 const value={fingerprint:strokeFingerprint(source),strokes:[{name:'橫',spoken:'橫'}],confirmed:true};
 const save=(body,changes={})=>fetch(url,{method:'POST',headers:{...headers,...changes},body:JSON.stringify(body)});
 assert.equal((await (await fetch(url)).json()).item,null);
 assert.equal((await save(value,{Authorization:''})).status,401);assert.equal(records.size,0);
 assert.equal((await save(value,{Origin:'https://attacker.example'})).status,403);
 assert.equal((await fetch(url+'?admin=1')).status,403);
 assert.equal((await save({...value,fingerprint:'outdated'})).status,400);
 assert.equal((await save({...value,strokes:[]})).status,400);
 assert.equal((await save({...value,strokes:[{name:'橫',spoken:''}]})).status,400);
 assert.equal((await save(value)).status,200);
 const publicItem=(await (await fetch(url)).json()).item;assert.equal(publicItem.strokes[0].spoken,'橫');assert.equal(publicItem.confirmed,true);
 assert.equal((await save({...value,confirmed:false})).status,200);
 assert.equal((await (await fetch(url)).json()).item,null);
 const adminItem=(await (await fetch(url+'?admin=1',{headers:{Authorization:'Bearer admin','X-Notebook-Request':'stroke-speech'}})).json()).item;
 assert.equal(adminItem.confirmed,false);assert.equal(adminItem.strokes[0].name,'橫');
 assert.equal((await fetch(url.replace('4e00','110000'))).status,400);
 assert.equal((await fetch(url,{method:'DELETE'})).status,405);
 assert.equal((await save({...value,confirmed:false,strokes:[{name:'',spoken:''}]})).status,200);
 assert.equal((await (await fetch(url)).json()).item,null);
});

test('正式 API 派送可讀寫筆畫語音，後端以實際筆順檔核對',async t=>{
 const records=new Map();
 const store={async get(key){if(!records.has(key))throw Object.assign(Error(),{status:404});return records.get(key);},async create(key,value){records.set(key,{value,generation:1});}};
 const server=createStructureServer({quizStore:store,origins:['http://127.0.0.1:5173'],authenticate:async req=>{if(req.headers.authorization!=='Bearer admin')throw Error();return 'teacher';}});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));t.after(()=>new Promise(resolve=>{server.close(resolve);server.closeAllConnections();}));
 const url=`http://127.0.0.1:${server.address().port}/api/structure/stroke-speech/4e00`;
 const strokes=JSON.parse(await readFile(new URL('../public/game-strokes/4e00.json',import.meta.url),'utf8'));
 const response=await fetch(url,{method:'POST',headers:{Origin:'http://127.0.0.1:5173','Content-Type':'application/json','X-Notebook-Request':'stroke-speech',Authorization:'Bearer admin'},body:JSON.stringify({fingerprint:strokeFingerprint(strokes),confirmed:true,strokes:[{name:'橫',spoken:'橫'}]})});
 assert.equal(response.status,200);assert.equal((await (await fetch(url)).json()).item.strokes[0].name,'橫');
});
