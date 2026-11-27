export interface CompetitionQuestion {difficulty?:'易'|'中'|'難';id?:string;type?:'sentence-practice'|'structure'|'writing';prompt:string;options?:string[];answer?:number;seconds:number;phrase?:string;character?:string;reading?:string}
import type { RubricItem } from '../server/sentence-rubric.mjs';
export interface CompetitionRoom {rubric?:RubricItem[];lessonTitles?:string[];id:string;code:string;title:string;className:string;status:'lobby'|'running'|'closed';questionCount:number;createdAt:number;duration:number;maxParticipants:number;startedAt:number|null;expiresAt:number|null;closedAt:number|null;loginMode:'roster'|'anonymous';gameType:'quiz'|'sentence-practice'|'structure'|'writing';testRoom:boolean;anonymousBirds?:{id:string;name:string;occupied:boolean;mine:boolean}[];nameChoices?:{seat:number;name:string}[];roster?:string[];questions?:CompetitionQuestion[]}
export interface CompetitionParticipant {uid:string;name:string;seat:number|null;avatarKind:'custom'|'default'|'anonymous';avatar:string|null;birdId?:string|null;index:number;correct:number;points:number;finished:boolean;mine?:boolean}
export interface LeaderboardItem extends CompetitionParticipant {rank:number;answered:number;mine:boolean}
export async function competitionRequest<T>(path:string,body?:unknown,student=false):Promise<T>{
 const user=student?null:(await import('./cloudSync')).cloudServices().auth.currentUser;
 const response=await fetch('/api/structure/competition'+path,{method:body===undefined?'GET':'POST',headers:{...(user?{Authorization:`Bearer ${await user.getIdToken()}`} : {}),'Content-Type':'application/json','X-Notebook-Request':'competition-room'},...(body===undefined?{}:{body:JSON.stringify(body)}),signal:AbortSignal.timeout(30000)});const value=await response.json();if(!response.ok)throw Error(value.error||'競賽服務暫時無法使用。');return value;
}
export async function competitionStudentRequest<T>(path:string,body?:unknown):Promise<T>{
 return competitionRequest<T>(path,body,true);
}
export function competitionJoinUrl(code:string){const url=new URL('/',window.location.origin);url.hash=`games/competition?code=${code}`;return url.toString();}
export function competitionCodeFromInput(value:string){
 const text=value.normalize('NFKC').trim();
 const parameter=text.match(/[?&]code=([^&#]*)/i);
 if(parameter){
  const code=new URLSearchParams(`code=${parameter[1]}`).get('code')?.normalize('NFKC').replace(/\s/g,'').toUpperCase()||'';
  return /^[A-Z2-9]{4}$/.test(code)?code:'';
 }
 const code=text.toUpperCase().replace(/\s/g,'');
 return /^[A-Z2-9]{0,4}$/.test(code)?code:'';
}
