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

test('教師報表含每題每位學生，重複生字不合併，保留未答、待確認與缺漏歷史', () => {
 const room={questions:[{character:'灘',phrase:'灘'},{character:'灘',phrase:'海灘'},{character:'林',phrase:'林'}],students:[{seat:1,name:'示例小安'},{seat:2,name:'示例小晴'},{seat:3,name:'示例未加入'}]};
 const participants=[{uid:'sample-1',seat:1,name:'示例小安',index:2,sentenceAnswers:[{questionIndex:0,character:'灘',sentence:'我在海灘玩。',points:0,timedOut:true,grade:{total:75,scores:{correctness:25},targetWord:'海灘',suggestedWord:'海灘',polished:'我在美麗的海灘玩。',feedback:'可增加細節。'}}]},
 {uid:'sample-2',seat:2,name:'示例小晴',index:1,sentenceAnswers:[{questionIndex:0,character:'灘',sentence:'海灘。',points:0,grade:{total:null,uncertain:true,rubric:[{key:'custom',label:'老師規則',points:100,score:25,evidence:'海灘'}]}}]}];
 const before=JSON.stringify(participants), report=sentenceReview(room,participants);
 assert.equal(report.questions.length,3);assert.equal(report.questions[0].rows.length,3);
 const row=report.questions[0].rows[0];
 assert.equal(row.word,'海灘');assert.equal(row.polished,'我在美麗的海灘玩。');assert.equal(row.qualityScore,75);assert.equal(row.points,0);assert.equal(row.timedOut,true);
 assert.equal(row.items[0].points,30);assert.equal(row.items[0].score,25);
 assert.equal(report.questions[0].rows[1].status,'pending');assert.equal(report.questions[0].rows[1].items[0].points,100);
 assert.equal(report.questions[1].rows[0].status,'missing-history');
 assert.equal(report.questions[1].rows[1].status,'unanswered');
 assert.equal(report.questions[0].rows[2].status,'unanswered');assert.equal('qualityScore' in report.questions[0].rows[2],false);
 assert.equal(report.questions[2].rows[0].status,'unanswered');
 assert.equal(JSON.stringify(participants),before);
});

test('AI 引用語詞須包含指定字且實際存在，舊紀錄不虛構建議句', () => {
 const report=sentenceReview({questions:[{character:'灘',phrase:'灘'}]},[{uid:'sample',name:'示例小安',index:1,sentenceAnswers:[{questionIndex:0,character:'灘',sentence:'海灘。',points:1,grade:{total:50,scores:{},targetWord:'沙灘',suggestedWord:'沙灘'}}]}]);
 const row=report.questions[0].rows[0];assert.equal(row.word,'');assert.equal(row.polished,'');assert.equal(row.suggestedWord,'');
});
