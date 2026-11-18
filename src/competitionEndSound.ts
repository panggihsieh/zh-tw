import { useEffect, useRef } from 'react';
import type { CompetitionRoom } from './competitionApi';

let audio:HTMLAudioElement|null=null;
const sounded=new Set<string>();
export function endSoundEnabled(){try{return localStorage.getItem('zh-tw.competition-end-sound')!=='off';}catch{return true;}}
export function setEndSoundEnabled(value:boolean){try{localStorage.setItem('zh-tw.competition-end-sound',value?'on':'off');}catch{}if(!value)audio?.pause();}
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
 audio??=new Audio(`${import.meta.env.BASE_URL}audio/pisa-competition-end.mp3`);
 audio.volume=endSoundVolume()/100;audio.currentTime=0;
 await audio.play();
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
   sounded.add(room.id);void playCompetitionEndSound().catch(()=>{/* 試聽按鈕可手動播放被瀏覽器阻擋的音效。 */});
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
   if(!endSoundEnabled())return;
   audio??=new Audio(`${import.meta.env.BASE_URL}audio/pisa-competition-end.mp3`);
   if(audio.paused){audio.muted=true;void audio.play().then(()=>{audio!.pause();audio!.currentTime=0;audio!.muted=false;}).catch(()=>{if(audio)audio.muted=false;});}
  }
  document.addEventListener('pointerdown',unlock,{once:true});
  document.addEventListener('keydown',unlock,{once:true});
  return()=>{document.removeEventListener('pointerdown',unlock);document.removeEventListener('keydown',unlock);};
 },[]);
}
