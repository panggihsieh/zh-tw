import {loadStructurePresets,inlineStructureHeader,inlineStructureControls,bindInlineStructures} from './inline-structure.mjs';
import {figure} from './structure-figure.mjs';
import {names,parseIds,suggestedWeights,validateCorrection,structureLabel} from './review-model.mjs';
const $=id=>document.getElementById(id);
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let book, corrections={}, running=false;
function current(c){return corrections[c.character]||{ids:c.ids||c.character,weights:suggestedWeights(parseIds(c.ids||c.character)),radical:c.dictionary[0]?.radical||'',explanation:'',source:'',note:'',status:'pending'};}
const labels={pending:'待核對',corrected:'已修正',reviewed:'已目測確認'};
function render(){
  let count=0, animatedCount=0;
  $('lessons').innerHTML=book.lessons.filter(l=>!$('lesson').value||l.id===$('lesson').value).map(l=>{
    const chars=l.characters.filter(c=>!$('search').value||$('search').value.includes(c.character));count+=chars.length;
    if(!chars.length)return '';
    const cards=chars.map(c=>{const v=current(c),ids=v.ids,tree=parseIds(ids),fig=figure(c.character,ids,v?.weights||suggestedWeights(tree));animatedCount+=Number(fig.animated);return `<article class="card"><div class="card-head"><span>${String(book.lessons.flatMap(x=>x.characters).findIndex(x=>x.character===c.character)+1).padStart(3,'0')}</span>${inlineStructureHeader(v)}</div><div class="pair"><div class="character">${esc(c.character)}</div>${fig.html}</div><div class="card-foot"><span>部首 ${esc(v?.radical||c.dictionary[0]?.radical||'待核')} · ${fig.animated?labels[v?.status||'pending']:'靜態待核'}</span><a href="editor.html?book=5-%E4%B8%8A&character=${encodeURIComponent(c.character)}">修正 ${esc(c.character)} ↗</a></div>${inlineStructureControls(c.character,v)}</article>`;}).join('');
    return `<section class="lesson-group"><div class="lesson-head"><h2>${esc(l.title)} · ${chars.length} 字</h2><a href="${esc(l.source)}" target="_blank" rel="noreferrer">課文生字來源 ↗</a></div><div class="grid">${cards}</div></section>`;
  }).join('');
  bindInlineStructures($('lessons'),book.lessons.flatMap(l=>l.characters),current,(c,value)=>{const next={...corrections,[c.character]:value};localStorage.setItem('kangxuan-structure-corrections-v1',JSON.stringify(next));corrections=next;render();$('save-message').textContent=`已儲存「${c.character}」的結構修正。`;});
  $('count').textContent=`顯示 ${count} / 224 字 · 可拆合 ${animatedCount} 字`;
}
$('animate').onclick=()=>{running=!running;document.body.classList.toggle('moving',running);$('animate').setAttribute('aria-checked',String(running));$('toggle-state').textContent=running?'ON':'OFF';};
$('lesson').onchange=render;$('search').oninput=render;
try {const response=await fetch('books.json');if(!response.ok)throw Error('字表載入失敗。');book=(await response.json()).books.find(b=>b.id==='5-上');if(!book)throw Error('找不到五上字表。');await loadStructurePresets();try {const saved=JSON.parse(localStorage.getItem('kangxuan-structure-corrections-v1')||'{}');for(const[c,v]of Object.entries(saved)){try{corrections[c]=validateCorrection(v);}catch{}}}catch{$('error').textContent='無法讀取本機修正，本次顯示原始候選。';}$('lesson').innerHTML+=book.lessons.map(l=>`<option value="${l.id}">${esc(l.title)}</option>`).join('');render();}catch(e){$('error').textContent=e.message;}
