import {test} from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {createStrokeSpeechHandler,strokeFingerprint,validateStrokeSpeech} from './stroke-speech.mjs';
import {createStructureServer} from './structure-api.mjs';
import {readFile} from 'node:fs/promises';

test('管理者發布、學生免登入讀取、撤回草稿與筆順變更驗證',async t=>{
 const records=new Map();const source=[{track:[{x:0,y:0},{x:100,y:0}],outline:[]}];
 const store={async get(key){if(!records.has(key))throw Object.assign(Error(),{status:404});return structuredClone(records.get(key));},async create(key,value){records.set(key,{value,generation:1});},async update(key,value,generation){assert.equal(generation,records.get(key).generation);records.set(key,{value,generation:generation+1});}};
 const handler=createStrokeSpeechHandler({store,origins:['https://zh-tw.web.app'],authenticate:async req=>{if(req.headers.authorization!=='Bearer admin')throw Error('denied');return 'admin';},loadStrokes:async()=>source});
 const server=http.createServer(handler);await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));t.after(()=>new Promise(resolve=>{server.close(resolve);server.closeAllConnections();}));
 const url=`http://127.0.0.1:${server.address().port}/api/structure/stroke-speech/4e00`;
 const headers={Origin:'https://zh-tw.web.app','Content-Type':'application/json','X-Notebook-Request':'stroke-speech',Authorization:'Bearer admin'};
 const value={fingerprint:strokeFingerprint(source),strokes:[{name:'橫',spoken:'橫',zhuyin:'ㄏㄥˊ'}],confirmed:true};
 const save=(body,changes={})=>fetch(url,{method:'POST',headers:{...headers,...changes},body:JSON.stringify(body)});
 assert.equal((await (await fetch(url)).json()).item,null);
 assert.equal((await save(value,{Authorization:''})).status,401);assert.equal(records.size,0);
 assert.equal((await save(value,{Origin:'https://attacker.example'})).status,403);
 assert.equal((await fetch(url+'?admin=1')).status,403);
 assert.equal((await save({...value,fingerprint:'outdated'})).status,400);
 assert.equal((await save({...value,strokes:[]})).status,400);
 assert.equal((await save({...value,strokes:[{name:'橫',spoken:''}]})).status,400);
 assert.equal((await save(value)).status,200);
 const publicItem=(await (await fetch(url)).json()).item;assert.equal(publicItem.strokes[0].spoken,'橫');assert.equal(publicItem.confirmed,true);assert.equal(publicItem.strokes[0].zhuyin,'ㄏㄥˊ');
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

test('基本筆畫清單僅限管理員、驗證內容並防止覆寫其他管理員更新',async t=>{
 const records=new Map();const store={async get(key){if(!records.has(key))throw Object.assign(Error(),{status:404});return structuredClone(records.get(key));},async create(key,value){records.set(key,{value,generation:1});},async update(key,value,generation){assert.equal(generation,records.get(key).generation);records.set(key,{value,generation:generation+1});}};
 const handler=createStrokeSpeechHandler({store,origins:['https://zh-tw.web.app'],authenticate:async req=>{if(req.headers.authorization!=='Bearer admin')throw Error();}});
 const server=http.createServer(handler);await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));t.after(()=>new Promise(resolve=>{server.close(resolve);server.closeAllConnections();}));
 const url=`http://127.0.0.1:${server.address().port}/api/structure/stroke-speech/catalogue`;
 const headers={Origin:'https://zh-tw.web.app','Content-Type':'application/json','X-Notebook-Request':'stroke-speech',Authorization:'Bearer admin'};
 const rows=JSON.parse(await readFile(new URL('../src/strokeCatalogueSeed.json',import.meta.url),'utf8'));
 const save=(value,changes={})=>fetch(url,{method:'POST',headers:{...headers,...changes},body:JSON.stringify(value)});
 assert.equal(rows.length,28);assert.ok(rows.every(row=>!row.confirmed));
 assert.equal((await fetch(url)).status,403);
 assert.equal((await fetch(url,{headers:{...headers,Authorization:''}})).status,401);
 assert.equal((await save({rows},{Origin:'https://attacker.example'})).status,403);
 assert.equal((await save({rows:[]})).status,400);
 assert.equal((await save({rows:rows.map((row,index)=>index===0?{...row,confirmed:true,spoken:''}:row)})).status,400);
 assert.equal((await save({rows:[rows[0],...rows.slice(0,27)]})).status,400);
 assert.equal((await save({rows:rows.map((row,index)=>index===0?{...row,mnemonicRevision:123}:row)})).status,400);
 assert.equal((await save({rows:rows.map((row,index)=>index===0?{...row,pronunciationSource:'invalid'}:row)})).status,400);
 for(const svgId of ['../file','https://bad.example','stroke-36',123])assert.equal((await save({rows:rows.map((row,index)=>index===0?{...row,svgId}:row)})).status,400);
 assert.equal((await save({rows:rows.map((row,index)=>index===0?{...row,thumbnail:'data:image/png;base64,AAAA'}:row)})).status,400);
 const thumbnail='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aR1sAAAAASUVORK5CYII=';
 rows[0].thumbnail=thumbnail;
 rows[0].svgId='stroke-34';rows[0].pronunciationSource='mnemonic';rows[0].mnemonic='橫';rows[0].mnemonicRevision='2026-11-18-final-1';
 assert.equal((await save({rows})).status,200);
 const saved=(await (await fetch(url,{headers})).json()).item;assert.equal(saved.rows.length,28);assert.equal(saved.rows[0].zhuyin,'ㄏㄥˊ');assert.equal(saved.rows[0].mnemonicRevision,'2026-11-18-final-1');assert.equal(saved.rows[0].mnemonic,'橫');assert.equal(saved.rows[0].pronunciationSource,'mnemonic');assert.equal(saved.rows[0].svgId,'stroke-34');
 assert.equal(saved.rows[0].thumbnail,thumbnail);
 assert.equal((await save({rows})).status,409);
 assert.equal((await save({...saved,rows:saved.rows.map((row,index)=>index===0?{...row,confirmed:true}:row)})).status,200);
 assert.equal((await (await fetch(url,{headers})).json()).item.rows[0].confirmed,true);
});

test('獨立口訣可儲存、保留舊格式並驗證型別及長度',()=>{
 const source=[];const base={fingerprint:strokeFingerprint(source),confirmed:false,strokes:[]};
 const strokes=[{}];const value={...base,fingerprint:strokeFingerprint(strokes),strokes:[{name:'豎折',spoken:'豎折',mnemonic:' 豎，右折 '}]};
 assert.equal(validateStrokeSpeech(value,strokes).strokes[0].mnemonic,'豎，右折');
 for(const mnemonic of [123,'字'.repeat(31)])assert.throws(()=>validateStrokeSpeech({...value,strokes:[{...value.strokes[0],mnemonic}]},strokes));
 assert.deepEqual(validateStrokeSpeech({...value,strokes:[{name:'豎',spoken:'豎'}]},strokes).strokes,[{name:'豎',spoken:'豎'}]);
});
