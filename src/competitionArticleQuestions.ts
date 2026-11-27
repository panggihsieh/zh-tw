import { quizRequest, type QuizPaper, type QuizQuestion } from './quizApi';
import type { CompetitionQuestion } from './competitionApi';
export const ARTICLE_DIFFICULTIES = [{key:'易',label:'簡單'},{key:'中',label:'中等'},{key:'難',label:'困難'}] as const;
export type ArticleCounts = Record<'易'|'中'|'難',number>;
export function articlePlanProblem(counts:ArticleCounts){
 const values=Object.values(counts);
 if(values.some(value=>!Number.isInteger(value)||value<0||value>100))return '各難度題數須為 0–100 的整數。';
 const total=values.reduce((sum,value)=>sum+value,0);
 return total<1||total>100?'總題數須為 1–100 題。':'';
}
export function articleBatches(counts:ArticleCounts){
 const problem=articlePlanProblem(counts);if(problem)throw Error(problem);
 return ARTICLE_DIFFICULTIES.flatMap(({key})=>Array.from({length:Math.ceil(counts[key]/10)},(_,index)=>({difficulty:key,count:Math.min(10,counts[key]-index*10)})));
}
export class ArticleGenerationError extends Error {
 constructor(message:string,public readonly questions:CompetitionQuestion[]){super(message);}
}
export async function generateArticleQuestions({article,counts,grade,className,roster,onProgress,request=quizRequest}:{article:string;counts:ArticleCounts;grade:number;className:string;roster:string[];onProgress:(text:string)=>void;request?:typeof quizRequest}):Promise<CompetitionQuestion[]>{
 const batches=articleBatches(counts),total=Object.values(counts).reduce((sum,value)=>sum+value,0);
 if(!article.trim()||article.length>12000)throw Error('請先上傳或貼上 1–12000 字文章。');
 if(!className||!roster.length)throw Error('請先選擇有學生名冊的班級。');
 const drafts:QuizQuestion[]=[],questions:CompetitionQuestion[]=[],seen=new Set<string>();
 try{
  for(const [index,batch] of batches.entries()){
   const label=ARTICLE_DIFFICULTIES.find(item=>item.key===batch.difficulty)!.label;
   onProgress(`正在產生第 ${index+1}／${batches.length} 批（${label} ${batch.count} 題），已完成 ${questions.length}／${total} 題…`);
   const paper=await request<QuizPaper>('/generate',{
    title:`Kahoot 文章閱讀草稿・${label}`,className,grade,lesson:'文章閱讀。量化問題的四個選項必須使用明確阿拉伯數字及適用單位，正解須能由文章核對。',
    passage:article.trim(),questionMode:'original',roster,count:batch.count,categories:['課文理解（閱讀素養）'],difficulty:batch.difficulty,
    priorQuestions:drafts.map(({stem,options,answer,category})=>({stem,options,answer,category})),
   });
   if(!Array.isArray(paper.questions)||paper.questions.length!==batch.count)throw Error('AI 題數不符合設定，本批未帶入。');
   if(paper.questions.some(question=>!question||question.difficulty!==batch.difficulty||typeof question.stem!=='string'||!question.stem.trim()||question.stem.length>500||!Array.isArray(question.options)||question.options.length!==4||question.options.some(option=>typeof option!=='string'||!option.trim()||option.length>200)||new Set(question.options.map(option=>option.trim())).size!==4||!Number.isInteger(question.answer)||question.answer<0||question.answer>3))throw Error('AI 題目格式或難度不符合設定，本批未帶入。');
   const keys=paper.questions.map(question=>question.stem.normalize('NFKC').replace(/[\s\p{P}]/gu,''));
   if(keys.some(key=>!key||seen.has(key))||new Set(keys).size!==keys.length)throw Error('AI 產生了重複題目，本批未帶入。');
   if(paper.questions.some(question=>/多少|幾(?:個|次|人|年|月|天|小時|分鐘|公尺|元|倍|％|%)/u.test(question.stem)&&!/[0-9０-９]/u.test(question.options[question.answer])))throw Error('AI 量化題未給出明確數字答案，本批未帶入。');
   keys.forEach(key=>seen.add(key));drafts.push(...paper.questions);
   questions.push(...paper.questions.map(question=>({prompt:question.stem,options:question.options,answer:question.answer,seconds:30,difficulty:batch.difficulty})));
  }
  return questions;
 }catch(error){throw new ArticleGenerationError(`${(error as Error).message} 已完成 ${questions.length}／${total} 題；不會自動重試或開課。`,questions);}
}
