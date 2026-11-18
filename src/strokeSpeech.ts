import {useEffect,useRef,useState} from 'react';
import {cloudServices} from './cloudSync';
import {loadVoicePreference,selectVoice} from './ttsPreferences';

export interface StrokeVoice {name:string;spoken:string;mnemonic?:string;zhuyin?:string}
export interface StrokeSpeechEntry {fingerprint:string;confirmed:boolean;strokes:StrokeVoice[];updatedAt?:string}
export const STROKE_NAMES=['點','橫','豎','撇','捺','提','橫鉤','豎鉤','斜鉤','臥鉤','彎鉤','橫折','豎折','撇折','撇點','橫撇','橫折鉤','豎彎','豎彎鉤','橫折彎鉤','橫折折撇','橫折折折鉤'];
export async function fingerprintStrokes(strokes:unknown) {
 const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(strokes)));
 return Array.from(new Uint8Array(digest),byte=>byte.toString(16).padStart(2,'0')).join('');
}
export async function strokeSpeechRequest(character:string, options:{admin?:boolean;value?:StrokeSpeechEntry;signal?:AbortSignal}={}) {
 const headers:Record<string,string>={};
 if(options.admin){const user=cloudServices().auth.currentUser;if(!user)throw Error('請先登入管理者帳號。');headers.Authorization=`Bearer ${await user.getIdToken()}`;headers['X-Notebook-Request']='stroke-speech';}
 if(options.value)headers['Content-Type']='application/json';
 const response=await fetch(`/api/structure/stroke-speech/${character.codePointAt(0)!.toString(16)}${options.admin?'?admin=1':''}`,{method:options.value?'POST':'GET',headers,...(options.value?{body:JSON.stringify(options.value)}:{}),signal:options.signal??AbortSignal.timeout(15000)});
 const value=await response.json();
 if(!response.ok)throw Error(value.error||'筆畫語音載入失敗。');
 return value.item as StrokeSpeechEntry|null;
}
let currentSpeech:SpeechSynthesisUtterance|null=null;
export function stopStrokeSpeech() {if(currentSpeech && 'speechSynthesis' in window){window.speechSynthesis.cancel();currentSpeech=null;}}
export function speakStrokeText(text:string,onDone?:(completed:boolean)=>void) {
 if(!('speechSynthesis' in window))return false;
 try {
  window.speechSynthesis.cancel();
  const speech=new SpeechSynthesisUtterance(text);speech.lang='zh-TW';speech.rate=.85;
  const voice=selectVoice(window.speechSynthesis.getVoices(),loadVoicePreference(localStorage));if(voice)speech.voice=voice;
  currentSpeech=speech;speech.onend=()=>{if(currentSpeech===speech)currentSpeech=null;onDone?.(true);};
  speech.onerror=()=>{if(currentSpeech===speech)currentSpeech=null;onDone?.(false);};
  window.speechSynthesis.speak(speech);return true;
 }catch {currentSpeech=null;return false;}
}
export function strokeSpeechText(entry:StrokeSpeechEntry|null,index:number,mode:'practice'|'competition',event:'prompt'|'correct'|'mistake') {
 if(!entry?.confirmed)return '';
 const row=entry.strokes[index];if(!row)return '';
 const spoken=row.mnemonic?.trim()||row.spoken;
 if(mode==='competition')return event==='correct'?spoken:event==='mistake'?'請再試一次。':'';
 return event==='mistake'?`請再試一次，這一筆是${spoken}。`:event==='prompt'?`${index===0?'第一筆':'下一筆'}，${spoken}。`:'';
}
export function useStrokeSpeech(character:string,strokes:unknown[]|null,mode:'practice'|'competition') {
 const [entry,setEntry]=useState<StrokeSpeechEntry|null>(null),[enabled,setEnabled]=useState(false),[status,setStatus]=useState('正在載入筆畫語音…');
 const owner=useRef(character);owner.current=character;
 useEffect(()=>{
  const abort=new AbortController();setEntry(null);setEnabled(false);
  if(!strokes){setStatus('');return;}
  setStatus('正在載入筆畫語音…');
  void Promise.all([strokeSpeechRequest(character,{signal:abort.signal}),fingerprintStrokes(strokes)]).then(([value,fingerprint])=>{
   if(abort.signal.aborted)return;
   if(value?.confirmed && value.fingerprint===fingerprint && value.strokes.length===strokes.length){setEntry(value);setStatus('教師已確認筆畫語音');}
   else setStatus('此字尚無對應本版筆順的已確認語音。');
  }).catch(()=>{if(!abort.signal.aborted)setStatus('筆畫語音暫時無法載入，仍可書寫。');});
  return()=>{abort.abort();stopStrokeSpeech();};
 },[character,strokes]);
 function say(index:number,event:'prompt'|'correct'|'mistake') {
  if(!enabled||owner.current!==character)return;
  const text=strokeSpeechText(entry,index,mode,event);if(text && !speakStrokeText(text))setStatus('此瀏覽器不支援語音播放。');
 }
 function toggle(index:number) {
  if(!entry)return;
  if(enabled){stopStrokeSpeech();setEnabled(false);}else{setEnabled(true);if(mode==='practice'){const text=strokeSpeechText(entry,index,mode,'prompt');if(text)speakStrokeText(text);}}
 }
 function narrate(index:number):Promise<void> {
  if(!enabled||owner.current!==character)return Promise.resolve();
  const text=strokeSpeechText(entry,index,'practice','prompt');
  return new Promise(resolve=>{const timer=setTimeout(resolve,10000);const done=()=>{clearTimeout(timer);resolve();};if(!text||!speakStrokeText(text,done))done();});
 }
 return {available:!!entry,enabled,status,say,toggle,narrate};
}
