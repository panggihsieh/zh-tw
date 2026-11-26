import {createHash} from 'node:crypto';
import WordExtractor from 'word-extractor';
import blueprint from './quiz-blueprint.json' with {type:'json'};
const hash=value=>createHash('sha256').update(value).digest('hex');
export function driveSourceId(value) {
  let u;try{u=new URL(value);}catch{throw Error('請輸入Google Drive檔案或資料夾連結');}
  if(u.protocol!=='https:'||u.username||u.password||u.port||!['drive.google.com','docs.google.com'].includes(u.hostname)||[...u.searchParams.keys()].some(k=>/token|code|key|secret/i.test(k)))throw Error('僅接受不含驗證權杖的Google Drive連結');
  const id=u.pathname.match(/\/(?:folders|d)\/([A-Za-z0-9_-]{8,})(?:\/|$)/)?.[1]||(u.pathname==='/open'?u.searchParams.get('id'):null);
  if(!id||!(/^[A-Za-z0-9_-]{8,}$/.test(id)))throw Error('無法辨識Drive檔案或資料夾ID');return id;
}
export function splitNaniSource(text,{grade,term,year,lessonKey}) {
  const candidates=blueprint.lessons.filter(l=>l.grade===grade&&l.term===term&&l.year===year);
  if(!candidates.length)throw Error('請選擇已登記的年級、冊次及學年度');
  const body=text.normalize('NFC').replace(/\r\n?/g,'\n').trim();
  if(body.length<20||body.length>100000)throw Error('教材文字長度需20–100000字');
  const markers=[...body.matchAll(/^(?:[一二三四五六七八九十]{1,3}、[^\n]+|讀寫練功房[^\n]*|閱讀充電站[^\n]*)$/gm)];
  const lessons=[];
  for(let i=0;i<markers.length;i++){
    const heading=markers[i][0],title=heading.replace(/^[一二三四五六七八九十]{1,3}、/,'').split(/[\u3000\t]/)[0].trim();
    const lesson=candidates.find(l=>l.title.replace(/^第.+?課[：:]/,'')===title);if(!lesson)continue;
    const passage=body.slice(markers[i].index,markers[i+1]?.index??body.length).trim();
    if(passage.length<20||passage.length>12000)throw Error(`${lesson.title}文字不足或超過12000字，請核對分課邊界`);
    if(lessons.some(l=>l.lessonKey===lesson.key))throw Error('課次標題重複，請核對來源');
    lessons.push({lessonKey:lesson.key,title:lesson.title,passage,textHash:hash(passage)});
  }
  if(!lessons.length){
    const lesson=candidates.find(l=>l.key===lessonKey);
    if(!lesson||body.length>12000||markers.length>0)throw Error('無法確認課次，請選擇單課或上傳有清楚課次標題的教材');
    lessons.push({lessonKey:lesson.key,title:lesson.title,passage:body,textHash:hash(body)});
  }
  return {lessons,missing:candidates.filter(l=>!lessons.some(row=>row.lessonKey===l.key)).map(l=>l.title)};
}
export async function extractQuizSource(bytes,filename) {
  if(/\.doc$/i.test(filename)){
    if(bytes.subarray(0,8).toString('hex')!=='d0cf11e0a1b11ae1')throw Error('檔案內容不是Word DOC格式');
    const doc=await new WordExtractor().extract(bytes);return doc.getBody();
  }
  if(/\.(txt|md)$/i.test(filename))return new TextDecoder('utf-8',{fatal:true}).decode(bytes);
  if(/\.pdf$/i.test(filename)){
    if(bytes.subarray(0,5).toString()!=='%PDF-')throw Error('檔案內容不是PDF');
    const {getDocument}=await import('pdfjs-dist/legacy/build/pdf.mjs');
    const task=getDocument({data:new Uint8Array(bytes),isEvalSupported:false,useSystemFonts:true});
    try{const doc=await task.promise;if(doc.numPages>60)throw Error('課文PDF最多60頁');const pages=[];for(let i=1;i<=doc.numPages;i++){const page=await doc.getPage(i);const t=await page.getTextContent();pages.push(t.items.map(x=>x.str?(x.str+(x.hasEOL?'\n':' ')):'').join(''));page.cleanup();}return pages.join('\n\n');}finally{await task.destroy();}
  }
  throw Error('支援Word DOC、文字型PDF及UTF-8 TXT／MD檔');
}
export function makeQuizSourceHandlers({store,scan,extract=extractQuizSource}) {
  const view=source=>({id:source.id,filename:source.filename,grade:source.grade,term:source.term,year:source.year,sourceUrls:source.sourceUrls,createdAt:source.createdAt,lessonCount:source.lessons.length,missing:source.missing});
  return async(path,method,input)=>{
    if(path==='/quiz-sources'&&method==='GET')return {items:(await scan('quiz-sources/')).map(view)};
    if(path==='/quiz-sources/resolve'&&method==='POST'){
      const id=driveSourceId(input.url);const sources=(await scan('quiz-sources/')).filter(s=>s.driveIds.includes(id));
      if(!sources.length)throw Error('這個連結尚未匯入教材庫；請先下載檔案，使用「檔案匯入」，不會自動擴大Drive存取權限');
      return {items:sources.map(view)};
    }
    if(path==='/quiz-sources/import'&&method==='POST'){
      if(typeof input.filename!=='string'||input.filename.length>200||!(/\.(doc|pdf|txt|md)$/i.test(input.filename))||typeof input.base64!=='string'||input.base64.length>7000000||!(/^[A-Za-z0-9+/]+={0,2}$/.test(input.base64)))throw Error('請提供5MB內的DOC、PDF、TXT或MD檔案');
      const bytes=Buffer.from(input.base64,'base64');if(bytes.toString('base64').replace(/=+$/,'')!==input.base64.replace(/=+$/,''))throw Error('檔案編碼無效');if(!bytes.length||bytes.length>5000000)throw Error('檔案需為5MB以內');
      if(!Array.isArray(input.sourceUrls??[])||(input.sourceUrls??[]).length>12)throw Error('教材來源連結最多12個');
      const driveIds=[...new Set((input.sourceUrls||[]).map(driveSourceId))];
      const sourceUrls=driveIds.map(id=>`https://drive.google.com/open?id=${id}`);
      const text=await extract(bytes,input.filename);const parts=splitNaniSource(text,input);
      const rawHash=hash(bytes),id=hash(`${rawHash}:${input.grade}:${input.term}:${input.year}:${parts.lessons.map(l=>l.lessonKey).join(',')}`);
      const original={rawHash,filename:input.filename,bytes:bytes.toString('base64'),mime:/\.doc$/i.test(input.filename)?'application/msword':/\.pdf$/i.test(input.filename)?'application/pdf':'text/plain'};
      const record={id,rawHash,filename:input.filename,grade:input.grade,term:input.term,year:input.year,driveIds,sourceUrls,...parts,parserVersion:'quiz-source-v1',createdAt:new Date().toISOString()};
      for(const [key,value]of [[`quiz-source-originals/${rawHash}.json`,original],[`quiz-sources/${id}.json`,record]]){
        try{await store.create(key,value);}catch(error){if(![409,412].includes(error.status))throw error;}
      }
      return {...view((await store.get(`quiz-sources/${id}.json`)).value),lessons:parts.lessons};
    }
    const match=path.match(/^\/quiz-sources\/([0-9a-f]{64})$/);
    if(match&&method==='GET'){const source=(await store.get(`quiz-sources/${match[1]}.json`)).value;return {...view(source),lessons:source.lessons};}
    return null;
  };
}
