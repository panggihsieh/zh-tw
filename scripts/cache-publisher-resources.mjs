// Downloads only URLs in a teacher-confirmed registry; no credentials/cookies.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {readResource,extractChoices,sha} from '../server/publisher-sync.mjs';
const input=process.argv[2],out=resolve(process.argv[3]||'.local/publisher-sources');
if(!input)throw Error('Usage: node scripts/cache-publisher-resources.mjs registry.json .local/publisher-sources');
const {items}=JSON.parse(await readFile(input,'utf8'));await mkdir(out,{recursive:true});
const report=[];let cursor=0;
await Promise.all(Array.from({length:3},async()=>{while(cursor<items.length){const item=items[cursor++];try{
 const r=await readResource(item.url),id=sha(item.url),questions=extractChoices(r.text),file=`${id}-${item.title.replace(/[<>:"/\\|?*\x00-\x1f]/g,'_')}`;
 await writeFile(resolve(out,file),Buffer.from(r.bytes,'base64'));const {bytes,...metadata}=r;
 await writeFile(resolve(out,id+'.json'),JSON.stringify({...item,...metadata,file,questions},null,2));report.push({...item,file,rawHash:r.rawHash,textHash:r.textHash,pages:r.pages,choices:questions.length,status:'downloaded'});
 console.log(`${item.grade}${item.term} ${item.title}: ${questions.length} choices`);
 }catch(e){report.push({...item,status:'needs_review',error:e.message});console.log(`${item.title}: needs review`);}}}));
await writeFile(resolve(out,'report.json'),JSON.stringify(report,null,2));
console.log(JSON.stringify({downloaded:report.filter(x=>x.status==='downloaded').length,needsReview:report.filter(x=>x.status!=='downloaded').length,total:items.length}));
