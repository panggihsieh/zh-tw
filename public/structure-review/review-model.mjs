export const names = {'⿰':'左右','⿱':'上下','⿲':'左中右','⿳':'上中下','⿴':'全包圍','⿵':'上三包圍','⿶':'下三包圍','⿷':'左三包圍','⿸':'左上包圍','⿹':'右上包圍','⿺':'左下包圍','⿻':'重疊'};
export function parseIds(text) {
  const tokens = text.trim().match(/&[^;]+;|[^\s]/gu) || [];
  let i = 0;
  function next() {
    const value = tokens[i++];
    if (!value) throw Error('部件不足，請核對結構式。');
    const count = value in names ? ('⿲⿳'.includes(value) ? 3 : 2) : 0;
    return {value, children:Array.from({length:count},next)};
  }
  const tree = next();
  if (i !== tokens.length) throw Error('部件數量與結構不符。');
  return tree;
}
export function suggestedWeights(tree) {
  const [a,b] = tree.children.map(x=>x.value);
  if (tree.children.length===3) return [33,34,33];
  if (tree.children.length!==2) return [100];
  if (tree.value==='⿱' && '艹宀竹雨龶亠'.includes(a)) return [28,72];
  if (tree.value==='⿱' && '心力土'.includes(b)) return [70,30];
  if (tree.value==='⿰' && '氵扌忄礻糹彳阝亻'.includes(a)) return [30,70];
  if (tree.value==='⿰' && a==='耳') return [38,62];
  if (tree.value==='⿰' && b==='刂') return [72,28];
  return [50,50];
}
export function validateWeights(text,count) {
  const values = text.split(/[,，\s]+/).filter(Boolean).map(Number);
  if(values.length!==count || values.some(x=>!Number.isFinite(x)||x<=0) || Math.abs(values.reduce((a,b)=>a+b,0)-100)>0.01)
    throw Error(`請填 ${count} 個正數，合計 100。`);
  return values;
}
export function validateCorrection(value) {
  if(!value || typeof value.ids!=='string' || value.ids.length>120) throw Error('修正資料格式錯誤。');
  const tree=parseIds(value.ids);
  if(!Array.isArray(value.weights) || value.weights.some(x=>typeof x!=='number')) throw Error('比例欄位格式錯誤。');
  validateWeights(String(value.weights),tree.children.length||1);
  for(const field of ['radical','explanation','source','note']) if(typeof value[field]!=='string' || value[field].length>4000) throw Error('修正欄位格式錯誤。');
  if(!['pending','corrected','reviewed'].includes(value.status)) throw Error('核對狀態錯誤。');
  return value;
}
export const horizontalPresets = {
  narrow: {label:'左窄右寬', weights:[35,65]},
  equal: {label:'左右等寬', weights:[50,50]},
  wide: {label:'左寬右窄', weights:[65,35]},
  triple: {label:'左中右', weights:[33,34,33]},
};
export function horizontalKind(tree,weights) {
  if(tree.value==='⿲') return 'triple';
  if(tree.value!=='⿰') return '';
  return weights[0]===weights[1]?'equal':weights[0]<weights[1]?'narrow':'wide';
}
export function structureLabel(tree,weights) {
  return horizontalPresets[horizontalKind(tree,weights)]?.label || verticalPresets[verticalKind(tree,weights)]?.label || names[tree.value] || '獨體／未再拆分';
}
export function serializeIds(tree) {return tree.value+tree.children.map(serializeIds).join('');}
export function horizontalParts(tree,kind) {
  let parts=tree.children.map(serializeIds);
  if(kind==='triple' && tree.children.length===2){
    const [left,right]=tree.children;
    if(right.value==='⿰') parts=[serializeIds(left),...right.children.map(serializeIds)];
    else if(left.value==='⿰') parts=[...left.children.map(serializeIds),serializeIds(right)];
    else parts=[parts[0],'',parts[1]];
  }
  if(kind!=='triple' && parts.length===3) parts=[parts[0],'⿰'+parts[1]+parts[2]];
  return parts.length ? parts : ['',...(kind==='triple'?['']:[]),''];
}
export function applyHorizontalPreset(kind,parts) {
  const preset=horizontalPresets[kind];
  if(!preset || parts.length!==preset.weights.length || parts.some(p=>!p.trim())) throw Error(kind==='triple'?'請填寫左、中、右三個部件；不會自動猜補中間部件。':'請填寫左、右兩個部件。');
  parts.forEach(parseIds);
  return {ids:(kind==='triple'?'⿲':'⿰')+parts.map(p=>p.trim()).join(''),weights:[...preset.weights]};
}
export const verticalPresets = {
  short: {label:'上短下長', weights:[35,65]},
  equal: {label:'上下等長', weights:[50,50]},
  tall: {label:'上長下短', weights:[65,35]},
  triple: {label:'上中下', weights:[33,34,33]},
};
export function verticalKind(tree,weights) {
  if(tree.value==='⿳') return 'triple';
  if(tree.value!=='⿱') return '';
  return weights[0]===weights[1]?'equal':weights[0]<weights[1]?'short':'tall';
}
export function verticalParts(tree,kind) {
  let parts=tree.children.map(serializeIds);
  if(kind==='triple' && tree.children.length===2){
    const [top,bottom]=tree.children;
    if(bottom.value==='⿱') parts=[serializeIds(top),...bottom.children.map(serializeIds)];
    else if(top.value==='⿱') parts=[...top.children.map(serializeIds),serializeIds(bottom)];
    else parts=[parts[0],'',parts[1]];
  }
  if(kind!=='triple' && parts.length===3) parts=[parts[0],'⿱'+parts[1]+parts[2]];
  return parts.length ? parts : ['',...(kind==='triple'?['']:[]),''];
}
export function applyVerticalPreset(kind,parts) {
  const preset=verticalPresets[kind];
  if(!preset || parts.length!==preset.weights.length || parts.some(p=>!p.trim())) throw Error(kind==='triple'?'請填寫上、中、下三個部件；不會自動猜補中間部件。':'請填寫上、下兩個部件。');
  parts.forEach(parseIds);
  return {ids:(kind==='triple'?'⿳':'⿱')+parts.map(p=>p.trim()).join(''),weights:[...preset.weights]};
}
