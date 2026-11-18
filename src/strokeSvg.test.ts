import {it,expect} from 'vitest';
import {STROKE_SVG_ASSETS,matchedStrokeSvg,selectedStrokeSvg} from './strokeSvg';
it('34 張素材 ID 唯一，使用固定站內路徑',()=>{
 expect(STROKE_SVG_ASSETS).toHaveLength(34);expect(new Set(STROKE_SVG_ASSETS.map(asset=>asset.id)).size).toBe(34);
 expect(STROKE_SVG_ASSETS.every(asset=>/^\/stroke-svg\/kai\/stroke-\d{2}\.svg$/.test(asset.src))).toBe(true);
});
it('同名及別名匹配，歧義筆畫不自動套用',()=>{
 expect(matchedStrokeSvg('橫')?.name).toBe('橫');expect(matchedStrokeSvg('撇橫')?.name).toBe('撇折');
 expect(matchedStrokeSvg('豎曲鉤')?.name).toBe('豎彎鉤');
 expect(matchedStrokeSvg('撇挑')?.name).toBe('撇挑');
 expect(matchedStrokeSvg('長頓點')?.id).toBe('stroke-34');
 for(const name of ['橫折橫'])expect(matchedStrokeSvg(name)).toBeUndefined();
});
it('人工選圖優先並可還原內建圖形',()=>{
 expect(selectedStrokeSvg({name:'橫',svgId:'stroke-03'})?.name).toBe('撇');
 expect(selectedStrokeSvg({name:'橫',svgId:'builtin'})).toBeUndefined();
 expect(selectedStrokeSvg({name:'橫',svgId:'https://bad.example'})).toBeUndefined();
});
