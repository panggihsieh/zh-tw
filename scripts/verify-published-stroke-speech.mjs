// Verify the public website, not merely cloud storage or a local manifest.
import fs from 'node:fs/promises';
import {strokeFingerprint,validateStrokeSpeech} from '../server/stroke-speech.mjs';

const planPath=process.argv[2]||'.local/stroke-speech-release/plan.json';
const plan=JSON.parse(await fs.readFile(planPath,'utf8'));
const base='https://zh-tw.web.app';
const results=[];
let next=0;
async function get(path){
 let last;
 for(let attempt=0;attempt<3;attempt++){
  try{const response=await fetch(base+path,{signal:AbortSignal.timeout(20000),headers:{'Cache-Control':'no-cache'}});if(!response.ok)throw Error('HTTP '+response.status);return await response.json();}
  catch(error){last=error;if(attempt<2)await new Promise(resolve=>setTimeout(resolve,1000*(attempt+1)));}
 }
 throw last;
}
async function worker(){
 while(next<plan.rows.length){
  const row=plan.rows[next++],code=row.character.codePointAt(0).toString(16);
  try{
   const [voice,strokes]=await Promise.all([get('/api/structure/stroke-speech/'+code),get('/game-strokes/'+code+'.json')]);
   if(!voice.item?.confirmed)throw Error('No published reading');
   validateStrokeSpeech(voice.item,strokes);
   if(strokeFingerprint(strokes)!==row.value.fingerprint)throw Error('Deployed geometry differs from release');
   if(JSON.stringify(voice.item.strokes)!==JSON.stringify(row.value.strokes))throw Error('Published reading differs from release');
   results.push({character:row.character,status:'passed',strokes:strokes.length,fingerprint:voice.item.fingerprint});
  }catch(error){results.push({character:row.character,status:'failed',message:error.message});}
  if(results.length%100===0)console.log(`Verified ${results.length}/${plan.rows.length}`);
 }
}
await Promise.all(Array.from({length:6},worker));
const failures=results.filter(row=>row.status!=='passed');
const report={scope:'正式站全部教材字的公開API語音、確認狀態、逐筆文字及實際筆順檔指紋比對；不代表逐字裝置發音試聽',site:base,checkedAt:new Date().toISOString(),planned:plan.rows.length,passed:results.length-failures.length,failures,results};
await fs.writeFile('reports/stroke-speech-production-verification.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({planned:plan.rows.length,passed:report.passed,failures}));
if(failures.length)process.exitCode=1;
