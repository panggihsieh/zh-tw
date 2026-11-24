import { tracePath, type Point } from './writingGame';
import structureAtlas from './structureAtlas.json';

/** 書寫生字：學生字跡。 */
export interface WritingSheetEntry { kind?:'writing'; number:number; character:string; traces:Point[][] }
/** 字體結構：標準字形與正確結構，答錯時附上學生的選擇。 */
export interface StructureSheetEntry { kind:'structure'; number:number; character:string; answer:string; choice:string; correct:boolean }
/** 生字造詞（一字多詞造句）：學生句子與評分。 */
export interface SentenceSheetEntry { kind:'sentence'; number:number; character:string; reading?:string; sentence:string; score:number|null; level?:string }
export type WorkSheetEntry = WritingSheetEntry | StructureSheetEntry | SentenceSheetEntry;
export type WorkSheetKind = 'writing'|'structure'|'sentence';
export interface WritingSheetInfo { title:string; className:string; name:string; date:string }

/** A4 橫式，200 DPI。 */
export const SHEET_WIDTH=2339, SHEET_HEIGHT=1654, SHEET_COLUMNS=7;
const MARGIN=90, HEADER=190, GAP=26, LABEL=54;
const SANS='"Noto Sans TC","PingFang TC","Microsoft JhengHei",sans-serif';
const KAI='"TW-Kai","BiauKai","DFKai-SB","Kaiti TC","STKaiti","Noto Serif TC",serif';

export function workSheetKind(entries:WorkSheetEntry[]):WorkSheetKind{return entries[0]?.kind??'writing';}
export const workSheetLabels:Record<WorkSheetKind,{heading:string;suffix:string}>={
 writing:{heading:'我的字跡作品',suffix:'我的字跡'},
 structure:{heading:'我的字體結構作品',suffix:'字體結構整理'},
 sentence:{heading:'我的造詞造句作品',suffix:'我的造句'},
};

/** 每排固定 7 字；字數多時縮小格子，讓全部內容都放在同一張 A4。 */
export function writingSheetLayout(count:number,label=LABEL){
 const rows=Math.max(1,Math.ceil(count/SHEET_COLUMNS));
 const byWidth=(SHEET_WIDTH-MARGIN*2-GAP*(SHEET_COLUMNS-1))/SHEET_COLUMNS;
 const byHeight=(SHEET_HEIGHT-MARGIN-HEADER-MARGIN-(rows-1)*GAP)/rows-label;
 const cell=Math.floor(Math.min(byWidth,byHeight));
 const left=Math.round((SHEET_WIDTH-cell*SHEET_COLUMNS-GAP*(SHEET_COLUMNS-1))/2);
 return {rows,cell,cells:Array.from({length:count},(_,index)=>({x:left+index%SHEET_COLUMNS*(cell+GAP),y:MARGIN+HEADER+Math.floor(index/SHEET_COLUMNS)*(cell+label+GAP)}))};
}

function drawHeader(context:CanvasRenderingContext2D,info:WritingSheetInfo,suffix:string,summary:string){
 context.fillStyle='#ffffff';context.fillRect(0,0,SHEET_WIDTH,SHEET_HEIGHT);
 context.fillStyle='#163d36';context.textBaseline='alphabetic';context.textAlign='left';
 context.font=`bold 64px ${SANS}`;context.fillText(`${info.title} · ${suffix}`,MARGIN,MARGIN+64);
 context.font=`36px ${SANS}`;context.fillStyle='#4b5b55';
 context.fillText([info.className,info.name,summary,info.date].filter(Boolean).join('　·　'),MARGIN,MARGIN+128);
 context.strokeStyle='#ccd9bd';context.lineWidth=3;context.beginPath();context.moveTo(MARGIN,MARGIN+160);context.lineTo(SHEET_WIDTH-MARGIN,MARGIN+160);context.stroke();
}

function drawGrid(context:CanvasRenderingContext2D,cell:number){
 context.fillStyle='#fffdf5';context.fillRect(0,0,cell,cell);
 context.strokeStyle='#c0392b';context.lineWidth=3;context.setLineDash([]);context.strokeRect(0,0,cell,cell);
 context.strokeStyle='#e8b4ac';context.lineWidth=2;context.setLineDash([10,10]);
 context.beginPath();context.moveTo(cell/2,0);context.lineTo(cell/2,cell);context.moveTo(0,cell/2);context.lineTo(cell,cell/2);context.moveTo(0,0);context.lineTo(cell,cell);context.moveTo(cell,0);context.lineTo(0,cell);context.stroke();
 context.setLineDash([]);
}

/** 文字超過寬度時縮小字級，避免與相鄰格子重疊。 */
function fitText(context:CanvasRenderingContext2D,text:string,x:number,y:number,maxWidth:number,size:number,weight=''){
 let current=size;
 do{context.font=`${weight} ${current}px ${SANS}`;if(context.measureText(text).width<=maxWidth)break;current-=1;}while(current>12);
 context.fillText(text,x,y);
}

export function drawWritingSheet(context:CanvasRenderingContext2D,entries:WritingSheetEntry[],info:WritingSheetInfo){
 drawHeader(context,info,workSheetLabels.writing.suffix,`共 ${entries.length} 字`);
 const {cell,cells}=writingSheetLayout(entries.length);
 entries.forEach((entry,index)=>{
  const {x,y}=cells[index],scale=cell/1000;
  context.save();context.translate(x,y);drawGrid(context,cell);
  context.scale(scale,scale);context.strokeStyle='#175d9a';context.lineWidth=Math.max(26,4/scale);context.lineCap='round';context.lineJoin='round';
  for(const points of entry.traces)if(points.length)context.stroke(new Path2D(tracePath(points.length===1?[points[0],points[0]]:points)));
  context.restore();
  context.fillStyle='#4b5b55';context.textAlign='center';
  fitText(context,`${entry.number}. ${entry.character}`,x+cell/2,y+cell+LABEL*.72,cell,Math.max(22,Math.min(34,Math.round(cell*.1))));
  context.textAlign='left';
 });
}

/** 結構縮圖：與作答按鈕相同的結構圖（structureAtlas 各結構第一張）。 */
export function structureThumbnail(structure:string){return (structureAtlas as {title:string;items:{image:string}[]}[]).find(group=>group.title===`${structure}結構`)?.items[0]?.image??'';}
export type StructureImages=Map<string,CanvasImageSource>;
export async function loadStructureImages(entries:StructureSheetEntry[]):Promise<StructureImages>{
 const images:StructureImages=new Map();
 const sources=[...new Set(entries.flatMap(entry=>[entry.answer,entry.choice]).map(structureThumbnail).filter(Boolean))];
 await Promise.all(sources.map(async source=>{
  try{
   // SVG 只有 viewBox；補上寬高，Firefox 與 Safari 才能畫進 canvas。
   const text=(await (await fetch(source)).text()).replace('<svg ','<svg width="400" height="400" ');
   const url=URL.createObjectURL(new Blob([text],{type:'image/svg+xml'}));
   try{const image=new Image();image.src=url;await image.decode();images.set(source,image);}finally{URL.revokeObjectURL(url);}
  }catch{/* 載入失敗時改以結構名稱代替縮圖 */}
 }));
 return images;
}

function drawThumbnail(context:CanvasRenderingContext2D,images:StructureImages,structure:string,x:number,y:number,size:number,color:string,crossed=false){
 const image=images.get(structureThumbnail(structure));
 context.fillStyle='#ffffff';context.fillRect(x,y,size,size);
 if(image)context.drawImage(image,x,y,size,size);
 else{context.fillStyle='#163d36';context.textAlign='center';context.textBaseline='middle';fitText(context,structure||'—',x+size/2,y+size/2,size-6,Math.round(size*.28),'bold');}
 context.strokeStyle=color;context.lineWidth=Math.max(3,size*.035);context.strokeRect(x,y,size,size);
 if(crossed){context.save();context.globalAlpha=.75;context.beginPath();context.moveTo(x+size*.12,y+size*.12);context.lineTo(x+size*.88,y+size*.88);context.moveTo(x+size*.88,y+size*.12);context.lineTo(x+size*.12,y+size*.88);context.lineWidth=Math.max(2,size*.035);context.stroke();context.restore();}
}

/** 字體結構：字下方只放結構縮圖，不用文字；答錯時旁邊加上學生所選結構（紅框打叉）。 */
export function drawStructureSheet(context:CanvasRenderingContext2D,entries:StructureSheetEntry[],info:WritingSheetInfo,images:StructureImages=new Map()){
 const correct=entries.filter(entry=>entry.correct).length;
 drawHeader(context,info,workSheetLabels.structure.suffix,`共 ${entries.length} 字，答對 ${correct} 字`);
 // 縮圖區高度隨格子大小調整，兩次計算讓字格與縮圖都放進同一張 A4。
 let layout=writingSheetLayout(entries.length,LABEL);
 layout=writingSheetLayout(entries.length,Math.round(layout.cell*.56));
 const {cell,cells}=layout,thumb=Math.round(cell*.42),small=Math.round(thumb*.72);
 entries.forEach((entry,index)=>{
  const {x,y}=cells[index];
  context.save();context.translate(x,y);drawGrid(context,cell);
  context.fillStyle='#1d2b26';context.textAlign='center';context.textBaseline='middle';
  context.font=`${Math.round(cell*.74)}px ${KAI}`;context.fillText(entry.character,cell/2,cell*.53);
  context.fillStyle=entry.correct?'#147747':'#c0392b';context.font=`bold ${Math.max(20,Math.round(cell*.13))}px ${SANS}`;
  context.textAlign='right';context.textBaseline='top';context.fillText(entry.correct?'✓':'✗',cell-10,8);
  context.fillStyle='#4b5b55';context.textAlign='left';context.font=`${Math.max(16,Math.round(cell*.09))}px ${SANS}`;context.fillText(`${entry.number}`,10,8);
  context.restore();
  const top=y+cell+Math.round(cell*.07);
  const total=entry.correct?thumb:thumb+small+Math.round(cell*.06);
  const left=x+(cell-total)/2;
  drawThumbnail(context,images,entry.answer,left,top,thumb,'#147747');
  if(!entry.correct)drawThumbnail(context,images,entry.choice,left+thumb+Math.round(cell*.06),top+thumb-small,small,'#c0392b',true);
  context.textBaseline='alphabetic';context.textAlign='left';
 });
}

/** 依寬度把句子切成多行（中文逐字換行）。 */
export function wrapText(measure:(text:string)=>number,text:string,maxWidth:number){
 const lines:string[]=[];let line='';
 for(const character of text){
  if(line&&measure(line+character)>maxWidth){lines.push(line);line=character;}else line+=character;
 }
 if(line||!lines.length)lines.push(line);
 return lines;
}

export function drawSentenceSheet(context:CanvasRenderingContext2D,entries:SentenceSheetEntry[],info:WritingSheetInfo){
 drawHeader(context,info,workSheetLabels.sentence.suffix,`共 ${entries.length} 題`);
 const top=MARGIN+HEADER,available=SHEET_HEIGHT-MARGIN-top,width=SHEET_WIDTH-MARGIN*2;
 const scoreWidth=300,gap=28;
 // 從大字級往下試，找出全部句子都能放進同一張 A4 的大小。
 let size=46,layout:{lines:string[];height:number;box:number}[]=[];
 for(;size>=16;size-=2){
  const box=Math.round(size*2.2),textWidth=width-box-scoreWidth-gap*3-size*2;
  context.font=`${size}px ${SANS}`;
  layout=entries.map(entry=>{const lines=wrapText(text=>context.measureText(text).width,entry.sentence||'（未作答）',textWidth);return {lines,box,height:Math.max(box,lines.length*size*1.5)+size*.7};});
  if(layout.reduce((sum,row)=>sum+row.height,0)<=available)break;
 }
 let y=top;
 entries.forEach((entry,index)=>{
  const row=layout[index];if(!row)return;
  const box=row.box,middle=y+row.height/2;
  context.fillStyle=index%2?'#ffffff':'#f6faf2';context.fillRect(MARGIN,y,width,row.height);
  context.fillStyle='#4b5b55';context.textAlign='right';context.textBaseline='middle';context.font=`${size}px ${SANS}`;
  context.fillText(`${entry.number}.`,MARGIN+size*1.8,middle);
  const boxX=MARGIN+size*2+gap;
  context.save();context.translate(boxX,middle-box/2);drawGrid(context,box);
  context.fillStyle='#1d2b26';context.textAlign='center';context.font=`${Math.round(box*.74)}px ${KAI}`;context.fillText(entry.character,box/2,box*.53);
  context.restore();
  const textX=boxX+box+gap;
  context.fillStyle='#1d2b26';context.textAlign='left';context.font=`${size}px ${SANS}`;
  row.lines.forEach((line,lineIndex)=>context.fillText(line,textX,middle+(lineIndex-(row.lines.length-1)/2)*size*1.5));
  context.textAlign='right';context.fillStyle=entry.score===null?'#7a6a2a':'#b45309';context.font=`bold ${size}px ${SANS}`;
  context.fillText(entry.score===null?'待確認':`${entry.score} 分`,MARGIN+width-gap,middle-(entry.score!==null&&entry.level?size*.45:0));
  if(entry.score!==null&&entry.level){context.fillStyle='#4b5b55';context.font=`${Math.round(size*.7)}px ${SANS}`;context.fillText(entry.level,MARGIN+width-gap,middle+size*.6);}
  y+=row.height;
 });
 context.textAlign='left';context.textBaseline='alphabetic';
}

export function drawWorkSheet(context:CanvasRenderingContext2D,entries:WorkSheetEntry[],info:WritingSheetInfo,images?:StructureImages){
 const kind=workSheetKind(entries);
 if(kind==='structure')drawStructureSheet(context,entries as StructureSheetEntry[],info,images);
 else if(kind==='sentence')drawSentenceSheet(context,entries as SentenceSheetEntry[],info);
 else drawWritingSheet(context,entries as WritingSheetEntry[],info);
}

export async function renderWritingSheet(entries:WorkSheetEntry[],info:WritingSheetInfo):Promise<Blob>{
 await document.fonts?.ready;
 const canvas=document.createElement('canvas');canvas.width=SHEET_WIDTH;canvas.height=SHEET_HEIGHT;
 const context=canvas.getContext('2d');if(!context)throw Error('無法建立作品圖片。');
 const images=workSheetKind(entries)==='structure'?await loadStructureImages(entries as StructureSheetEntry[]):undefined;
 drawWorkSheet(context,entries,info,images);
 return new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(Error('無法建立作品圖片。')),'image/png'));
}

/** 同一課堂中重新整理頁面時，保留已送出的作答。 */
export function writingSheetStorageKey(roomId:string,uid:string){return `competition-writing-sheet:${roomId}:${uid}`;}
export function loadWritingSheet(key:string):WorkSheetEntry[]{
 try{const value=JSON.parse(sessionStorage.getItem(key)||'[]');return Array.isArray(value)?value:[];}catch{return [];}
}
export function saveWritingSheet(key:string,entries:WorkSheetEntry[]){
 try{sessionStorage.setItem(key,JSON.stringify(entries));}catch{/* 儲存空間不足時仍可在本頁使用 */}
}
