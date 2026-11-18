import fs from 'node:fs';
import {strokeFingerprint} from '../server/stroke-speech.mjs';

const read=file=>JSON.parse(fs.readFileSync(file,'utf8'));
const load=c=>read('public/game-strokes/'+c.codePointAt(0).toString(16)+'.json');
const groups=read('reports/stroke-voice-curriculum-queue.json');
const groupIndex=Number(process.argv[2] ?? 0);
const queue=groups[groupIndex];
if (!queue) throw Error('Unknown curriculum group index');
const references=[];
const simple=new Set(['橫','豎','撇','點','捺','挑']);
function signature(track){
 const points=[track[0]];
 for(const p of track.slice(1))if(Math.hypot(p.x-points.at(-1).x,p.y-points.at(-1).y)>0)points.push(p);
 if(points.length<3)return null;
 const distances=[0];
 for(let i=1;i<points.length;i++)distances.push(distances.at(-1)+Math.hypot(points[i].x-points[i-1].x,points[i].y-points[i-1].y));
 const length=distances.at(-1);
 if(length<220)return null;
 let segment=1;
 return Array.from({length:17},(_,i)=>{
  const d=length*i/16;
  while(distances[segment]<d&&segment<points.length-1)segment++;
  const t=(d-distances[segment-1])/(distances[segment]-distances[segment-1]);
  const a=points[segment-1],b=points[segment];
  return [(a.x+(b.x-a.x)*t-points[0].x)/length,(a.y+(b.y-a.y)*t-points[0].y)/length];
 }).flat();
}
function add(character,strokes,names){
 strokes.forEach((stroke,i)=>{
  const shape=signature(stroke.track);
  if(shape)references.push({character,index:i+1,name:names[i].name,shape});
 });
}
await Promise.all(groups[0].rows.filter(r=>r.status==='published').map(async ({character})=>{
 const response=await fetch('https://zh-tw.web.app/api/structure/stroke-speech/'+character.codePointAt(0).toString(16));
 const {item}=await response.json(),strokes=load(character);
 if(!response.ok||!item?.confirmed||item.fingerprint!==strokeFingerprint(strokes))throw Error(character);
 add(character,strokes,item.strokes);
}));
for(const name of ['7','8']){
 const report=read('reports/nani-5a-lesson-'+name+'-stroke-review.json');
 for(const row of report.rows.filter(r=>r.status==='reviewed-local')){
  const strokes=load(row.character);
  if(row.fingerprint!==strokeFingerprint(strokes))throw Error(row.character);
  add(row.character,strokes,row.strokes);
 }
}
function match(shape,character){
 if(!shape)return null;
 const near=references.filter(r=>r.character!==character).map(r=>({
  ...r,error:Math.max(...shape.map((x,i)=>Math.abs(x-r.shape[i]))),
 })).filter(r=>r.error<=.047).sort((a,b)=>a.error-b.error);
 const first=near[0];
 if(!first||simple.has(first.name)||near.some(r=>r.name!==first.name)||new Set(near.map(r=>r.character)).size<2)return null;
 return {name:first.name,references:near.slice(0,4).map(({character,index})=>({character,index}))};
}
const sample=references.map(r=>({r,result:match(r.shape,r.character)})).filter(x=>x.result);
const mismatches=sample.filter(({r,result})=>r.name!==result.name).map(({r,result})=>({character:r.character,index:r.index,expected:r.name,proposed:result.name}));
const rows=[];
for(const row of queue.rows.filter(r=>r.firstBatch && r.status==='needs-stroke-names')){
 const strokes=load(row.character);
 const suggestions=strokes.flatMap((s,i)=>{
  const result=match(signature(s.track),row.character);
  return result?[{index:i+1,...result}]:[];
 });
 if(suggestions.length)rows.push({character:row.character,fingerprint:strokeFingerprint(strokes),suggestions});
}
const summary={referenceStrokes:references.length,crossChecks:sample.length,mismatches,characters:rows.length,candidates:rows.reduce((n,r)=>n+r.suggestions.length,0)};
fs.writeFileSync('reports/'+(groupIndex===0?'nani-upper':'curriculum-group-'+groupIndex)+'-compound-stroke-candidates.json',JSON.stringify({status:'unverified',summary,rows},null,2)+'\n');
console.log(JSON.stringify(summary));
