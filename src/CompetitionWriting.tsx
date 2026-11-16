import { useEffect, useRef, useState, type PointerEvent } from 'react';
import { judgeStroke, outlinePath, sample, tracePath, type Point } from './writingGame';

interface Stroke { outline:any[]; track:Point[] }
export default function CompetitionWriting({character,disabled,onSubmit}:{character:string;disabled:boolean;onSubmit:(traces:Point[][])=>void}) {
 const [strokes,setStrokes]=useState<Stroke[]|null>(null),[traces,setTraces]=useState<Point[][]>([]),[live,setLive]=useState<Point[]>([]),[message,setMessage]=useState(''),[hint,setHint]=useState(false);
 const pen=useRef<{id:number;points:Point[]}|null>(null);
 useEffect(()=>{
  const controller=new AbortController();
  fetch(`/game-strokes/${character.codePointAt(0)!.toString(16)}.json`,{signal:controller.signal}).then(async response=>{
   if(!response.ok)throw Error('此字尚無可用筆順資料，請老師重新選字。');
   const value=await response.json();if(!controller.signal.aborted)setStrokes(value);
  }).catch(error=>{if(!controller.signal.aborted)setMessage(error.message);});
  return()=>controller.abort();
 },[character]);
 const complete=Boolean(strokes?.length&&traces.length===strokes.length);
 function point(event:PointerEvent<SVGSVGElement>):Point {
  const rect=event.currentTarget.getBoundingClientRect();
  return {x:Math.max(0,Math.min(1000,(event.clientX-rect.left)/rect.width*1000)),y:Math.max(0,Math.min(1000,(event.clientY-rect.top)/rect.height*1000))};
 }
 function finish(event:PointerEvent<SVGSVGElement>) {
  if(pen.current?.id!==event.pointerId)return;
  const points=sample([...pen.current.points,point(event)]);pen.current=null;setLive([]);
  if(disabled)return;
  if(strokes&&judgeStroke(points,strokes[traces.length].track.map(p=>({x:p.x/2048*1000,y:p.y/2048*1000})))){
   setTraces([...traces,points]);setMessage(traces.length+1===strokes.length?'書寫完成，可以送出。':'這一筆正確，請寫下一筆。');
  }else setMessage('請依筆順再試一次。');
 }
 return <div className="competition-writing">
  <p>請依筆順書寫「{character}」 · 已完成 {traces.length}／{strokes?.length??0} 筆</p>
  <svg viewBox="0 0 1000 1000" className="competition-writing-pad" aria-label={`書寫區 ${character}`}
   onPointerDown={event=>{if(disabled||!strokes||complete||pen.current||event.button!==0)return;event.preventDefault();event.currentTarget.setPointerCapture(event.pointerId);const points=[point(event)];pen.current={id:event.pointerId,points};setLive(points);}}
   onPointerMove={event=>{if(pen.current?.id!==event.pointerId)return;pen.current.points.push(point(event));if(pen.current.points.length>512)pen.current.points=sample(pen.current.points,256);setLive([...pen.current.points]);}}
   onPointerUp={finish} onPointerCancel={()=>{pen.current=null;setLive([]);}}>
   <path d="M500 0V1000M0 500H1000M0 0L1000 1000M1000 0L0 1000" stroke="#ccd9bd" strokeDasharray="12 12" fill="none"/>
   {strokes?.map((stroke,index)=><path key={index} d={outlinePath(stroke.outline)} transform="scale(.48828125)" fill={index<traces.length?'#b8ddaf':hint&&index===traces.length?'#ffdc8b':'#edf1e8'}/>)}
   {traces.map((points,index)=><path key={index} d={tracePath(points)} stroke="#175d9a" strokeWidth="14" strokeLinecap="round" fill="none"/>)}
   <path d={tracePath(live)} stroke="#175d9a" strokeWidth="14" strokeLinecap="round" fill="none"/>
  </svg>
  <p role="status">{message||'使用滑鼠、觸控筆或手指，依筆順完成每一筆。'}</p>
  <div className="competition-actions"><button type="button" className="secondary" disabled={disabled||!strokes||complete} onClick={()=>setHint(!hint)}>{hint?'收合':'顯示'}下一筆提示</button><button type="button" className="secondary" disabled={disabled||!traces.length} onClick={()=>{setTraces([]);setMessage('已清除，請重新書寫。');}}>重新書寫</button><button type="button" className="primary" disabled={disabled||!complete} onClick={()=>onSubmit(traces)}>送出書寫答案</button></div>
 </div>;
}
