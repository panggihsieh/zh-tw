import test from 'node:test';import assert from 'node:assert/strict';import http from 'node:http';import {once} from 'node:events';
import {createQuizHandler} from './quiz-api.mjs';import {blueprint,quotaProgress,duplicateQuestionIssue} from './quiz-lesson-bank.mjs';
test('固定55題、45課；來源確認、權限、分批、失敗恢復與完整配額',async t=>{
 const db=new Map();let duplicate=false,paid=0,failBankUpdate=false;
 const store={list:async prefix=>({names:[...db.keys()].filter(k=>k.startsWith(prefix))}),get:async key=>{if(!db.has(key))throw Object.assign(Error('missing'),{status:404});return structuredClone(db.get(key));},create:async(key,value)=>{if(db.has(key))throw Object.assign(Error('exists'),{status:412});db.set(key,{value:structuredClone(value),generation:1});},update:async(key,value,generation)=>{if(failBankUpdate&&key.startsWith('lesson-banks/')&&value.paperIds.length>db.get(key).value.paperIds.length){failBankUpdate=false;throw Error('模擬建立題目後連線中斷');}if(db.get(key).generation!==generation)throw Object.assign(Error('conflict'),{status:412});db.set(key,{value:structuredClone(value),generation:generation+1});}};
 const handler=createQuizHandler({store,origins:['https://test'],authenticate:async req=>({uid:'test',admin:req.headers['x-user']!=='student',email:'teacher@example.com'}),generate:async v=>{paid++;return {questions:Array.from({length:5},(_,i)=>({category:v.categories[0],difficulty:v.difficulty,stem:duplicate?v.priorQuestions[0].stem:`虛構測試第${v.priorQuestions.length+i+1}題？`,variants:[`虛構測試改寫甲${v.priorQuestions.length+i+1}？`,`虛構測試改寫乙${v.priorQuestions.length+i+1}？`],options:['這是測試選項第一句。','這是測試選項第二句。','這是測試選項第三句。','這是測試選項第四句。'],answer:0,explanation:'虛構測試解析，不供學生作答。',evidence:v.passage}))};}});
 const server=http.createServer(handler).listen(0,'127.0.0.1');await once(server,'listening');t.after(()=>server.close());
 const call=async(path,body,user='teacher')=>{const r=await fetch(`http://127.0.0.1:${server.address().port}/api/structure/quiz${path}`,{method:body?'POST':'GET',headers:{Origin:'https://test','X-Notebook-Request':'quiz','Content-Type':'application/json','x-user':user},body:body?JSON.stringify(body):undefined});return {status:r.status,data:await r.json()};};
 assert.equal(blueprint.lessons.length,45);assert.equal(blueprint.plan.reduce((n,r)=>n+r.count,0),55);
 assert.equal((await call('/lesson-banks',undefined,'student')).status,403);
 assert.equal((await call('/quiz-sources',undefined,'student')).status,403);
 assert.equal((await call('/quiz-sources/import',{},'student')).status,403);
 const source={lessonKey:blueprint.lessons[0].key,passage:'這是明確標記的虛構課文測試資料。'.repeat(8),sourceConfirmed:true,sourceLabel:'虛構測試全文',difficulty:'中'};
 assert.equal((await call('/lesson-banks',{...source,sourceConfirmed:false})).status,400);assert.equal(paid,0);
 const bank=(await call('/lesson-banks',source)).data;assert.equal(bank.total,0);assert.equal(paid,0);
 const path=`/lesson-banks/${bank.id}/next`;
 assert.equal((await call(path,{})).data.total,5);
 duplicate=true;assert.equal((await call(path,{})).status,400);assert.equal((await call('/lesson-banks')).data.items[0].total,5);duplicate=false;
 failBankUpdate=true;assert.equal((await call(path,{})).status,400);const paidBeforeResume=paid;assert.equal((await call(path,{})).data.total,10);assert.equal(paid,paidBeforeResume,'沿用已建立批次，恢復時不重複付費');
 let result;for(let i=0;i<9;i++){result=await call(path,{});assert.equal(result.status,200,JSON.stringify(result.data));}
 assert.equal(result.data.total,55);assert.equal(result.data.complete,true);assert.deepEqual(result.data.rows.map(r=>r.actual),[10,15,15,5,5,5]);assert.equal(result.data.paperIds.length,11);
 const sourceId='a'.repeat(64);db.set(`quiz-sources/${sourceId}.json`,{value:{filename:'合成教材.txt',lessons:[{lessonKey:source.lessonKey,passage:source.passage}]},generation:1});
 const selected=(await call('/lesson-banks',{...source,sourceId,passage:'這段未採用，必須沿用私有教材庫原文。',categories:['成語'],outputTitle:'自訂測試題庫',outputFormat:'cloud-json'})).data;
 assert.equal(selected.title,'自訂測試題庫');assert.equal(db.get(`lesson-banks/${selected.id}.json`).value.passage,source.passage);
 const selectedPath=`/lesson-banks/${selected.id}/next`;
 const selectedBatch=await call(selectedPath,{categories:['成語']});assert.equal(selectedBatch.data.total,5);assert.equal(selectedBatch.data.selectionComplete,true);assert.equal(selectedBatch.data.complete,false);
 const paidBeforeSelection=paid;assert.equal((await call(selectedPath,{categories:['成語']})).data.selectionComplete,true);assert.equal(paid,paidBeforeSelection);
 const exported=await call(`/lesson-banks/${selected.id}/export`);assert.equal(exported.data.questions.length,5);assert.equal(exported.data.status,'teacher-review-required');assert.equal(exported.data.roster,undefined);assert.equal(exported.data.passage,undefined);
 const before=paid;assert.equal((await call(path,{})).data.complete,true);assert.equal(paid,before,'配額完成後不得再次呼叫模型');
 const saved=[...db.values()].filter(r=>r.value.bankId);assert.equal(saved.length,12);assert.ok(saved.every(r=>r.value.status==='draft'&&r.value.questions.every(q=>!q.reviewed)));assert.equal(quotaProgress([]).complete,false);
});

test('去重以題幹及選項一起核對，同義改寫不算新母題；不同考點選項可保留',()=>{
 const q={stem:'以下哪項正確？',variants:['正確的是哪一項？','何者正確？'],options:['甲','乙','丙','丁']};
 assert.ok(duplicateQuestionIssue([q],[{...q,stem:q.variants[0]}]));
 assert.ok(duplicateQuestionIssue([q],[{...q,options:['丁','丙','乙','甲']}]));
 assert.equal(duplicateQuestionIssue([q],[{...q,options:['新甲','新乙','新丙','新丁']}]),'');
});
