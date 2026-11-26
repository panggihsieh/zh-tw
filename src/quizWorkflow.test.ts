import {describe,it,expect} from 'vitest';
import {runQuizWorkflow,importQuizSource,type LessonBank} from './quizWorkflow';
import type {quizRequest} from './quizApi';
const bank=():LessonBank=>({id:'test',lessonKey:'nani-115_1-5-1',title:'虛構測試',createdAt:'2026-11-26',paperIds:[],total:0,complete:false,lastError:'',rows:[]});
describe('試題製作工作流程',()=>{
 it('只製作所選類型，選取配額完成即停止，不把5題冒充整課55題',async()=>{
  let calls=0;const progress:number[]=[];
  const request=(async(_path:string,payload:any)=>{calls++;expect(payload.categories).toEqual(['成語']);return {...bank(),total:5,selectionComplete:true};}) as typeof quizRequest;
  const result=await runQuizWorkflow({bank:bank(),categories:['成語'],all:true,request,onProgress:b=>progress.push(b.total),shouldStop:()=>false});
  expect(calls).toBe(1);expect(result.complete).toBe(false);expect(progress).toEqual([5]);
 });
 it('中止只在已保存批次之間生效，失敗不自動重試',async()=>{
  let calls=0;const request=(async()=>{calls++;return {...bank(),total:5};}) as typeof quizRequest;
  await runQuizWorkflow({bank:bank(),categories:['字音字形'],all:true,request,onProgress:()=>{},shouldStop:()=>true});expect(calls).toBe(1);
  const fail=(async()=>{calls++;throw Error('模型拒絕');})as typeof quizRequest;
  await expect(runQuizWorkflow({bank:bank(),categories:['成語'],all:true,request:fail,onProgress:()=>{},shouldStop:()=>false})).rejects.toThrow('模型拒絕');expect(calls).toBe(2);
 });
 it('檔案輸入保留冊次與來源連結，過大檔案不送出',async()=>{
  let payload:any;const request=(async(_path:string,p:unknown)=>{payload=p;return {id:'test'};})as typeof quizRequest;
  await importQuizSource(new File(['合成來源'],'虛構.txt'),'nani-115_1-6-3',request,'https://drive.google.com/file/d/sampleSource/view');
  expect(payload.grade).toBe(6);expect(payload.year).toBe('115_1');expect(payload.sourceUrls).toHaveLength(1);expect(payload.base64).toBeTruthy();
  await expect(importQuizSource({size:5000001}as File,'nani-115_1-6-3',request)).rejects.toThrow('5MB');
 });
});
