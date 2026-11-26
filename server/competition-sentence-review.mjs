// Only use persisted AI grades; never generate explanations from class rankings.
export function sentenceReview(room, participants) {
 const classParticipants=[...participants,...(room.loginMode==='anonymous'?[]:(room.students||[]).filter(student=>!participants.some(participant=>participant.seat===student.seat)).map(student=>({uid:`absent-seat-${student.seat}`,name:student.name,seat:student.seat,index:0})))];
 const groups=[...new Set(room.questions.map(q=>q.character))].map(character=>{
  const indexes=room.questions.flatMap((q,i)=>q.character===character?[i]:[]);
  const answers=participants.flatMap(p=>(p.sentenceAnswers||[]).filter(a=>indexes.includes(a.questionIndex)&&a.character===character).map(a=>({
   questionIndex:a.questionIndex,name:p.name,seat:p.seat||null,sentence:a.sentence,points:a.points,
   qualityScore:a.grade.total,feedback:a.grade.feedback,issueReason:a.grade.issueReason||'',scores:a.grade.scores,...(a.grade.rubric?{rubric:a.grade.rubric.map(({label,points,score,evidence})=>({label,points,score,evidence}))}:{}),
   timedOut:a.timedOut,uncertain:a.grade.uncertain,
  })));
  const scored=answers.filter(a=>Number.isFinite(a.qualityScore)&&!a.uncertain);
  const high=scored.length?Math.max(...scored.map(a=>a.qualityScore)):null;
  const low=scored.length?Math.min(...scored.map(a=>a.qualityScore)):null;
  return {character,count:answers.length,pending:answers.filter(a=>a.uncertain||a.qualityScore==null),
   highest:scored.filter(a=>a.qualityScore===high),lowest:scored.filter(a=>a.qualityScore===low),
   missingHistory:participants.reduce((n,p)=>n+indexes.filter(i=>i<p.index&&!(p.sentenceAnswers||[]).some(a=>a.questionIndex===i)).length,0),
   unanswered:classParticipants.reduce((n,p)=>n+indexes.filter(i=>i>=p.index).length,0)};
 });
 const questions=room.questions.map((question,questionIndex)=>({
  questionIndex,character:question.character,reading:question.reading||'',prompt:question.prompt||'',
  rows:[...classParticipants].sort((a,b)=>(a.seat||9999)-(b.seat||9999)||String(a.name).localeCompare(String(b.name),'zh-Hant')).map(participant=>{
   const answer=(participant.sentenceAnswers||[]).find(item=>item.questionIndex===questionIndex&&item.character===question.character);
   const base={id:`${questionIndex}:${participant.uid}`,name:participant.name,seat:participant.seat||null};
   if(!answer)return {...base,status:questionIndex<participant.index?'missing-history':'unanswered'};
   const grade=answer.grade||{};
   const quotedWord=(value,sentence)=>typeof value==='string'&&/^[\p{Script=Han}]{2,8}$/u.test(value)&&value.includes(question.character)&&sentence.includes(value)?value:'';
   const polished=typeof grade.polished==='string'&&grade.polished.length<=400&&grade.polished.includes(question.character)?grade.polished:'';
   return {...base,status:grade.uncertain||!Number.isFinite(grade.total)?'pending':'graded',
    sentence:answer.sentence,word:quotedWord(grade.targetWord,answer.sentence)||quotedWord(question.phrase,answer.sentence),
    polished,suggestedWord:quotedWord(grade.suggestedWord,polished),
    qualityScore:Number.isFinite(grade.total)?grade.total:null,points:answer.points,competitionMaximum:100*(room.sentenceScoreScale??10),timedOut:answer.timedOut===true,
    targetOk:grade.targetOk,feedback:grade.feedback||'',issueReason:grade.issueReason||'',
    items:grade.rubric?.map(({key,label,points,score,evidence})=>({key,label,points,score,evidence:evidence||''}))||[
     ['correctness','用詞正確',30],['completeness','句意完整',20],['fluency','語句通順',20],['detail','內容具體',20],['mechanics','文字標點',10],
    ].map(([key,label,points])=>({key,label,points,score:Number.isFinite(grade.scores?.[key])?grade.scores[key]:null,evidence:''})),
   };
  }),
 }));
 return {groups,questions};
}
