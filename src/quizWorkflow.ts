import {quizRequest} from './quizApi';
import blueprint from '../server/quiz-blueprint.json';
export interface QuizSourceSummary {id:string;filename:string;grade:number;term:string;year:string;lessonCount:number;missing:string[];sourceUrls:string[]}
export interface QuizSource extends QuizSourceSummary {lessons:{lessonKey:string;title:string;passage:string;textHash:string}[]}
export interface LessonBank {id:string;lessonKey:string;title:string;createdAt:string;paperIds:string[];total:number;complete:boolean;selectionComplete?:boolean;categories?:string[];outputFormat?:string;sourceId?:string;lastError:string;rows:{category:string;count:number;actual:number}[]}
export interface QuizWorkflowParameters {lessonKey:string;sourceId?:string;passage?:string;sourceLabel?:string;sourceConfirmed:boolean;difficulty:string;categories:string[];outputTitle:string;outputFormat:'cloud'|'cloud-json'}
export async function importQuizSource(file:File,lessonKey:string,request=quizRequest,sourceUrl=''):Promise<QuizSource>{
  if(file.size>5000000)throw Error('教材檔案最多5MB');
  const lesson=blueprint.lessons.find(l=>l.key===lessonKey);if(!lesson)throw Error('請先選課次');
  const bytes=new Uint8Array(await file.arrayBuffer());let binary='';for(let i=0;i<bytes.length;i+=32768)binary+=String.fromCharCode(...bytes.subarray(i,i+32768));
  return request('/quiz-sources/import',{filename:file.name,base64:btoa(binary),grade:lesson.grade,term:lesson.term,year:lesson.year,lessonKey,sourceUrls:sourceUrl.trim()?[sourceUrl.trim()]:[]});
}
export async function runQuizWorkflow({bank,categories,all,onProgress,shouldStop,request=quizRequest}:{bank:LessonBank;categories:string[];all:boolean;onProgress:(bank:LessonBank)=>void;shouldStop:()=>boolean;request?:typeof quizRequest}):Promise<LessonBank>{
  let current=bank;
  for(let batch=0;batch<11;batch++){
    const next=await request<LessonBank>(`/lesson-banks/${current.id}/next`,{categories});
    if(next.total<=current.total&&!next.complete&&!next.selectionComplete)throw Error('進度未增加，已停止，請重新整理後核對');
    current=next;onProgress(current);
    if(!all||current.complete||current.selectionComplete||shouldStop())return current;
  }
  return current;
}
export async function downloadQuizBank(bank:LessonBank,request=quizRequest){
  const data=await request(`/lesson-banks/${bank.id}/export`);
  const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json;charset=utf-8'}));
  const link=document.createElement('a');link.href=url;link.download=bank.title.replace(/[\\/:*?"<>|]/g,'_')+'.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
