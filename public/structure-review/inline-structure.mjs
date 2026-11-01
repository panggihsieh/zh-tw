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
function confirmStructure(character,value,preset,confirm,cancel){
  const dialog=document.createElement('dialog');dialog.className='structure-confirm-dialog';dialog.setAttribute('aria-label',`${character}結構縮圖確認`);
  dialog.innerHTML=`<h2>${esc(character)} · 結構縮圖確認</h2><p>${esc(preset?.group||'自訂結構')} · ${esc(preset?.title||'目前結構')}　${value.weights.join(' : ')}</p><div class="structure-confirm-images"><figure><figcaption>結構縮圖</figcaption>${preset?`<img src="${preset.image}" alt="${esc(preset.title)}結構縮圖" width="200" height="200"/>`:'<p>尚無對應圖例</p>'}</figure><figure><figcaption>生字部件預覽</figcaption>${figure(character,value.ids,value.weights).html}</figure></div><p class="help">色塊為部件位置示意；確認後會儲存這個字的結構修正。</p><p class="structure-confirm-error" role="alert"></p><div class="structure-confirm-actions"><button type="button" data-cancel>取消</button><button type="button" data-confirm>確認並儲存</button></div>`;
  let committed=false;dialog.querySelector('[data-cancel]').onclick=()=>dialog.close();
  dialog.querySelector('[data-confirm]').onclick=()=>{try{confirm();committed=true;dialog.close();}catch(e){dialog.querySelector('[role="alert"]').textContent=`未儲存：${e.message}`;}};
  dialog.addEventListener('close',()=>{if(!committed)cancel();dialog.remove();},{once:true});document.body.append(dialog);dialog.showModal();
}
export function bindInlineStructures(root,characters,current,save){
  root.querySelectorAll('[data-inline-character]').forEach(panel=>{
    const character=characters.find(c=>c.character===panel.dataset.inlineCharacter),select=panel.querySelector('select'),button=panel.querySelector('[data-inline-save]'),message=panel.querySelector('p');let draft=null,invalid=false;
    function preview(value){const card=panel.closest('.card');card.querySelector('.inline-structure-header').outerHTML=inlineStructureHeader(value);card.querySelector('.pair svg').outerHTML=figure(character.character,value.ids,value.weights).html;}
    function reset(){draft=null;invalid=false;const value=current(character);select.value=matchStructurePreset(value)?.id||'';preview(value);message.textContent='已取消，保留原結構。';}
    function ask(){if(invalid)throw Error('請先補齊部件，或重新選取可用的結構。');const value=validateCorrection({...current(character),...(draft||{}),status:draft?'corrected':current(character).status,updatedAt:new Date().toISOString()});confirmStructure(character.character,value,matchStructurePreset(value),()=>save(character,value),reset);}
    select.onchange=()=>{draft=null;invalid=false;message.textContent='';try{
      const preset=presets.find(p=>p.id===select.value);if(!preset){reset();return;}
      draft=presetCorrection(character.character,current(character),preset);preview(draft);ask();
    }catch(e){invalid=true;message.textContent=e.message;}};
    button.onclick=()=>{try{ask();}catch(e){message.textContent=`未儲存：${e.message}`;}};
  });
}
