import {useState} from 'react';
import {STROKE_SVG_ASSETS,selectedStrokeSvg} from './strokeSvg';
export default function StrokeSvgPicker({name,svgId,onSelect}:{name:string;svgId?:string;onSelect:(id:string)=>void}){
 const [open,setOpen]=useState(false);const selected=selectedStrokeSvg({name,svgId});
 return <div className="stroke-svg-picker"><button type="button" className="secondary stroke-svg-picker-toggle" aria-expanded={open} onClick={()=>setOpen(!open)}>{selected&&<img src={selected.src} alt=""/>}更換筆畫圖片：{selected?.name??'原有圖形'}</button>{open&&<div className="stroke-svg-options" role="group" aria-label={`${name}的筆畫圖片選單`}><button type="button" className="secondary" onClick={()=>{onSelect('builtin');setOpen(false);}}>使用原有圖形</button>{STROKE_SVG_ASSETS.map(asset=><button key={asset.id} type="button" title={asset.warning??asset.name} aria-pressed={selected?.id===asset.id} onClick={()=>{onSelect(asset.id);setOpen(false);}}><img src={asset.src} alt={`${asset.name}縮圖`}/><span>{asset.name}</span>{asset.warning&&<small>待核對</small>}</button>)}</div>}{selected?.warning&&<p role="status">{selected.warning}</p>}<small>選圖後請按「儲存此筆畫」。圖片只更換示意，不會改變筆順資料或口訣。</small></div>;
}
