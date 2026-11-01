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
