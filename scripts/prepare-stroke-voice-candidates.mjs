import fs from 'node:fs';
import {strokeFingerprint} from '../server/stroke-speech.mjs';

const queue=JSON.parse(fs.readFileSync(new URL('../reports/stroke-voice-curriculum-queue.json',import.meta.url)));
const groupIndex = Number(process.argv[2] ?? 0);
const group = queue[groupIndex];
if (!group) throw new Error('Unknown curriculum group index');
function candidate(track) {
  const first=track[0],last=track.at(-1);
  const dx=last.x-first.x,dy=last.y-first.y,length=Math.hypot(dx,dy);
  if(length<180)return null;
  let lastProjection=0;
  for(const point of track){
    const x=point.x-first.x,y=point.y-first.y;
    const projection=(x*dx+y*dy)/length;
    if(Math.abs(x*dy-y*dx)/length>length*.055||projection+length*.025<lastProjection)return null;
    lastProjection=projection;
  }
  if(dx>0&&Math.abs(dy)<dx*.18)return '橫';
  if(dy>0&&Math.abs(dx)<dy*.10)return '豎';
  if(track.length>=3&&length>=460&&dx<0&&dy>0&&dy>=Math.abs(dx)*.75&&dy<=Math.abs(dx)*2.2)return '撇';
  return null;
}
const rows=group.rows.filter(row=>row.firstBatch && row.status==='needs-stroke-names').map(row=>{
 const id=row.character.codePointAt(0).toString(16);
 const strokes=JSON.parse(fs.readFileSync(new URL('../public/game-strokes/'+id+'.json',import.meta.url)));
 const suggestions=strokes.map((stroke,index)=>({index:index+1,name:candidate(stroke.track)}));
 return {character:row.character,fingerprint:strokeFingerprint(strokes),suggestions};
});
const summaries={
 characters:rows.length,
 strokes:rows.reduce((n,row)=>n+row.suggestions.length,0),
 straightCandidates:rows.reduce((n,row)=>n+row.suggestions.filter(stroke=>stroke.name).length,0),
};
const reference = {};
await Promise.all(group.rows.filter(row=>row.status==='published').map(async row=>{
 const id=row.character.codePointAt(0).toString(16);
 const strokes=JSON.parse(fs.readFileSync(new URL('../public/game-strokes/'+id+'.json',import.meta.url)));
 const response=await fetch('https://zh-tw.web.app/api/structure/stroke-speech/'+id);
 if(!response.ok)throw Error('Unable to load published reference '+row.character);
 const {item}=await response.json();
 if(!item?.confirmed||item.fingerprint!==strokeFingerprint(strokes))throw Error('Reference version mismatch '+row.character);
 strokes.forEach((stroke,index)=>{
  const name=candidate(stroke.track);
  if(!name)return;
  const result=reference[name]??={matches:0,mismatches:[]};
  const actual=item.strokes[index].name;
  if(actual===name)result.matches++;
  else result.mismatches.push({character:row.character,index:index+1,actual});
 });
}));
fs.writeFileSync(new URL('../reports/'+(groupIndex===0?'nani-upper':'curriculum-group-'+groupIndex)+'-stroke-candidates.json',import.meta.url),JSON.stringify({status:'unverified',summaries,reference,rows},null,2)+'\n');
console.log(summaries,JSON.stringify(reference));
