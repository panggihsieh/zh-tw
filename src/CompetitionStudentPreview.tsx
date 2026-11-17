import { useState } from 'react';
import CompetitionPlay from './CompetitionPlay';
import type { CompetitionRoom } from './competitionApi';
import { createCompetitionSimulation } from './competitionSimulation';

export default function CompetitionStudentPreview({room,onBack,backLabel}:{room:CompetitionRoom;onBack:()=>void;backLabel:string}) {
 const [simulation] = useState(()=>createCompetitionSimulation(room));
 const [,setRevision] = useState(0);
 async function request<T>(path:string,body?:unknown):Promise<T> {
  const value=await simulation.request<T>(path,body);
  if(path.endsWith('/join'))setRevision(value=>value+1);
  return value;
 }
 return <section className="competition-admin">
  <p className="competition-notice">測試學生畫面 · 本機模擬，不會加入正式課堂、寫入成績或呼叫 AI。</p>
  <div className="competition-actions"><button type="button" className="secondary" disabled={!simulation.joined||simulation.running||simulation.ended||!room.questions?.length} onClick={()=>{simulation.start();setRevision(value=>value+1);}}>模擬老師開始課程</button><button type="button" className="secondary" disabled={!simulation.running} onClick={()=>{simulation.finish();setRevision(value=>value+1);}}>模擬老師結束課程</button></div>
  <CompetitionPlay request={request} initialCode={room.code} onBack={onBack} backLabel={backLabel}/>
 </section>;
}
