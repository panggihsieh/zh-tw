import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { writingIdentity } from './writing-api.mjs';
const bank=JSON.parse(await readFile(new URL('./sentence-bank.json',import.meta.url),'utf8'));
const validId=v=>typeof v==='string'&&/^[0-9a-f-]{36}$/i.test(v);
const fail=(message,status=400)=>{throw Object.assign(Error(message),{status});};
const bounded=(v,n)=>typeof v==='string'&&v.trim().length>0&&v.length<=n;
export function validateCompetition(v) {
  if(!v||!bounded(v.title,100)||!Number.isSafeInteger(v.minutes)||v.minutes<1||!Number.isSafeInteger(Date.now()+v.minutes*60000)||!Array.isArray(v.lessonIds)||!v.lessonIds.length||v.lessonIds.length>6||!Array.isArray(v.questions)||!v.questions.length||v.reviewed!==true)fail('需選擇1–6課及至少1個字，設定有效的整數分鐘（至少1分鐘）並確認讀音。');
  const lessons=v.lessonIds.map(id=>bank.lessons.find(l=>l.id===id));
  if(lessons.some(l=>!l))fail('僅開放南一五、六年級課別。');
  const questions=v.questions.map((q,i)=>{
    const source=lessons.flatMap(l=>l.characters).find(c=>c.character===q.character)?.readings.find(r=>r.reading===q.reading);
    if(!source)fail('題目字與讀音不在所選課別字典候選中。');
    return {id:String(i),character:q.character,reading:q.reading,...source};
  });
  if(new Set(questions.map(q=>q.character)).size!==questions.length)fail('同一字每場只出一題，讓學生自行想出語詞。');
  const roster=v.roster||[];
  if(v.passage!==undefined&&(typeof v.passage!=='string'||v.passage.length>12000))fail('課文補充最多12000字。');
  if(!Array.isArray(roster)||roster.length>100||roster.some(e=>!bounded(e,254)||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)))fail('派送名單需填寫有效電子郵件。');
  return {title:v.title.trim(),minutes:v.minutes,passage:v.passage||'',lessonIds:[...new Set(v.lessonIds)],lessons:lessons.map(l=>`南一 ${l.grade}${l.term} ${l.title}`),roster:[...new Set(roster.map(e=>e.toLowerCase()))],questions,reviewed:true,rubricVersion:'idiom40-elements50-fluency10-v1'};
}
export function scoreSentence(sentence,question,analysis) {
  if(!analysis||typeof analysis.targetOk!=='boolean'||typeof analysis.readingOk!=='boolean'||typeof analysis.uncertain!=='boolean'||!Number.isInteger(analysis.fluency)||analysis.fluency<0||analysis.fluency>10||!bounded(analysis.feedback,1200)||!analysis.elements||!analysis.idiom||typeof analysis.idiom.appropriate!=='boolean')fail('AI 評分格式不符，須由老師覆核。');
  const elements={};
  for(const key of ['person','event','time','place','object']) {
    const proof=analysis.elements[key];
    if(typeof proof!=='string'||proof.length>300||proof&&!sentence.includes(proof))fail('AI 評分依據不是原句片段，須由老師覆核。');
    elements[key]={evidence:proof,score:proof?10:0};
  }
  const idiom=analysis.idiom.text;
  if(typeof idiom!=='string'||idiom.length>40||idiom&&!sentence.includes(idiom))fail('AI 成語依據不是原句片段。');
  const targetOk=sentence.includes(question.character)&&analysis.targetOk&&analysis.readingOk;
  const idiomScore=analysis.idiom.appropriate&&Array.from(idiom).length>=4?40:0;
  return {targetOk,readingOk:analysis.readingOk,idiom:{text:idiom,score:idiomScore},elements,fluency:analysis.fluency,feedback:analysis.feedback,uncertain:analysis.uncertain,total:analysis.uncertain?null:targetOk?idiomScore+Object.values(elements).reduce((n,v)=>n+v.score,0)+analysis.fluency:0};
}
export function validateTeacherGrade(v) {
  if(!v||typeof v.targetOk!=='boolean'||![0,40].includes(v.idiom)||!Number.isInteger(v.fluency)||v.fluency<0||v.fluency>10||!bounded(v.feedback,1200)||!v.elements||['person','event','time','place','object'].some(k=>![0,10].includes(v.elements[k])))fail('覆核配分不符：成語0/40、人事時地物各0/10、順暢0–10。');
  const elements=Object.fromEntries(['person','event','time','place','object'].map(k=>[k,v.elements[k]]));
  return {targetOk:v.targetOk,idiom:v.idiom,fluency:v.fluency,feedback:v.feedback,elements,total:v.targetOk?v.idiom+Object.values(elements).reduce((a,b)=>a+b,0)+v.fluency:0};
}
async function body(req) {let n=0,chunks=[];for await(const c of req){n+=c.length;if(n>30000)fail('請求資料過大。',413);chunks.push(c);}return JSON.parse(Buffer.concat(chunks).toString('utf8'));}
export function createSentenceHandler({store,origins,authenticate=writingIdentity,analyze,now=()=>Date.now()}) {
  const grading=new Set();
  async function scan(prefix){let cursor,items=[],pages=0;do{const p=await store.list(prefix,cursor);items.push(...await Promise.all(p.names.map(async name=>(await store.get(name)).value)));cursor=p.nextCursor;if(++pages>30)fail('資料量過大，請分批查詢。');}while(cursor);return items;}
  const eventKey=id=>`sentence-events/${id}.json`;
  const participantKey=(id,uid)=>`sentence-participants/${id}/${uid}.json`;
  const answerKey=(id,uid,qid)=>`sentence-answers/${id}/${uid}/${qid}.json`;
  const access=(event,u)=>u.admin||!event.roster.length||event.roster.includes(u.email.toLowerCase());
  const active=e=>e.status==='running'&&now()<e.endsAt;
  const publicEvent=(e,admin)=>admin?e:{id:e.id,title:e.title,lessons:e.lessons,minutes:e.minutes,status:e.status,startsAt:e.startsAt,endsAt:e.endsAt,questions:e.questions.map(q=>({id:q.id,character:q.character,reading:q.reading}))};
  return async(req,res)=>{
    const send=(status,v)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(v));};
    if(req.method==='POST'&&(!origins.includes(req.headers.origin)||req.headers['x-notebook-request']!=='sentence-game'))return send(403,{error:'不允許的來源'});
    let user;try{user=await authenticate(req);}catch{return send(401,{error:'請先登入 Google 帳號'});}
    try {
      const url=new URL(req.url,'http://localhost');
      const path=url.pathname.replace('/api/structure/sentence','');
      if(path==='/events'&&req.method==='GET')return send(200,{now:now(),items:(await scan('sentence-events/')).filter(e=>access(e,user)&&(user.admin||e.status!=='draft')).sort((a,b)=>b.createdAt-a.createdAt).map(e=>publicEvent(e,user.admin))});
      if(path==='/events'&&req.method==='POST'){
        if(!user.admin)fail('僅管理者可派送競賽。',403);
        const event={...validateCompetition(await body(req)),id:randomUUID(),status:'published',createdAt:now(),createdBy:user.uid};
        await store.create(eventKey(event.id),event);return send(201,{event});
      }
      const match=path.match(/^\/events\/([0-9a-f-]{36})\/(start|close|join|answers|submit|finish|correct|grade|review)$/i);
      if(!match)fail('找不到競賽功能。',404);
      const [,id,action]=match;
      const old=await store.get(eventKey(id)),event=old.value;
      if(!access(event,user))fail('這場競賽未派送給此帳號。',403);
      if(req.method==='GET'&&action==='answers'){
        const items=await scan(`sentence-answers/${id}/${user.admin&&url.searchParams.get('mine')!=='1'?'':`${user.uid}/`}`);
        return send(200,{items,now:now(),event:publicEvent(event,user.admin),participants:user.admin?await scan(`sentence-participants/${id}/`):[]});
      }
      if(req.method!=='POST')fail('不支援的操作。',405);
      if(['start','close'].includes(action)){
        if(!user.admin)fail('僅管理者可控制競賽。',403);
        if(action==='start'&&event.status!=='published')fail('競賽只能開始一次，需重賽請重新派送。',409);
        const updated={...event,status:action==='start'?'running':'closed',...(action==='start'?{startsAt:now(),endsAt:now()+event.minutes*60000}:{endsAt:Math.min(event.endsAt||now(),now())})};
        await store.update(eventKey(id),updated,old.generation);return send(200,{event:publicEvent(updated,user.admin),now:now()});
      }
      if(action==='join'){
        if(!active(event))fail('競賽尚未開始或已結束。',409);
        const key=participantKey(id,user.uid);
        try{await store.create(key,{eventId:id,uid:user.uid,name:user.displayName||user.email,joinedAt:now(),endsAt:event.endsAt,finished:false});}catch(e){if(e.status!==412)throw e;}
        return send(200,{event:publicEvent(event,false),participant:(await store.get(key)).value,now:now(),answers:await scan(`sentence-answers/${id}/${user.uid}/`)});
      }
      const v=await body(req);
      if(action==='review'){
        if(!user.admin)fail('僅管理者可覆核。',403);
        const q=event.questions.find(q=>q.id===v.questionId);
        if(!q||typeof v.uid!=='string'||!/^[a-zA-Z0-9_-]{1,128}$/.test(v.uid))fail('覆核對象不符。');
        const key=answerKey(id,v.uid,q.id),answer=await store.get(key);
        const grade=validateTeacherGrade(v.grade);
        await store.update(key,{...answer.value,teacherGrade:{...grade,reviewedBy:user.uid,reviewedAt:now()},status:'reviewed'},answer.generation);
        return send(200,{ok:true});
      }
      const uid=action==='grade'&&user.admin&&typeof v.uid==='string'?v.uid:user.uid;
      if(!/^[a-zA-Z0-9_-]{1,128}$/.test(uid))fail('帳號識別不符。');
      const participant=await store.get(participantKey(id,uid));
      if(action==='finish'){
        if(!participant.value.finished)await store.update(participantKey(id,uid),{...participant.value,finished:true,finishedAt:now()},participant.generation);
        return send(200,{items:await scan(`sentence-answers/${id}/${uid}/`)});
      }
      const question=event.questions.find(q=>q.id===v.questionId);
      if(!question)fail('題目不存在。');
      if(action==='correct'){
        if(!active(event)||participant.value.finished)fail('競賽已結束。',409);
        if(!bounded(v.transcript,300))fail('請先說一句話。');
        const count=participant.value.correctionCount||0;if(count>=event.questions.length*2)fail('已達本場語音修正次數，請自行確認文字。',429);
        await store.update(participantKey(id,uid),{...participant.value,correctionCount:count+1},participant.generation);
        const r=await analyze('correct',{transcript:v.transcript,question});
        const suggested=r?.sentence;
        if(!bounded(suggested,300)||Array.from(suggested).length>Array.from(v.transcript).length*1.5+2||Array.from(suggested).length<Array.from(v.transcript).length*.5)fail('無法確定辨識修正，請自行修改或再說一次。');
        return send(200,{original:v.transcript,suggestion:suggested,notice:'AI 只提供修正建議，請確認是否符合你原本想說的話。'});
      }
      const key=answerKey(id,uid,question.id);
      if(action==='submit'){
        if(!active(event)||participant.value.finished)fail('時間已到，未送出的句子不再收件。',409);
        if(v.confirmed!==true||!bounded(v.sentence,300)||typeof v.original!=='string'||v.original.length>300||Array.from(v.sentence.replace(/[^\p{Script=Han}]/gu,'')).length<5||!v.sentence.includes(question.character))fail('請確認句子至少有5個中文字，且包含指定字。');
        const answer={eventId:id,uid,name:user.displayName||user.email,questionId:question.id,character:question.character,reading:question.reading,original:v.original,sentence:v.sentence.trim(),submittedAt:now(),status:'pending',aiGrade:null};
        await store.create(key,answer);return send(201,{answer});
      }
      if(action==='grade'){
        if(!participant.value.finished&&active(event))fail('完成競賽後才開始評分。',409);
        const answer=await store.get(key);
        if(answer.value.aiGrade||answer.value.status==='needs_teacher'||answer.value.teacherGrade)return send(200,{answer:answer.value});
        if(grading.has(key))fail('正在評分，請稍後重載。',409);
        if(answer.value.gradingAt&&now()-answer.value.gradingAt<150000)fail('正在評分，請稍後重載。',409);
        grading.add(key);
        try {
          await store.update(key,{...answer.value,gradingAt:now()},answer.generation);
          let updated={...answer.value};
          try{const analysis=await analyze('grade',{question,sentence:answer.value.sentence});updated.aiGrade=scoreSentence(answer.value.sentence,question,analysis);updated.status=updated.aiGrade.uncertain?'needs_teacher':'ai_scored';}
          catch{updated.status='needs_teacher';updated.gradingError='AI 暫時無法完成評分，保留原句，請老師覆核。';}
          const current=await store.get(key);
          if(!current.value.teacherGrade)await store.update(key,{...updated,gradedAt:now()},current.generation);
          return send(200,{answer:(await store.get(key)).value});
        }finally{grading.delete(key);}
      }
      fail('不支援的操作。',404);
    }catch(e){const status=e.status===412?409:[400,401,403,404,405,409,413,429].includes(e.status)?e.status:400;return send(status,{error:status===404?'找不到競賽或作答紀錄。':status===409&&e.status===412?'此題已送出或資料已更新，請重新載入。':e.message||'競賽服務暫時無法使用。'});}
  };
}
