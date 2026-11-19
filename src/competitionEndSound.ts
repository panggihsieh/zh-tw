import { useEffect, useRef, useSyncExternalStore } from 'react';
import type { CompetitionRoom } from './competitionApi';

let audio:HTMLAudioElement|null=null;
const sounded=new Set<string>();
let generation=0,priming=false;
let soundStatus:'idle'|'playing'|'blocked'|'stopped'|'silent'='idle';
const listeners=new Set<()=>void>();
function updateStatus(value:typeof soundStatus){soundStatus=value;listeners.forEach(listener=>listener());}
export function useEndSoundStatus(){return useSyncExternalStore(listener=>{listeners.add(listener);return()=>listeners.delete(listener);},()=>soundStatus,()=>soundStatus);}
function endAudio(){
 audio??=new Audio(`${import.meta.env.BASE_URL}audio/pisa-competition-end.mp3`);
 audio.onended=()=>updateStatus('idle');
 audio.onerror=()=>updateStatus('blocked');
 return audio;
}
export function stopCompetitionEndSound(){generation++;priming=false;if(audio){audio.pause();audio.currentTime=0;audio.muted=false;}updateStatus('stopped');}
export async function primeCompetitionEndSound(){
 if(!endSoundEnabled()||priming||soundStatus==='playing')return;
 const player=endAudio(),run=++generation;priming=true;player.muted=false;player.volume=0;
 try{await player.play();}catch{/* Retry at the next user gesture. */}
 finally{if(run===generation){player.pause();player.currentTime=0;player.volume=endSoundVolume()/100;priming=false;}}
}
export function endSoundEnabled(){try{return localStorage.getItem('zh-tw.competition-end-sound')!=='off';}catch{return true;}}
export function setEndSoundEnabled(value:boolean){try{localStorage.setItem('zh-tw.competition-end-sound',value?'on':'off');}catch{}if(!value)stopCompetitionEndSound();}
export function endSoundVolume(){
 try {
  const value=Number(localStorage.getItem('zh-tw.competition-end-volume') ?? 60);
  return Number.isFinite(value) ? Math.max(0,Math.min(100,value)) : 60;
 } catch { return 60; }
}
export function setEndSoundVolume(value:number){
 try { localStorage.setItem('zh-tw.competition-end-volume',String(value)); } catch {}
 if(audio)audio.volume=value/100;
}
export async function playCompetitionEndSound(){
 if(!endSoundEnabled())return;
 const player=endAudio(),run=++generation;priming=false;player.muted=false;
 player.volume=endSoundVolume()/100;player.currentTime=0;
 if(player.volume===0){updateStatus('silent');return;}
 try{await player.play();if(run===generation)updateStatus('playing');}
 catch(error){if(run===generation){updateStatus('blocked');throw error;}}
}
export async function playClosedCompetitionSound(roomId:string){
 if(sounded.has(roomId))return;
 sounded.add(roomId);
 setEndSoundEnabled(true);
 try { await playCompetitionEndSound(); }
 catch(error){sounded.delete(roomId);throw error;}
}
export function observeCompetitionEnd(rooms:CompetitionRoom[],previous:Map<string,string>){
 for(const room of rooms){
  if(previous.get(room.id)==='running'&&room.status==='closed'&&!sounded.has(room.id)){
   sounded.add(room.id);setEndSoundEnabled(true);void playCompetitionEndSound().catch(()=>{/* 試聽按鈕可手動播放被瀏覽器阻擋的音效。 */});
  }
  previous.set(room.id,room.status);
 }
}
export function useCompetitionEndSound(rooms:CompetitionRoom[]){
 const previous=useRef(new Map<string,string>());
 useEffect(()=>{
  observeCompetitionEnd(rooms,previous.current);
 },[rooms]);
 useEffect(()=>{
  function unlock(){
   if(soundStatus==='blocked'){void playCompetitionEndSound().catch(()=>{});return;}
   void primeCompetitionEndSound();
  }
  document.addEventListener('pointerdown',unlock);
  document.addEventListener('keydown',unlock);
  return()=>{document.removeEventListener('pointerdown',unlock);document.removeEventListener('keydown',unlock);};
 },[]);
}
