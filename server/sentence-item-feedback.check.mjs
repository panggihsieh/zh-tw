import test from 'node:test';import assert from 'node:assert/strict';
import {itemFeedbackInstruction,validateItemFeedback} from './sentence-item-feedback.mjs';
import {gradePractice} from './sentence-api.mjs';import {RUBRIC_ITEMS,gradeRubric,rubricInstruction,validateRubric} from './sentence-rubric.mjs';
const items=RUBRIC_ITEMS.slice(0,5),sentence='媽媽藉由手機聯絡朋友。';
const feedback=()=>Object.fromEntries(items.map(item=>[item.key,{reason:`「媽媽」這句在${item.label}仍可補充具體內容。`,suggestion:'在「聯絡朋友」後補上聯絡的目的。',quote:'聯絡朋友'}]));
test('每項必須有個別原因與建議，拒絕漏項、過長與非原句引用',()=>{
 const valid=feedback();assert.equal(Object.keys(validateItemFeedback(items,valid,sentence,{required:true})).length,5);
 assert.throws(()=>validateItemFeedback(items,undefined,sentence,{required:true}));
 for(const change of [v=>delete v.mechanics,v=>v.detail.suggestion='',v=>v.detail.reason='字'.repeat(161),v=>v.detail.quote='不存在的文字']){const value=feedback();change(value);assert.throws(()=>validateItemFeedback(items,value,sentence,{required:true}));}
 assert.deepEqual(validateItemFeedback(items,undefined,sentence),{});
});
test('提示要求個別回饋和滿分說明，固定與自訂配分均保留回饋、不改分數',()=>{
 assert.match(itemFeedbackInstruction(items),/不能只複述評分標準/);assert.match(itemFeedbackInstruction(items),/滿分/);
 const analysis={targetOk:true,meaningOk:true,uncertain:false,feedback:'測試總評',correctness:20,completeness:15,fluency:15,detail:15,mechanics:5,itemFeedback:feedback()};
 const old=gradePractice(sentence,'藉',{...analysis,itemFeedback:undefined}),current=gradePractice(sentence,'藉',analysis);
 assert.deepEqual(current.scores,old.scores);assert.equal(current.total,old.total);assert.deepEqual(current.itemFeedback,feedback());
 const rubric=validateRubric([{key:'correctness',points:40},{key:'person',points:20},{key:'custom',points:40,rule:'寫出聯絡目的'}]);
 const customFeedback=Object.fromEntries(rubric.map(item=>[item.key,{reason:'原句只寫出聯絡朋友，沒有交代原因。',suggestion:'補上與朋友約定的事情，保留原意。',quote:'聯絡朋友'}]));
 const grade=gradeRubric(sentence,'藉',rubric,{targetOk:true,meaningOk:true,uncertain:false,feedback:'測試總評',scores:{correctness:20,custom:10},evidence:{person:'媽媽'},itemFeedback:customFeedback});
 assert.equal(grade.total,50);assert.equal(grade.rubric[1].score,20);assert.deepEqual(grade.itemFeedback,customFeedback);assert.match(rubricInstruction(rubric),/itemFeedback/);
});
