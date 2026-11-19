// Only use persisted AI grades; never generate explanations from class rankings.
export function sentenceReview(room, participants) {
 const groups=[...new Set(room.questions.map(q=>q.character))].map(character=>{
  const indexes=room.questions.flatMap((q,i)=>q.character===character?[i]:[]);
  const answers=participants.flatMap(p=>(p.sentenceAnswers||[]).filter(a=>indexes.includes(a.questionIndex)&&a.character===character).map(a=>({
   questionIndex:a.questionIndex,name:p.name,seat:p.seat||null,sentence:a.sentence,points:a.points,
   qualityScore:a.grade.total,feedback:a.grade.feedback,issueReason:a.grade.issueReason||'',scores:a.grade.scores,
   timedOut:a.timedOut,uncertain:a.grade.uncertain,
  })));
  const scored=answers.filter(a=>Number.isFinite(a.qualityScore)&&!a.uncertain);
  const high=scored.length?Math.max(...scored.map(a=>a.qualityScore)):null;
  const low=scored.length?Math.min(...scored.map(a=>a.qualityScore)):null;
  return {character,count:answers.length,pending:answers.filter(a=>a.uncertain||a.qualityScore==null),
   highest:scored.filter(a=>a.qualityScore===high),lowest:scored.filter(a=>a.qualityScore===low),
   missingHistory:participants.reduce((n,p)=>n+indexes.filter(i=>i<p.index&&!(p.sentenceAnswers||[]).some(a=>a.questionIndex===i)).length,0),
   unanswered:participants.reduce((n,p)=>n+indexes.filter(i=>i>=p.index).length,0)};
 });
 return {groups};
}
