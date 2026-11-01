import {loadStructurePresets,inlineStructureHeader,inlineStructureControls,bindInlineStructures} from './inline-structure.mjs';
import {figure} from './structure-figure.mjs';
import {LESSON_KEY,uniqueCharacters,parseLessonFile,validateLesson,validateLessons} from './lesson-import.mjs';
import {names,parseIds,suggestedWeights,validateWeights,validateCorrection,horizontalKind,horizontalParts,applyHorizontalPreset,structureLabel,verticalKind,verticalParts,applyVerticalPreset} from './review-model.mjs';
const $=id=>document.getElementById(id);
const lessonMode=new URLSearchParams(location.search).get('mode')==='lesson';
const key='kangxuan-structure-corrections-v1', viewKey=lessonMode?'hanzi-notebook.lesson-review-view.v1':'kangxuan-structure-view-v1';
let uploaded=[],catalog={},dictionary={},strokeIds=new Set(),removed=null,lessonReady=false;
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
  return `<svg viewBox="0 0 100 100" role="img" aria-label="${esc(structureLabel(tree,weights))}結構候選"><g fill="#285d50" font-family="MingLiU-ExtB,PMingLiU,Microsoft JhengHei,serif">${draw(tree,1,1,98,98)}</g></svg>`;
}
function pair(c,v){if(lessonMode)return `<div class="pair"><div class="character">${esc(c.character)}</div>${figure(c.character,v.ids,v.weights).html}</div>`;return `<div class="pair"><div class="character">${esc(c.character)}</div>${diagram(v.ids,v.weights)}</div>`;}
function book(){return data.books.find(b=>b.id===$('book').value);}
function lessons(){const b=book();$('lesson').innerHTML='<option value="">全部課別</option>'+b.lessons.map(l=>`<option value="${l.id}">${esc(l.title)}</option>`).join('');}
function render(){
  const pageSize=lessonMode?500:24;const b=book(), all=b.lessons.flatMap(l=>l.characters.map(c=>({...c,lesson:l})));
  const list=all.filter(c=>(!$('lesson').value||c.lesson.id===$('lesson').value)&&(!$('search').value||$('search').value.includes(c.character))&&(!$('status').value||current(c).status===$('status').value));
  page=Math.max(0,Math.min(page,Math.ceil(list.length/pageSize)-1));
  $('scope').textContent=`${b.title} · ${b.year?b.year.replace('_1',' 學年度上學期').replace('_2',' 學年度下學期'):'本機上傳課文'} · ${b.lessons.length} 課 / ${all.length} 字 · 符合條件 ${list.length} 字 · 本冊已目測確認 ${all.filter(c=>current(c).status==='reviewed').length} 字`;
  $('grid').innerHTML=list.slice(page*pageSize,page*pageSize+pageSize).map(c=>{const v=current(c),tree=parseIds(v.ids);return `<article class="card ${v.status}"><div class="card-top"><span>${esc(c.lesson.title.split('：')[0])}</span>${inlineStructureHeader(v)}</div>${pair(c,v)}<div class="card-bottom"><span>部首：${esc(v.radical||'待核')}</span><span class="badge">${states[v.status]}</span></div>${lessonMode?`<p class="help">總筆畫：${esc(c.dictionary[0]?.strokes||'待核對')}</p>`:''}${inlineStructureControls(c.character,v)}<button data-char="${esc(c.character)}">詳細修正 ${esc(c.character)}</button></article>`;}).join('');
  if(lessonMode){const selectedUpload=$('book').value==='uploaded'&&uploaded.some(l=>l.id===$('lesson').value);$('replace-lesson').disabled=!selectedUpload;$('remove-lesson').disabled=!selectedUpload;if(!list.length)$('grid').innerHTML='<p class="empty-review">'+(b.id==='uploaded'&&!uploaded.length?'尚無上傳課別。先上傳生字表或貼上文字，再按「儲存為新課」。':'沒有符合條件的生字。')+'</p>'; }
  $('position').textContent=list.length?`${page+1} / ${Math.ceil(list.length/pageSize)} 頁`:'沒有符合的生字';$('prev').disabled=page===0;$('next').disabled=(page+1)*pageSize>=list.length;
  try{localStorage.setItem(viewKey,JSON.stringify({book:b.id,lesson:$('lesson').value,search:$('search').value,status:$('status').value,page}));}catch{}
  bindInlineStructures($('grid'),list,current,(c,value)=>{const next={...corrections,[c.character]:value};localStorage.setItem(key,JSON.stringify(next));corrections=next;render();$('message').textContent=`已儲存「${c.character}」的結構修正。`;});
  $('grid').querySelectorAll('button[data-char]').forEach(btn=>btn.onclick=()=>open(all.find(c=>c.character===btn.dataset.char)));
}
function open(c){
  selected=c;const v=current(c);$('edit-title').textContent=`${c.character} · 結構修正`;
  for(const id of ['ids','radical','explanation','source','note']) $(id).value=v[id];
  $('weights').value=v.weights.join(',');$('review-status').value=v.status;
  $('dictionary').textContent=c.dictionary.length?c.dictionary.map(d=>`部首：${d.radical}｜讀音：${d.reading}｜${d.meaning}`).join('\n'):'教育部簡編本未收錄此單字，部首、音義待核對。';
  $('lesson-source').hidden=!c.lesson.source;if(c.lesson.source){$('lesson-source').href=c.lesson.source;$('lesson-source').textContent=`${c.lesson.title} · 教育百科來源 ↗`;}
  if(lessonMode){$('stroke-query').hidden=false;$('stroke-count').textContent=`「${c.character}」總筆畫：${c.dictionary[0]?.strokes||'待核對'}；部首：${v.radical||'待核對'}。`;const available=strokeIds.has(c.character.codePointAt(0));$('show-stroke').disabled=!available;$('show-stroke').textContent=available?'顯示官方筆順':'官方嵌入清單未收錄';$('stroke-link').href=available?`https://stroke-order.learningweb.moe.edu.tw/dictFrame.jsp?ID=${c.character.codePointAt(0)}`:'https://stroke-order.learningweb.moe.edu.tw/';$('stroke-frame').hidden=true;$('stroke-frame').removeAttribute('src');}
  $('error').textContent='';syncHorizontal();preview();$('edit').showModal();
}
function formValue(){for(const axis of axes){const kind=$(axis.id).value;if(kind){const parts=readParts(axis,kind);if(axis.apply(kind,parts).ids!==$('ids').value.trim())throw Error('請完成部件修改並更新預覽。');}}const tree=parseIds($('ids').value);return validateCorrection({ids:$('ids').value.trim(),weights:validateWeights($('weights').value,tree.children.length||1),radical:$('radical').value,explanation:$('explanation').value,source:$('source').value,note:$('note').value,status:$('review-status').value,updatedAt:new Date().toISOString()});}
function preview(){try{const tree=parseIds($('ids').value);$('weights').disabled=!(tree.children.length && '⿰⿲⿱⿳'.includes(tree.value));$('weights-help').textContent=$('weights').disabled?'獨體、包圍與重疊採位置示意，本欄不調整輪廓；可修改結構式及查證紀錄。':'比例調整第一層分區；內層仍採初始示意比例。';$('preview').innerHTML=pair(selected,formValue());$('error').textContent='';}catch(e){$('error').textContent=e.message;}}
const axes=[
  {id:'horizontal',fields:['left-part','middle-part','right-part'],middle:'middle-label',kind:horizontalKind,parts:horizontalParts,apply:applyHorizontalPreset},
  {id:'vertical',fields:['top-part','vertical-middle-part','bottom-part'],middle:'vertical-middle-label',kind:verticalKind,parts:verticalParts,apply:applyVerticalPreset},
];
function readParts(axis,kind){return (kind==='triple'?axis.fields:[axis.fields[0],axis.fields[2]]).map(id=>$(id).value);}
function syncHorizontal(){
  const tree=parseIds($('ids').value),weights=validateWeights($('weights').value,tree.children.length||1);
  for(const axis of axes){const kind=axis.kind(tree,weights);$(axis.id).value=kind;showParts(axis,kind,tree);}
}
function showParts(axis,kind,tree){
  $(axis.id+'-parts').hidden=!kind;$(axis.middle).hidden=kind!=='triple';
  if(!kind)return;
  const parts=axis.parts(tree,kind);$(axis.fields[0]).value=parts[0]||'';$(axis.fields[2]).value=parts.at(-1)||'';$(axis.fields[1]).value=kind==='triple'?parts[1]||'':'';
}
function updateParts(axis){
  try{const kind=$(axis.id).value;if(!kind)return;const value=axis.apply(kind,readParts(axis,kind));$('ids').value=value.ids;$('weights').value=value.weights.join(',');preview();}catch(e){$('error').textContent=e.message;}
}
for(const axis of axes){
  $(axis.id).onchange=()=>{try{const tree=parseIds($('ids').value),kind=$(axis.id).value;for(const other of axes)if(other!==axis){$(other.id).value='';showParts(other,'',tree);}showParts(axis,kind,tree);updateParts(axis);}catch(e){$('error').textContent=e.message;}};
  for(const id of axis.fields)$(id).oninput=()=>updateParts(axis);
}
$('ids').onchange=()=>{try{$('weights').value=suggestedWeights(parseIds($('ids').value)).join(',');syncHorizontal();preview();}catch(e){$('error').textContent=e.message;}};
$('weights').onchange=()=>{try{syncHorizontal();}catch{}preview();};$('preview-button').onclick=preview;
$('operators').innerHTML=Object.entries(names).map(([op,name])=>`<button type="button" data-op="${op}" title="${name}">${op} ${name}</button>`).join('');
$('operators').querySelectorAll('button').forEach(btn=>btn.onclick=()=>{$('ids').value=btn.dataset.op;$('ids').focus();});
$('show-stroke').onclick=()=>{$('stroke-frame').src=$('stroke-link').href;$('stroke-frame').hidden=false;};
$('close').onclick=()=>{$('stroke-frame').hidden=true;$('stroke-frame').removeAttribute('src');$('edit').close();};
$('edit').addEventListener('close',()=>{$('stroke-frame').removeAttribute('src');});
$('form').onsubmit=e=>{e.preventDefault();try{const value=formValue(), next={...corrections,[selected.character]:value};localStorage.setItem(key,JSON.stringify(next));corrections=next;$('edit').close();$('message').textContent=`已儲存「${selected.character}」的修正（同字跨冊共用）。`;render();}catch(e){$('error').textContent=`無法儲存：${e.message}`;}};
$('book').onchange=()=>{page=0;lessons();syncLessonDraft();render();};
for(const id of ['lesson','search','status']) $(id).oninput=()=>{page=0;if(id==='lesson')syncLessonDraft();render();};
$('prev').onclick=()=>{page--;render();};$('next').onclick=()=>{page++;render();};
$('export').onclick=()=>{const blob=new Blob([JSON.stringify({version:1,exportedAt:new Date().toISOString(),corrections,...(lessonMode?{lessons:uploaded}: {})},null,2)],{type:'application/json'});const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=lessonMode?'每課生字結構筆畫查詢-備份.json':'康軒五六年級-結構修正.json';a.click();URL.revokeObjectURL(url);};
$('import').onchange=async()=>{try{const file=$('import').files[0];if(!file)return;if(file.size>4e6)throw Error('檔案過大。');const imported=JSON.parse(await file.text());if(imported.version!==1||!imported.corrections||Array.isArray(imported.corrections))throw Error('版本或格式錯誤。');const next={...corrections};for(const [c,v]of Object.entries(imported.corrections)){if(!/^\p{Script=Han}$/u.test(c))throw Error('生字鍵值格式錯誤。');next[c]=validateCorrection(v);}if(lessonMode&&imported.lessons!==undefined){validateLessons(imported.lessons);const lessonsById=new Map(uploaded.map(l=>[l.id,l]));for(const l of imported.lessons)lessonsById.set(l.id,l);const nextLessons=validateLessons([...lessonsById.values()]);saveWorkspace(next,nextLessons);uploaded=nextLessons;rebuildUploads();}else localStorage.setItem(key,JSON.stringify(next));corrections=next;render();$('message').textContent=lessonMode?'課別與修正已匯入；同字以匯入版本為準。':'修正已匯入；同字以匯入版本為準。';}catch(e){$('message').textContent=`匯入失敗：${e.message}`;}$('import').value='';};
function saveWorkspace(nextCorrections,nextLessons){
  const beforeCorrections=localStorage.getItem(key),beforeLessons=localStorage.getItem(LESSON_KEY);
  try{localStorage.setItem(LESSON_KEY,JSON.stringify({version:1,lessons:nextLessons}));localStorage.setItem(key,JSON.stringify(nextCorrections));}
  catch(e){try{for(const[k,v]of [[key,beforeCorrections],[LESSON_KEY,beforeLessons]])v===null?localStorage.removeItem(k):localStorage.setItem(k,v);}catch{}throw e;}
}
function rebuildUploads(selectId){
  const selectedBook=$('book').value,selectedLesson=$('lesson').value;
  const uploadBook={id:'uploaded',title:'我上傳的課文',year:'',lessons:uploaded.map(l=>({...l,source:'',characters:l.characters.map(character=>{let ids=catalog[character]||character;try{parseIds(ids);}catch{ids=character;}return {character,ids,dictionary:dictionary[character]||[]};})}))};
  data.books=data.books.filter(b=>b.id!=='uploaded');data.books.unshift(uploadBook);
  $('book').innerHTML=data.books.map(b=>`<option value="${b.id}">${esc(b.title)}</option>`).join('');
  $('book').value=selectId?'uploaded':selectedBook||'uploaded';lessons();if(selectId)$('lesson').value=selectId;else if([...$('lesson').options].some(o=>o.value===selectedLesson))$('lesson').value=selectedLesson;
}
function syncLessonDraft(){if(!lessonMode||!data)return;const lesson=$('book').value==='uploaded'?uploaded.find(l=>l.id===$('lesson').value):null;if(lesson){$('lesson-title').value=lesson.title;$('lesson-characters').value=lesson.characters.join('、');draftPreview();}}
function draftPreview(){const chars=uniqueCharacters($('lesson-characters').value);$('lesson-preview').textContent=`預覽 ${chars.length} 字：${chars.join('、')}`;}
function saveLesson(replace=false){try{if(!lessonReady)throw Error('本機資料尚未載入，請稍候。');
  const old=replace&&$('book').value==='uploaded'?uploaded.find(l=>l.id===$('lesson').value):null;
  if(replace&&!old)throw Error('請先選取一個已上傳的課別。');
  const lesson=validateLesson({id:old?.id||crypto.randomUUID(),title:$('lesson-title').value.trim(),characters:uniqueCharacters($('lesson-characters').value)});
  const next=validateLessons(old?uploaded.map(l=>l.id===old.id?lesson:l):[...uploaded,lesson]);
  localStorage.setItem(LESSON_KEY,JSON.stringify({version:1,lessons:next}));uploaded=next;rebuildUploads(lesson.id);page=0;render();$('message').textContent=`已儲存「${lesson.title}」${lesson.characters.length} 字。可逐字修正結構並儲存。`;
}catch(e){$('message').textContent=`無法儲存課別：${e.message}`;}}
if(lessonMode){
  document.title='每課生字結構筆畫查詢';document.querySelector('h1').textContent='每課生字結構筆畫查詢';document.querySelector('header span').textContent='本機後台 · 教師檢視修正';
  $('lesson-workspace').hidden=false;$('lesson-animation').hidden=false;$('export').textContent='匯出課別與結構修正';
  document.querySelector('footer').textContent='上傳課別與結構修正儲存在本機瀏覽器，請匯出備份。生字筆畫資料參考教育部《國語辭典簡編本》，IDS 結構來源與授權見資料說明；候選結構待教師核對。';
  $('lesson-characters').oninput=draftPreview;$('save-lesson').onclick=()=>saveLesson(false);$('replace-lesson').onclick=()=>saveLesson(true);
  $('lesson-file').onchange=async()=>{try{const file=$('lesson-file').files[0];if(!file)return;if(file.size>1_000_000)throw Error('生字表超過 1 MB。');const draft=parseLessonFile(await file.text(),file.name);$('lesson-title').value=draft.title;$('lesson-characters').value=draft.characters.join('、');draftPreview();$('message').textContent='已讀取生字表，請確認預覽後按儲存為新課。';}catch(e){$('message').textContent=`讀取失敗：${e.message}`;}$('lesson-file').value='';};
  $('remove-lesson').onclick=()=>{try{const lesson=$('book').value==='uploaded'?uploaded.find(l=>l.id===$('lesson').value):null;if(!lesson)throw Error('請先選取要移除的上傳課別。');const next=uploaded.filter(l=>l.id!==lesson.id);localStorage.setItem(LESSON_KEY,JSON.stringify({version:1,lessons:next}));removed=lesson;uploaded=next;rebuildUploads();page=0;render();$('undo-lesson').hidden=false;$('message').textContent=`已移除「${lesson.title}」，可按復原移除。`;}catch(e){$('message').textContent=e.message;}};
  $('undo-lesson').onclick=()=>{try{if(!removed)return;const next=validateLessons([...uploaded,removed]);localStorage.setItem(LESSON_KEY,JSON.stringify({version:1,lessons:next}));uploaded=next;rebuildUploads(removed.id);removed=null;$('undo-lesson').hidden=true;render();}catch(e){$('message').textContent=e.message;}};
  $('animate').onclick=()=>{const running=$('animate').getAttribute('aria-checked')!=='true';$('animate').setAttribute('aria-checked',String(running));$('animate').textContent=`全部拆合動畫 ${running?'ON':'OFF'}`;document.body.classList.toggle('moving',running);};
}
const query=new URLSearchParams(location.search);if(query.get('book')==='5-上'&&/^\p{Script=Han}$/u.test(query.get('character')||''))savedView={book:'5-上',search:query.get('character'),lesson:'',status:'',page:0};
try{const response=await fetch('books.json');if(!response.ok)throw Error('無法載入字表。');data=await response.json();await loadStructurePresets();if(lessonMode){
  const resources=await Promise.all([fetch('ids-catalog.json'),fetch('/dictionaries/moe-concised.json'),fetch('moe-stroke-ids.json')]);
  if(resources.some(r=>!r.ok))throw Error('本機字形或筆畫資料無法載入。');
  catalog=await resources[0].json();const moe=await resources[1].json();strokeIds=new Set(await resources[2].json());
  for(const row of moe.entries)if(Array.from(row[0]).length===1)(dictionary[row[0]]??=[]).push({radical:row[2].trim(),reading:row[6],meaning:row[13],strokes:row[3].trim()});
  for(const b of data.books)for(const l of b.lessons)for(const c of l.characters)c.dictionary=dictionary[c.character]||c.dictionary;
  try{const stored=JSON.parse(localStorage.getItem(LESSON_KEY)||'{"version":1,"lessons":[]}');if(stored.version!==1)throw Error('課別版本不符。');uploaded=validateLessons(stored.lessons);}catch(e){$('message').textContent=`本機課別讀取失敗：${e.message}；原紀錄未覆寫。`;throw e;}
  rebuildUploads();if(!savedView.book)savedView={book:'uploaded',lesson:uploaded[0]?.id||'',page:0};
}$('book').innerHTML=data.books.map(b=>`<option value="${b.id}">${b.title}</option>`).join('');if(data.books.some(b=>b.id===savedView.book))$('book').value=savedView.book;lessons();if([...$('lesson').options].some(o=>o.value===savedView.lesson))$('lesson').value=savedView.lesson;$('search').value=savedView.search||'';$('status').value=savedView.status||'';page=Number.isInteger(savedView.page)?savedView.page:0;if(lessonMode){lessonReady=true;$('save-lesson').disabled=false;}syncLessonDraft();render();}catch(e){$('message').textContent=e.message;}
