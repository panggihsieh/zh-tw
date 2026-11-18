import {findStrokePreset,upgradeStrokeMnemonic,strokeMnemonicReason} from './strokeSpeechCatalog';
import StrokeVoiceSettings from './StrokeVoiceSettings';
import {useEffect,useRef,useState} from 'react';
import {cloudServices} from './cloudSync';
import {speakStrokeText,type StrokeVoice} from './strokeSpeech';
import seed from './strokeCatalogueSeed.json';
export type CatalogueRow=typeof seed[number] & {mnemonic?:string;mnemonicRevision?:string};
interface Catalogue {rows:CatalogueRow[];updatedAt?:string}
export const STROKE_CATALOGUE_SOURCE='https://gsyan888.blogspot.com/p/stroke-basic.html';
async function request(value?:Catalogue):Promise<Catalogue|null>{
 const user=cloudServices().auth.currentUser;if(!user)throw Error('請先登入管理員帳號。');
 const response=await fetch('/api/structure/stroke-speech/catalogue',{method:value?'POST':'GET',headers:{Authorization:`Bearer ${await user.getIdToken()}`,'X-Notebook-Request':'stroke-speech',...(value?{'Content-Type':'application/json'}:{})},...(value?{body:JSON.stringify(value)}:{}),signal:AbortSignal.timeout(15000)});
 const result=await response.json();if(!response.ok)throw Error(result.error||'基本筆畫清單載入失敗。');return result.item;
}
export default function StrokeCatalogue({onChange}:{onChange:(rows:CatalogueRow[])=>void}){
 const saved=useRef<Catalogue>({rows:seed});
 const [savedId,setSavedId]=useState('');
 const [value,setValue]=useState<Catalogue>({rows:seed}),[ready,setReady]=useState(false),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[heard,setHeard]=useState<string[]>([]),[dirty,setDirty]=useState(false);
 useEffect(()=>{let live=true;
  void request().then(async item=>{
   if(!live)return;
   const original:Catalogue=item?{...item,rows:item.rows.map(row=>({...row,zhuyin:row.zhuyin??seed.find(candidate=>candidate.id===row.id)?.zhuyin??''}))}:{rows:seed};
   saved.current=original;const rows=original.rows.map(row=>upgradeStrokeMnemonic(row));
   const upgraded=rows.some((row,index)=>row!==original.rows[index]);let next:Catalogue={...original,rows};
   if(upgraded){
    try{const result=await request(next);if(!result)throw Error('未取得儲存結果。');next=result;saved.current=result;if(live){setDirty(false);setMessage('已自動覆寫並儲存最新版口訣；讀音有變更的項目需重新試聽確認。');}}
    catch(error){if(live){setDirty(true);setMessage(`新版口訣自動儲存失敗：${(error as Error).message} 請重試儲存。`);}}
   }
   if(live){setValue(next);setReady(true);onChange(saved.current.rows);}
  }).catch(error=>{if(live)setMessage((error as Error).message);});
  return()=>{live=false;};
 },[onChange]);
 function edit(id:string,patch:Partial<CatalogueRow>){setSavedId('');setValue(old=>({...old,rows:old.rows.map(row=>row.id===id?{...row,...patch,...('confirmed' in patch?{}:{confirmed:false})}:row)}));setDirty(true);if(!('confirmed' in patch))setHeard(old=>old.filter(key=>key!==id));}
 function rowDirty(row:CatalogueRow){return JSON.stringify(row)!==JSON.stringify(saved.current.rows.find(item=>item.id===row.id));}
 async function save(id?:string){
  setBusy(true);setMessage('');setSavedId('');
  try{
   const payload=id?{...saved.current,rows:saved.current.rows.map(row=>row.id===id?value.rows.find(item=>item.id===id)!:row)}:value;
   const next=await request(payload);if(!next)throw Error('未取得儲存結果。');
   saved.current=next;
   const rows=id?value.rows.map(row=>row.id===id?next.rows.find(item=>item.id===id)!:row):next.rows;
   setValue({...next,rows});onChange(next.rows);
   setDirty(rows.some(row=>JSON.stringify(row)!==JSON.stringify(next.rows.find(item=>item.id===row.id))));
   if(id)setSavedId(id);
   setMessage(id?'已儲存此筆畫，其他卡片的未儲存修改仍保留。':'已儲存基本筆畫清單；逐字語音仍需另行核對與發布。');
  }catch(error){setMessage((error as Error).message);}finally{setBusy(false);}
 }
 return <details className="stroke-catalogue" open><summary>基本筆畫收集與念法核對（28 種）</summary><p>先收集及確認基本筆畫念法，再套用到下方各字。所有初始項目均待核對。</p><p><a href={STROKE_CATALOGUE_SOURCE} target="_blank" rel="noreferrer">開啟 HTML5 FUN 原站示範與錄音</a> · 本站試聽使用裝置中文語音，未收錄原站音檔。</p><StrokeVoiceSettings/><p>注音為待核對候選；用於顯示念法。實際試聽優先朗讀口訣，留空則使用「朗讀文字」，避免部分語音引擎將注音逐個符號念出。</p><p>已儲存且確認的項目才會出現在下方套用選單。修改名稱、念法或備註後需重新試聽確認。</p><p role="status">{message}{dirty?'（有尚未儲存的修改）':''}</p>{!ready&&<p>清單未載入，請重新開啟本頁後重試。</p>}<fieldset disabled={!ready||busy}><div className="stroke-speech-grid">{value.rows.map(row=><article key={row.id}><header className="stroke-card-heading"><h4><span className="stroke-catalogue-symbol">{row.symbol}</span> {row.name}</h4><button type="button" className="stroke-audition" disabled={!(row.mnemonic?.trim()||row.spoken.trim())} onClick={()=>{if(speakStrokeText(row.mnemonic?.trim()||row.spoken)){setHeard(old=>[...old,row.id]);setMessage('請實際聽完並確認讀音後，再勾選確認。');}else setMessage('此瀏覽器無法播放語音。');}}>試聽念法</button></header><p className="stroke-mnemonic-preview">{row.mnemonic?.trim()||'尚未設定口訣'}</p><details className="stroke-mnemonic-tip"><summary>為何這樣念？</summary><p>{strokeMnemonicReason(row.name)}</p>{row.mnemonic?.trim()&&row.mnemonic!==findStrokePreset(row.name)?.spoken&&<p>目前是自訂口訣；以上為對照表規則，請核對自訂內容。</p>}</details><p>參考例字：{row.examples}</p><details className="stroke-card-editor"><summary>編輯與核對</summary><label>注音念法<input value={row.zhuyin} maxLength={120} onChange={event=>edit(row.id,{zhuyin:event.target.value})}/></label><label>精簡語音讀音（口訣版）<input value={row.mnemonic??''} maxLength={30} onChange={event=>edit(row.id,{mnemonic:event.target.value})}/></label><button type="button" className="secondary" disabled={!findStrokePreset(row.name)} onClick={()=>edit(row.id,{mnemonic:findStrokePreset(row.name)?.spoken??''})}>帶入對照表口訣</button><label>朗讀文字<input value={row.spoken} maxLength={30} onChange={event=>edit(row.id,{spoken:event.target.value})}/></label><label>核對備註<textarea value={row.notes} maxLength={500} onChange={event=>edit(row.id,{notes:event.target.value})}/></label><label><input type="checkbox" checked={row.confirmed} disabled={!row.confirmed&&(!heard.includes(row.id)||!row.spoken.trim())} onChange={event=>edit(row.id,{confirmed:event.target.checked})}/>管理員已比對原站並試聽確認</label><button type="button" className="primary" disabled={!rowDirty(row)} onClick={()=>void save(row.id)} aria-label={`儲存${row.name}此筆畫`}>儲存此筆畫</button><small role="status">{savedId===row.id?'已儲存':rowDirty(row)?'尚未儲存':''}</small></details></article>)}</div><button type="button" className="primary" disabled={!dirty} onClick={()=>void save()}>儲存基本筆畫核對清單</button></fieldset></details>;
}
export function confirmedStrokeVoice(rows:CatalogueRow[],id:string):StrokeVoice|undefined {const row=rows.find(row=>row.id===id&&row.confirmed);return row?{name:row.name,spoken:row.spoken,zhuyin:row.zhuyin,mnemonic:row.mnemonic}:undefined;}
