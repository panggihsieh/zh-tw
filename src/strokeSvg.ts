import assets from './strokeSvgAssets.json';
export const STROKE_SVG_ASSETS: {id:string;name:string;src:string;warning?:string}[]=assets;
const aliases:Record<string,string>={'橫折折':'橫折橫','橫曲鉤':'橫折彎鉤','豎曲鉤':'豎彎鉤','撇折':'撇橫','撇頓點':'撇點','豎橫折':'豎折折','豎橫折鉤':'豎折折鉤','橫撇橫折鉤':'橫折折折鉤'};
export function matchedStrokeSvg(name:string){
 const target=aliases[name]??name.split('／')[0];
 return STROKE_SVG_ASSETS.find(asset=>asset.name===target&&!asset.warning);
}
export function selectedStrokeSvg(row:{name:string;svgId?:string;thumbnail?:string},thumbnails:Record<string,string>={}):typeof STROKE_SVG_ASSETS[number]|undefined{
 if(row.thumbnail)return {id:'custom',name:'自訂縮圖',src:row.thumbnail};
 if(row.svgId==='builtin')return undefined;
 const asset=row.svgId?STROKE_SVG_ASSETS.find(asset=>asset.id===row.svgId):matchedStrokeSvg(row.name);
 return asset&&thumbnails[asset.id]?{...asset,src:thumbnails[asset.id]}:asset;
}
