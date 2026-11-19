import test from 'node:test';
import assert from 'node:assert/strict';
import {sentenceReview} from './competition-sentence-review.mjs';
test('逐字分組保留同分、區分逾時與品質，待確認及舊資料不誤列最低分',()=>{
 const room={questions:[{character:'春'},{character:'夏'},{character:'春'}]};
 const a=(questionIndex,total,extra={})=>({questionIndex,character:room.questions[questionIndex].character,sentence:'虛構測試句',points:0,grade:{total,feedback:'測試評語',scores:{correctness:30},uncertain:false},...extra});
 const report=sentenceReview(room,[{name:'測試甲',index:3,sentenceAnswers:[a(0,90,{timedOut:true}),a(1,40),a(2,20)]},{name:'測試乙',index:2,sentenceAnswers:[a(0,90),a(1,null,{grade:{total:null,uncertain:true,feedback:'待確認',scores:{}}})]},{name:'舊資料測試',index:1}]);
 assert.equal(report.groups.length,2);
 assert.equal(report.groups[0].highest.length,2);
 assert.equal(report.groups[0].highest[0].timedOut,true);
 assert.equal(report.groups[0].lowest[0].qualityScore,20);
 assert.equal(report.groups[0].missingHistory,1);
 assert.equal(report.groups[0].unanswered,2);
 assert.equal(report.groups[1].pending.length,1);
 assert.equal(report.groups[1].lowest[0].qualityScore,40);
});
