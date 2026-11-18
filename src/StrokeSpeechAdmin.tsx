import StrokeCatalogue,{confirmedStrokeVoice,type CatalogueRow} from './StrokeCatalogue';
import {useEffect,useState} from 'react';
import {outlinePath,tracePath,type Point} from './writingGame';
import {fingerprintStrokes,speakStrokeText,stopStrokeSpeech,STROKE_NAMES,strokeSpeechRequest,type StrokeVoice} from './strokeSpeech';
import './strokeSpeech.css';
interface Stroke {outline:any[];track:Point[]}
export default function StrokeSpeechAdmin() {
 const [catalogue,setCatalogue]=useState<CatalogueRow[]>([]);
 const [input,setInput]=useState(''),[character,setCharacter]=useState(''),[strokes,setStrokes]=useState<Stroke[]>([]),[rows,setRows]=useState<StrokeVoice[]>([]),[fingerprint,setFingerprint]=useState(''),[confirmed,setConfirmed]=useState(false),[message,setMessage]=useState(''),[busy,setBusy]=useState(false),[reviewed,setReviewed]=useState(false);
 useEffect(()=>()=>stopStrokeSpeech(),[]);
 async function load(){
  const c=input.trim();if(!/^\p{Script=Han}$/u.test(c)){setMessage('請輸入一個生字。');return;}
  setBusy(true);setMessage('');setCharacter('');setRows([]);setStrokes([]);setReviewed(false);stopStrokeSpeech();
  try{
   const response=await fetch(`/game-strokes/${c.codePointAt(0)!.toString(16)}.json`);if(!response.ok||!response.headers.get('Content-Type')?.includes('json'))throw Error('此字沒有書寫筆順資料。');
   const data=await response.json() as Stroke[];const fingerprint=await fingerprintStrokes(data);const item=await strokeSpeechRequest(c,{admin:true});
   setCharacter(c);setStrokes(data);setFingerprint(fingerprint);setConfirmed(Boolean(item?.confirmed&&item.fingerprint===fingerprint));
   setRows(item?.fingerprint===fingerprint?item.strokes:data.map(()=>({name:'',spoken:''})));
   if(item && item.fingerprint!==fingerprint)setMessage('筆順已更新，請重新逐筆確認名稱與讀音。');
  }catch(error){setMessage((error as Error).message);}finally{setBusy(false);}
 }
 function edit(index:number,key:keyof StrokeVoice,value:string){setRows(old=>old.map((row,i)=>i===index?{...row,[key]:value,...(key==='name'&&(!row.spoken||row.spoken===row.name)?{spoken:value}:{})}:row));setReviewed(false);setConfirmed(false);}
 async function save(publish:boolean){setBusy(true);setMessage('');try{await strokeSpeechRequest(character,{admin:true,value:{fingerprint,strokes:rows,confirmed:publish}});setConfirmed(publish);setReviewed(false);setMessage(publish?'已發布，學生下次載入此字即可使用。':'已存為草稿，學生端不會朗讀此字。');}catch(error){setMessage((error as Error).message);}finally{setBusy(false);}}
 const valid=rows.length>0&&rows.every(row=>row.name.trim()&&row.spoken.trim());
 return <section className="stroke-speech-admin"><h2>筆畫語音</h2><p>逐字核對筆順、筆畫名稱及試聽，確認後才提供學生使用。朗讀使用裝置的中文語音，可在 TTS 設定選擇聲音。</p><p>練習：先念「第一筆，橫」「下一筆，豎」。正式比賽：寫對才念名稱；寫錯只說「請再試一次」。</p>
  <StrokeCatalogue onChange={setCatalogue}/>
  <form onSubmit={event=>{event.preventDefault();void load();}}><label>核對生字 <input value={input} onChange={event=>setInput(event.target.value)} disabled={busy} maxLength={2} placeholder="例如：木"/></label><button className="primary" disabled={busy}>載入筆順與語音</button></form>
  <p role="status">{message}</p>
  {character&&<><h3>「{character}」共 {strokes.length} 筆 · {confirmed?'已確認發布':'草稿／尚未發布'}</h3><datalist id="stroke-name-options">{STROKE_NAMES.map(name=><option key={name} value={name}/>)}</datalist><div className="stroke-speech-grid">{rows.map((row,index)=><article key={index}><h4>第 {index+1} 筆</h4><svg viewBox="0 0 2048 2048" aria-label={`第${index+1}筆軌跡`}>
   {strokes.map((stroke,i)=><path key={i} d={outlinePath(stroke.outline)} fill={i===index?'#168259':'#e3e9df'}/>)}<path d={tracePath(strokes[index].track)} fill="none" stroke="#b33124" strokeWidth="12"/><circle cx={strokes[index].track[0].x} cy={strokes[index].track[0].y} r="30" fill="#b33124"/></svg><small>紅點為起點，依綠色筆形核對。</small>
   <label>套用已確認基本筆畫<select value="" disabled={busy} onChange={event=>{const voice=confirmedStrokeVoice(catalogue,event.target.value);if(voice){setRows(old=>old.map((row,i)=>i===index?voice:row));setReviewed(false);setConfirmed(false);}}}><option value="">選擇已儲存並確認的念法</option>{catalogue.filter(row=>row.confirmed).map(row=><option key={row.id} value={row.id}>{row.symbol} {row.name}（{row.spoken}）</option>)}</select></label><label>筆畫名稱<input list="stroke-name-options" maxLength={30} value={row.name} disabled={busy} onChange={event=>edit(index,'name',event.target.value)}/></label><label>注音念法<input maxLength={120} value={row.zhuyin??''} disabled={busy} onChange={event=>edit(index,'zhuyin',event.target.value)}/></label><label>朗讀文字<input maxLength={30} value={row.spoken} disabled={busy} onChange={event=>edit(index,'spoken',event.target.value)}/></label><button type="button" className="secondary" disabled={!row.spoken} onClick={()=>{if(!speakStrokeText(row.spoken))setMessage('此瀏覽器不支援語音播放。');}}>試聽</button></article>)}</div>
   <label><input type="checkbox" checked={reviewed} disabled={busy||!valid} onChange={event=>setReviewed(event.target.checked)}/>我已逐筆核對順序、名稱，並試聽讀音</label><div className="competition-actions"><button className="secondary" disabled={busy||!rows.length} onClick={()=>void save(false)}>儲存草稿／撤回發布</button><button className="primary" disabled={busy||!valid||!reviewed} onClick={()=>void save(true)}>確認並發布語音</button></div></>}
 </section>;
}
