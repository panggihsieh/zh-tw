// Publish an already reviewed plan. Existing records are never overwritten.
import fs from 'node:fs/promises';
import {GoogleAuth} from 'google-auth-library';
import {createWritingCloudStore} from '../server/writing-api.mjs';
import {validateStrokeSpeech} from '../server/stroke-speech.mjs';

if(!process.argv.includes('--apply'))throw Error('Use --apply only after reviewing the release plan and validation results.');
const plan=JSON.parse(await fs.readFile('.local/stroke-speech-release/plan.json','utf8'));
const readiness=JSON.parse(await fs.readFile('reports/stroke-speech-release-readiness.json','utf8'));
if(readiness.issues.length||plan.rows.length!==readiness.characters)throw Error('Release plan is incomplete');
// Validate the complete plan before the first cloud mutation.
for(const row of plan.rows){
 const strokes=JSON.parse(await fs.readFile(`public/game-strokes/${row.character.codePointAt(0).toString(16)}.json`,'utf8'));
 validateStrokeSpeech(row.value,strokes);
 if(!['create','preserve-existing'].includes(row.action)||!row.value.confirmed)throw Error('Invalid release action');
}
const auth=new GoogleAuth({scopes:['https://www.googleapis.com/auth/cloud-platform']});
const store=createWritingCloudStore(auth,'voltaic-circuit-511310-a3-zh-tw-writing');
const same=(a,b)=>a.confirmed===b.confirmed&&a.fingerprint===b.fingerprint&&JSON.stringify(a.strokes)===JSON.stringify(b.strokes);
const results=[];
try{
 for(const row of plan.rows){
  const key=`stroke-speech/${row.character.codePointAt(0).toString(16)}.json`;
  if(row.action==='preserve-existing'){
   const previous=await store.get(key);
   if(!same(previous.value,row.value))throw Error('Existing data changed: '+row.character);
   results.push({character:row.character,status:'preserved'});continue;
  }
  const value={...row.value,updatedAt:new Date().toISOString()};
  try{await store.create(key,value);results.push({character:row.character,status:'created'});}
  catch(error){
   if(error.status!==412&&error.status!==409)throw error;
   const previous=await store.get(key);
   if(!same(previous.value,value))throw Error('Concurrent conflicting data: '+row.character);
   results.push({character:row.character,status:'already-created'});
  }
  if(results.length%100===0)console.log(`Published or preserved ${results.length}/${plan.rows.length}`);
 }
}finally{
 await fs.writeFile('reports/stroke-speech-release-publication.json',JSON.stringify({scope:'Cloud storage publication; public API and deployed geometry require separate verification',planned:plan.rows.length,completed:results.length,results},null,2)+'\n');
}
console.log(JSON.stringify({completed:results.length,planned:plan.rows.length}));
