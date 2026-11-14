import type { CompetitionQuestion } from './competitionApi';

export const questionCsvExample = '\uFEFF題目,選項A,選項B,選項C,選項D,正確答案(A-D),作答秒數(5-300)\r\n「日積月累」最接近哪個意思？,長期累積,立刻完成,全部忘記,暫時停止,A,30\r\n哪一個字的部首是「木」？,林,明,晴,問,A,20\r\n';

function rows(text:string){
 const result:string[][]=[];let row:string[]=[],field='',quoted=false;
 for(let i=0;i<text.length;i++){
  const char=text[i];
  if(quoted){if(char==='"'&&text[i+1]==='"'){field+='"';i++;}else if(char==='"')quoted=false;else field+=char;continue;}
  if(char==='"'){quoted=true;continue;}if(char===','){row.push(field.trim());field='';continue;}
  if(char==='\n'){row.push(field.trim());if(row.some(Boolean))result.push(row);row=[];field='';continue;}
  if(char!=='\r')field+=char;
 }
 if(quoted)throw Error('CSV 引號未成對，請依範例格式修正。');
 row.push(field.trim());if(row.some(Boolean))result.push(row);return result;
}

export function parseQuestionCsv(text:string):CompetitionQuestion[]{
 const parsed=rows(text.replace(/^\uFEFF/,''));
 if(parsed.length<2)throw Error('題庫沒有題目，請保留標題列並至少填寫一題。');
 if(parsed.length>101)throw Error('一次最多匯入 100 題。');
 const expected=['題目','選項A','選項B','選項C','選項D','正確答案(A-D)','作答秒數(5-300)'];
 if(expected.some((value,index)=>parsed[0][index]!==value)||parsed[0].length!==expected.length)throw Error('標題列與範例格式不同，請重新下載範例。');
 return parsed.slice(1).map((values,index)=>{
  const line=index+2,answer=values[5]?.toUpperCase(),seconds=Number(values[6]);
  if(values.length!==7)throw Error(`第 ${line} 列欄位數量不是 7 欄。`);
  if(!values[0]||values.slice(1,5).some(value=>!value))throw Error(`第 ${line} 列的題目或選項未填完整。`);
  if(values[0].length>500||values.slice(1,5).some(value=>value.length>300))throw Error(`第 ${line} 列文字過長。`);
  if(!['A','B','C','D'].includes(answer))throw Error(`第 ${line} 列的正確答案必須是 A、B、C 或 D。`);
  if(!Number.isInteger(seconds)||seconds<5||seconds>300)throw Error(`第 ${line} 列的作答秒數必須是 5～300 的整數。`);
  return {prompt:values[0],options:values.slice(1,5),answer:answer.charCodeAt(0)-65,seconds};
 });
}
