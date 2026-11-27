import { RUBRIC_ITEMS } from './sentence-rubric.mjs';
// Reports use persisted answers only. Missing history and pending AI grades are not mistakes.
export function competitionMistakes(room, participants) {
 const summary={missingHistory:0,unanswered:0,pending:0,wrongAnswers:0};
 const questions=room.questions.flatMap((question,questionIndex)=>{
  const wrongAnswers=[];
  for(const participant of participants){
   const history=(participant.answerHistory||[]).find(answer=>answer.questionIndex===questionIndex);
   const sentence=(participant.sentenceAnswers||[]).find(answer=>answer.questionIndex===questionIndex);
   if(!history&&!sentence){summary[questionIndex<(participant.index||0)?'missingHistory':'unanswered']++;continue;}
   const type=question.type||room.gameType;
   let sentenceDetails;
   let correct,reason='答錯',response=history?.response,points=history?.points??sentence?.points??null,feedback='';
   if(type==='sentence-practice'){
    const grade=sentence?.grade;
    if(!grade||grade.uncertain||!Number.isFinite(grade.total)){summary.pending++;continue;}
    if(typeof grade.targetOk!=='boolean'||typeof grade.meaningOk!=='boolean'){summary.missingHistory++;continue;}
    response=sentence.sentence;feedback=grade.feedback||'';
    const snapshot=Array.isArray(grade.rubric)&&grade.rubric.length?grade.rubric:null;
    const rubric=snapshot||(Array.isArray(room.rubric)&&room.rubric.length?room.rubric:RUBRIC_ITEMS.slice(0,5));
    sentenceDetails={qualityScore:grade.total,competitionMaximum:100*(room.sentenceScoreScale??10),timedOut:history?.timedOut===true||sentence.timedOut===true,targetOk:grade.targetOk,meaningOk:grade.meaningOk,
     items:rubric.map(item=>{
      const savedScore=snapshot?item.score:grade.scores?.[item.key];
      const definition=RUBRIC_ITEMS.find(base=>base.key===item.key);
      const roomItem=room.rubric?.find(base=>base.key===item.key);
      return {key:item.key,label:item.label||definition?.label||item.key,points:Number.isFinite(item.points)?item.points:null,score:Number.isFinite(savedScore)?savedScore:null,
       evidence:typeof item.evidence==='string'?item.evidence:'',criterion:item.rule||roomItem?.rule||definition?.hint||''};
     })};
    correct=grade.targetOk&&grade.meaningOk&&grade.total>=50;
    if(correct&&(history?.timedOut||sentence.timedOut)){correct=false;reason='逾時';}
   }else if(typeof history?.correct==='boolean'){
    correct=history.correct;
    if(history.timedOut)reason='逾時';
   }else if(Number.isInteger(history?.response)&&Number.isInteger(question.answer)){
    correct=history.response===question.answer;
    if(correct&&history.points===0){correct=false;reason='答案正確但未得分（舊紀錄未保存是否逾時）';}
   }else{summary.missingHistory++;continue;}
   if(correct)continue;
   wrongAnswers.push({uid:participant.uid,name:participant.name,seat:participant.seat??null,response,points,reason,feedback,...(sentenceDetails?{sentenceDetails}:{})});
  }
  summary.wrongAnswers+=wrongAnswers.length;
  return wrongAnswers.length?[{questionIndex,question,wrongAnswers}]:[];
 });
 return {questions,summary};
}
