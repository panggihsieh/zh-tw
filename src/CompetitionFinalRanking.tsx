import CompetitionSentenceReview from './CompetitionSentenceReview';
import {Square,Music2} from 'lucide-react';
import OriginalCompetitionAvatar from './OriginalCompetitionAvatar';
import CompetitionClassroomExport from './CompetitionClassroomExport';
import { useEffect, useRef, useState } from 'react';
import { competitionRequest, type CompetitionRoom, type LeaderboardItem } from './competitionApi';
import { captureCompetitionRanking } from './competitionRankingPhoto';
import { endSoundEnabled, playCompetitionEndSound, setEndSoundEnabled, stopCompetitionEndSound, useEndSoundStatus, endSoundVolume, setEndSoundVolume } from './competitionEndSound';

interface Photo { id:string; image:string; createdAt:number; title:string }
export default function CompetitionFinalRanking({room,items,request=competitionRequest,simulated=false,autoSave=false,allowExport=false}:{autoSave?:boolean;allowExport?:boolean;room:CompetitionRoom;items:LeaderboardItem[];request?:typeof competitionRequest;simulated?:boolean}){
 const board=useRef<HTMLDivElement>(null),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[photo,setPhoto]=useState<Photo|null>(null),[preview,setPreview]=useState(''),[revision,setRevision]=useState(''),[enabled,setEnabled]=useState(endSoundEnabled);
 const [photosLoaded,setPhotosLoaded]=useState(false);
 const soundStatus=useEndSoundStatus(),[volume,setVolume]=useState(endSoundVolume);
 const stopMusic=<button type="button" className="secondary" onClick={stopCompetitionEndSound}><Square size={18} aria-hidden="true"/>停止播放音樂</button>;
 const saveDialog=useRef<HTMLDialogElement>(null);
 const [saveDecision,setSaveDecision]=useState<boolean|null>(null),[saveChoice,setSaveChoice]=useState(true),[saveSeconds,setSaveSeconds]=useState(30);
 useEffect(()=>{
  if(!autoSave||saveDecision!==null||simulated||room.status!=='closed'||!items.length)return;
  const dialog=saveDialog.current;
  dialog?.showModal();
  const deadline=Date.now()+30000;
  const timer=setInterval(()=>{
   const remaining=Math.max(0,Math.ceil((deadline-Date.now())/1000));setSaveSeconds(remaining);
   if(!remaining){clearInterval(timer);setSaveDecision(false);dialog?.close();setMessage('30 秒未確認，已略過自動保存；仍可手動保存或匯出。');}
  },250);
  return()=>{clearInterval(timer);dialog?.close();};
 },[autoSave,saveDecision,simulated,room.id,room.status,!!items.length]);
 useEffect(()=>{if(saveDecision!==null)saveDialog.current?.close();},[saveDecision]);
 const rankingRevision=items.length ? JSON.stringify(items.map(item=>[item.uid,item.rank,item.points,item.correct,item.answered])) : '';
 useEffect(()=>{
  let active=true;
  if(!simulated&&room.status==='closed')void request<{items:Photo[]}>(`/rooms/${room.id}/photos`).then(value=>{
   if(active){setPhoto(value.items[0]??null);setPhotosLoaded(true);}
  }).catch(error=>{if(active)setMessage(`照片紀錄載入失敗：${error.message}`);});
  return()=>{active=false;};
 },[room.id,room.status,request,simulated]);
 const automaticSaveFinished=useRef(false);
 useEffect(()=>{
  if(!autoSave||saveDecision!==true||simulated||room.status!=='closed'||!photosLoaded||photo||!rankingRevision||automaticSaveFinished.current)return;
  const node=board.current;
  if(!node)return;
  let active=true;
  let retry:ReturnType<typeof setTimeout>|undefined;
  async function save(attempt:number){
   if(!node||!active)return;
   setBusy(true);
   try {
    const image=await captureCompetitionRanking(node);
    if(!active)return;
    const value=await request<{photo:Photo}>(`/rooms/${room.id}/photos`,{image,revision:rankingRevision});
    if(active){
     automaticSaveFinished.current=true;
     setPhoto(value.photo);
     setMessage('排名照片已自動保存到課堂紀錄。');
     setBusy(false);
    }
   } catch(error){
    if(!active)return;
    if(attempt<3)retry=setTimeout(()=>void save(attempt+1),3000);
    else {
     setMessage(`自動保存失敗：${(error as Error).message}。可手動拍照保存。`);
     setBusy(false);
    }
   }
  }
  void save(1);
  return()=>{active=false;clearTimeout(retry);};
 },[autoSave,saveDecision,simulated,room.id,room.status,photosLoaded,photo,rankingRevision,request]);
 async function capture(){
  if(!board.current)return;setBusy(true);setMessage('');
  try{setRevision(rankingRevision);setPreview(await captureCompetitionRanking(board.current));setMessage('照片已拍好，確認後可上傳保存。');}catch(error){setMessage((error as Error).message);}finally{setBusy(false);}
 }
 async function upload(){
  setBusy(true);setMessage('');
  try{const value=await request<{photo:Photo}>(`/rooms/${room.id}/photos`,{image:preview,revision});setPhoto(value.photo);setPreview('');setMessage('排名照片已上傳保存。');}catch(error){setMessage(`尚未上傳：${(error as Error).message}。照片保留，可重試。`);}finally{setBusy(false);}
 }
 return <section className="competition-final-ranking">
  {autoSave&&!simulated&&room.status==='closed'&&!!items.length&&<dialog ref={saveDialog} aria-labelledby={`save-ranking-${room.id}`} onCancel={()=>{setSaveDecision(false);}}>
   <h2 id={`save-ranking-${room.id}`}>課堂已結束，是否儲存排名？</h2>
   <p>{room.title} · {saveSeconds} 秒內確認，逾時放棄自動保存。</p><div className="competition-actions">{stopMusic}</div>
   <label><input type="radio" name={`save-${room.id}`} checked={saveChoice} onChange={()=>setSaveChoice(true)}/>儲存排名並開啟課堂紀錄匯出預覽</label>
   <label><input type="radio" name={`save-${room.id}`} checked={!saveChoice} onChange={()=>setSaveChoice(false)}/>放棄自動保存</label>
   <div className="competition-actions"><button type="button" className="primary" autoFocus onClick={()=>{setSaveDecision(saveChoice);if(!saveChoice)setMessage('已略過自動保存。');}}>確認</button><button type="button" className="secondary" onClick={()=>{setSaveDecision(false);setMessage('已略過自動保存。');}}>放棄</button></div>
  </dialog>}
  <div className="competition-actions" aria-label="結束音樂控制">
   <button type="button" className="secondary" onClick={()=>{setEnabled(true);setEndSoundEnabled(true);void playCompetitionEndSound().catch(()=>setMessage('音樂未能播放，請確認瀏覽器聲音權限後再按播放。'));}}><Music2 size={18} aria-hidden="true"/>播放結束音樂</button>{stopMusic}
   <label>音樂音量<input type="range" min="0" max="100" value={volume} onChange={event=>{const value=Number(event.target.value);setVolume(value);setEndSoundVolume(value);}}/>{volume}%</label>
   <span role="status">{soundStatus==='blocked'?'自動播放未成功，請按「播放結束音樂」。':soundStatus==='playing'?'結束音樂播放中':soundStatus==='silent'?'音樂音量為 0，請調高音量後播放。':soundStatus==='stopped'?'音樂已停止':''}</span>
  </div>
  <div ref={board} className="competition-ranking-capture">
   <p>🏆 {room.status==='closed'?'最終排名':'目前排名 · 等待課堂結束'}</p><h2>{room.title}</h2>
   <p>{room.className} · {room.questionCount} 題 · {new Date(room.startedAt??room.createdAt).toLocaleString('zh-TW',{timeZone:'Asia/Taipei'})} · 設定 {Math.round(room.duration/60)} 分鐘</p>
   {room.testRoom&&<p>獨立測試課堂</p>}{simulated&&<p>模擬預覽</p>}
   <div className="competition-podium">{items.slice(0,5).map(item=><div key={item.uid}><b>第 {item.rank} 名</b>{item.avatarKind==='anonymous'?<span className="competition-avatar anonymous">?</span>:<OriginalCompetitionAvatar src={item.avatarKind==='custom'&&item.avatar?item.avatar:`${import.meta.env.BASE_URL}mascot/green-bird.png`} alt={`${item.name}的公仔`}/>}<strong>{item.name}</strong><span>{item.points} 分</span></div>)}</div>
   <ol className="competition-leaderboard">{items.map(item=><li key={item.uid} className={item.mine?'is-me':''}><b>{item.rank}</b><span>{item.name}<small>{item.correct} 題達標 · 已答 {item.answered}/{room.questionCount}</small></span><strong>{item.points} 分</strong></li>)}</ol>
   {!items.length&&<p>尚無排名紀錄。</p>}
  </div>
  {allowExport&&!simulated&&room.status==='closed'&&room.gameType==='sentence-practice'&&<CompetitionSentenceReview roomId={room.id} request={request}/>}
  <div className="competition-actions">
   <label><input type="checkbox" checked={enabled} onChange={event=>{setEnabled(event.target.checked);setEndSoundEnabled(event.target.checked);}}/> 結束鼓掌音效</label>
   <button type="button" className="secondary" disabled={!enabled} onClick={()=>void playCompetitionEndSound().catch(()=>setMessage('瀏覽器未允許音效，請再次按下試聽。'))}>試聽結束音效</button>
   <button type="button" className="secondary" disabled={busy||room.status!=='closed'||!items.length} onClick={()=>void capture()}>拍照保存排名</button>
  </div>
  {preview&&<div className="competition-ranking-photo"><img src={preview} alt="待上傳的排名照片"/><a href={preview} download={`${room.title}-排名.jpg`}>下載照片</a>{!simulated&&<button type="button" className="primary" disabled={busy} onClick={()=>void upload()}>上傳排名照片</button>}{simulated&&<p>模擬預覽僅供下載，不上傳正式紀錄。</p>}</div>}
  {photo&&<details><summary>查看已上傳排名照片</summary><div className="competition-ranking-photo"><img src={photo.image} alt={`${photo.title}排名照片`}/><a href={photo.image} download={`${photo.title}-排名.jpg`}>下載已保存照片</a><p>拍照保存：{new Date(photo.createdAt).toLocaleString('zh-TW',{timeZone:'Asia/Taipei'})}</p></div></details>}
  {allowExport&&<CompetitionClassroomExport room={room} items={items} revision={rankingRevision} autoOpen={saveDecision===true}/>}
  <p role="status">{busy?'處理排名照片中…':message}</p>
 </section>;
}
