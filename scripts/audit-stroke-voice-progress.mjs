import fs from 'node:fs';
import {strokeFingerprint,validateStrokeSpeech} from '../server/stroke-speech.mjs';

const repo=new URL('../',import.meta.url);
const read=path=>JSON.parse(fs.readFileSync(new URL(path,repo),'utf8'));
const groups=read('reports/stroke-voice-curriculum-queue.json');
const results=new Map();
for(const filename of fs.readdirSync(new URL('reports/',repo)).filter(n=>/^nani-.*-stroke-review\.json$/.test(n))){
 for(const row of read('reports/'+filename).rows){
  const id=row.character.codePointAt(0).toString(16);
  const strokes=read('public/game-strokes/'+id+'.json');
  validateStrokeSpeech({...row,confirmed:true},strokes);
  if(results.has(row.character))throw Error('Duplicate review: '+row.character);
  results.set(row.character,row);
 }
}
const published=[...new Set(groups.flatMap(g=>g.rows.filter(r=>r.status==='published').map(r=>r.character)))];
const live=new Map(await Promise.all(published.map(async c=>{
 const id=c.codePointAt(0).toString(16),base='https://zh-tw.web.app';
 const [voice,stroke]=await Promise.all([fetch(base+'/api/structure/stroke-speech/'+id),fetch(base+'/game-strokes/'+id+'.json')]);
 if(!voice.ok||!stroke.ok)throw Error('Production request failed: '+c);
 const {item}=await voice.json(), strokes=await stroke.json();
 if(item?.confirmed)validateStrokeSpeech(item,strokes);
 return [c,Boolean(item?.confirmed&&item.fingerprint===strokeFingerprint(strokes))];
})));
const verificationPath=new URL('reports/stroke-speech-production-verification.json',repo);
if(fs.existsSync(verificationPath)){
 const verification=JSON.parse(fs.readFileSync(verificationPath,'utf8'));
 if(verification.site==='https://zh-tw.web.app')for(const row of verification.results??[]){
  if(row.status!=='passed'||!row.fingerprint)continue;
  const strokes=read('public/game-strokes/'+row.character.codePointAt(0).toString(16)+'.json');
  if(strokeFingerprint(strokes)===row.fingerprint)live.set(row.character,true);
 }
}
const batches=groups.map(group=>{
 const rows=group.rows.filter(r=>r.firstBatch).map(r=>{
  const id=r.character.codePointAt(0).toString(16);
  const status=live.get(r.character)?'published':results.get(r.character)?.status??(fs.existsSync(new URL('public/game-strokes/'+id+'.json',repo))?'needs-stroke-names':r.status==='stroke-file-staged'?'stroke-file-staged':'missing-strokes');
  return {character:r.character,status};
 });
 const counts=Object.fromEntries(['published','reviewed-local','needs-second-review','needs-stroke-names','stroke-file-staged','missing-strokes'].map(status=>[status,rows.filter(x=>x.status===status).length]));
 return {name:group.name,uniqueCharacters:rows.length,counts,rows};
});
fs.writeFileSync(new URL('reports/stroke-voice-progress.json',repo),JSON.stringify({checkedAt:new Date().toISOString(),batches},null,2)+'\n');
console.log(JSON.stringify(batches.map(({rows,...summary})=>summary),null,2));
