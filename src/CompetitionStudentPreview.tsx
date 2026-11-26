import { useCallback, useEffect, useRef, useState } from 'react';
import CompetitionPlay from './CompetitionPlay';
import type { CompetitionRoom } from './competitionApi';
import { createCompetitionSimulation } from './competitionSimulation';

export default function CompetitionStudentPreview(props: {room:CompetitionRoom;onBack:()=>void;backLabel:string}) {
 const [attempt,setAttempt]=useState(0);
 return <StudentSimulation key={attempt} {...props} onRestart={()=>setAttempt(value=>value+1)}/>;
}

function StudentSimulation({room,onBack,backLabel,onRestart}:{room:CompetitionRoom;onBack:()=>void;backLabel:string;onRestart:()=>void}) {
 const [simulation] = useState(()=>createCompetitionSimulation(room));
 const [,setRevision] = useState(0);
 const [fullscreen,setFullscreen]=useState(false),[message,setMessage]=useState('');
 const stage=useRef<HTMLElement>(null);
 useEffect(()=>{const changed=()=>setFullscreen(document.fullscreenElement===stage.current);document.addEventListener('fullscreenchange',changed);return()=>document.removeEventListener('fullscreenchange',changed);},[]);
 const request=useCallback(async <T,>(path:string,body?:unknown):Promise<T> => {
  const value=await simulation.request<T>(path,body);
  if(path.endsWith('/join')||path.endsWith('/answer'))setRevision(value=>value+1);
  return value;
 },[simulation]);
 return <section className="competition-admin competition-student-simulation" ref={stage}>
  <p className="competition-notice">學生模擬・教學示範模式。可錄影或投影，不會加入正式課堂、保存成績或呼叫 AI；造句評分顯示為待確認。</p>
  <div className="competition-actions">
   <button type="button" className="secondary" disabled={!simulation.joined||simulation.running||simulation.ended||!room.questions?.length} onClick={()=>{simulation.start();setRevision(value=>value+1);}}>模擬老師開始課程</button>
   <button type="button" className="secondary" disabled={!simulation.running} onClick={()=>{simulation.finish();setRevision(value=>value+1);}}>模擬老師結束課程</button>
   <button type="button" className="secondary" onClick={onRestart}>重新開始模擬</button>
   <button type="button" className="secondary" onClick={async()=>{
    try{if(document.fullscreenElement===stage.current)await document.exitFullscreen();else if(stage.current?.requestFullscreen)await stage.current.requestFullscreen();else setMessage('此瀏覽器不支援全螢幕。');}
    catch{setMessage('無法切換全螢幕，請確認瀏覽器權限。');}
   }}>{fullscreen?'離開全螢幕':'教學全螢幕'}</button>
  </div>
  <p role="status">{message}</p>
  <CompetitionPlay request={request} initialCode={room.code} onBack={onBack} backLabel={backLabel}/>
 </section>;
}
