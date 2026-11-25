import {createHash, randomUUID} from 'node:crypto';
import blueprint from './quiz-blueprint.json' with {type:'json'};

export {blueprint};
export function quotaProgress(questions=[]) {
  const rows=blueprint.plan.map(row=>({...row,actual:questions.filter(q=>q.category===row.category).length}));
  return {rows,total:questions.length,complete:rows.every(row=>row.actual===row.count)&&questions.length===blueprint.total};
}
const fingerprint=q=>String(q.stem).normalize('NFC').replace(/[\s\p{P}]/gu,'');
export function validateBankBatch(bank, questions, category, validateQuiz) {
  if(!Array.isArray(questions)||questions.length!==blueprint.batchSize||questions.some(q=>q.category!==category||q.difficulty!==bank.difficulty))throw Error('本批題型、難度或題數不符，未入庫');
  if(category==='標點符號'&&questions.some(q=>!Array.isArray(q.options)||q.options.some(v=>(String(v).match(/\p{Script=Han}/gu)||[]).length<6)))throw Error('標點選項須為完整敘述，不接受符號碎片');
  const seen=new Set(bank.questions.map(fingerprint));
  for(const q of questions){const key=fingerprint(q);if(seen.has(key))throw Error('本批與既有題幹重複，未入庫');seen.add(key);}
  return validateQuiz({...bank,questions:questions.map(q=>({...q,id:randomUUID(),reviewed:false}))});
}
export function makeLessonBankHandlers({store,scan,generate,validateQuiz}) {
  const running=new Set();
  const summary=bank=>({id:bank.id,lessonKey:bank.lessonKey,lesson:bank.lesson,title:bank.title,createdAt:bank.createdAt,difficulty:bank.difficulty,paperIds:bank.paperIds,lastError:bank.lastError||'',...quotaProgress(bank.questions)});
  return async(path,method,input,user)=>{
    if(path==='/lesson-banks'&&method==='GET')return {blueprint,items:(await scan('lesson-banks/')).map(summary)};
    if(path==='/lesson-banks'&&method==='POST'){
      const lesson=blueprint.lessons.find(l=>l.key===input.lessonKey);
      if(!lesson||input.sourceConfirmed!==true||typeof input.passage!=='string'||input.passage.trim().length<20||input.passage.length>12000||!['易','中','難'].includes(input.difficulty))throw Error('請選南一高年級課次，提供20–12000字課文全文並確認來源與難度');
      if(typeof input.sourceLabel!=='string'||!input.sourceLabel.trim()||input.sourceLabel.length>300)throw Error('請填寫課文來源或檔名（300字內）');
      const bank={id:randomUUID(),lessonKey:lesson.key,title:`${lesson.grade}${lesson.term} ${lesson.title}・55題重編`,lesson:`南一 ${lesson.grade}${lesson.term} ${lesson.title}`,grade:lesson.grade,passage:input.passage.trim(),sourceLabel:input.sourceLabel.trim(),sourceHash:createHash('sha256').update(input.passage.trim()).digest('hex'),sourceConfirmed:true,difficulty:input.difficulty,questions:[],paperIds:[],className:'教師重編待審題庫',roster:[user.email],questionMode:'original',createdAt:new Date().toISOString()};
      // 先驗證教師收件身分，不把待審母題指派給學生。
      if(typeof user.email!=='string'||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(user.email))throw Error('教師帳號缺少有效Email');
      await store.create(`lesson-banks/${bank.id}.json`,bank);return summary(bank);
    }
    const match=path.match(/^\/lesson-banks\/([0-9a-f-]{36})\/next$/);
    if(!match||method!=='POST')return null;
    const key=`lesson-banks/${match[1]}.json`;
    if(running.has(key))throw Error('本課上一批仍在處理，請稍後重新整理');
    running.add(key);let old;
    try {
      old=await store.get(key);const bank=old.value,progress=quotaProgress(bank.questions);
      if(progress.complete)return summary(bank);
      const row=progress.rows.find(row=>row.actual<row.count);
      if(!row)throw Error('本課配額異常，請先核對');
      const batchIndex=bank.paperIds.length;
      const hash=createHash('sha256').update(`${bank.id}:${batchIndex}`).digest('hex');
      const paperId=`${hash.slice(0,8)}-${hash.slice(8,12)}-${hash.slice(12,16)}-${hash.slice(16,20)}-${hash.slice(20,32)}`;
      const paperKey=`quiz-papers/${paperId}.json`;
      let paper;
      try {paper=(await store.get(paperKey)).value;}catch(error){if(error.status!==404)throw error;}
      if(!paper){
        const output=await generate({...bank,count:5,categories:[row.category],questionPlan:[{category:row.category,count:5,difficulty:bank.difficulty}],priorQuestions:bank.questions.map(q=>({stem:q.stem,options:q.options}))});
        const quiz=validateBankBatch(bank,output.questions,row.category,validateQuiz);
        paper={...quiz,id:paperId,familyId:paperId,status:'draft',title:`${bank.title}・${row.category} ${row.actual+1}–${row.actual+5}`,bankId:bank.id,sourceKind:'lesson',sourceLabel:bank.sourceLabel,lessonKey:bank.lessonKey,generatedAt:new Date().toISOString(),aiCheck:output.aiCheck};
        try {await store.create(paperKey,paper);}catch(error){if(![409,412].includes(error.status))throw error;paper=(await store.get(paperKey)).value;}
      }
      // 上次若在建立題目後中斷，可沿用確定批次ID，避免重複付費及重複入庫。
      validateBankBatch(bank,paper.questions,row.category,validateQuiz);
      const next={...bank,questions:[...bank.questions,...paper.questions],paperIds:[...bank.paperIds,paperId],lastError:'',updatedAt:new Date().toISOString()};
      try {await store.update(key,next,old.generation);}catch(error){if(error.status!==412)throw error;return summary((await store.get(key)).value);}
      return summary(next);
    }catch(error){
      if(old){try{await store.update(key,{...old.value,lastError:String(error.message).slice(0,600)},old.generation);}catch{/* 不覆蓋另一請求已保存的新進度。 */}}
      throw error;
    }finally{running.delete(key);}
  };
}
