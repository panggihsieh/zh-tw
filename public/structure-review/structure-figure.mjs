import {names,parseIds,suggestedWeights} from './review-model.mjs';
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function figure(character,ids,weights){
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
