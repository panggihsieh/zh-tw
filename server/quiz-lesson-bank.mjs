import {createHash, randomUUID} from 'node:crypto';
import blueprint from './quiz-blueprint.json' with {type:'json'};

export {blueprint};
export function quotaProgress(questions=[]) {
  const rows=blueprint.plan.map(row=>({...row,actual:questions.filter(q=>q.category===row.category).length}));
  return {rows,total:questions.length,complete:rows.every(row=>row.actual===row.count)&&questions.length===blueprint.total};
}
const fingerprints=q=>{
  const normalize=s=>String(s).normalize('NFC').replace(/[\s\p{P}]/gu,'');
  const options=(q.options||[]).map(normalize).sort().join('|');
  return [q.stem,...(q.variants||[])].map(stem=>normalize(stem)+'::'+options);
};
export function duplicateQuestionIssue(previous,questions) {
  const seen=new Set(previous.flatMap(fingerprints));
  for(const [index,q]of questions.entries()){
    const keys=fingerprints(q);if(keys.some(key=>seen.has(key)))return `第${index+1}題與既有母題或同義改寫重複，請換用尚未出過的課文字詞或考點：${q.stem}`;
    keys.forEach(key=>seen.add(key));
  }
  return '';
}
export function validateBankBatch(bank, questions, category, validateQuiz) {
  if(!Array.isArray(questions)||questions.length!==blueprint.batchSize||questions.some(q=>q.category!==category||q.difficulty!==bank.difficulty))throw Error('本批題型、難度或題數不符，未入庫');
  if(category==='標點符號'&&questions.some(q=>!Array.isArray(q.options)||q.options.some(v=>(String(v).match(/\p{Script=Han}/gu)||[]).length<6)))throw Error('標點選項須為完整敘述，不接受符號碎片');
  const duplicate=duplicateQuestionIssue(bank.questions,questions);if(duplicate)throw Error(duplicate+'；本批未入庫');
  return validateQuiz({...bank,questions:questions.map(q=>({...q,id:randomUUID(),reviewed:false}))});
}
export function makeLessonBankHandlers({store,scan,generate,validateQuiz}) {
  const running=new Set();
  const selectedCategories = input => {
    const categories=input??blueprint.plan.map(r=>r.category);
    if(!Array.isArray(categories)||!categories.length||new Set(categories).size!==categories.length||categories.some(c=>!blueprint.plan.some(r=>r.category===c)))throw Error('請至少選擇一種有效題型');
    return categories;
  };
  const summary=bank=>({id:bank.id,lessonKey:bank.lessonKey,lesson:bank.lesson,title:bank.title,createdAt:bank.createdAt,difficulty:bank.difficulty,paperIds:bank.paperIds,categories:bank.categories||blueprint.plan.map(r=>r.category),sourceId:bank.sourceId,outputFormat:bank.outputFormat||'cloud',selectionComplete:quotaProgress(bank.questions).rows.filter(r=>(bank.categories||blueprint.plan.map(x=>x.category)).includes(r.category)).every(r=>r.actual===r.count),lastError:bank.lastError||'',...quotaProgress(bank.questions)});
  return async(path,method,input,user)=>{
    if(path==='/lesson-banks'&&method==='GET')return {blueprint,items:(await scan('lesson-banks/')).map(summary)};
    if(path==='/lesson-banks'&&method==='POST'){
      const lesson=blueprint.lessons.find(l=>l.key===input.lessonKey);
      const categories=selectedCategories(input.categories);
      if(input.sourceId){
        if(!/^[0-9a-f]{64}$/.test(input.sourceId))throw Error('教材識別碼無效');
        const source=(await store.get(`quiz-sources/${input.sourceId}.json`)).value;
        const found=source.lessons.find(l=>l.lessonKey===input.lessonKey);if(!found)throw Error('所選教材不包含這一課');
        input={...input,passage:found.passage,sourceLabel:source.filename};
      }
      if(input.outputTitle!==undefined&&(typeof input.outputTitle!=='string'||input.outputTitle.trim().length>100))throw Error('題庫名稱最多100字');
      if(input.outputFormat!==undefined&&!['cloud','cloud-json'].includes(input.outputFormat))throw Error('輸出格式不符');
      if(!lesson||input.sourceConfirmed!==true||typeof input.passage!=='string'||input.passage.trim().length<20||input.passage.length>12000||!['易','中','難'].includes(input.difficulty))throw Error('請選南一高年級課次，提供20–12000字課文全文並確認來源與難度');
      if(typeof input.sourceLabel!=='string'||!input.sourceLabel.trim()||input.sourceLabel.length>300)throw Error('請填寫課文來源或檔名（300字內）');
      const bank={id:randomUUID(),categories,outputFormat:input.outputFormat||'cloud',...(input.sourceId?{sourceId:input.sourceId}:{}),lessonKey:lesson.key,title:input.outputTitle?.trim()||`${lesson.grade}${lesson.term} ${lesson.title}・55題重編`,lesson:`南一 ${lesson.grade}${lesson.term} ${lesson.title}`,grade:lesson.grade,passage:input.passage.trim(),sourceLabel:input.sourceLabel.trim(),sourceHash:createHash('sha256').update(input.passage.trim()).digest('hex'),sourceConfirmed:true,difficulty:input.difficulty,questions:[],paperIds:[],className:'教師重編待審題庫',roster:[user.email],questionMode:'original',createdAt:new Date().toISOString()};
      // 先驗證教師收件身分，不把待審母題指派給學生。
      if(typeof user.email!=='string'||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(user.email))throw Error('教師帳號缺少有效Email');
      await store.create(`lesson-banks/${bank.id}.json`,bank);return summary(bank);
    }
    const exportMatch=path.match(/^\/lesson-banks\/([0-9a-f-]{36})\/export$/);
    if(exportMatch&&method==='GET'){
      const bank=(await store.get(`lesson-banks/${exportMatch[1]}.json`)).value;
      return {schemaVersion:1,title:bank.title,lesson:bank.lesson,sourceLabel:bank.sourceLabel,sourceId:bank.sourceId,exportedAt:new Date().toISOString(),status:'teacher-review-required',quota:quotaProgress(bank.questions),questions:bank.questions};
    }
    const match=path.match(/^\/lesson-banks\/([0-9a-f-]{36})\/next$/);
    if(!match||method!=='POST')return null;
    const key=`lesson-banks/${match[1]}.json`;
    if(running.has(key))throw Error('本課上一批仍在處理，請稍後重新整理');
    running.add(key);let old;
    try {
      old=await store.get(key);const bank={...old.value,categories:selectedCategories(input.categories??old.value.categories)},progress=quotaProgress(bank.questions);
      if(progress.complete)return summary(bank);
      const row=progress.rows.find(row=>bank.categories.includes(row.category)&&row.actual<row.count);
      if(!row)return summary(bank);
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
