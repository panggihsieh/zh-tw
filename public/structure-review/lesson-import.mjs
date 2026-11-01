export const LESSON_KEY='hanzi-notebook.lesson-structures.v1';
export function uniqueCharacters(text){
  return [...new Set(String(text).match(/\p{Script=Han}/gu)||[])];
}
function csvRows(text){
  const rows=[];let row=[],cell='',quoted=false;
  for(let i=0;i<text.length;i++){
    const c=text[i];
    if(c==='"'){if(quoted&&text[i+1]==='"'){cell+='"';i++;}else quoted=!quoted;}
    else if(!quoted&&(c===','||c==='\n')){row.push(cell.trim());cell='';if(c==='\n'){rows.push(row);row=[];}}
    else if(c!=='\r')cell+=c;
  }
  if(quoted)throw Error('CSV 引號未結束。');
  row.push(cell.trim());if(row.some(Boolean))rows.push(row);return rows;
}
export function parseLessonFile(text,filename){
  if(text.length>1_000_000)throw Error('生字表超過 1 MB，請分課上傳。');
  text=text.replace(/^\uFEFF/,'');
  let title=filename.replace(/\.[^.]+$/,''),content=text;
  const ext=filename.split('.').at(-1).toLowerCase();
  if(ext==='json'){
    const value=JSON.parse(text);const chars=Array.isArray(value)?value:value.characters;
    if(typeof chars!=='string'&&!(Array.isArray(chars)&&chars.every(x=>typeof x==='string')))throw Error('JSON 請提供 characters 字串或陣列。');
    content=Array.isArray(chars)?chars.join(''):chars;
    if(!Array.isArray(value)&&typeof value.title==='string')title=value.title;
  }else if(ext==='csv'){
    const rows=csvRows(text);const column=rows[0]?.findIndex(x=>['生字','字','character','characters'].includes(x.toLowerCase()));
    if(column===undefined||column<0)throw Error('CSV 第一列需有「生字」欄位。');
    content=rows.slice(1).map(r=>r[column]||'').join('');
  }else if(ext!=='txt')throw Error('請上傳 TXT、CSV 或 JSON 生字表；PDF／照片請先整理成生字文字。');
  const characters=uniqueCharacters(content);validateLesson({id:'draft',title:title.trim(),characters});
  return {title:title.trim(),characters};
}
export function validateLesson(value){
  if(!value||typeof value.id!=='string'||!/^[-\w]{1,80}$/.test(value.id)||typeof value.title!=='string'||!value.title.trim()||value.title.length>80)throw Error('課名需為 1–80 字。');
  if(!Array.isArray(value.characters)||!value.characters.length||value.characters.length>500||value.characters.some(c=>typeof c!=='string'||!/^\p{Script=Han}$/u.test(c))||new Set(value.characters).size!==value.characters.length)throw Error('每課需有 1–500 個不重複生字。');
  return value;
}
export function validateLessons(values){
  if(!Array.isArray(values)||values.length>100)throw Error('最多儲存 100 課。');
  values.forEach(validateLesson);if(new Set(values.map(x=>x.id)).size!==values.length)throw Error('課別 ID 重複。');return values;
}
