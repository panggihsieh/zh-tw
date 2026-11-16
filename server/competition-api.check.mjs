import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {once} from 'node:events';
import {createCompetitionHandler,makeRoomCode,questionPoints,rankParticipants,validateRoomInput} from './competition-api.mjs';

const definition=()=>({title:'五年一班國語挑戰',className:'五年一班',roster:['student@example.com','other@example.com'],questions:[{prompt:'「日積月累」最接近哪個意思？',options:['長期累積','立刻完成','全部忘記','暫時停止'],answer:0,seconds:30},{prompt:'哪一個字的部首是「木」？',options:['林','明'],answer:0,seconds:20}]});
function memoryStore(){const data=new Map();return {async list(prefix){return {names:[...data.keys()].filter(k=>k.startsWith(prefix))};},async get(key){if(!data.has(key))throw Object.assign(Error('missing'),{status:404});return structuredClone(data.get(key));},async create(key,value){if(data.has(key))throw Object.assign(Error('conflict'),{status:412});data.set(key,{value:structuredClone(value),generation:1});},async update(key,value,generation){if(data.get(key)?.generation!==generation)throw Object.assign(Error('conflict'),{status:412});data.set(key,{value:structuredClone(value),generation:generation+1});}};}
async function fixture(t){const store=memoryStore();let clock=100000,aiCalls=0;const server=http.createServer(createCompetitionHandler({store,origins:['https://test'],now:()=>clock,random:()=>0,gradeSentence:async()=>{aiCalls++;return {targetOk:true,meaningOk:true,uncertain:false,correctness:30, completeness:20, fluency:15, detail:15, mechanics:5,highlight:'美麗的海灘',feedback:'句子完整，可以再加上感受。'};},authenticate:async req=>{const uid=req.headers['x-test-user'];if(!uid)throw Error('unauthorized');return {uid,email:`${uid}@example.com`,displayName:uid,admin:uid==='teacher'};}}));server.listen(0,'127.0.0.1');await once(server,'listening');t.after(()=>server.close());const request=async(path,body,user='teacher')=>{const response=await fetch(`http://127.0.0.1:${server.address().port}/api/structure/competition${path}`,{method:body===undefined?'GET':'POST',headers:{Origin:'https://test','Content-Type':'application/json','x-notebook-request':'competition-room','x-test-user':user},...(body===undefined?{}:{body:JSON.stringify(body)})});return {status:response.status,...await response.json()};};return {request,setTime:value=>clock=value,aiCalls:()=>aiCalls};}

test('四碼排除易混淆字元，題目與班級名單必須完整',()=>{assert.equal(makeRoomCode(()=>0),'AAAA');assert.equal(validateRoomInput(definition()).questions.length,2);for(const patch of [{roster:[]},{roster:['bad']},{questions:[]},{questions:[{prompt:'題目',options:['只有一個'],answer:0,seconds:30}]},{questions:[{prompt:'題目',options:['甲','乙'],answer:2,seconds:30}]},{questions:[{prompt:'題目',options:['甲','乙'],answer:0,seconds:4}]}])assert.throws(()=>validateRoomInput({...definition(),...patch}));});
test('生字結構題保留競賽類型與正解',()=>{const value=validateRoomInput({...definition(),gameType:'structure',questions:[{type:'structure',character:'林',prompt:'「林」是哪一種字形結構？',options:['左右','上下','全包圍'],answer:0,seconds:20}]});assert.equal(value.gameType,'structure');assert.deepEqual(value.questions[0],{id:'1',type:'structure',character:'林',prompt:'「林」是哪一種字形結構？',options:['左右','上下','全包圍'],answer:0,seconds:20});});

test('書寫競賽接受生字，拒絕非漢字與不合法時間',()=>{
 const input={...definition(),gameType:'writing',questions:[{character:'林',seconds:120}]};
 assert.equal(validateRoomInput(input).questions[0].type,'writing');
 for(const question of [{character:'../x',seconds:120},{character:'林',seconds:0}])assert.throws(()=>validateRoomInput({...input,questions:[question]}));
});

test('書寫競賽由伺服器依實際筆順比對，忽略客戶端宣告完成，不呼叫 AI',async t=>{
 const {writingReferences}=await import('./competition-writing.mjs');
 const traces=(await writingReferences('林')).map(stroke=>stroke.track.map(p=>({x:p.x/2048*1000,y:p.y/2048*1000})));
 const f=await fixture(t);
 const created=await f.request('/rooms',{...definition(),gameType:'writing',questions:[{character:'林',seconds:120},{character:'林',seconds:120}]});
 assert.equal(created.status,201);assert.equal(created.room.gameType,'writing');const id=created.room.id;
 await f.request(`/rooms/${id}/join`,{},'student');await f.request(`/rooms/${id}/start`,{});await f.request(`/rooms/${id}/state`,{},'student');
 const wrong=await f.request(`/rooms/${id}/answer`,{complete:true,traces:[]},'student');assert.equal(wrong.correct,false);assert.equal(wrong.points,0);
 const correct=await f.request(`/rooms/${id}/answer`,{traces},'student');assert.equal(correct.correct,true);assert.equal(correct.points,1000);assert.equal(correct.participant.finished,true);assert.equal(f.aiCalls(),0);
});
test('計分採答對八成與速度兩成，錯答或逾時為零分',()=>{assert.equal(questionPoints(true,0,30),1000);assert.equal(questionPoints(true,15000,30),900);assert.equal(questionPoints(true,30000,30),800);assert.equal(questionPoints(true,30001,30),0);assert.equal(questionPoints(false,0,30),0);});
test('排名先比分數、答對數與作答時間，同分並列',()=>{const ranked=rankParticipants([{name:'甲',points:900,correct:1,totalResponseMs:1000,joinedAt:1},{name:'乙',points:900,correct:1,totalResponseMs:1000,joinedAt:2},{name:'丙',points:800,correct:1,totalResponseMs:500,joinedAt:1}]);assert.deepEqual(ranked.map(v=>v.rank),[1,1,3]);});
test('教師建房、名單限制、開始鎖定加入、逐題作答與最終排名',async t=>{const f=await fixture(t);assert.equal((await f.request('/available',undefined,'student')).available,false);assert.equal((await f.request('/rooms',definition(),'student')).status,403);const created=await f.request('/rooms',definition());assert.equal(created.status,201);assert.equal(created.room.code,'AAAA');const id=created.room.id;assert.equal((await f.request('/available',undefined,'student')).available,true);assert.equal((await f.request('/available',undefined,'outsider')).available,false);assert.equal((await f.request('/code/AAAA',undefined,'outsider')).status,403);assert.equal((await f.request('/code/AAAA',undefined,'student')).room.title,definition().title);assert.equal((await f.request(`/rooms/${id}/join`,{},'student')).question,null);await f.request(`/rooms/${id}/start`,{});assert.equal((await f.request('/available',undefined,'student')).available,false);assert.equal((await f.request(`/rooms/${id}/join`,{},'other')).status,409);const joined=await f.request(`/rooms/${id}/state`,{},'student');assert.equal(joined.question.answer,undefined);f.setTime(115000);const first=await f.request(`/rooms/${id}/answer`,{answer:0},'student');assert.equal(first.correct,true);assert.equal(first.points,900);f.setTime(120000);const second=await f.request(`/rooms/${id}/answer`,{answer:1},'student');assert.equal(second.correct,false);assert.equal(second.participant.finished,true);const board=await f.request(`/rooms/${id}/leaderboard`,undefined,'student');assert.equal(board.items[0].rank,1);assert.equal(board.items[0].points,900);assert.equal(board.items[0].mine,true);});

test('課文生字字卡、AI費用上限、公仔與獨立模擬課堂完成全流程',async t=>{const f=await fixture(t),input={title:'隔離造句測試',classId:'class-1',className:'五年一班',loginMode:'roster',gameType:'sentence-practice',duration:600,maxParticipants:10,testRoom:true,students:[{seat:1,name:'測試學生',email:'student@example.com',active:true}],roster:['student@example.com'],questions:[{phrase:'灘',character:'灘',reading:'ㄊㄢ',seconds:90}]};const created=await f.request('/rooms',input);assert.equal(created.status,201);assert.equal(created.room.testRoom,true);assert.equal(created.room.maxParticipants,10);const id=created.room.id;const joined=await f.request(`/rooms/${id}/join`,{},'student');assert.equal(joined.participant.name,'測試學生');assert.equal(joined.participant.avatarKind,'default');const simulated=await f.request(`/rooms/${id}/simulate`,{});assert.equal(simulated.items.length,6);await f.request(`/rooms/${id}/start`,{});const state=await f.request(`/rooms/${id}/state`,{},'student');assert.equal(state.question.character,'灘');const answer=await f.request(`/rooms/${id}/answer`,{sentence:'我在美麗的海灘看夕陽。'},'student');assert.equal(answer.grade.level,'甲等');assert.equal(f.aiCalls(),1);assert.equal((await f.request(`/rooms/${id}/answer`,{sentence:'我在海灘散步。'},'student')).status,409);assert.equal(f.aiCalls(),1);await f.request(`/rooms/${id}/simulate`,{});f.setTime(160000);const closed=await f.request(`/rooms/${id}/close`,{});assert.equal(closed.room.status,'closed');assert.equal(closed.room.closedAt,160000);assert.equal(closed.room.expiresAt-closed.room.closedAt,540000);const board=await f.request(`/rooms/${id}/leaderboard`,undefined,'student');assert.equal(board.room.closedAt,160000);assert.equal(board.items.length,6);assert.equal(board.items.some(v=>v.avatarKind==='anonymous'),true);});

for(const gameType of ['quiz','structure','sentence-practice','writing'])test(`${gameType} 最終排名拍照上傳、權限及重試覆存`,async t=>{
 const f=await fixture(t),question=gameType==='sentence-practice'?{character:'林',phrase:'林',seconds:90}:gameType==='writing'?{character:'林',seconds:120}:{prompt:'題目',character:'林',options:['左右','上下'],answer:0,seconds:30};
 const created=await f.request('/rooms',{...definition(),gameType,questions:[question]});assert.equal(created.status,201);const id=created.room.id,path=`/rooms/${id}/photos`;
 await f.request(`/rooms/${id}/join`,{},'student');
 assert.equal((await f.request(path,{},'student')).status,409);
 await f.request(`/rooms/${id}/start`,{});await f.request(`/rooms/${id}/close`,{});
 const board=await f.request(`/rooms/${id}/leaderboard`,undefined,'student');
 const revision=JSON.stringify(board.items.map(v=>[v.uid,v.rank,v.points,v.correct,v.answered]));
 const image='data:image/jpeg;base64,'+Buffer.from([255,216,255,224,0,2,255,217]).toString('base64');
 assert.equal((await f.request(path,{image,revision:'old'},'student')).status,409);
 assert.equal((await f.request(path,{image:'data:image/jpeg;base64,AAAA',revision},'student')).status,400);
 assert.equal((await f.request(path,{image,revision},'outsider')).status,403);
 assert.equal((await f.request(path,{image,revision},'other')).status,403);
 const saved=await f.request(path,{image,revision},'student');assert.equal(saved.status,200);assert.equal(saved.photo.title,created.room.title);
 assert.equal((await f.request(path,{image,revision},'student')).status,200);
 assert.equal((await f.request(path,undefined,'student')).items.length,1);
 assert.equal((await f.request(path,undefined,'teacher')).items.length,1);
 assert.equal((await f.request(path,undefined,'outsider')).status,403);
});

test('學生免 Google 登入：代碼選姓名、禁止冒用教師、開始鎖定及到期停答',async t=>{
 const store=memoryStore();let clock=100000;
 const server=http.createServer(createCompetitionHandler({store,origins:['https://test'],now:()=>clock,random:()=>0,authenticate:async req=>{
  if(req.headers['x-test-user']!=='teacher')throw Error('unauthorized');
  return {uid:'teacher',email:'teacher@example.com',admin:true};
 }}));server.listen(0,'127.0.0.1');await once(server,'listening');t.after(()=>server.close());
 const call=async(path,body,cookie='',teacher=false)=>{
  const response=await fetch(`http://127.0.0.1:${server.address().port}/api/structure/competition${path}`,{method:body===undefined?'GET':'POST',headers:{Origin:'https://test','Content-Type':'application/json','x-notebook-request':'competition-room',...(cookie?{Cookie:cookie}:{}),...(teacher?{'x-test-user':'teacher'}:{})},...(body===undefined?{}:{body:JSON.stringify(body)})});
  return {status:response.status,cookie:response.headers.get('set-cookie')?.split(';')[0],...await response.json()};
 };
 const created=await call('/rooms',{...definition(),duration:60,students:[{seat:1,name:'小明',email:'student@example.com'},{seat:2,name:'小華',email:'other@example.com'}]},'',true);
 const room=created.room;
 assert.equal((await call('/rooms',definition())).status,403);
 assert.equal((await call(`/rooms/${room.id}/join`,{seat:1})).status,403);
 const found=await call(`/code/${room.code}`);assert.equal(found.status,200);assert.deepEqual(found.room.nameChoices,[{seat:1,name:'小明'},{seat:2,name:'小華'}]);assert.equal(found.room.roster,undefined);assert.equal(found.room.questions,undefined);
 const cookie=found.cookie;assert.ok(cookie);
 assert.equal((await call(`/rooms/${room.id}/start`,{},cookie)).status,403);
 assert.equal((await call(`/rooms/${room.id}/join`,{seat:999},cookie)).status,400);
 const joined=await call(`/rooms/${room.id}/join`,{seat:1},cookie);assert.equal(joined.status,200);assert.equal(joined.participant.name,'小明');assert.match(joined.participant.uid,/^guest-/);
 assert.equal((await call(`/rooms/${room.id}/join`,{seat:1},cookie)).status,200);
 const second=await call(`/code/${room.code}`);assert.equal((await call(`/rooms/${room.id}/join`,{seat:1},second.cookie)).status,200);
 assert.equal((await call(`/rooms/${room.id}/start`,{},'',true)).status,200);
 assert.equal((await call(`/rooms/${room.id}/join`,{seat:2},second.cookie)).status,409);
 assert.equal((await call(`/rooms/${room.id}/state`,{},cookie)).status,200);
 clock+=60001;
 assert.equal((await call(`/rooms/${room.id}/answer`,{answer:0},cookie)).status,409);
 assert.equal((await call(`/code/${room.code}`,undefined,cookie)).status,404);
});

test("新課堂不再接受Google匿名模式",()=>{assert.throws(()=>validateRoomInput({...definition(),loginMode:"anonymous"}),/學生統一/);assert.equal(validateRoomInput({...definition(),loginMode:"roster"}).loginMode,"roster");});
