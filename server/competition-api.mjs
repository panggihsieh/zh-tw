import {exportCompetitionClassroom} from './classroom-export.mjs';
import { randomUUID, randomBytes, randomInt, createHash } from 'node:crypto';
import { writingIdentity } from './writing-api.mjs';
import { sentenceReview } from './competition-sentence-review.mjs';
import { gradePractice } from './sentence-api.mjs';
import { writingReferences, judgeCompetitionWriting } from './competition-writing.mjs';

const alphabet='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const fail=(message,status=400)=>{throw Object.assign(Error(message),{status});};
const text=(value,max)=>typeof value==='string'&&value.trim()&&value.length<=max;
export const makeRoomCode=random=>Array.from({length:4},()=>alphabet[random?Math.floor(random()*alphabet.length):randomInt(alphabet.length)]).join('');
export function validateRoomInput(value){
 if(!value||!text(value.title,100)||!text(value.className,80))fail('請填寫競賽名稱與班級。');
 if(value.loginMode&&value.loginMode!=='roster')fail('學生統一以開課代碼及名冊姓名免登入加入，不再提供 Google 匿名加入。');
 const loginMode='roster',gameType=['sentence-practice','structure','writing'].includes(value.gameType)?value.gameType:'quiz';
 const lessonTitles=value.lessonTitles??[];if(!Array.isArray(lessonTitles)||lessonTitles.length>100||lessonTitles.some(v=>!text(v,160)))fail('課文標題格式不符。');
 const duration=Number(value.duration??600);if(!Number.isInteger(duration)||duration<60||duration>7200)fail('課堂時間須為 1–120 分鐘。');
 const maxParticipants=Number(value.maxParticipants??100);if(!Number.isInteger(maxParticipants)||maxParticipants<1||maxParticipants>100)fail('參與人數上限須為 1–100 人。');
 const students=(value.students||[]).filter(v=>v?.active!==false).map(v=>({seat:Number(v.seat),name:String(v.name||'').trim(),email:String(v.email||'').trim().toLowerCase(),...(v.avatar?{avatar:v.avatar}:{})}));
 if(students.length>100||students.some(v=>!Number.isInteger(v.seat)||v.seat<1||v.seat>999||!text(v.name,80)||!text(v.email,254)||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.email)||v.avatar&&(!/^data:image\/(?:jpeg;base64,\/9j\/|png;base64,iVBORw0KGgo|webp;base64,UklGR)[A-Za-z0-9+/]+={0,2}$/.test(v.avatar)||v.avatar.length>12000)))fail('班級學生資料或公仔格式不符。');
 const roster=value.roster||students.map(v=>v.email);
 if(loginMode==='roster'&&(!Array.isArray(roster)||!roster.length||roster.length>100||roster.some(v=>!text(v,254)||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v))))fail('名冊模式需有 1–100 個有效 Email。');
 if(!Array.isArray(value.questions)||!value.questions.length||value.questions.length>100)fail('請輸入 1–100 題。');
 const questions=value.questions.map((q,index)=>{
  if(gameType==='writing'){
   if(!/^\p{Script=Han}$/u.test(String(q.character||''))||!Number.isInteger(q.seconds)||q.seconds<30||q.seconds>300)fail(`第 ${index+1} 題書寫題格式不完整。`);
   return {id:String(index+1),type:'writing',character:q.character,prompt:`依筆順書寫「${q.character}」`,seconds:q.seconds};
  }
  if(gameType==='sentence-practice'){
   const phrase=String(q.phrase||'').trim(),character=String(q.character||'').trim();
   if(!/^[\p{Script=Han}]{1,8}$/u.test(phrase)||!/^\p{Script=Han}$/u.test(character)||!phrase.includes(character)||!Number.isInteger(q.seconds)||q.seconds<30||q.seconds>300)fail(`第 ${index+1} 張生字字卡格式不完整。`);
   return {id:String(index+1),type:'sentence-practice',prompt:`先想一個含「${character}」的語詞，再造一個完整句子`,phrase,character,reading:String(q.reading||'').slice(0,40),seconds:q.seconds};
  }
  if(!text(q.prompt,500)||!Array.isArray(q.options)||q.options.length<2||q.options.length>(gameType==='structure'?8:6)||q.options.some(v=>!text(v,200))||!Number.isInteger(q.answer)||q.answer<0||q.answer>=q.options.length||!Number.isInteger(q.seconds)||q.seconds<5||q.seconds>300)fail(`第 ${index+1} 題格式不完整。`);
  return {id:String(index+1),...(gameType==='structure'?{type:'structure',character:String(q.character||'').trim()}:{}),prompt:q.prompt.trim(),options:q.options.map(v=>v.trim()),answer:q.answer,seconds:q.seconds};
 });
 return {lessonTitles:[...new Set(lessonTitles.map(v=>v.trim()))],title:value.title.trim(),classId:String(value.classId||''),className:value.className.trim(),loginMode,gameType,duration,maxParticipants,testRoom:value.testRoom===true,students,roster:[...new Set(roster.map(v=>v.toLowerCase()))],questions};
}
export function questionPoints(correct,elapsedMs,seconds){return correct&&elapsedMs<=seconds*1000?800+Math.round(200*Math.max(0,1-elapsedMs/(seconds*1000))):0;}
export function rankParticipants(items){
 const sorted=[...items].sort((a,b)=>b.points-a.points||b.correct-a.correct||a.totalResponseMs-b.totalResponseMs||a.joinedAt-b.joinedAt);
 let rank=0,previous;return sorted.map((item,index)=>{const key=`${item.points}/${item.correct}/${item.totalResponseMs}`;if(key!==previous)rank=index+1;previous=key;return {...item,rank};});
}
async function requestBody(req,limit=1500000){let size=0,chunks=[];for await(const c of req){size+=c.length;if(size>limit)fail('請求資料過大。',413);chunks.push(c);}return JSON.parse(Buffer.concat(chunks).toString('utf8'));}
export function createCompetitionHandler({store,origins,authenticate=writingIdentity,gradeSentence,now=()=>Date.now(),random}){
 const roomKey=id=>`competition-rooms/${id}.json`,participantKey=(id,uid)=>`competition-participants/${id}/${uid}.json`;
 async function scan(prefix){let cursor,items=[],pages=0;do{const page=await store.list(prefix,cursor);items.push(...await Promise.all(page.names.map(async name=>(await store.get(name)).value)));cursor=page.nextCursor;if(++pages>30)fail('資料量過大。');}while(cursor);return items;}
 const publicRoom=(room,admin=false)=>({id:room.id,code:room.code,title:room.title,lessonTitles:room.lessonTitles||[],className:room.className,status:room.status,questionCount:room.questions.length,createdAt:room.createdAt,duration:room.duration||600,maxParticipants:room.maxParticipants||100,startedAt:room.startedAt||null,expiresAt:room.expiresAt||null,closedAt:room.closedAt||null,loginMode:room.loginMode||'roster',gameType:room.gameType||'quiz',testRoom:room.testRoom===true,...(admin?{roster:room.roster,questions:room.questions}: {})});
 const permitted=(room,user)=>user.guest ? user.roomId===room.id : user.admin||room.loginMode==='anonymous'||room.roster.includes(user.email.toLowerCase());
 const publicParticipant=(value,user)=>({uid:value.uid,name:value.name,seat:value.seat||null,avatarKind:value.avatarKind,avatar:value.avatar||null,index:value.index,correct:value.correct,points:value.points,finished:value.finished,mine:value.uid===user.uid});
 return async(req,res)=>{
  const send=(status,value)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(value));};
  if(req.method==='POST'&&(!origins.includes(req.headers.origin)||req.headers['x-notebook-request']!=='competition-room'))return send(403,{error:'不允許的來源'});
  let user;
  try { user=await authenticate(req); } catch {
   if(req.headers.authorization)return send(401,{error:'教師登入憑證無效'});
   const token=/(?:^|;\s*)competition_guest=([A-Za-z0-9_-]{43})(?:;|$)/.exec(req.headers.cookie||'')?.[1];
   const uid=token?'guest-'+createHash('sha256').update(token).digest('hex'):null;
   const session=uid?await store.get(`competition-guests/${uid}.json`).catch(()=>null):null;
   user={uid:uid||'pending',email:'',admin:false,guest:true,roomId:session?.value.expiresAt>now()?session.value.roomId:null};
  }
  try{
   const url=new URL(req.url,'http://localhost'),path=url.pathname.replace('/api/structure/competition','');
   const avatarMatch=path.match(/^\/avatar-originals\/([a-f0-9]{64})$/);
   if(avatarMatch&&req.method==='GET'){
    if(!user.admin)fail('僅管理者可讀取公仔原圖。',403);
    const original=await store.get(`competition-avatar-originals/${avatarMatch[1]}.json`).catch(error=>{if(error.status===404)return null;throw error;});
    return send(200,{avatar:original?.value.avatar||null});
   }
   if(path==='/avatar-originals'&&req.method==='POST'){
    if(!user.admin)fail('僅管理者可儲存公仔原圖。',403);
    const {thumbnail,original}=await requestBody(req,7100000);
    if(typeof thumbnail!=='string'||thumbnail.length>12000||!/^data:image\/(?:jpeg;base64,\/9j\/|png;base64,iVBORw0KGgo|webp;base64,UklGR)[A-Za-z0-9+/]+={0,2}$/.test(thumbnail)||typeof original!=='string'||original.length>6800000||!/^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(original))fail('公仔圖片格式不符。');
    const id=createHash('sha256').update(thumbnail).digest('hex'),key=`competition-avatar-originals/${id}.json`;
    try{await store.create(key,{avatar:original});}catch(error){if(error.status!==412)throw error;}
    return send(200,{saved:true});
   }
   if(path==='/available'&&req.method==='GET'){if(user.guest)return send(200,{available:false});const available=(await scan('competition-rooms/')).some(room=>room&&room.archivedAt==null&&room.status==='lobby'&&permitted(room,user));return send(200,{available});}
   if(path==='/rooms'&&req.method==='GET'){if(!user.admin)fail('僅管理者可查看開課紀錄。',403);return send(200,{items:(await scan('competition-rooms/')).filter(room=>room && room.archivedAt == null).sort((a,b)=>b.createdAt-a.createdAt).map(v=>publicRoom(v,true))});}
   if(path==='/rooms'&&req.method==='POST'){
    if(!user.admin)fail('僅管理者可建立競賽。',403);const input=validateRoomInput(await requestBody(req));if(input.gameType==='writing')for(const question of input.questions){try{await writingReferences(question.character);}catch{fail(`「${question.character}」尚無可用筆順資料，請重新選字。`);}}const used=new Set((await scan('competition-rooms/')).filter(v=>v.status!=='closed').map(v=>v.code));let code='';for(let i=0;i<20&&!code;i++){const candidate=makeRoomCode(random);if(!used.has(candidate))code=candidate;}if(!code)fail('暫時無法產生開課代碼。',409);
    const room={...input,id:randomUUID(),code,status:'lobby',createdAt:now(),createdBy:user.uid,sentenceScoreScale:1};await store.create(roomKey(room.id),room);return send(201,{room:publicRoom(room,true)});
   }
   const codeMatch=path.match(/^\/code\/([A-Z2-9]{4})$/i);
   if(codeMatch&&req.method==='GET'){
    if(user.guest && user.uid==='pending') {
     const token=randomBytes(32).toString('base64url');
     user.uid='guest-'+createHash('sha256').update(token).digest('hex');
     res.setHeader('Set-Cookie',`competition_guest=${token}; Path=/api/structure/competition; HttpOnly; Secure; SameSite=Strict; Max-Age=7200`);
    }
    const key=`competition-code-attempts/${encodeURIComponent(user.uid)}.json`;
    const room=(await scan('competition-rooms/')).find(v=>v.code===codeMatch[1].toUpperCase()&&v.status!=='closed'&&!(v.expiresAt&&v.expiresAt<=now())&&!(v.status==='lobby'&&now()>=v.createdAt+7200000));
    for(let attempt=0;attempt<8;attempt++){
      const record=await store.get(key).catch(error=>{if(error.status===404)return null;throw error;});
      if(record?.value.lockUntil>now())fail('代碼輸錯三次，請十五分鐘後再試。',429);
      const count=room?0:(record?.value.lockUntil?0:record?.value.count||0)+1;
      if(room&&!record?.value.count)break;
      const lockUntil=count>=3?now()+900000:0;
      try{
        if(record)await store.update(key,{count,lockUntil},record.generation);
        else await store.create(key,{count,lockUntil});
      }catch(error){if(error.status===412&&attempt<7)continue;throw error;}
      if(lockUntil)fail('代碼輸錯三次，已鎖定十五分鐘。',429);
      break;
    }
    if(!room)fail('開課代碼無效或已結束。',404);
    if(user.guest){
     if(room.status!=='lobby'){
      const joined=user.roomId===room.id?await store.get(participantKey(room.id,user.uid)).catch(()=>null):null;
      if(!joined)fail('課堂開始後已鎖定加入。',409);
     }
     const key=`competition-guests/${user.uid}.json`,existing=await store.get(key).catch(error=>{if(error.status===404)return null;throw error;});
     const value={roomId:room.id,expiresAt:room.createdAt+7200000};
     if(existing)await store.update(key,value,existing.generation);else await store.create(key,value);
     user.roomId=room.id;
    }
    if(!permitted(room,user))fail('你不在這個班級名單中。',403);
    return send(200,{room:{...publicRoom(room,user.admin),...(user.guest?{nameChoices:(room.students||[]).map(student=>({seat:student.seat,name:student.name}))}:{})}});
   }
   const match=path.match(/^\/rooms\/([0-9a-f-]{36})\/(start|close|join|state|answer|leaderboard|lobby|simulate|archive|photos|classroom-export|sentence-review)$/i);if(!match)fail('找不到競賽功能。',404);
   const [,id,action]=match;let record=await store.get(roomKey(id)),room=record.value;if(room.status==='running'&&room.expiresAt&&now()>=room.expiresAt){const expired={...room,status:'closed',closedAt:room.expiresAt};await store.update(roomKey(id),expired,record.generation);record=await store.get(roomKey(id));room=record.value;}
   if(action==='archive'){
    if(req.method!=='POST'||!user.admin)fail('僅管理者可移除課堂。',403);
    if(room.status!=='closed')fail('只能移除已結束的課堂。',409);
    if(room.archivedAt == null)await store.update(roomKey(id),{...room,archivedAt:now()},record.generation);
    return send(200,{archived:true});
   }
   if(!permitted(room,user))fail('你不在這個班級名單中。',403);
   if(action==='classroom-export'){
    if(req.method!=='POST'||!user.admin)fail('僅管理者可匯出課堂紀錄。',403);
    const ranking=rankParticipants(await scan(`competition-participants/${id}/`));
    return send(200,await exportCompetitionClassroom(room,ranking,await requestBody(req)));
   }
   if(action==='photos'){
    const prefix=`competition-ranking-photos/${id}/`,key=`${prefix}${encodeURIComponent(user.uid)}.json`;
    if(!user.admin){try{await store.get(participantKey(id,user.uid));}catch{fail('請先加入這堂課才能保存排名照片。',403);}}
    if(req.method==='GET'){
     const items=user.admin?await scan(prefix):await store.get(key).then(record=>[record.value]).catch(error=>{if(error.status===404)return[];throw error;});
     return send(200,{items:items.sort((a,b)=>b.createdAt-a.createdAt)});
    }
    if(req.method!=='POST')fail('不支援的操作。',405);
    if(room.status!=='closed')fail('請等課堂結束後再保存最終排名。',409);
    const participants=await scan(`competition-participants/${id}/`);
    if(participants.some(item=>item.gradingIndex!=null))fail('仍有答案評量中，請稍後拍照。',409);
    const ranking=rankParticipants(participants);
    if(!ranking.length)fail('尚無排名可供拍照。',409);
    const input=await requestBody(req),image=input.image;
    const revision=JSON.stringify(ranking.map(v=>[v.uid,v.rank,v.points,v.correct,v.index]));
    if(input.revision!==revision)fail('排名已更新，請重新拍照。',409);
    if(typeof image!=='string'||image.length>1200000||!/^data:image\/jpeg;base64,[A-Za-z0-9+/]+={0,2}$/.test(image))fail('請上傳有效且不超過 900 KB 的排名 JPEG 照片。');
    const bytes=Buffer.from(image.split(',')[1],'base64');
    if(bytes.length<4||bytes[0]!==255||bytes[1]!==216||bytes[2]!==255||bytes.at(-2)!==255||bytes.at(-1)!==217)fail('排名照片內容不是 JPEG。');
    const photo={id:`${id}-${user.uid}`,roomId:id,owner:user.uid,title:room.title,className:room.className,createdAt:now(),startedAt:room.startedAt,closedAt:room.closedAt,testRoom:room.testRoom===true,image,revision};
    const existing=await store.get(key).catch(error=>{if(error.status===404)return null;throw error;});
    if(existing)await store.update(key,photo,existing.generation);else await store.create(key,photo);
    return send(200,{photo});
   }
   if(['start','close'].includes(action)){
    if(req.method!=='POST'||!user.admin)fail('僅管理者可控制競賽。',403);if(action==='start'&&room.status!=='lobby')fail('這場競賽已經開始或結束。',409);
    const timestamp=now(),updated={...room,status:action==='start'?'running':'closed',[action==='start'?'startedAt':'closedAt']:timestamp,...(action==='start'?{expiresAt:timestamp+(room.duration||600)*1000}:{})};await store.update(roomKey(id),updated,record.generation);return send(200,{room:publicRoom(updated,true)});
   }
   if(action==='sentence-review'&&req.method==='GET'){
    if(!user.admin)fail('僅教師可查看逐字造句分析。',403);
    if(room.status!=='closed'||room.gameType!=='sentence-practice')fail('請在造句競賽結束後查看分析。',409);
    const participants=await scan(`competition-participants/${id}/`);
    if(participants.some(p=>p.gradingIndex!=null))fail('仍有造句評分中，請稍後重新載入。',409);
    return send(200,sentenceReview(room,participants));
   }
   if(action==='lobby'&&req.method==='GET'){if(!user.admin)fail('僅管理者可查看課堂大廳。',403);const items=await scan(`competition-participants/${id}/`);return send(200,{room:publicRoom(room,true),items:items.sort((a,b)=>(a.seat||9999)-(b.seat||9999)||a.joinedAt-b.joinedAt).map(v=>publicParticipant(v,user))});}
   if(action==='leaderboard'&&req.method==='GET'){const items=rankParticipants(await scan(`competition-participants/${id}/`));return send(200,{room:publicRoom(room,user.admin),items:items.map(v=>({rank:v.rank,...publicParticipant(v,user),answered:v.index}))});}
   if(action==='simulate'&&req.method==='POST'){
    if(!user.admin||!room.testRoom)fail('只有獨立測試課堂可以使用模擬學生。',403);
    const names=['測試小安','測試小晴','測試阿文','測試小禾','測試小宇'];
    if(room.status==='lobby'){const existing=await scan(`competition-participants/${id}/`),available=Math.max(0,(room.maxParticipants||100)-existing.length);for(const [index,name] of names.slice(0,available).entries()){const uid=`test-student-${index+1}`,key=participantKey(id,uid);try{await store.create(key,{roomId:id,uid,name,seat:index+1,avatarKind:index===4?'anonymous':'default',joinedAt:now()+index,index:0,correct:0,points:0,totalResponseMs:0,questionStartedAt:null,finished:false,testRoom:true});}catch(error){if(error.status!==412)throw error;}}}
    else if(room.status==='running'){const records=await scan(`competition-participants/${id}/`);for(const participant of records.filter(v=>v.testRoom)){const key=participantKey(id,participant.uid),current=await store.get(key),order=Number(participant.uid.split('-').at(-1))||5,answered=Math.min(room.questions.length,participant.index+1),finished=answered>=room.questions.length;await store.update(key,{...participant,index:answered,correct:answered,points:Math.round(Math.min(answered*1000,answered*(1020-order*35)) * (room.gameType === "sentence-practice" ? (room.sentenceScoreScale ?? 10) / 10 : 1)),totalResponseMs:answered*(2000+order*250),questionStartedAt:now(),finished,finishedAt:finished?now():undefined},current.generation);}}
    else fail('已結束的測試課堂不能再模擬。',409);
    const items=rankParticipants(await scan(`competition-participants/${id}/`));return send(200,{room:publicRoom(room,true),items:items.map(v=>({rank:v.rank,...publicParticipant(v,user),answered:v.index}))});
   }
   if(req.method!=='POST')fail('不支援的操作。',405);
   const key=participantKey(id,user.uid);
   if(action==='join'){
    if(room.status!=='lobby')fail('課堂開始後已鎖定加入。',409);const existing=await scan(`competition-participants/${id}/`);if(!existing.some(v=>v.uid===user.uid)&&existing.length>=(room.maxParticipants||100))fail('這堂課已達參與人數上限。',409);let student=(room.students||[]).find(v=>v.email===user.email.toLowerCase());
    if(user.guest){
     if(now()>=room.createdAt+7200000)fail('課堂加入時間已結束。',409);
     const body=await requestBody(req);student=(room.students||[]).find(v=>v.seat===body.seat);
     if(!student)fail('請選取老師名冊中的姓名。');

    }
    const anonymous=!user.guest&&room.loginMode==='anonymous';try{await store.create(key,{roomId:id,uid:user.uid,name:anonymous?'匿名學生':student?.name||user.displayName||user.email,seat:anonymous?null:student?.seat||null,avatarKind:anonymous?'anonymous':student?.avatar?'custom':'default',...(student?.avatar&&!anonymous?{avatar:student.avatar}:{}),joinedAt:now(),index:0,correct:0,points:0,totalResponseMs:0,questionStartedAt:null,finished:false,testRoom:room.testRoom===true});}catch(e){if(e.status!==412)throw e;}const joined=await store.get(key);return send(200,{room:publicRoom(room,false),participant:publicParticipant(joined.value,user),question:null});
   }
   const participantRecord=await store.get(key),participant=participantRecord.value;
   if(action==='state'){
    let current=participant;if(room.status==='running'&&!current.finished&&current.questionStartedAt==null){current={...current,questionStartedAt:now()};await store.update(key,current,participantRecord.generation);}
    return send(200,{room:publicRoom(room,false),participant:publicParticipant(current,user),question:room.status==='running'&&!current.finished?{...room.questions[current.index],answer:undefined}:null});
   }
   if(action==='answer'){
    if(room.status!=='running'||now()>=room.expiresAt||participant.finished||participant.questionStartedAt==null)fail('目前不能作答，課堂可能已到期。',409);const body=await requestBody(req),question=room.questions[participant.index],elapsed=Math.max(0,now()-participant.questionStartedAt);let correct,points,grade;
    if(question.type==='sentence-practice'){
     if(participant.gradingIndex===participant.index)fail('這題正在評量，請勿重複送出。',409);if(!text(body.sentence,300)||!body.sentence.includes(question.character)||!gradeSentence)fail('請輸入包含指定字的完整句子。');const locked={...participant,gradingIndex:participant.index};await store.update(key,locked,participantRecord.generation);try{grade=gradePractice(body.sentence,question.character,await gradeSentence({phrase:question.phrase,character:question.character,sentence:body.sentence}));}catch(error){const failed=await store.get(key),retry={...failed.value};delete retry.gradingIndex;await store.update(key,retry,failed.generation);throw error;}correct=grade.targetOk&&grade.meaningOk&&grade.total>=50;points=elapsed<=question.seconds*1000?Math.round((room.sentenceScoreScale ?? 10) * grade.total):0;
    }else if(question.type==='writing'){correct=await judgeCompetitionWriting(question.character,body.traces)&&elapsed<=question.seconds*1000;points=questionPoints(correct,elapsed,question.seconds);
    }else{if(!Number.isInteger(body.answer)||body.answer<0||body.answer>=question.options.length)fail('答案格式不符。');correct=body.answer===question.answer&&elapsed<=question.seconds*1000;points=questionPoints(correct,elapsed,question.seconds);}
    const nextIndex=participant.index+1,finished=nextIndex>=room.questions.length;
    const updated={...participant,index:nextIndex,correct:participant.correct+(correct?1:0),points:participant.points+points,totalResponseMs:participant.totalResponseMs+elapsed,questionStartedAt:now(),finished,finishedAt:finished?now():undefined};if(question.type==='sentence-practice')updated.sentenceAnswers=[...(participant.sentenceAnswers||[]),{questionIndex:participant.index,character:question.character,sentence:body.sentence,grade,points,elapsedMs:elapsed,timedOut:elapsed>question.seconds*1000,submittedAt:now()}];
   delete updated.gradingIndex;const latest=question.type==='sentence-practice'?await store.get(key):participantRecord;await store.update(key,updated,latest.generation);return send(200,{correct,correctAnswer:question.answer,points,grade,participant:publicParticipant(updated,user),question:finished?null:{...room.questions[nextIndex],answer:undefined}});
   }
   fail('不支援的操作。',404);
  }catch(error){const status=error instanceof SyntaxError?400:[400,401,403,404,405,409,413,429].includes(error.status)?error.status:503;return send(status,{error:error instanceof SyntaxError?'請求 JSON 格式不符。':status===503?'競賽服務暫時無法使用，請稍後重試。':error.message});}
 };
}
