import { useEffect, useState } from 'react';
import { competitionRequest, type CompetitionQuestion, type CompetitionRoom } from './competitionApi';
import './classroomRecords.css';
import './competitionSentenceStatistics.css';

interface MistakeAnswer { uid:string; name:string; seat:number|null; response?:string|number; points:number|null; reason:string; feedback:string }
interface MistakeQuestion { questionIndex:number; question:CompetitionQuestion; wrongAnswers:MistakeAnswer[] }
interface MistakeReport { room:CompetitionRoom; questions:MistakeQuestion[]; summary:{wrongAnswers:number;missingHistory:number;unanswered:number;pending:number} }
const labels={quiz:'四選一競賽',structure:'字體結構',writing:'筆順書寫','sentence-practice':'生字造詞'};
function answerText(question:CompetitionQuestion,response?:string|number){
 return typeof response==='number'?`${String.fromCharCode(65+response)}．${question.options?.[response]??'未保存選項'}`:response||'未保存回答';
}
export default function CompetitionMistakeReview({request=competitionRequest,onOpenCompetition}:{request?:typeof competitionRequest;onOpenCompetition:()=>void}){
 const [rooms,setRooms]=useState<CompetitionRoom[]>([]),[roomId,setRoomId]=useState('');
 const [report,setReport]=useState<MistakeReport|null>(null),[selected,setSelected]=useState<number[]>([]),[title,setTitle]=useState('');
 const [listError,setListError]=useState(''),[error,setError]=useState(''),[loading,setLoading]=useState(true),[listLoading,setListLoading]=useState(true),[busy,setBusy]=useState(false);
 const [listReload,setListReload]=useState(0),[reload,setReload]=useState(0),[created,setCreated]=useState<CompetitionRoom|null>(null);
 const current=report?.room.id===roomId?report:null;
 useEffect(()=>{
  let active=true;setListLoading(true);setListError('');
  void request<{items:CompetitionRoom[]}>('/mistake-rooms').then(({items})=>{if(active){setRooms(items);setRoomId(previous=>items.some(room=>room.id===previous)?previous:items[0]?.id??'');}}).catch(error=>{if(active)setListError(error.message);}).finally(()=>{if(active)setListLoading(false);});
  return()=>{active=false;};
 },[request,listReload]);
 useEffect(()=>{
  let active=true;setReport(null);setSelected([]);setError('');setCreated(null);setTitle('');
  if(!roomId){setLoading(false);return;}
  setLoading(true);
  void request<MistakeReport>(`/rooms/${roomId}/mistake-review`).then(value=>{if(active){setReport(value);setTitle(`${value.room.title.slice(0,90)}・錯題複習`);}}).catch(error=>{if(active)setError(error.message);}).finally(()=>{if(active)setLoading(false);});
  return()=>{active=false;};
 },[roomId,request,reload]);
 async function create(){
  if(!current||busy||!selected.length)return;
  setBusy(true);setError('');setCreated(null);
  try{const result=await request<{room:CompetitionRoom}>(`/rooms/${roomId}/mistake-practice`,{questionIndexes:selected,title:title.trim()});setCreated(result.room);setSelected([]);}
  catch(error){setError((error as Error).message);}finally{setBusy(false);}
 }
 return <section className="game-review competition-mistake-review" aria-label="錯題複習">
  <h2>錯題複習</h2><p>查看自己建立的正式課堂，依學生錯題檢討，再勾選原題建立新的複習競賽。</p>
  <button type="button" className="secondary" disabled={listLoading||busy} onClick={()=>setListReload(value=>value+1)}>重新載入課堂</button>
  {listLoading&&<p role="status">載入課堂清單…</p>}{listError&&<p role="alert">{listError}</p>}
  {!listLoading&&!listError&&!rooms.length&&<p role="status">目前沒有已結束的正式課堂。學生模擬與獨立測試課堂不列入錯題複習。</p>}
  {!!rooms.length&&<label className="classroom-room-picker">選擇檢討課堂<select disabled={busy} value={roomId} onChange={event=>setRoomId(event.target.value)}>{rooms.map(room=><option key={room.id} value={room.id}>{room.className} · {labels[room.gameType]} · {room.title}（{room.code}）</option>)}</select></label>}
  {loading&&<p role="status">正在整理錯題…</p>}{error&&<p role="alert">{error}</p>}
  {!!roomId&&<button type="button" className="secondary" disabled={loading||busy} onClick={()=>setReload(value=>value+1)}>重新載入錯題</button>}
  {current&&<>
   <p>{current.questions.length} 道需複習題目 · {current.summary.wrongAnswers} 筆錯答／逾時紀錄</p>
   <p>未作答 {current.summary.unanswered} 題次 · 舊紀錄缺漏 {current.summary.missingHistory} 題次 · 評分待確認 {current.summary.pending} 題次。這些紀錄不當成錯題。</p>
   {!current.questions.length&&<p role="status">這堂課目前沒有可確認的錯題。</p>}
   {!!current.questions.length&&<>
    <button type="button" className="secondary" disabled={busy} onClick={()=>setSelected(selected.length===current.questions.length?[]:current.questions.map(item=>item.questionIndex))}>{selected.length===current.questions.length?'取消全選':'全選錯題'}</button>
    {current.questions.map(item=><article key={item.questionIndex} className="mistake-question">
     <label><input type="checkbox" disabled={busy} checked={selected.includes(item.questionIndex)} onChange={event=>setSelected(previous=>event.target.checked?[...previous,item.questionIndex]:previous.filter(index=>index!==item.questionIndex))}/>勾選第 {item.questionIndex+1} 題作為複習題</label>
     <h3>第 {item.questionIndex+1} 題 · {item.question.prompt}</h3>
     {!!item.question.options?.length&&<ol type="A">{item.question.options.map((option,index)=><li key={index}>{option}</li>)}</ol>}
     <p><strong>正確答案：</strong>{item.question.answer!==undefined?answerText(item.question,item.question.answer):item.question.type==='writing'?`依正確筆順書寫「${item.question.character}」`:'開放作答，無唯一標準答案；請依當次評語檢討。'}</p>
     <div className="sentence-stat-scroll" role="region" aria-label={`第 ${item.questionIndex+1} 題錯題明細`} tabIndex={0}>
      <table className="mistake-table"><caption>{item.wrongAnswers.length} 位學生需複習</caption><thead><tr><th scope="col">學生</th><th scope="col">個人作答</th><th scope="col">本題得分</th><th scope="col">原因／當次評語</th></tr></thead>
      <tbody>{item.wrongAnswers.map(answer=><tr key={answer.uid}><th scope="row">{answer.seat?`${answer.seat} 號 `:''}{answer.name}</th><td>{answerText(item.question,answer.response)}</td><td>{answer.points??'未保存'}{answer.points!==null?' 分':''}</td><td>{answer.reason}{answer.feedback&&<p>{answer.feedback}</p>}</td></tr>)}</tbody></table>
     </div>
    </article>)}
    <section aria-label="建立錯題複習競賽"><h3>依勾選錯題再次開課</h3>
     <label className="classroom-room-picker">複習競賽名稱<input maxLength={100} disabled={busy} value={title} onChange={event=>setTitle(event.target.value)}/></label>
     <p>沿用原班級與參賽方式，另建等候大廳，由老師開始競賽；原課堂及分數保留。已選 {selected.length} 題。</p>
     <button type="button" className="primary" disabled={busy||!selected.length||!title.trim()||loading} onClick={()=>void create()}>{busy?'正在建立…':'建立錯題複習大廳'}</button>
    </section>
   </>}
  </>}
  {created&&<section aria-label="已建立複習課堂"><p role="status">已建立「{created.title}」，開課代碼 {created.code}，共 {created.questionCount} 題，等待老師開始。</p><button type="button" className="secondary" onClick={onOpenCompetition}>前往 Kahoot 開課管理</button></section>}
 </section>;
}
