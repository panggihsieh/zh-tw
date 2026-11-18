// Read-only cloud comparison. No storage objects are created or changed.
import fs from 'node:fs/promises';
import {GoogleAuth} from 'google-auth-library';
import {createWritingCloudStore} from '../server/writing-api.mjs';
import {validateStrokeSpeech,strokeFingerprint} from '../server/stroke-speech.mjs';

const auth=new GoogleAuth({scopes:['https://www.googleapis.com/auth/cloud-platform']});
const store=createWritingCloudStore(auth,'voltaic-circuit-511310-a3-zh-tw-writing');
const reviews=new Map();
for(const file of (await fs.readdir('reports')).filter(name=>/^nani-.*-stroke-review\.json$/.test(name))){
 for(const row of JSON.parse(await fs.readFile('reports/'+file,'utf8')).rows){
  if(reviews.has(row.character))throw Error('Duplicate review: '+row.character);
  reviews.set(row.character,row);
 }
}
const groups=JSON.parse(await fs.readFile('reports/stroke-voice-curriculum-queue.json','utf8'));
const characters=[...new Set(groups.flatMap(group=>group.rows.map(row=>row.character)))];
const existing=new Map();
let cursor;
do{
 const page=await store.list('stroke-speech/',cursor);
 for(const name of page.names){
  if(!/^stroke-speech\/[0-9a-f]+\.json$/.test(name))continue;
  const previous=await store.get(name);
  existing.set(String.fromCodePoint(parseInt(name.split('/')[1],16)),previous);
 }
 cursor=page.nextCursor;
}while(cursor);
const rows=[],issues=[];
for(const character of characters){
 const code=character.codePointAt(0).toString(16);
 const strokes=JSON.parse(await fs.readFile('public/game-strokes/'+code+'.json','utf8'));
 const previous=existing.get(character),review=reviews.get(character);
 if(previous){
  try{
   validateStrokeSpeech(previous.value,strokes);
   if(!previous.value.confirmed)throw Error('Existing teacher draft must not be overwritten');
   rows.push({character,action:'preserve-existing',generation:previous.generation,value:previous.value});
  }catch(error){issues.push({character,issue:'existing-data-needs-review',message:error.message});}
  continue;
 }
 if(!review||review.status!=='reviewed-local'||review.reviewStrokeNumbers?.length||review.geometryReviewStrokeNumbers?.length){issues.push({character,issue:'review-incomplete'});continue;}
 const value=validateStrokeSpeech({...review,confirmed:true},strokes);
 if(value.fingerprint!==strokeFingerprint(strokes))throw Error('Geometry mismatch: '+character);
 rows.push({character,action:'create',generation:'0',value});
}
await fs.mkdir('.local/stroke-speech-release',{recursive:true});
await fs.writeFile('.local/stroke-speech-release/plan.json',JSON.stringify({rows},null,2)+'\n');
const report={scope:'本機逐筆審核與實際雲端物件比對，尚未發布',characters:characters.length,preserveExisting:rows.filter(row=>row.action==='preserve-existing').length,create:rows.filter(row=>row.action==='create').length,issues};
await fs.writeFile('reports/stroke-speech-release-readiness.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
if(issues.length)process.exitCode=1;
