import {createHash} from 'node:crypto';
import bank from './sentence-bank.json' with {type:'json'};
import blueprint from './quiz-blueprint.json' with {type:'json'};
export async function readingContext({lessonId,passage:provided}, {scan,store,analyze}) {
 const lesson=bank.lessons.find(l=>l.id===lessonId);if(!lesson)throw Error('課次不存在');
 const catalog=blueprint.lessons.find(l=>l.grade===lesson.grade&&l.term===lesson.term&&l.year===lesson.year&&l.title===lesson.title);
 let passage='',source='';
 if(catalog){const sources=await scan('quiz-sources/');const matches=sources.flatMap(s=>s.lessons.filter(l=>l.lessonKey===catalog.key).map(l=>({...l,filename:s.filename})));if(matches.length){passage=matches[0].passage;source=matches[0].filename;}}
 if(!passage){if(typeof provided!=='string'||provided.trim().length<40||provided.length>12000)throw Error('本課尚缺已匯入全文，請貼上並確認課文全文後再使用AI。');passage=provided.trim();source='教師提供課文全文';}
 const sourceHash=createHash('sha256').update(passage).digest('hex');const key=`reading-context/v2/${lesson.id}-${sourceHash}.json`;
 const cached=await store.get(key).catch(e=>{if(e.status===404)return null;throw e;});if(cached)return cached.value;
 const result=await analyze({lesson,passage});
 const rows=lesson.characters.map(char=>{
  const candidates=(result.rows||[]).filter(r=>r.character===char.character);const row=candidates[0];
  const valid=candidates.length===1&&row?.ok===true&&typeof row.contextWord==='string'&&/^\p{Script=Han}{2,8}$/u.test(row.contextWord)&&row.contextWord.includes(char.character)&&passage.includes(row.contextWord)&&char.readings.some(r=>r.reading===row.reading)&&typeof row.evidence==='string'&&row.evidence.includes(row.contextWord)&&passage.includes(row.evidence);
  return valid?{character:char.character,reading:row.reading,contextWord:row.contextWord,evidence:row.evidence,status:'ready'}:{character:char.character,status:'pending',reason:'AI未能確認課文圈詞與候選讀音，請解鎖核對。'};
 });
 const value={lessonId,source,sourceHash,createdAt:new Date().toISOString(),rows};try{await store.create(key,value);}catch(e){if(e.status!==412)throw e;return(await store.get(key)).value;}return value;
}
