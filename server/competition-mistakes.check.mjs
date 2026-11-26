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
