import assets from './strokeSvgAssets.json';
export const STROKE_SVG_ASSETS=assets;
const aliases:Record<string,string>={'橫曲鉤':'橫折彎鉤','豎曲鉤':'豎彎鉤','撇橫':'撇折','撇頓點':'撇點','豎橫折':'豎折折','豎橫折鉤':'豎折折鉤','橫撇橫折鉤':'橫折折折鉤'};
export function matchedStrokeSvg(name:string){
 const target=aliases[name]??name.split('／')[0];
 return assets.find(asset=>asset.name===target&&!asset.warning);
}
export function selectedStrokeSvg(row:{name:string;svgId?:string}){
 if(row.svgId==='builtin')return undefined;
 return row.svgId?assets.find(asset=>asset.id===row.svgId):matchedStrokeSvg(row.name);
}
