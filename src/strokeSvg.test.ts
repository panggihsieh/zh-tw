import {it,expect} from 'vitest';
import {STROKE_SVG_ASSETS,matchedStrokeSvg,selectedStrokeSvg} from './strokeSvg';
it('35 張素材 ID 唯一，使用固定站內路徑',()=>{
 expect(STROKE_SVG_ASSETS).toHaveLength(35);expect(new Set(STROKE_SVG_ASSETS.map(asset=>asset.id)).size).toBe(35);
 expect(STROKE_SVG_ASSETS.every(asset=>/^\/stroke-svg\/kai\/stroke-\d{2}\.(?:svg|png)$/.test(asset.src))).toBe(true);
});
it('同名及舊稱都能找到對應素材',()=>{
 expect(matchedStrokeSvg('橫')?.name).toBe('橫');expect(matchedStrokeSvg('撇折')?.name).toBe('撇橫');
 expect(matchedStrokeSvg('豎曲鉤')?.name).toBe('豎彎鉤');
 expect(matchedStrokeSvg('撇挑')?.name).toBe('撇挑');
 expect(matchedStrokeSvg('長頓點')?.id).toBe('stroke-34');
 expect(matchedStrokeSvg('橫折橫')?.id).toBe('stroke-29');
 expect(matchedStrokeSvg('橫折折')?.id).toBe('stroke-29');
});
it('人工選圖優先並可還原內建圖形',()=>{
 expect(selectedStrokeSvg({name:'橫',svgId:'stroke-03'})?.name).toBe('撇');
 expect(selectedStrokeSvg({name:'橫',svgId:'builtin'})).toBeUndefined();
 expect(selectedStrokeSvg({name:'橫',svgId:'https://bad.example'})).toBeUndefined();
});
