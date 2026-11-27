import test from 'node:test';
import assert from 'node:assert/strict';
import {competitionMistakes} from './competition-mistakes.mjs';
test('四選一區分錯答、逾時、未答與舊資料；不看總分猜錯題',()=>{
 const room={gameType:'quiz',questions:[{prompt:'甲',options:['一','二'],answer:0},{prompt:'乙',options:['一','二'],answer:1}]};
 const result=competitionMistakes(room,[{uid:'a',name:'測試甲',index:2,points:0,answerHistory:[{questionIndex:0,response:1,points:0},{questionIndex:1,response:1,points:0,correct:false,timedOut:true}]},{uid:'b',name:'測試乙',index:1,answerHistory:[]}]);
 assert.equal(result.questions.length,2);assert.equal(result.questions[0].wrongAnswers[0].reason,'答錯');assert.equal(result.questions[1].wrongAnswers[0].reason,'逾時');assert.equal(result.summary.missingHistory,1);assert.equal(result.summary.unanswered,1);
});
test('書寫只使用已保存對錯；舊紀錄沒有判定不猜測',()=>{
 const room={gameType:'writing',questions:[{type:'writing',character:'一',prompt:'寫一'}]};
 const result=competitionMistakes(room,[{uid:'a',index:1,answerHistory:[{questionIndex:0,response:'已送出',correct:false,points:0}]},{uid:'b',index:1,answerHistory:[{questionIndex:0,response:'已送出',points:0}]}]);
 assert.equal(result.summary.wrongAnswers,1);assert.equal(result.summary.missingHistory,1);
});
test('造句保留當次評語，待確認不當錯題，逾時和品質分開',()=>{
 const room={gameType:'sentence-practice',questions:[{type:'sentence-practice',character:'一'}]};
 const answer=grade=>({questionIndex:0,sentence:'我一起旅行',points:0,grade});const grade={total:40,targetOk:true,meaningOk:true,uncertain:false,feedback:'測試評語'};
 const result=competitionMistakes(room,[{uid:'wrong',sentenceAnswers:[answer(grade)]},{uid:'pending',sentenceAnswers:[answer({...grade,uncertain:true})]},{uid:'ok',sentenceAnswers:[answer({...grade,total:80})]},{uid:'timeout',sentenceAnswers:[{...answer({...grade,total:80}),timedOut:true}]},{uid:'old',sentenceAnswers:[answer({total:80})]}]);
 assert.equal(result.summary.wrongAnswers,2);assert.equal(result.summary.pending,1);assert.equal(result.summary.missingHistory,1);assert.equal(result.questions[0].wrongAnswers[0].feedback,'測試評語');assert.equal(result.questions[0].wrongAnswers[1].reason,'逾時');
});

test('錯題明細優先採作答快照，保留自訂項目、零分與個別依據，不套用後續配分',()=>{
 const grade={total:40,targetOk:true,meaningOk:true,uncertain:false,feedback:'當次評語',rubric:[{key:'correctness',label:'用詞正確',points:20,score:10,evidence:''},{key:'person',label:'人',points:30,score:0,evidence:''},{key:'custom',label:'老師自訂',points:50,score:30,evidence:'覺得開心',rule:'寫出感受'}]};
 const room={gameType:'sentence-practice',sentenceScoreScale:10,rubric:[{key:'correctness',points:99},{key:'custom',points:1,rule:'不同規則'}],questions:[{type:'sentence-practice',character:'一'}]};
 const original=structuredClone(grade);
 const result=competitionMistakes(room,[{uid:'test',name:'虛構學生',sentenceAnswers:[{questionIndex:0,sentence:'我和家人一起旅行，覺得開心。',points:400,grade}]}]);
 const detail=result.questions[0].wrongAnswers[0].sentenceDetails;
 assert.equal(detail.qualityScore,40);assert.equal(detail.competitionMaximum,1000);assert.equal(detail.items.length,3);
 assert.deepEqual(detail.items.map(item=>[item.key,item.score,item.points]),[['correctness',10,20],['person',0,30],['custom',30,50]]);
 assert.equal(detail.items[2].criterion,'寫出感受');assert.equal(detail.items[2].evidence,'覺得開心');assert.deepEqual(grade,original);
});

test('舊五項評分完整列出，缺漏不是零分，逾時不清空原品質與項目分數',()=>{
 const room={gameType:'sentence-practice',sentenceScoreScale:1,questions:[{type:'sentence-practice',character:'一'}]};
 const grade={total:85,targetOk:true,meaningOk:true,uncertain:false,scores:{correctness:25,completeness:20,fluency:20,detail:20}};
 const result=competitionMistakes(room,[{uid:'timeout',sentenceAnswers:[{questionIndex:0,sentence:'一起旅行。',points:0,timedOut:true,grade}]}]);
 const detail=result.questions[0].wrongAnswers[0].sentenceDetails;
 assert.equal(detail.qualityScore,85);assert.equal(detail.competitionMaximum,100);assert.equal(detail.timedOut,true);assert.equal(detail.items.length,5);
 assert.equal(detail.items[0].score,25);assert.equal(detail.items[0].points,30);assert.equal(detail.items[4].score,null);assert.equal(detail.items[4].points,10);
});
