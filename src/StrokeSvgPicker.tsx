import {useState} from 'react';
import {STROKE_SVG_ASSETS,selectedStrokeSvg} from './strokeSvg';
export default function StrokeSvgPicker({name,svgId,thumbnail,onSelect,onUpload}:{name:string;svgId?:string;thumbnail?:string;onUpload:(image:string)=>void;onSelect:(id:string)=>void}){
 const [open,setOpen]=useState(false);const selected=selectedStrokeSvg({name,svgId,thumbnail});
 const [error,setError]=useState('');
 async function upload(file:File){
  setError('');
  if(!['image/png','image/webp'].includes(file.type)||file.size>65536){
   setError('請選擇 64 KB 以下的 PNG 或 WebP 圖片。');
   return;
  }
  try{
   const data=await new Promise<string>((resolve,reject)=>{
    const reader=new FileReader();
    reader.onload=()=>resolve(String(reader.result));
    reader.onerror=reject;
    reader.readAsDataURL(file);
   });
   const image=new Image();
   image.src=data;
   await image.decode();
   if(image.width>2048||image.height>2048)throw Error();
   onUpload(data);
   setOpen(false);
  }catch{setError('圖片無法讀取，或尺寸超過 2048 × 2048。');}
 }
 return <div className="stroke-svg-picker"><button type="button" className="secondary stroke-svg-picker-toggle" aria-expanded={open} onClick={()=>setOpen(!open)}>{selected&&<img src={selected.src} alt=""/>}更換筆畫圖片：{selected?.name??'原有圖形'}</button>{open&&<label>上傳縮圖（PNG 或 WebP，64 KB 以下）<input type="file" accept="image/png,image/webp" onChange={event=>{const file=event.currentTarget.files?.[0];event.currentTarget.value='';if(file)void upload(file);}}/></label>}{error&&<p role="alert">{error}</p>}{open&&<div className="stroke-svg-options" role="group" aria-label={`${name}的筆畫圖片選單`}><button type="button" className="secondary" onClick={()=>{onSelect('builtin');setOpen(false);}}>使用原有圖形</button>{STROKE_SVG_ASSETS.map(asset=><button key={asset.id} type="button" title={asset.warning??asset.name} aria-pressed={selected?.id===asset.id} onClick={()=>{onSelect(asset.id);setOpen(false);}}><img src={asset.src} alt={`${asset.name}縮圖`}/><span>{asset.name}</span>{asset.warning&&<small>待核對</small>}</button>)}</div>}{selected?.warning&&<p role="status">{selected.warning}</p>}<small>選圖後請按「儲存此筆畫」。圖片只更換示意，不會改變筆順資料或口訣。</small></div>;
}
