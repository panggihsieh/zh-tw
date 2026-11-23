import { useEffect, useRef, useState } from 'react';
import { Copy, Download } from 'lucide-react';
import { renderWritingSheet, type WritingSheetEntry, type WritingSheetInfo } from './competitionWritingSheet';

/** 作業完成後以整張 A4 橫式填滿螢幕顯示，學生可截圖、複製或下載。 */
export default function CompetitionWritingSheet({entries,info}:{entries:WritingSheetEntry[];info:WritingSheetInfo}){
 const [url,setUrl]=useState(''),[message,setMessage]=useState('正在產生字跡圖片…');
 const sheet=useRef<HTMLImageElement>(null),shown=useRef(false),blob=useRef<Promise<Blob>|null>(null);
 const revision=JSON.stringify([entries.map(entry=>[entry.number,entry.traces.length]),info]);
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
 const filename=`${info.title}-${info.name||'字跡'}.png`.replace(/[\\/:*?"<>|\s]+/g,'_');
 function reveal(){if(shown.current)return;shown.current=true;// 等排名等版面穩定後再置中，讓整張 A4 完整出現在螢幕上。
  window.setTimeout(()=>sheet.current?.scrollIntoView({block:'center'}),600);}
 return <section className="competition-writing-sheet" aria-label="我的字跡作品">
  <h2>我的字跡作品</h2>
  <p>可直接截圖整張 A4 橫式畫面，或使用下方按鈕複製、下載。</p>
  {url?<img ref={sheet} src={url} onLoad={reveal} alt={`${info.name}的字跡作品，共 ${entries.length} 字`}/>:<div className="competition-writing-sheet-placeholder" aria-hidden="true"/>}
  <div className="competition-actions"><button type="button" className="primary" disabled={!url} onClick={()=>void copy()}><Copy size={18}/>複製圖片到剪貼簿</button>{url?<a className="secondary" href={url} download={filename}><Download size={18}/>下載 PNG</a>:null}</div>
  <p role="status">{message}</p>
 </section>;
}
