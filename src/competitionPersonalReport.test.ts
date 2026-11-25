import { describe, expect, it } from 'vitest';
import { personalReportLines } from './competitionPersonalReport';
describe('個人競賽 PDF 內容', () => {
 it('保留零號選項、零分、未作答及舊資料差異', () => {
  const lines=personalReportLines({title:'測試課堂',className:'測試班',name:'虛構學生',points:100,date:0,questions:[
   {prompt:'題目甲',type:'quiz',options:['甲','乙'],answer:0,submitted:1,points:0,answered:true},
   {prompt:'題目乙',type:'quiz',options:['丙','丁'],answer:0,points:null,answered:false},
   {prompt:'舊題',type:'quiz',options:['丙','丁'],answer:1,points:null,answered:true},
  ]}).join('\n');
  expect(lines).toContain('個人作答：B．乙'); expect(lines).toContain('正確答案：A．甲');
  expect(lines).toContain('本題得分：0 分'); expect(lines).toContain('個人作答：未作答');
  expect(lines).toContain('舊課堂未保存作答紀錄');
 });
});
