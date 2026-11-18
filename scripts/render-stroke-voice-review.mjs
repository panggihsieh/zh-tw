import fs from 'node:fs';
const root=new URL('../',import.meta.url);
const read=path=>JSON.parse(fs.readFileSync(new URL(path,root),'utf8'));
const report=read('reports/nani-upper-stroke-candidates.json');
const compounds=new Map(read('reports/nani-upper-compound-stroke-candidates.json').rows.map(row=>[row.character,row]));
const rows=report.rows.map(row=>{
 const strokes=read('public/game-strokes/'+row.character.codePointAt(0).toString(16)+'.json');
 if(strokes.length!==row.suggestions.length)throw Error(row.character);
 const match=compounds.get(row.character);
 const byIndex=new Map(match?.fingerprint===row.fingerprint?match.suggestions.map(s=>[s.index,s]):[]);
 return {character:row.character,fingerprint:row.fingerprint,strokes:row.suggestions.map((s,i)=>{
  const compound=byIndex.get(i+1);
  return {name:s.name??compound?.name,track:strokes[i].track.map(p=>[p.x,p.y])};
 })};
});
const html=`<!doctype html><html lang="zh-Hant"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>南一高年級逐筆核對</title>
<style>body{font:18px system-ui;padding:1rem;background:#faf9f3;color:#163529}button,label,select,input{font:inherit}main{display:flex;gap:.6rem;flex-wrap:wrap}figure{margin:0;padding:.45rem;border:1px solid #aab8a0;border-radius:.5rem;text-align:center}svg{display:block;width:112px;height:112px;background:white}input{width:7rem}small{display:block}</style>
<h1>南一高年級逐筆核對</h1><label>選字 <select id="chars"></select></label> <button id="export">匯出已填念法草稿</button><p id="status" role="status"></p><main id="strokes"></main>
<script>
const rows=${JSON.stringify(rows)};
const chars=document.getElementById('chars'),strokes=document.getElementById('strokes'),status=document.getElementById('status');
const key='zh-tw-stroke-review-drafts';
let drafts={};
try{drafts=JSON.parse(localStorage.getItem(key)||'{}')||{};}catch{}
rows.forEach((r,i)=>chars.add(new Option(r.character,i)));
function show(){
 const row=rows[Number(chars.value)];
 status.textContent=row.character+'，共 '+row.strokes.length+' 筆。候選念法請核對後再填。';
 strokes.innerHTML=row.strokes.map((s,i)=>'<figure><svg viewBox="0 0 2048 2048" aria-hidden="true"><path d="M0 1024H2048M1024 0V2048" stroke="#ccc" stroke-width="12"/><polyline points="'+s.track.map(p=>p.join(',')).join(' ')+'" fill="none" stroke="#175d9a" stroke-width="38" stroke-linejoin="round" stroke-linecap="round"/><circle cx="'+s.track[0][0]+'" cy="'+s.track[0][1]+'" r="46" fill="#a43a22"/></svg><figcaption><label>第 '+(i+1)+' 筆 <input maxlength="30"></label><small>'+ (s.name?'候選：'+s.name:'待判讀')+'</small></figcaption></figure>').join('');
 const inputs=[...strokes.querySelectorAll('input')];
 const id=row.character+':'+row.fingerprint;
 inputs.forEach((input,i)=>{
  input.value=drafts[id]?.[i]??'';
  input.addEventListener('input',()=>{
   drafts[id]=inputs.map(field=>field.value.trim());
   try{localStorage.setItem(key,JSON.stringify(drafts));}
   catch{status.textContent='無法存到瀏覽器，請先匯出草稿。';}
  });
 });
}
document.getElementById('export').onclick=()=>{
 const filled=rows.flatMap(row=>{
  const names=drafts[row.character+':'+row.fingerprint];
  if(!names?.some(Boolean))return [];
  return [{character:row.character,fingerprint:row.fingerprint,strokes:names.map(name=>({name,spoken:name})),status:'draft'}];
 });
 if(!filled.length){status.textContent='目前還沒有可匯出的草稿。';return;}
 const url=URL.createObjectURL(new Blob([JSON.stringify({rows:filled},null,2)],{type:'application/json'}));
 const a=document.createElement('a');a.href=url;a.download='stroke-voice-drafts.json';a.click();
 setTimeout(()=>URL.revokeObjectURL(url),1000);
};
chars.onchange=show;show();
</script></html>`;
fs.writeFileSync(new URL('reports/nani-upper-stroke-review.html',root),html);
console.log('Review page:',rows.length,'characters');
