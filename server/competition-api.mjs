import { randomUUID } from 'node:crypto';
import { writingIdentity } from './writing-api.mjs';

const alphabet='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const fail=(message,status=400)=>{throw Object.assign(Error(message),{status});};
const text=(value,max)=>typeof value==='string'&&value.trim()&&value.length<=max;
export const makeRoomCode=(random=Math.random)=>Array.from({length:4},()=>alphabet[Math.floor(random()*alphabet.length)]).join('');
export function validateRoomInput(value){
 if(!value||!text(value.title,100)||!text(value.className,80))fail('請填寫競賽名稱與班級。');
 const roster=value.roster||[];
 if(!Array.isArray(roster)||!roster.length||roster.length>100||roster.some(v=>!text(v,254)||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)))fail('班級名單需有 1–100 個有效 Email。');
 if(!Array.isArray(value.questions)||!value.questions.length||value.questions.length>100)fail('請輸入 1–100 題。');
 const questions=value.questions.map((q,index)=>{
  if(!text(q.prompt,500)||!Array.isArray(q.options)||q.options.length<2||q.options.length>6||q.options.some(v=>!text(v,200))||!Number.isInteger(q.answer)||q.answer<0||q.answer>=q.options.length||!Number.isInteger(q.seconds)||q.seconds<5||q.seconds>300)fail(`第 ${index+1} 題格式不完整。`);
  return {id:String(index+1),prompt:q.prompt.trim(),options:q.options.map(v=>v.trim()),answer:q.answer,seconds:q.seconds};
 });
 return {title:value.title.trim(),className:value.className.trim(),roster:[...new Set(roster.map(v=>v.toLowerCase()))],questions};
}
export function questionPoints(correct,elapsedMs,seconds){return correct&&elapsedMs<=seconds*1000?800+Math.round(200*Math.max(0,1-elapsedMs/(seconds*1000))):0;}
export function rankParticipants(items){
 const sorted=[...items].sort((a,b)=>b.points-a.points||b.correct-a.correct||a.totalResponseMs-b.totalResponseMs||a.joinedAt-b.joinedAt);
 let rank=0,previous;return sorted.map((item,index)=>{const key=`${item.points}/${item.correct}/${item.totalResponseMs}`;if(key!==previous)rank=index+1;previous=key;return {...item,rank};});
}
async function requestBody(req){let size=0,chunks=[];for await(const c of req){size+=c.length;if(size>150000)fail('請求資料過大。',413);chunks.push(c);}return JSON.parse(Buffer.concat(chunks).toString('utf8'));}
export function createCompetitionHandler({store,origins,authenticate=writingIdentity,now=()=>Date.now(),random=Math.random}){
 const roomKey=id=>`competition-rooms/${id}.json`,participantKey=(id,uid)=>`competition-participants/${id}/${uid}.json`;
 async function scan(prefix){let cursor,items=[],pages=0;do{const page=await store.list(prefix,cursor);items.push(...await Promise.all(page.names.map(async name=>(await store.get(name)).value)));cursor=page.nextCursor;if(++pages>30)fail('資料量過大。');}while(cursor);return items;}
 const publicRoom=(room,admin=false)=>({id:room.id,code:room.code,title:room.title,className:room.className,status:room.status,questionCount:room.questions.length,createdAt:room.createdAt,...(admin?{roster:room.roster,questions:room.questions}: {})});
 return async(req,res)=>{
  const send=(status,value)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(value));};
  if(req.method==='POST'&&(!origins.includes(req.headers.origin)||req.headers['x-notebook-request']!=='competition-room'))return send(403,{error:'不允許的來源'});
  let user;try{user=await authenticate(req);}catch{return send(401,{error:'請先登入 Google 帳號'});}
  try{
   const url=new URL(req.url,'http://localhost'),path=url.pathname.replace('/api/structure/competition','');
   if(path==='/rooms'&&req.method==='GET'){if(!user.admin)fail('僅管理者可查看開課紀錄。',403);return send(200,{items:(await scan('competition-rooms/')).sort((a,b)=>b.createdAt-a.createdAt).map(v=>publicRoom(v,true))});}
   if(path==='/rooms'&&req.method==='POST'){
    if(!user.admin)fail('僅管理者可建立競賽。',403);const input=validateRoomInput(await requestBody(req));const used=new Set((await scan('competition-rooms/')).filter(v=>v.status!=='closed').map(v=>v.code));let code='';for(let i=0;i<20&&!code;i++){const candidate=makeRoomCode(random);if(!used.has(candidate))code=candidate;}if(!code)fail('暫時無法產生開課代碼。',409);
    const room={...input,id:randomUUID(),code,status:'lobby',createdAt:now(),createdBy:user.uid};await store.create(roomKey(room.id),room);return send(201,{room:publicRoom(room,true)});
   }
   const codeMatch=path.match(/^\/code\/([A-Z2-9]{4})$/i);
   if(codeMatch&&req.method==='GET'){
    const room=(await scan('competition-rooms/')).find(v=>v.code===codeMatch[1].toUpperCase()&&v.status!=='closed');if(!room)fail('開課代碼無效或已結束。',404);if(!user.admin&&!room.roster.includes(user.email.toLowerCase()))fail('你不在這個班級名單中。',403);return send(200,{room:publicRoom(room,user.admin)});
   }
   const match=path.match(/^\/rooms\/([0-9a-f-]{36})\/(start|close|join|state|answer|leaderboard)$/i);if(!match)fail('找不到競賽功能。',404);
   const [,id,action]=match,record=await store.get(roomKey(id)),room=record.value;
   if(!user.admin&&!room.roster.includes(user.email.toLowerCase()))fail('你不在這個班級名單中。',403);
   if(['start','close'].includes(action)){
    if(req.method!=='POST'||!user.admin)fail('僅管理者可控制競賽。',403);if(action==='start'&&room.status!=='lobby')fail('這場競賽已經開始或結束。',409);
    const updated={...room,status:action==='start'?'running':'closed',[action==='start'?'startedAt':'closedAt']:now()};await store.update(roomKey(id),updated,record.generation);return send(200,{room:publicRoom(updated,true)});
   }
   if(action==='leaderboard'&&req.method==='GET'){const items=rankParticipants(await scan(`competition-participants/${id}/`));return send(200,{room:publicRoom(room,user.admin),items:items.map(v=>({rank:v.rank,name:v.name,points:v.points,correct:v.correct,answered:v.index,finished:v.finished,mine:v.uid===user.uid}))});}
   if(req.method!=='POST')fail('不支援的操作。',405);
   const key=participantKey(id,user.uid);
   if(action==='join'){
    if(room.status==='closed')fail('競賽已結束。',409);try{await store.create(key,{roomId:id,uid:user.uid,name:user.displayName||user.email,joinedAt:now(),index:0,correct:0,points:0,totalResponseMs:0,questionStartedAt:room.status==='running'?now():null,finished:false});}catch(e){if(e.status!==412)throw e;}const joined=await store.get(key);let participant=joined.value;if(room.status==='running'&&!participant.finished&&participant.questionStartedAt==null){participant={...participant,questionStartedAt:now()};await store.update(key,participant,joined.generation);}return send(200,{room:publicRoom(room,false),participant,question:room.status==='running'&&!participant.finished?{...room.questions[participant.index],answer:undefined}:null});
   }
   const participantRecord=await store.get(key),participant=participantRecord.value;
   if(action==='state'){
    let current=participant;if(room.status==='running'&&!current.finished&&current.questionStartedAt==null){current={...current,questionStartedAt:now()};await store.update(key,current,participantRecord.generation);}
    return send(200,{room:publicRoom(room,false),participant:current,question:room.status==='running'&&!current.finished?{...room.questions[current.index],answer:undefined}:null});
   }
   if(action==='answer'){
    if(room.status!=='running'||participant.finished||participant.questionStartedAt==null)fail('目前不能作答，請先更新競賽狀態。',409);const body=await requestBody(req),question=room.questions[participant.index];if(!Number.isInteger(body.answer)||body.answer<0||body.answer>=question.options.length)fail('答案格式不符。');const elapsed=Math.max(0,now()-participant.questionStartedAt),correct=body.answer===question.answer&&elapsed<=question.seconds*1000,points=questionPoints(correct,elapsed,question.seconds),nextIndex=participant.index+1,finished=nextIndex>=room.questions.length;
    const updated={...participant,index:nextIndex,correct:participant.correct+(correct?1:0),points:participant.points+points,totalResponseMs:participant.totalResponseMs+elapsed,questionStartedAt:now(),finished,finishedAt:finished?now():undefined};await store.update(key,updated,participantRecord.generation);return send(200,{correct,correctAnswer:question.answer,points,participant:updated,question:finished?null:{...room.questions[nextIndex],answer:undefined}});
   }
   fail('不支援的操作。',404);
  }catch(error){const status=[400,401,403,404,405,409,413].includes(error.status)?error.status:400;return send(status,{error:error.message||'競賽服務暫時無法使用。'});}
 };
}
