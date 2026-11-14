export interface SentenceQuestion { id:string;character:string;reading:string;definition?:string;source?:string }
export interface SentenceLesson {id:string;title:string;grade:number;term:string;year:string;characters:{character:string;readings:{reading:string;definition:string;source:string}[]}[]}
export interface SentenceEvent {id:string;title:string;minutes:number;lessons:string[];lessonIds:string[];roster:string[];questions:SentenceQuestion[];status:'published'|'running'|'closed';startsAt?:number;endsAt?:number}
export const elementLabels={person:'人',event:'事',time:'時',place:'地',object:'物'};
export interface SentenceGrade {targetOk:boolean;readingOk:boolean;idiom:{text:string;score:number};elements:Record<keyof typeof elementLabels,{evidence:string;score:number}>;fluency:number;feedback:string;total:number|null;uncertain:boolean}
export interface TeacherSentenceGrade {targetOk:boolean;idiom:number;elements:Record<keyof typeof elementLabels,number>;fluency:number;feedback:string;total?:number}
export interface SentencePracticeGrade {
  polished?: string;
  fullScoreExample?: string;
  creativeExample?: string;
  issue?: string;
  issueReason?: string;
}
export interface SentenceAnswer {eventId:string;uid:string;name:string;questionId:string;character:string;reading:string;original:string;sentence:string;submittedAt:number;status:string;aiGrade:SentenceGrade|null;teacherGrade?:TeacherSentenceGrade;gradingError?:string}
export interface SentencePracticeGrade {targetOk:boolean;meaningOk:boolean;uncertain:boolean;scores:{correctness:number;completeness:number;fluency:number;detail:number;mechanics:number};total:number|null;level:'優等'|'甲等'|'乙等'|'待加強'|'待確認';highlight:string;feedback:string}
export async function sentenceRequest<T>(path:string,body?:unknown):Promise<T> {
 const {cloudServices}=await import('./cloudSync');const u=cloudServices().auth.currentUser;
 if(!u)throw Error('請先登入 Google 帳號。');
 const response=await fetch('/api/structure/sentence'+path,{method:body===undefined?'GET':'POST',headers:{Authorization:`Bearer ${await u.getIdToken()}`,'Content-Type':'application/json','X-Notebook-Request':'sentence-game'},...(body!==undefined?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(140000)});
 const value=await response.json();if(!response.ok)throw Error(value.error||'競賽服務暫時無法使用。');return value;
}
