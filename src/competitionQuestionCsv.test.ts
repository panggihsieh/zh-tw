import {describe,expect,it} from 'vitest';
import {parseQuestionCsv,questionCsvExample} from './competitionQuestionCsv';

describe('四選一 CSV 題庫',()=>{
 it('可讀取下載範例',()=>{const rows=parseQuestionCsv(questionCsvExample);expect(rows).toHaveLength(2);expect(rows[0]).toMatchObject({answer:0,seconds:30});});
 it('支援引號內的逗號與雙引號',()=>{const text='題目,選項A,選項B,選項C,選項D,正確答案(A-D),作答秒數(5-300)\n"哪個詞有逗號,但仍是同一題？","甲,乙","他說""好""",丙,丁,B,15';expect(parseQuestionCsv(text)[0].options).toEqual(['甲,乙','他說"好"','丙','丁']);});
 it('指出錯誤列號',()=>{const text='題目,選項A,選項B,選項C,選項D,正確答案(A-D),作答秒數(5-300)\n題目,甲,乙,丙,丁,E,30';expect(()=>parseQuestionCsv(text)).toThrow('第 2 列');});
});
