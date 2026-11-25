import { useEffect, useRef, useState } from 'react';
import { Camera, Download } from 'lucide-react';
import { renderWritingSheet, workSheetKind, workSheetLabels, type WorkSheetEntry, type WritingSheetInfo } from './competitionWritingSheet';

/** 書寫生字、字體結構、生字造詞完成後，以整張 A4 橫式填滿螢幕顯示，學生可截圖、拍照（複製）或下載。 */
export default function CompetitionWritingSheet({entries,info}:{entries:WorkSheetEntry[];info:WritingSheetInfo}){
 const [url,setUrl]=useState(''),[message,setMessage]=useState('正在產生作品圖片…');
 const sheet=useRef<HTMLDivElement>(null),shown=useRef(false),blob=useRef<Promise<Blob>|null>(null);
 const revision=JSON.stringify([entries,info]),{heading}=workSheetLabels[workSheetKind(entries)];
 useEffect(()=>{
  let active=true,objectUrl='';
  const pending=renderWritingSheet(entries,info);blob.current=pending;
  pending.then(value=>{if(!active)return;objectUrl=URL.createObjectURL(value);setUrl(objectUrl);setMessage('');}).catch(error=>{if(active)setMessage(error.message);});
  return()=>{active=false;if(objectUrl)URL.revokeObjectURL(objectUrl);};
 },[revision]);
 async function copy(){
  const pending=blob.current;if(!pending)return;
  try{
   if(!navigator.clipboard?.write||typeof ClipboardItem==='undefined')throw Error('unsupported');
   // Safari 需要在點擊當下建立 ClipboardItem，因此直接傳入 Promise。
   await navigator.clipboard.write([new ClipboardItem({'image/png':pending})]);
   setMessage('已複製到剪貼簿，可以貼到文件或簡報。');
  }catch{setMessage('此瀏覽器無法直接複製圖片，請直接截圖、在圖片上按右鍵（或長按）選「複製圖片」，或改用下載。');}
 }
 const filename=`${info.title}-${info.name||'作品'}.png`.replace(/[\\/:*?"<>|\s]+/g,'_');
 function reveal(){if(shown.current)return;shown.current=true;// 等排名等版面穩定後再置中，讓整張 A4 完整出現在螢幕上。
  window.setTimeout(()=>sheet.current?.scrollIntoView({block:'center'}),600);}
 return <section className="competition-writing-sheet" aria-label={heading}>
  <h2>{heading}</h2>
  <p>可直接截圖整張 A4 橫式畫面，或按右上角的拍照（複製）、下載。</p>
  <div className="competition-writing-sheet-frame" ref={sheet}>
   <div className="competition-writing-sheet-toolbar">
    <p role="status">{message}</p>
    <button type="button" className="primary" disabled={!url} onClick={()=>void copy()} title="把整張 A4 作品複製到剪貼簿"><Camera size={18}/>拍照（複製）</button>
    {url?<a className="secondary" href={url} download={filename} title="下載 A4 橫式 PNG"><Download size={18}/>下載</a>:<button type="button" className="secondary" disabled><Download size={18}/>下載</button>}
   </div>
   {url?<img src={url} onLoad={reveal} alt={`${info.name}的${heading.replace('我的','')}，共 ${entries.length} 題`}/>:<div className="competition-writing-sheet-placeholder" aria-hidden="true"/>}
  </div>
 </section>;
}
