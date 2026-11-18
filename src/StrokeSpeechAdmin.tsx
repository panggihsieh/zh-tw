import {useEffect,useState} from 'react';
import {outlinePath,tracePath,type Point} from './writingGame';
import {fingerprintStrokes,speakStrokeText,stopStrokeSpeech,strokeSpeechRequest,type StrokeVoice} from './strokeSpeech';
import './strokeSpeech.css';
import {STROKE_CATALOG,findStrokePreset} from './strokeSpeechCatalog';
interface Stroke {outline:any[];track:Point[]}
export default function StrokeSpeechAdmin() {
 const [input,setInput]=useState(''),[character,setCharacter]=useState(''),[strokes,setStrokes]=useState<Stroke[]>([]),[rows,setRows]=useState<StrokeVoice[]>([]),[fingerprint,setFingerprint]=useState(''),[confirmed,setConfirmed]=useState(false),[message,setMessage]=useState(''),[busy,setBusy]=useState(false),[reviewed,setReviewed]=useState(false);
 useEffect(()=>()=>stopStrokeSpeech(),[]);
 async function load(){
  const c=input.trim();if(!/^\p{Script=Han}$/u.test(c)){setMessage('請輸入一個生字。');return;}
  setBusy(true);setMessage('');setCharacter('');setRows([]);setStrokes([]);setReviewed(false);stopStrokeSpeech();
  try{
   const response=await fetch(`/game-strokes/${c.codePointAt(0)!.toString(16)}.json`);if(!response.ok||!response.headers.get('Content-Type')?.includes('json'))throw Error('此字沒有書寫筆順資料。');
   const data=await response.json() as Stroke[];const fingerprint=await fingerprintStrokes(data);const item=await strokeSpeechRequest(c,{admin:true});
   setCharacter(c);setStrokes(data);setFingerprint(fingerprint);setConfirmed(Boolean(item?.confirmed&&item.fingerprint===fingerprint));
   setRows(item?.fingerprint===fingerprint?item.strokes:data.map(()=>({name:'',spoken:'',mnemonic:''})));
   if(item && item.fingerprint!==fingerprint)setMessage('筆順已更新，請重新逐筆確認名稱與讀音。');
  }catch(error){setMessage((error as Error).message);}finally{setBusy(false);}
 }
 function edit(index:number,key:keyof StrokeVoice,value:string){setRows(old=>old.map((row,i)=>{
  if(i!==index)return row;
  const previous=findStrokePreset(row.name),next=findStrokePreset(value);
  const autoSpoken=key==='name'&&(!row.spoken||row.spoken===row.name||row.spoken===previous?.spoken);
  return {...row,[key]:value,...(autoSpoken?{spoken:next?.spoken??value}:{}),...(key==='name'&&(!row.mnemonic||row.mnemonic===previous?.spoken)?{mnemonic:next?.spoken??value}:{})};
 }));setReviewed(false);setConfirmed(false);}
 function audition(text:string){if(!speakStrokeText(text))setMessage('此瀏覽器不支援語音播放。');}
 async function save(publish:boolean){setBusy(true);setMessage('');try{await strokeSpeechRequest(character,{admin:true,value:{fingerprint,strokes:rows,confirmed:publish}});setConfirmed(publish);setReviewed(false);setMessage(publish?'已發布，學生下次載入此字即可使用。':'已存為草稿，學生端不會朗讀此字。');}catch(error){setMessage((error as Error).message);}finally{setBusy(false);}}
 const valid=rows.length>0&&rows.every(row=>row.name.trim()&&row.spoken.trim());
 return <section className="stroke-speech-admin"><h2>筆順語音產生器</h2><p>逐字核對筆順、筆畫名稱及試聽，確認後才提供學生使用。朗讀使用裝置的中文語音，可在 TTS 設定選擇聲音。</p><p>練習：先念「第一筆，橫」「下一筆，豎」。正式比賽：寫對才念名稱；寫錯只說「請再試一次」。</p>
  <details className="stroke-catalog"><summary>32 種筆畫口訣對照與試聽</summary><p>依提供的對照表建立；符號與例字供核對，請依實際筆形選擇。選擇筆畫名稱會自動帶入口訣，自訂朗讀文字則保留。</p>{['基本筆畫','向左轉折','向右轉折','向下與鉤類'].map(group=><section key={group}><h3>{group}</h3><div className="stroke-catalog-grid">{STROKE_CATALOG.filter(item=>item.group===group).map(item=><article key={item.name}><header className="stroke-card-heading"><strong>{item.symbol} {item.name}</strong><button type="button" className="stroke-audition" aria-label={`試聽${item.name}唸法`} onClick={()=>audition(item.spoken)}>試聽唸法</button></header><p>{item.spoken}</p><small>例字：{item.examples}</small></article>)}</div></section>)}</details>
  <form onSubmit={event=>{event.preventDefault();void load();}}><label>核對生字 <input value={input} onChange={event=>setInput(event.target.value)} disabled={busy} maxLength={2} placeholder="例如：木"/></label><button className="primary" disabled={busy}>載入筆順與語音</button></form>
  <p role="status">{message}</p>
  {character&&<><h3>「{character}」共 {strokes.length} 筆 · {confirmed?'已確認發布':'草稿／尚未發布'}</h3><datalist id="stroke-name-options">{STROKE_CATALOG.flatMap(item=>item.name.split('／').map(name=><option key={name} value={name}>{item.symbol} · {item.spoken}</option>))}</datalist><div className="stroke-speech-grid">{rows.map((row,index)=><article key={index}><header className="stroke-card-heading"><h4>第 {index+1} 筆</h4><button type="button" className="stroke-audition" aria-label={`試聽第${index+1}筆唸法`} disabled={!(row.mnemonic?.trim()||row.spoken)} onClick={()=>audition(row.mnemonic?.trim()||row.spoken)}>試聽唸法</button></header><svg viewBox="0 0 2048 2048" aria-label={`第${index+1}筆軌跡`}>
   {strokes.map((stroke,i)=><path key={i} d={outlinePath(stroke.outline)} fill={i===index?'#168259':'#e3e9df'}/>)}<path d={tracePath(strokes[index].track)} fill="none" stroke="#b33124" strokeWidth="12"/><circle cx={strokes[index].track[0].x} cy={strokes[index].track[0].y} r="30" fill="#b33124"/></svg><small>紅點為起點，依綠色筆形核對。</small>
   <label>套用筆畫口訣<select value={findStrokePreset(row.name)?.name??''} disabled={busy} onChange={event=>{if(event.target.value)edit(index,'name',event.target.value.split('／')[0]);}}><option value="">選擇筆畫（或下方自訂）</option>{['基本筆畫','向左轉折','向右轉折','向下與鉤類'].map(group=><optgroup key={group} label={group}>{STROKE_CATALOG.filter(item=>item.group===group).map(item=><option key={item.name} value={item.name}>{item.symbol} {item.name}</option>)}</optgroup>)}</select></label><label>筆畫名稱<input list="stroke-name-options" maxLength={30} value={row.name} disabled={busy} onChange={event=>edit(index,'name',event.target.value)}/></label><label>精簡語音讀音（口訣版）<input maxLength={30} value={row.mnemonic??''} disabled={busy} placeholder="例如：豎，右折，下折，左鉤" onChange={event=>edit(index,'mnemonic',event.target.value)}/></label><small>試聽與學生語音優先使用口訣；留空則使用朗讀文字。</small><label>朗讀文字<input maxLength={30} value={row.spoken} disabled={busy} onChange={event=>edit(index,'spoken',event.target.value)}/></label></article>)}</div>
   <label><input type="checkbox" checked={reviewed} disabled={busy||!valid} onChange={event=>setReviewed(event.target.checked)}/>我已逐筆核對順序、名稱，並試聽讀音</label><div className="competition-actions"><button className="secondary" disabled={busy||!rows.length} onClick={()=>void save(false)}>儲存草稿／撤回發布</button><button className="primary" disabled={busy||!valid||!reviewed} onClick={()=>void save(true)}>確認並發布語音</button></div></>}
 </section>;
}
