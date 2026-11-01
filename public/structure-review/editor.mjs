import {names,parseIds,suggestedWeights,validateWeights,validateCorrection} from './review-model.mjs';
const $=id=>document.getElementById(id);
const key='kangxuan-structure-corrections-v1', viewKey='kangxuan-structure-view-v1';
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const states={pending:'待核對',corrected:'已修正',reviewed:'已目測確認'};
let data, corrections={}, page=0, selected, savedView={};
try {corrections=JSON.parse(localStorage.getItem(key)||'{}'); for(const v of Object.values(corrections)) validateCorrection(v); savedView=JSON.parse(localStorage.getItem(viewKey)||'{}');} catch {corrections={};$('message').textContent='本機紀錄無法讀取，請匯入備份或重新儲存。';}
function current(c){return corrections[c.character]||{ids:c.ids||c.character,weights:suggestedWeights(parseIds(c.ids||c.character)),radical:c.dictionary[0]?.radical||'',explanation:'',source:'',note:'',status:'pending'};}
function diagram(ids,weights){
  const tree=parseIds(ids), colors=['#e8efde','#f8e7d7','#e1edf1'];
  function rect(x,y,w,h,color){return `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${color}" stroke="#8b9e81" stroke-width=".65"/>`;}
  function text(s,x,y,w,h){return `<text x="${x+w/2}" y="${y+h/2}" text-anchor="middle" dominant-baseline="central" font-size="${Math.min(w*.76,h*.76,62)}">${esc(s)}</text>`;}
  function draw(n,x,y,w,h,depth=0){
    if(!n.children.length) return rect(x,y,w,h,colors[depth%3])+text(/[①-⑳&？]/u.test(n.value)?'待核':n.value,x,y,w,h);
    if('⿰⿲⿱⿳'.includes(n.value)){
      const vertical='⿱⿳'.includes(n.value), ratios=depth===0?weights:suggestedWeights(n);let shift=0;
      return n.children.map((child,i)=>{const size=(vertical?h:w)*ratios[i]/100;const svg=draw(child,vertical?x:x+shift,vertical?y+shift:y,vertical?w:size,vertical?size:h,depth+i+1);shift+=size;return svg;}).join('');
    }
    // Enclosures and overlaps use occupied-region schematics, not clipped glyphs.
    const op=n.value;let inner=[x+w*.25,y+h*.25,w*.65,h*.65], outer=[x,y,w*.25,h*.25];
    if(op==='⿴') inner=[x+w*.22,y+h*.22,w*.56,h*.56];
    if(op==='⿵') inner=[x+w*.22,y+h*.32,w*.56,h*.65];
    if(op==='⿶'){inner=[x+w*.22,y,w*.56,h*.65];outer=[x,y+h*.75,w*.25,h*.25];}
    if(op==='⿷') inner=[x+w*.32,y+h*.2,w*.65,h*.6];
    if(op==='⿹'){inner=[x,y+h*.3,w*.65,h*.67];outer=[x+w*.75,y,w*.25,h*.25];}
    if(op==='⿺'){inner=[x+w*.3,y,w*.67,h*.65];outer=[x,y+h*.7,w*.3,h*.3];}
    if(op==='⿻') inner=[x+w*.35,y+h*.35,w*.65,h*.65];
    return rect(x,y,w,h,colors[depth%3])+draw(n.children[0],...outer,depth+1)+draw(n.children[1],...inner,depth+2);
  }
  return `<svg viewBox="0 0 100 100" role="img" aria-label="${esc(names[tree.value]||'獨體／未再拆分')}結構候選"><g fill="#285d50" font-family="MingLiU-ExtB,PMingLiU,Microsoft JhengHei,serif">${draw(tree,1,1,98,98)}</g></svg>`;
}
function pair(c,v){return `<div class="pair"><div class="character">${esc(c.character)}</div>${diagram(v.ids,v.weights)}</div>`;}
function book(){return data.books.find(b=>b.id===$('book').value);}
function lessons(){const b=book();$('lesson').innerHTML='<option value="">全部課別</option>'+b.lessons.map(l=>`<option value="${l.id}">${esc(l.title)}</option>`).join('');}
function render(){
  const b=book(), all=b.lessons.flatMap(l=>l.characters.map(c=>({...c,lesson:l})));
  const list=all.filter(c=>(!$('lesson').value||c.lesson.id===$('lesson').value)&&(!$('search').value||$('search').value.includes(c.character))&&(!$('status').value||current(c).status===$('status').value));
  page=Math.max(0,Math.min(page,Math.ceil(list.length/24)-1));
  $('scope').textContent=`${b.title} · ${b.year.replace('_1',' 學年度上學期').replace('_2',' 學年度下學期')} · ${b.lessons.length} 課 / ${all.length} 字 · 符合條件 ${list.length} 字 · 本冊已目測確認 ${all.filter(c=>current(c).status==='reviewed').length} 字`;
  $('grid').innerHTML=list.slice(page*24,page*24+24).map(c=>{const v=current(c),tree=parseIds(v.ids);return `<article class="card ${v.status}"><div class="card-top"><span>${esc(c.lesson.title.split('：')[0])}</span><span>${esc(names[tree.value]||'獨體／未再拆分')}</span></div>${pair(c,v)}<div class="card-bottom"><span>部首：${esc(v.radical||'待核')}</span><span class="badge">${states[v.status]}</span></div><button data-char="${esc(c.character)}">目測／修正 ${esc(c.character)}</button></article>`;}).join('');
  $('position').textContent=list.length?`${page+1} / ${Math.ceil(list.length/24)} 頁`:'沒有符合的生字';$('prev').disabled=page===0;$('next').disabled=(page+1)*24>=list.length;
  try{localStorage.setItem(viewKey,JSON.stringify({book:b.id,lesson:$('lesson').value,search:$('search').value,status:$('status').value,page}));}catch{}
  $('grid').querySelectorAll('button').forEach(btn=>btn.onclick=()=>open(all.find(c=>c.character===btn.dataset.char)));
}
function open(c){
  selected=c;const v=current(c);$('edit-title').textContent=`${c.character} · 結構修正`;
  for(const id of ['ids','radical','explanation','source','note']) $(id).value=v[id];
  $('weights').value=v.weights.join(',');$('review-status').value=v.status;
  $('dictionary').textContent=c.dictionary.length?c.dictionary.map(d=>`部首：${d.radical}｜讀音：${d.reading}｜${d.meaning}`).join('\n'):'教育部簡編本未收錄此單字，部首、音義待核對。';
  $('lesson-source').href=c.lesson.source;$('lesson-source').textContent=`${c.lesson.title} · 教育百科來源 ↗`;
  $('error').textContent='';preview();$('edit').showModal();
}
function formValue(){const tree=parseIds($('ids').value);return validateCorrection({ids:$('ids').value.trim(),weights:validateWeights($('weights').value,tree.children.length||1),radical:$('radical').value,explanation:$('explanation').value,source:$('source').value,note:$('note').value,status:$('review-status').value,updatedAt:new Date().toISOString()});}
function preview(){try{const tree=parseIds($('ids').value);$('weights').disabled=!(tree.children.length && '⿰⿲⿱⿳'.includes(tree.value));$('weights-help').textContent=$('weights').disabled?'獨體、包圍與重疊採位置示意，本欄不調整輪廓；可修改結構式及查證紀錄。':'比例調整第一層分區；內層仍採初始示意比例。';$('preview').innerHTML=pair(selected,formValue());$('error').textContent='';}catch(e){$('error').textContent=e.message;}}
$('ids').onchange=()=>{try{$('weights').value=suggestedWeights(parseIds($('ids').value)).join(',');preview();}catch(e){$('error').textContent=e.message;}};
$('weights').onchange=preview;$('preview-button').onclick=preview;
$('operators').innerHTML=Object.entries(names).map(([op,name])=>`<button type="button" data-op="${op}" title="${name}">${op} ${name}</button>`).join('');
$('operators').querySelectorAll('button').forEach(btn=>btn.onclick=()=>{$('ids').value=btn.dataset.op;$('ids').focus();});
$('close').onclick=()=>$('edit').close();
$('form').onsubmit=e=>{e.preventDefault();try{const value=formValue(), next={...corrections,[selected.character]:value};localStorage.setItem(key,JSON.stringify(next));corrections=next;$('edit').close();$('message').textContent=`已儲存「${selected.character}」的修正（同字跨冊共用）。`;render();}catch(e){$('error').textContent=`無法儲存：${e.message}`;}};
$('book').onchange=()=>{page=0;lessons();render();};
for(const id of ['lesson','search','status']) $(id).oninput=()=>{page=0;render();};
$('prev').onclick=()=>{page--;render();};$('next').onclick=()=>{page++;render();};
$('export').onclick=()=>{const blob=new Blob([JSON.stringify({version:1,exportedAt:new Date().toISOString(),corrections},null,2)],{type:'application/json'});const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='康軒五六年級-結構修正.json';a.click();URL.revokeObjectURL(url);};
$('import').onchange=async()=>{try{const file=$('import').files[0];if(!file)return;if(file.size>4e6)throw Error('檔案過大。');const imported=JSON.parse(await file.text());if(imported.version!==1||!imported.corrections||Array.isArray(imported.corrections))throw Error('版本或格式錯誤。');const next={...corrections};for(const [c,v]of Object.entries(imported.corrections)){if(!/^\p{Script=Han}$/u.test(c))throw Error('生字鍵值格式錯誤。');next[c]=validateCorrection(v);}localStorage.setItem(key,JSON.stringify(next));corrections=next;render();$('message').textContent='修正已匯入；同字以匯入版本為準。';}catch(e){$('message').textContent=`匯入失敗：${e.message}`;}$('import').value='';};
const query=new URLSearchParams(location.search);if(query.get('book')==='5-上'&&/^\p{Script=Han}$/u.test(query.get('character')||''))savedView={book:'5-上',search:query.get('character'),lesson:'',status:'',page:0};
try{const response=await fetch('books.json');if(!response.ok)throw Error('無法載入字表。');data=await response.json();$('book').innerHTML=data.books.map(b=>`<option value="${b.id}">${b.title}</option>`).join('');if(data.books.some(b=>b.id===savedView.book))$('book').value=savedView.book;lessons();if([...$('lesson').options].some(o=>o.value===savedView.lesson))$('lesson').value=savedView.lesson;$('search').value=savedView.search||'';$('status').value=savedView.status||'';page=Number.isInteger(savedView.page)?savedView.page:0;render();}catch(e){$('message').textContent=e.message;}
