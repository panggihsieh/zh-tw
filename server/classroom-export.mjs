export async function exportCompetitionClassroom(room, ranking, input, fetcher=fetch, env=process.env) {
 const error=(status,message)=>Object.assign(new Error(message),{status});
 if(room.status!=='closed'||room.testRoom||!ranking.length||ranking.some(row=>row.gradingIndex!=null)){
  throw error(409,'請等正式課堂結束且評分完成後再匯出。');
 }
 if(input?.confirmed!==true)throw error(400,'請先確認匯出。');
 const revision=JSON.stringify(ranking.map(row=>[row.uid,row.rank,row.points,row.correct,row.index]));
 if(input.revision!==revision)throw error(409,'排名已更新，請重新預覽。');
 const {image,limitKB}=input;
 if(![20,50,100].includes(limitKB)||typeof image!=='string'||image.length>133360){
  throw error(400,'JPEG 圖片或容量上限不正確。');
 }
 const classId=JSON.parse(env.CLASSROOM_EXPORT_CLASSES||'{}')[room.classId];
 if(!env.CLASSROOM_EXPORT_TOKEN||!env.CLASSROOM_EXPORT_SCHOOL||!classId){
  throw error(409,'此班級尚未完成 School IAM 匯出設定。');
 }
 try{
  const response=await fetcher('https://school-iam.web.app/v1/classroom-records/import',{
   method:'POST',
   headers:{Authorization:'Bearer '+env.CLASSROOM_EXPORT_TOKEN,'Content-Type':'application/json'},
   signal:AbortSignal.timeout(15000),
   body:JSON.stringify({
    sourceProject:'zh-tw',sourceClassroomId:room.id,schoolId:env.CLASSROOM_EXPORT_SCHOOL,classId,
    title:room.title,closedAt:room.closedAt??room.expiresAt,
    ranking:ranking.map(row=>({rank:row.rank,name:row.name,score:row.points,answered:row.index})),
    image,limitKB,
   }),
  });
  if(response.ok)return await response.json();
  if(response.status===400||response.status===409)throw error(response.status,'School IAM 拒絕此紀錄，請檢查班級對應或重新預覽。');
  throw error(502,'School IAM 暫時無法接收，請稍後重試。');
 }catch(cause){
  if(cause.status)throw cause;
  throw error(502,'School IAM 連線失敗，可重送同一筆紀錄。');
 }
}
