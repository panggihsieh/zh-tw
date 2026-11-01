import {parseIds,serializeIds,horizontalParts,verticalParts,validateCorrection} from './review-model.mjs';
import {figure} from './structure-figure.mjs';
let presets=[];
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export async function loadStructurePresets(){const r=await fetch('/structure-atlas/catalog.json');if(!r.ok)throw Error('無法載入後台結構圖例。');presets=await r.json();}
function pinPart(tree){
  if(tree.value!=='⿱'||tree.children[1]?.value!=='⿰')return null;
  const parts=[tree.children[0],...tree.children[1].children].map(serializeIds);
  return parts.every(p=>p===parts[0])?parts[0]:null;
}
export function matchStructurePreset(value,options=presets){
  const tree=parseIds(value.ids),pin=pinPart(tree);
  const matches=options.filter(p=>p.operator===(pin?'品':tree.children.length?tree.value:''));
  return matches.sort((a,b)=>score(a)-score(b))[0]||null;
  function score(p){return p.weights.length===value.weights.length?p.weights.reduce((sum,w,i)=>sum+Math.abs(w-value.weights[i]),0):1000;}
}
export function presetCorrection(character,value,preset){
  const tree=parseIds(value.ids);let parts=tree.children.map(serializeIds),ids;
  if(preset.operator==='')return {...value,ids:character,weights:[100]};
  if(preset.operator==='品'){
    const part=pinPart(tree);
    if(!part)throw Error('品字形需確認三個相同部件，請開啟詳細修正填寫；不自動猜補。');
    return {...value,ids:`⿱${part}⿰${part}${part}`,weights:[50,50]};
  }
  if('⿰⿲'.includes(preset.operator))parts=horizontalParts(tree,preset.operator==='⿲'?'triple':'equal');
  else if('⿱⿳'.includes(preset.operator))parts=verticalParts(tree,preset.operator==='⿳'?'triple':'equal');
  const count='⿲⿳'.includes(preset.operator)?3:2;
  if(parts.length!==count||parts.some(x=>!x))throw Error(`此結構需要 ${count} 個部件，請開啟詳細修正補齊。`);
  ids=preset.operator+parts.join('');parseIds(ids);
  return {...value,ids,weights:[...preset.weights]};
}
export function inlineStructureHeader(value){
  const preset=matchStructurePreset(value);
  return preset?`<span class="inline-structure-header"><img class="inline-atlas-thumb" src="${preset.image}" alt="${esc(preset.title)}結構圖" width="44" height="44"/><span>${esc(['⿲','⿳','品',''].includes(preset.operator)?preset.group:preset.title)}</span></span>`:'<span class="inline-structure-header">圖例待核</span>';
}
export function inlineStructureControls(character,value){
  const preset=matchStructurePreset(value);
  return `<div class="inline-structure-controls" data-inline-character="${esc(character)}"><span class="inline-structure-caption">結構修正</span><button type="button" data-inline-choose aria-haspopup="dialog" aria-label="選擇${esc(character)}的結構">${preset?`<img src="${preset.image}" alt="" width="44" height="44"/>`:''}<span>${esc(preset?.title || '選擇結構縮圖')}</span><span aria-hidden="true">▦</span></button><p class="inline-structure-message" role="status"></p></div>`;
}
function chooseStructure(character,initial,save,cancel){
  const dialog=document.createElement('dialog');dialog.className='structure-confirm-dialog structure-picker-dialog';dialog.setAttribute('aria-label',`${character}結構縮圖選擇`);
  let value=initial,changed=false,committed=false;
  const currentPreset=matchStructurePreset(initial);
  dialog.innerHTML=`<h2>${esc(character)} · 選擇結構</h2><p class="help">選擇結構縮圖，確認後儲存；取消則保留原結構。</p><div class="structure-picker-groups">${[...new Set(presets.map(p=>p.group))].map(group=>`<section><h3>${esc(group)}</h3><div class="structure-picker-grid">${presets.filter(p=>p.group===group).map(p=>`<label class="structure-picker-option"><input type="radio" name="structure-preset" value="${p.id}" ${p.id===currentPreset?.id?'checked':''}/><img src="${p.image}" alt="${esc(p.title)}結構縮圖" width="100" height="100"/><span>${esc(p.title)}</span></label>`).join('')}</div></section>`).join('')}</div><div class="structure-picker-footer"><div class="structure-picker-selection"><span data-selected-label role="status"></span><div data-selected-preview></div></div><p class="structure-confirm-error" role="alert"></p><div class="structure-confirm-actions"><button type="button" data-cancel>取消</button><button type="button" data-confirm>確認並儲存</button></div></div>`;
  const confirm=dialog.querySelector('[data-confirm]'),error=dialog.querySelector('[role="alert"]');
  function preview(preset){dialog.querySelector('[data-selected-label]').textContent=`已選：${preset?.group || '自訂結構'} · ${preset?.title || '目前結構'}`;dialog.querySelector('[data-selected-preview]').innerHTML=figure(character,value.ids,value.weights).html;}
  preview(currentPreset);
  dialog.querySelectorAll('input').forEach(input=>input.addEventListener('change',()=>{
    try{const preset=presets.find(p=>p.id===input.value);value=presetCorrection(character,initial,preset);changed=true;confirm.disabled=false;error.textContent='';preview(preset);}
    catch(e){confirm.disabled=true;error.textContent=e.message;dialog.querySelector('[data-selected-label]').textContent='此選項需要補齊部件，尚未套用。';dialog.querySelector('[data-selected-preview]').replaceChildren();}
  }));
  let cleaned=false;
  const cleanup=()=>{if(cleaned)return;cleaned=true;if(!committed)cancel();dialog.remove();};
  const close=()=>{dialog.close();cleanup();};
  dialog.querySelector('[data-cancel]').onclick=close;
  dialog.addEventListener('cancel',event=>{event.preventDefault();close();});
  confirm.onclick=()=>{try{const correction=validateCorrection({...value,status:changed?'corrected':initial.status,updatedAt:new Date().toISOString()});save(correction);committed=true;close();}catch(e){error.textContent=`未儲存：${e.message}`;}};
  dialog.addEventListener('close',cleanup,{once:true});document.body.append(dialog);dialog.showModal();dialog.querySelector('input:checked')?.focus({preventScroll:true});
}
export function bindInlineStructures(root,characters,current,save){
  root.querySelectorAll('[data-inline-character]').forEach(panel=>{
    const character=characters.find(c=>c.character===panel.dataset.inlineCharacter),button=panel.querySelector('[data-inline-choose]'),message=panel.querySelector('.inline-structure-message');
    button.onclick=()=>{message.textContent='';chooseStructure(character.character,current(character),value=>save(character,value),()=>{message.textContent='已取消，保留原結構。';});};
  });
}
