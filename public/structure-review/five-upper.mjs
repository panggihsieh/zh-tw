import {names,parseIds,suggestedWeights,validateCorrection,structureLabel} from './review-model.mjs';
const $=id=>document.getElementById(id);
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let book, corrections={}, running=false;
const labels={pending:'待核對',corrected:'已修正',reviewed:'已目測確認'};
function figure(character,ids,weights){
  const root=parseIds(ids), unknown=/[①-⑳&？]/u.test(ids), animated=root.children.length>0&&!unknown;
  const rect=(x,y,w,h,color)=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${color}" stroke="#97a88c" stroke-width=".6"/>`;
  const text=(s,x,y,w,h)=>`<text x="${x+w/2}" y="${y+h/2}" dominant-baseline="central" text-anchor="middle" font-size="${Math.min(w*.8,h*.8,72)}">${esc(s)}</text>`;
  function regions(n,x,y,w,h,ratios){
    if('⿰⿲⿱⿳'.includes(n.value)){const vertical='⿱⿳'.includes(n.value);let shift=0;return n.children.map((_,i)=>{const size=(vertical?h:w)*ratios[i]/100,r=[vertical?x:x+shift,vertical?y+shift:y,vertical?w:size,vertical?size:h];shift+=size;return r;});}
    if(n.value==='⿻')return [[x,y,w*.65,h*.65],[x+w*.35,y+h*.35,w*.65,h*.65]];
    const outer=[x,y,w*.28,h*.28];let inner=[x+w*.28,y+h*.28,w*.69,h*.69];
    if(n.value==='⿴')inner=[x+w*.25,y+h*.25,w*.5,h*.5];
    if(n.value==='⿵')inner=[x+w*.25,y+h*.3,w*.5,h*.67];
    if(n.value==='⿶'){outer[1]=y+h*.72;inner=[x+w*.25,y,w*.5,h*.67];}
    if(n.value==='⿷')inner=[x+w*.3,y+h*.2,w*.67,h*.6];
    if(n.value==='⿹'){outer[0]=x+w*.72;inner=[x,y+h*.3,w*.67,h*.67];}
    if(n.value==='⿺'){outer[1]=y+h*.72;inner=[x+w*.3,y,w*.67,h*.67];}
    return [outer,inner];
  }
  function draw(n,x,y,w,h,depth=0){
    if(!n.children.length)return rect(x,y,w,h,['#e8efde','#f8e7d7','#e1edf1'][depth%3])+text(/[①-⑳&？]/u.test(n.value)?'待核':n.value,x,y,w,h);
    return regions(n,x,y,w,h,suggestedWeights(n)).map((r,i)=>draw(n.children[i],...r,depth+i+1)).join('');
  }
  const chunks=root.children.length?regions(root,8,8,84,84,weights).map((r,i)=>{const vertical='⿱⿳'.includes(root.value),d=(i-(root.children.length-1)/2)*16;return `<g class="part" style="--dx:${vertical?0:d}px;--dy:${vertical?d:0}px">${draw(root.children[i],...r,i+1)}</g>`;}).join(''):draw(root,8,8,84,84);
  return {animated,html:`<svg class="${animated?'animated':''}" viewBox="0 0 100 100" role="img" aria-label="${esc(character)}${esc(names[root.value]||'獨體／未再拆分')}拆合示意"><g fill="#285d50" font-family="MingLiU-ExtB,PMingLiU,Microsoft JhengHei,serif"><rect x="1" y="1" width="98" height="98" rx="2" fill="#f7f9f1" stroke="#c4d1bb" stroke-dasharray="3 3"/><g class="parts">${chunks}</g><g class="complete">${text(character,0,0,100,100)}</g></g></svg>`};
}
function render(){
  let count=0, animatedCount=0;
  $('lessons').innerHTML=book.lessons.filter(l=>!$('lesson').value||l.id===$('lesson').value).map(l=>{
    const chars=l.characters.filter(c=>!$('search').value||$('search').value.includes(c.character));count+=chars.length;
    if(!chars.length)return '';
    const cards=chars.map(c=>{const v=corrections[c.character],ids=v?.ids||c.ids||c.character,tree=parseIds(ids),fig=figure(c.character,ids,v?.weights||suggestedWeights(tree));animatedCount+=Number(fig.animated);return `<article class="card"><div class="card-head"><span>${String(book.lessons.flatMap(x=>x.characters).findIndex(x=>x.character===c.character)+1).padStart(3,'0')}</span><span>${esc(structureLabel(tree,v?.weights||suggestedWeights(tree)))}</span></div><div class="pair"><div class="character">${esc(c.character)}</div>${fig.html}</div><div class="card-foot"><span>部首 ${esc(v?.radical||c.dictionary[0]?.radical||'待核')} · ${fig.animated?labels[v?.status||'pending']:'靜態待核'}</span><a href="editor.html?book=5-%E4%B8%8A&character=${encodeURIComponent(c.character)}">修正 ${esc(c.character)} ↗</a></div></article>`;}).join('');
    return `<section class="lesson-group"><div class="lesson-head"><h2>${esc(l.title)} · ${chars.length} 字</h2><a href="${esc(l.source)}" target="_blank" rel="noreferrer">課文生字來源 ↗</a></div><div class="grid">${cards}</div></section>`;
  }).join('');
  $('count').textContent=`顯示 ${count} / 224 字 · 可拆合 ${animatedCount} 字`;
}
$('animate').onclick=()=>{running=!running;document.body.classList.toggle('moving',running);$('animate').setAttribute('aria-checked',String(running));$('toggle-state').textContent=running?'ON':'OFF';};
$('lesson').onchange=render;$('search').oninput=render;
try {const response=await fetch('books.json');if(!response.ok)throw Error('字表載入失敗。');book=(await response.json()).books.find(b=>b.id==='5-上');if(!book)throw Error('找不到五上字表。');try {const saved=JSON.parse(localStorage.getItem('kangxuan-structure-corrections-v1')||'{}');for(const[c,v]of Object.entries(saved)){try{corrections[c]=validateCorrection(v);}catch{}}}catch{$('error').textContent='無法讀取本機修正，本次顯示原始候選。';}$('lesson').innerHTML+=book.lessons.map(l=>`<option value="${l.id}">${esc(l.title)}</option>`).join('');render();}catch(e){$('error').textContent=e.message;}
