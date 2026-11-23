import { tracePath, type Point } from './writingGame';

export interface WritingSheetEntry { number:number; character:string; traces:Point[][] }
export interface WritingSheetInfo { title:string; className:string; name:string; date:string }

/** A4 橫式，200 DPI。 */
export const SHEET_WIDTH=2339, SHEET_HEIGHT=1654, SHEET_COLUMNS=7;
const MARGIN=90, HEADER=190, GAP=26, LABEL=54;

/** 每排固定 7 字；字數多時縮小格子，讓全部字跡都放在同一張 A4。 */
export function writingSheetLayout(count:number){
 const rows=Math.max(1,Math.ceil(count/SHEET_COLUMNS));
 const byWidth=(SHEET_WIDTH-MARGIN*2-GAP*(SHEET_COLUMNS-1))/SHEET_COLUMNS;
 const byHeight=(SHEET_HEIGHT-MARGIN-HEADER-MARGIN-(rows-1)*GAP)/rows-LABEL;
 const cell=Math.floor(Math.min(byWidth,byHeight));
 const left=Math.round((SHEET_WIDTH-cell*SHEET_COLUMNS-GAP*(SHEET_COLUMNS-1))/2);
 return {rows,cell,cells:Array.from({length:count},(_,index)=>({x:left+index%SHEET_COLUMNS*(cell+GAP),y:MARGIN+HEADER+Math.floor(index/SHEET_COLUMNS)*(cell+LABEL+GAP)}))};
}

export function drawWritingSheet(context:CanvasRenderingContext2D,entries:WritingSheetEntry[],info:WritingSheetInfo){
 const font='"Noto Sans TC","PingFang TC","Microsoft JhengHei",sans-serif';
 context.fillStyle='#ffffff';context.fillRect(0,0,SHEET_WIDTH,SHEET_HEIGHT);
 context.fillStyle='#163d36';context.textBaseline='alphabetic';context.textAlign='left';
 context.font=`bold 64px ${font}`;context.fillText(`${info.title} · 我的字跡`,MARGIN,MARGIN+64);
 context.font=`36px ${font}`;context.fillStyle='#4b5b55';
 context.fillText([info.className,info.name,`共 ${entries.length} 字`,info.date].filter(Boolean).join('　·　'),MARGIN,MARGIN+128);
 context.strokeStyle='#ccd9bd';context.lineWidth=3;context.beginPath();context.moveTo(MARGIN,MARGIN+160);context.lineTo(SHEET_WIDTH-MARGIN,MARGIN+160);context.stroke();
 const {cell,cells}=writingSheetLayout(entries.length);
 entries.forEach((entry,index)=>{
  const {x,y}=cells[index],scale=cell/1000;
  context.save();context.translate(x,y);
  context.fillStyle='#fffdf5';context.fillRect(0,0,cell,cell);
  context.strokeStyle='#c0392b';context.lineWidth=3;context.setLineDash([]);context.strokeRect(0,0,cell,cell);
  context.strokeStyle='#e8b4ac';context.lineWidth=2;context.setLineDash([10,10]);
  context.beginPath();context.moveTo(cell/2,0);context.lineTo(cell/2,cell);context.moveTo(0,cell/2);context.lineTo(cell,cell/2);context.moveTo(0,0);context.lineTo(cell,cell);context.moveTo(cell,0);context.lineTo(0,cell);context.stroke();
  context.setLineDash([]);
  context.scale(scale,scale);context.strokeStyle='#175d9a';context.lineWidth=Math.max(26,4/scale);context.lineCap='round';context.lineJoin='round';
  for(const points of entry.traces)if(points.length)context.stroke(new Path2D(tracePath(points.length===1?[points[0],points[0]]:points)));
  context.restore();
  context.fillStyle='#4b5b55';context.textAlign='center';context.font=`${Math.max(22,Math.min(34,Math.round(cell*.1)))}px ${font}`;
  context.fillText(`${entry.number}. ${entry.character}`,x+cell/2,y+cell+LABEL*.72);
  context.textAlign='left';
 });
}

export async function renderWritingSheet(entries:WritingSheetEntry[],info:WritingSheetInfo):Promise<Blob>{
 await document.fonts?.ready;
 const canvas=document.createElement('canvas');canvas.width=SHEET_WIDTH;canvas.height=SHEET_HEIGHT;
 const context=canvas.getContext('2d');if(!context)throw Error('無法建立字跡圖片。');
 drawWritingSheet(context,entries,info);
 return new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(Error('無法建立字跡圖片。')),'image/png'));
}

/** 同一課堂中重新整理頁面時，保留已送出的字跡。 */
export function writingSheetStorageKey(roomId:string,uid:string){return `competition-writing-sheet:${roomId}:${uid}`;}
export function loadWritingSheet(key:string):WritingSheetEntry[]{
 try{const value=JSON.parse(sessionStorage.getItem(key)||'[]');return Array.isArray(value)?value:[];}catch{return [];}
}
export function saveWritingSheet(key:string,entries:WritingSheetEntry[]){
 try{sessionStorage.setItem(key,JSON.stringify(entries));}catch{/* 儲存空間不足時仍可在本頁使用 */}
}
