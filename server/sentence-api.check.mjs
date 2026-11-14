import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {once} from 'node:events';
import {readFile} from 'node:fs/promises';
import {createSentenceHandler,validateCompetition,scoreSentence,gradePractice,validateTeacherGrade} from './sentence-api.mjs';
const bank=JSON.parse(await readFile(new URL('./sentence-bank.json',import.meta.url),'utf8'));
const lesson=bank.lessons[0],character=lesson.characters[0];
const definition=()=>({title:'南一五上測試競賽',minutes:1,lessonIds:[lesson.id],questions:[{character:character.character,reading:character.readings[0].reading}],reviewed:true,roster:['student@example.com']});
const analysis=sentence=>({targetOk:true,readingOk:true,uncertain:false,idiom:{text:'日積月累',appropriate:true},elements:{person:'小明',event:'閱讀',time:'今天',place:'圖書館',object:'故事書'},fluency:10,feedback:'能交代人物、時間、地點與事件，請再確認成語使用。'});
const text=()=>`今天小明在圖書館閱讀故事書，日積月累，認識了「${character.character}」的用法。`;
function memoryStore(){const data=new Map();return {data,async list(prefix){return {names:[...data.keys()].filter(k=>k.startsWith(prefix))};},async get(key){if(!data.has(key))throw Object.assign(Error('missing'),{status:404});return structuredClone(data.get(key));},async create(key,value){if(data.has(key))throw Object.assign(Error('conflict'),{status:412});data.set(key,{value:structuredClone(value),generation:1});},async update(key,value,generation){if(data.get(key)?.generation!==generation)throw Object.assign(Error('conflict'),{status:412});data.set(key,{value:structuredClone(value),generation:generation+1});}};}
async function fixture(t,ai=async()=>analysis(),requirePracticeCode=false){
 const store=memoryStore();let clock=100000;const server=http.createServer(createSentenceHandler({store,origins:['https://test'],now:()=>clock,analyze:ai,requirePracticeCode,authenticate:async req=>{const id=req.headers['x-test-user'];if(!id)throw Error('no user');return {uid:id,email:`${id}@example.com`,displayName:id,admin:id==='teacher'};}}));server.listen(0,'127.0.0.1');await once(server,'listening');t.after(()=>server.close());
 const request=async(path,body,user='teacher',origin='https://test')=>{const r=await fetch(`http://127.0.0.1:${server.address().port}/api/structure/sentence${path}`,{method:body===undefined?'GET':'POST',headers:{'Content-Type':'application/json','x-test-user':user,'x-notebook-request':'sentence-game',Origin:origin},...(body===undefined?{}:{body:JSON.stringify(body)})});return {status:r.status,...await r.json()};};
 return {store,request,setTime:v=>clock=v};
}
test('個人造句代碼僅教師可開放，名冊學生可進入至截止',async t=>{
 let calls=0;
 const {request,setTime}=await fixture(t,async()=>{calls++;return {sentence:'今天我去圖書館看書。'};},true);
 const input={phrase:'書',character:'書',transcript:'今天我去圖書館看書。'};
 assert.equal((await request('/practice/correct',input,'student')).status,403);
 const settings={minutes:1,roster:['student@example.com']};
 assert.equal((await request('/practice/open',settings,'student')).status,403);
 const session=await request('/practice/open',settings);
 assert.equal(session.status,201);
 assert.equal((await request('/practice/access',{code:session.code},'other')).status,403);
 assert.equal((await request('/practice/access',{code:session.code},'student')).status,200);
 assert.equal((await request('/practice/correct',{...input,code:session.code},'student')).status,200);
 setTime(session.expiresAt);
 assert.equal((await request('/practice/access',{code:session.code},'student')).status,403);
 assert.equal((await request('/practice/correct',{...input,code:session.code},'student')).status,403);
 assert.equal(calls,1);
});
test('題庫只包含南一五六年級45課，派送要求教師核對並驗證題目讀音',()=>{
 assert.equal(bank.lessons.length,45);assert.ok(bank.lessons.every(l=>[5,6].includes(l.grade)));
 assert.equal(validateCompetition(definition()).questions.length,1);
 for(const patch of [{reviewed:false},{minutes:0},{minutes:1.5},{questions:[]},{lessonIds:['fake']},{questions:[{character:'偽',reading:'假的'}]},{roster:['bad']}])assert.throws(()=>validateCompetition({...definition(),...patch}));
 const questions=lesson.characters.slice(0,9).map(c=>({character:c.character,reading:c.readings[0].reading}));
 const extended=validateCompetition({...definition(),minutes:61,questions});
 assert.equal(extended.questions.length,9);
 assert.equal(extended.minutes,61);
 assert.throws(()=>validateCompetition({...definition(),questions:Array(9).fill(definition().questions[0])}));
});
test('配分40+5*10+10=100，不接受不存在的證據或錯字音得高分',()=>{
 const q=definition().questions[0],s=text(),v=analysis();assert.equal(scoreSentence(s,q,v).total,100);
 assert.equal(scoreSentence(s,q,{...v,readingOk:false}).total,0);
 assert.equal(scoreSentence(s,q,{...v,uncertain:true}).total,null);
 assert.throws(()=>scoreSentence(s,q,{...v,elements:{...v.elements,time:'昨天'}}));
 assert.throws(()=>scoreSentence(s,q,{...v,fluency:11}));
 assert.equal(scoreSentence(s,q,{...v,idiom:{text:'',appropriate:false}}).total,60);
});
test('教師覆核只接受固定配分，不能用額外欄位增加分數',()=>{
 const v={targetOk:true,idiom:40,elements:{person:10,event:10,time:10,place:10,object:10,cheat:999},fluency:10,feedback:'符合題意。'};
 assert.equal(validateTeacherGrade(v).total,100);assert.equal(validateTeacherGrade({...v,targetOk:false}).total,0);
 assert.throws(()=>validateTeacherGrade({...v,idiom:41}));
});
test('教師派送、學生名單、CORS、統一開始、不可重開',async t=>{
 const f=await fixture(t);
 assert.equal((await f.request('/events',definition(),'student')).status,403);
 assert.equal((await f.request('/events',definition(),'teacher','https://evil')).status,403);
 assert.equal((await f.request('/events',undefined,'')).status,401);
 const created=await f.request('/events',definition());assert.equal(created.status,201);const id=created.event.id;
 assert.equal((await f.request('/events',undefined,'outsider')).items.length,0);
 const studentList=await f.request('/events',undefined,'student');assert.equal(studentList.items.length,1);assert.equal(studentList.items[0].roster,undefined);assert.equal(studentList.items[0].questions[0].definition,undefined);
 assert.equal((await f.request(`/events/${id}/join`,{},'student')).status,409);
 assert.equal((await f.request(`/events/${id}/start`,{},'student')).status,403);
 const started=await f.request(`/events/${id}/start`,{});assert.equal(started.event.endsAt,160000);
 assert.equal((await f.request(`/events/${id}/start`,{})).status,409);
 assert.equal((await f.request(`/events/${id}/join`,{},'outsider')).status,403);
});
test('同一學生重整不重算時間、截止收件、同題不可覆寫、評分不能由客戶端指定',async t=>{
 const f=await fixture(t);const id=(await f.request('/events',definition())).event.id;await f.request(`/events/${id}/start`,{});
 const first=await f.request(`/events/${id}/join`,{},'student');f.setTime(120000);const again=await f.request(`/events/${id}/join`,{},'student');assert.equal(first.participant.endsAt,again.participant.endsAt);
 const answer={questionId:'0',sentence:text(),original:'原始辨識',confirmed:true,total:999};
 assert.equal((await f.request(`/events/${id}/submit`,{...answer,confirmed:false},'student')).status,400);
 assert.equal((await f.request(`/events/${id}/submit`,answer,'student')).status,201);
 assert.equal((await f.request(`/events/${id}/submit`,answer,'student')).status,409);
 assert.equal((await f.request(`/events/${id}/grade`,{questionId:'0'},'student')).status,409);
 await f.request(`/events/${id}/finish`,{},'student');const g=await f.request(`/events/${id}/grade`,{questionId:'0'},'student');assert.equal(g.answer.aiGrade.total,100);assert.equal(g.answer.total,undefined);
 const reviewed=await f.request(`/events/${id}/review`,{uid:'student',questionId:'0',grade:{targetOk:true,idiom:0,elements:{person:10,event:10,time:10,place:10,object:10},fluency:8,feedback:'成語不適切，其他完整。'}});assert.equal(reviewed.status,200);
 const regrade=await f.request(`/events/${id}/grade`,{questionId:'0'},'student');assert.equal(regrade.answer.teacherGrade.total,58);assert.equal(regrade.answer.aiGrade.total,100);
 f.setTime(200000);assert.equal((await f.request(`/events/${id}/submit`,answer,'student')).status,409);
 assert.equal((await f.request(`/events/${id}/answers`,undefined,'outsider')).status,403);
});
test('AI 失敗保存原文並標示待教師覆核，不製造0分',async t=>{
 const f=await fixture(t,async()=>{throw Error('provider unavailable');});const id=(await f.request('/events',definition())).event.id;await f.request(`/events/${id}/start`,{});await f.request(`/events/${id}/join`,{},'student');await f.request(`/events/${id}/submit`,{questionId:'0',sentence:text(),original:'語音原句',confirmed:true},'student');await f.request(`/events/${id}/finish`,{},'student');const r=await f.request(`/events/${id}/grade`,{questionId:'0'},'student');assert.equal(r.answer.status,'needs_teacher');assert.equal(r.answer.aiGrade,null);assert.equal(r.answer.original,'語音原句');
});
test('學生不能查他人句子、不能提前評分，老師提早結束後不再收件',async t=>{
 const f=await fixture(t);const id=(await f.request('/events',{...definition(),roster:[]})).event.id;await f.request(`/events/${id}/start`,{});await f.request(`/events/${id}/join`,{},'student');await f.request(`/events/${id}/submit`,{questionId:'0',sentence:text(),original:'',confirmed:true},'student');await f.request(`/events/${id}/join`,{},'other');const view=await f.request(`/events/${id}/answers`,undefined,'other');assert.equal(view.items.length,0);
 assert.equal((await f.request(`/events/${id}/review`,{},'student')).status,403);
 await f.request(`/events/${id}/close`,{});assert.equal((await f.request(`/events/${id}/submit`,{questionId:'0',sentence:text(),original:'',confirmed:true},'other')).status,409);
});
test('語音校正保留原文、限制次數，不能在截止後呼叫',async t=>{
 const f=await fixture(t,async()=>({sentence:'爸爸在銀行上班。'}));const id=(await f.request('/events',definition())).event.id;await f.request(`/events/${id}/start`,{});await f.request(`/events/${id}/join`,{},'student');const payload={questionId:'0',transcript:'爸爸在銀航上班。'};
 const c=await f.request(`/events/${id}/correct`,payload,'student');assert.equal(c.original,payload.transcript);assert.equal(c.suggestion,'爸爸在銀行上班。');await f.request(`/events/${id}/correct`,payload,'student');assert.equal((await f.request(`/events/${id}/correct`,payload,'student')).status,429);f.setTime(160001);assert.equal((await f.request(`/events/${id}/correct`,payload,'student')).status,409);
});
test('自由造句保留原始辨識、校正同音字並回傳五項等第',async t=>{
 const f=await fixture(t,async(mode)=>mode==='practice-correct'
  ? {sentence:'我在美麗的海灘看夕陽。'}
  : {targetOk:true,meaningOk:true,uncertain:false,correctness:30,completeness:20,fluency:15,detail:20,mechanics:10,highlight:'美麗的海灘',feedback:'用詞具體，句子很有畫面。'});
 const correction=await f.request('/practice/correct',{phrase:'美麗海灘',character:'灘',transcript:'我在美麗的海攤看夕陽。'},'student');
 assert.equal(correction.original,'我在美麗的海攤看夕陽。');
 assert.equal(correction.suggestion,'我在美麗的海灘看夕陽。');
 const graded=await f.request('/practice/grade',{phrase:'美麗海灘',character:'灘',sentence:correction.suggestion},'student');
 assert.equal(graded.grade.level,'優等');
 assert.equal(graded.grade.total,95);
 assert.deepEqual(graded.grade.scores,{correctness:30,completeness:20,fluency:15,detail:20,mechanics:10});
 assert.equal((await f.request('/practice/grade',{phrase:'美麗海灘',character:'麗',sentence:'今天海灘很好看。'},'student')).status,400);
});
test('自由造句等第遇到指定字錯誤或不確定時不製造高分',()=>{
 const sentence='我在美麗的海灘看夕陽。';
 const base={targetOk:true,meaningOk:true,uncertain:false,correctness:30,completeness:20,fluency:20,detail:20,mechanics:10,highlight:'美麗的海灘',feedback:'句子完整。'};
 assert.equal(gradePractice(sentence,'灘',base).level,'優等');
 assert.equal(gradePractice(sentence,'灘',{...base,meaningOk:false}).level,'待加強');
 assert.equal(gradePractice(sentence,'灘',{...base,uncertain:true}).level,'待確認');
 assert.throws(()=>gradePractice(sentence,'灘',{...base,mechanics:11}));
 assert.throws(()=>gradePractice(sentence,'灘',{...base,highlight:'不在原句'}));
});
test('滿分示例只回傳實際出現的成語或佳詞',()=>{
 const sentence='我在美麗的海灘看夕陽。';
 const base={targetOk:true,meaningOk:true,uncertain:false,correctness:30,completeness:20,fluency:20,detail:20,mechanics:10,highlight:'美麗的海灘',feedback:'句子完整。',fullScoreExample:'夕陽映照著波光粼籼的海灘。',fullScoreExpression:'波光粼籼'};
 assert.equal(gradePractice(sentence,'灘',base).fullScoreExpression,'波光粼籼');
 assert.equal(gradePractice(sentence,'灘',{...base,fullScoreExpression:'五光十色'}).fullScoreExpression,'');
});
