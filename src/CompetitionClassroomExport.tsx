import {useRef,useState} from 'react';
import {competitionRequest,type CompetitionRoom,type LeaderboardItem} from './competitionApi';
import {captureCompetitionRanking} from './competitionRankingPhoto';

export default function CompetitionClassroomExport({room,items,revision}:{room:CompetitionRoom;items:LeaderboardItem[];revision:string}){
 const board=useRef<HTMLDivElement>(null);
 const [open,setOpen]=useState(false),[limit,setLimit]=useState(100),[message,setMessage]=useState(''),[busy,setBusy]=useState(false);
 const [preview,setPreview]=useState<{image:string;revision:string;limitKB:number}|null>(null);
 const current=preview?.revision===revision&&preview.limitKB===limit;
 async function prepare(){
  if(!board.current||busy)return;
  setBusy(true);setPreview(null);setMessage('');
  try{setPreview({image:await captureCompetitionRanking(board.current,limit*1000),revision,limitKB:limit});}
  catch(error){setMessage((error as Error).message);}
  finally{setBusy(false);}
 }
 async function confirm(){
  if(!preview||!current||busy)return;
  setBusy(true);setMessage('');
  try{
   await competitionRequest(`/rooms/${room.id}/classroom-export`,{...preview,confirmed:true});
   setMessage('課堂紀錄已保存至 School IAM。');setPreview(null);setOpen(false);
  }catch(error){setMessage((error as Error).message);}
  finally{setBusy(false);}
 }
 if(room.testRoom||!items.length)return null;
 return <section>
  <button type="button" className="secondary" disabled={open} onClick={()=>{setOpen(true);setMessage('');}}>預覽課堂紀錄匯出</button>
  {open&&<>
   <div ref={board} className="competition-ranking-capture">
    <h3>{room.title} · 最終排名</h3>
    <p>{room.className}</p>
    <div className="competition-podium competition-centered-podium">
     {items.slice(0,7).map((item,index)=><div key={item.uid} style={{gridColumn:[4,3,5,2,6,1,7][index],paddingBottom:24*(6-index)}}>
      {item.avatarKind==='anonymous'?<span className="competition-avatar anonymous">?</span>:<img className="competition-avatar" src={item.avatarKind==='custom'&&item.avatar?item.avatar:import.meta.env.BASE_URL+'mascot/green-bird.png'} alt={item.name+'的公仔'}/>}
      <b>{item.rank}</b><strong>{item.name}</strong><span>{item.points} 分</span>
     </div>)}
    </div>
   </div>
   <ol>{items.map(item=><li key={item.uid}>第 {item.rank} 名 · {item.name} · {item.points} 分 · 已答 {item.answered} 題</li>)}</ol>
   <div className="competition-actions">
    <label>JPEG 容量上限 <select value={limit} disabled={busy} onChange={event=>{setLimit(Number(event.target.value));setPreview(null);}}>
     {[100,50,20].map(value=><option key={value} value={value}>{value} KB</option>)}
    </select></label>
    <button type="button" className="secondary" disabled={busy} onClick={()=>void prepare()}>產生排行圖片</button>
    <button type="button" className="primary" disabled={busy||!current} onClick={()=>void confirm()}>確認送出至 School IAM</button>
    <button type="button" className="secondary" disabled={busy} onClick={()=>{setOpen(false);setPreview(null);setMessage('');}}>略過匯出</button>
   </div>
   {current&&preview&&<div className="competition-ranking-photo"><img src={preview.image} alt="待匯出的排行圖片"/></div>}
  </>}
  <p role="status">{busy?'處理課堂匯出中…':message}</p>
 </section>;
}
