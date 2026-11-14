export interface CompetitionQuestion {id?:string;type?:'sentence-practice';prompt:string;options?:string[];answer?:number;seconds:number;phrase?:string;character?:string;reading?:string}
export interface CompetitionRoom {id:string;code:string;title:string;className:string;status:'lobby'|'running'|'closed';questionCount:number;createdAt:number;duration:number;maxParticipants:number;startedAt:number|null;expiresAt:number|null;closedAt:number|null;loginMode:'roster'|'anonymous';gameType:'quiz'|'sentence-practice';testRoom:boolean;roster?:string[];questions?:CompetitionQuestion[]}
export interface CompetitionParticipant {uid:string;name:string;seat:number|null;avatarKind:'custom'|'default'|'anonymous';avatar:string|null;index:number;correct:number;points:number;finished:boolean;mine?:boolean}
export interface LeaderboardItem extends CompetitionParticipant {rank:number;answered:number;mine:boolean}
export async function competitionRequest<T>(path:string,body?:unknown):Promise<T>{
 const {cloudServices}=await import('./cloudSync');const user=cloudServices().auth.currentUser;if(!user)throw Error('請先登入 Google 帳號。');
 const response=await fetch('/api/structure/competition'+path,{method:body===undefined?'GET':'POST',headers:{Authorization:`Bearer ${await user.getIdToken()}`,'Content-Type':'application/json','X-Notebook-Request':'competition-room'},...(body===undefined?{}:{body:JSON.stringify(body)}),signal:AbortSignal.timeout(30000)});const value=await response.json();if(!response.ok)throw Error(value.error||'競賽服務暫時無法使用。');return value;
}
export function competitionJoinUrl(code:string){const url=new URL('/',window.location.origin);url.hash=`games/competition?code=${code}`;return url.toString();}
