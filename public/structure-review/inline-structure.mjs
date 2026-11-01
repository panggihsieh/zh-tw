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
  return `<div class="inline-structure-controls" data-inline-character="${esc(character)}"><label>結構修正<select aria-label="${esc(character)}的結構修正">${!preset?'<option value="">目前結構（未對應圖例）</option>':''}${presets.map(p=>`<option value="${p.id}" ${p.id===preset?.id?'selected':''}>${esc(p.group)}・${esc(p.title)}</option>`).join('')}</select></label><button type="button" data-inline-save aria-label="儲存${esc(character)}的結構">儲存</button><p class="inline-structure-message" role="status"></p></div>`;
}
export function bindInlineStructures(root,characters,current,save){
  root.querySelectorAll('[data-inline-character]').forEach(panel=>{
    const character=characters.find(c=>c.character===panel.dataset.inlineCharacter),select=panel.querySelector('select'),button=panel.querySelector('[data-inline-save]'),message=panel.querySelector('p');let draft=null,invalid=false;
    select.onchange=()=>{draft=null;invalid=false;message.textContent='';try{
      const preset=presets.find(p=>p.id===select.value);if(!preset)return;
      draft=presetCorrection(character.character,current(character),preset);
      const card=panel.closest('.card'),header=card.querySelector('.inline-structure-header');header.outerHTML=inlineStructureHeader(draft);
      card.querySelector('.pair svg').outerHTML=figure(character.character,draft.ids,draft.weights).html;
      message.textContent='預覽中，按儲存套用。';
    }catch(e){invalid=true;message.textContent=e.message;}};
    button.onclick=()=>{try{if(invalid)throw Error('請先補齊部件，或重新選取可用的結構。');const value=validateCorrection({...current(character),...(draft||{}),status:draft?'corrected':current(character).status,updatedAt:new Date().toISOString()});save(character,value);}catch(e){message.textContent=`未儲存：${e.message}`;}};
  });
}
