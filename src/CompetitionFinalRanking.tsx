import { useEffect, useRef, useState } from 'react';
import { competitionRequest, type CompetitionRoom, type LeaderboardItem } from './competitionApi';
import { captureCompetitionRanking } from './competitionRankingPhoto';
import { endSoundEnabled, playCompetitionEndSound, setEndSoundEnabled } from './competitionEndSound';

interface Photo { id:string; image:string; createdAt:number; title:string }
export default function CompetitionFinalRanking({room,items,request=competitionRequest,simulated=false}:{room:CompetitionRoom;items:LeaderboardItem[];request?:typeof competitionRequest;simulated?:boolean}){
 const board=useRef<HTMLDivElement>(null),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[photo,setPhoto]=useState<Photo|null>(null),[preview,setPreview]=useState(''),[revision,setRevision]=useState(''),[enabled,setEnabled]=useState(endSoundEnabled);
 useEffect(()=>{
  let active=true;
  if(!simulated&&room.status==='closed')void request<{items:Photo[]}>(`/rooms/${room.id}/photos`).then(value=>{if(active)setPhoto(value.items[0]??null);}).catch(error=>{if(active)setMessage(`照片紀錄載入失敗：${error.message}`);});
  return()=>{active=false;};
 },[room.id,room.status,request,simulated]);
 async function capture(){
  if(!board.current)return;setBusy(true);setMessage('');
  try{setRevision(JSON.stringify(items.map(v=>[v.uid,v.rank,v.points,v.correct,v.answered])));setPreview(await captureCompetitionRanking(board.current));setMessage('照片已拍好，確認後可上傳保存。');}catch(error){setMessage((error as Error).message);}finally{setBusy(false);}
 }
 async function upload(){
  setBusy(true);setMessage('');
  try{const value=await request<{photo:Photo}>(`/rooms/${room.id}/photos`,{image:preview,revision});setPhoto(value.photo);setPreview('');setMessage('排名照片已上傳保存。');}catch(error){setMessage(`尚未上傳：${(error as Error).message}。照片保留，可重試。`);}finally{setBusy(false);}
 }
 return <section className="competition-final-ranking">
  <div ref={board} className="competition-ranking-capture">
   <p>🏆 {room.status==='closed'?'最終排名':'目前排名 · 等待課堂結束'}</p><h2>{room.title}</h2>
   <p>{room.className} · {room.questionCount} 題 · {new Date(room.startedAt??room.createdAt).toLocaleString('zh-TW',{timeZone:'Asia/Taipei'})} · 設定 {Math.round(room.duration/60)} 分鐘</p>
   {room.testRoom&&<p>獨立測試課堂</p>}{simulated&&<p>模擬預覽</p>}
   <div className="competition-podium">{items.slice(0,5).map(item=><div key={item.uid}><b>第 {item.rank} 名</b>{item.avatarKind==='anonymous'?<span className="competition-avatar anonymous">?</span>:<img className="competition-avatar" src={item.avatarKind==='custom'&&item.avatar?item.avatar:`${import.meta.env.BASE_URL}mascot/green-bird.png`} alt={`${item.name}的公仔`}/>}<strong>{item.name}</strong><span>{item.points} 分</span></div>)}</div>
   <ol className="competition-leaderboard">{items.map(item=><li key={item.uid} className={item.mine?'is-me':''}><b>{item.rank}</b><span>{item.name}<small>{item.correct} 題達標 · 已答 {item.answered}/{room.questionCount}</small></span><strong>{item.points} 分</strong></li>)}</ol>
   {!items.length&&<p>尚無排名紀錄。</p>}
  </div>
  <div className="competition-actions">
   <label><input type="checkbox" checked={enabled} onChange={event=>{setEnabled(event.target.checked);setEndSoundEnabled(event.target.checked);}}/> 結束鼓掌音效</label>
   <button type="button" className="secondary" disabled={!enabled} onClick={()=>void playCompetitionEndSound().catch(()=>setMessage('瀏覽器未允許音效，請再次按下試聽。'))}>試聽結束音效</button>
   <button type="button" className="secondary" disabled={busy||room.status!=='closed'||!items.length} onClick={()=>void capture()}>拍照保存排名</button>
  </div>
  {preview&&<div className="competition-ranking-photo"><img src={preview} alt="待上傳的排名照片"/><a href={preview} download={`${room.title}-排名.jpg`}>下載照片</a>{!simulated&&<button type="button" className="primary" disabled={busy} onClick={()=>void upload()}>上傳排名照片</button>}{simulated&&<p>模擬預覽僅供下載，不上傳正式紀錄。</p>}</div>}
  {photo&&<details><summary>查看已上傳排名照片</summary><div className="competition-ranking-photo"><img src={photo.image} alt={`${photo.title}排名照片`}/><a href={photo.image} download={`${photo.title}-排名.jpg`}>下載已保存照片</a><p>拍照保存：{new Date(photo.createdAt).toLocaleString('zh-TW',{timeZone:'Asia/Taipei'})}</p></div></details>}
  <p role="status">{busy?'處理排名照片中…':message}</p>
 </section>;
}
