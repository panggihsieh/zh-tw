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
   let correct,reason='答錯',response=history?.response,points=history?.points??sentence?.points??null,feedback='';
   if(type==='sentence-practice'){
    const grade=sentence?.grade;
    if(!grade||grade.uncertain||!Number.isFinite(grade.total)){summary.pending++;continue;}
    if(typeof grade.targetOk!=='boolean'||typeof grade.meaningOk!=='boolean'){summary.missingHistory++;continue;}
    response=sentence.sentence;feedback=grade.feedback||'';
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
   wrongAnswers.push({uid:participant.uid,name:participant.name,seat:participant.seat??null,response,points,reason,feedback});
  }
  summary.wrongAnswers+=wrongAnswers.length;
  return wrongAnswers.length?[{questionIndex,question,wrongAnswers}]:[];
 });
 return {questions,summary};
}
