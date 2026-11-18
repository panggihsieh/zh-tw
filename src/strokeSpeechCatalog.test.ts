import {describe,it,expect} from 'vitest';
import {STROKE_CATALOG,findStrokePreset,fillStrokeMnemonic} from './strokeSpeechCatalog';
describe('32 種筆畫口訣',()=>{
 it('保留完整分類與各筆畫口訣',()=>{
  expect(STROKE_CATALOG).toHaveLength(32);
  expect(new Set(STROKE_CATALOG.map(item=>item.name)).size).toBe(32);
  expect(['基本筆畫','向左轉折','向右轉折','向下與鉤類'].map(group=>STROKE_CATALOG.filter(item=>item.group===group).length)).toEqual([8,4,11,9]);
  expect(STROKE_CATALOG.every(item=>item.symbol&&item.spoken&&item.examples)).toBe(true);
 });
 it('別名套用同一口訣，共用符號仍按名稱分辨',()=>{
  expect(findStrokePreset('提')?.spoken).toBe('挑');
  expect(findStrokePreset('戈鉤')?.spoken).toBe('斜彎，鉤');
  expect(findStrokePreset('心鉤')?.spoken).toBe('向右下平彎，左鉤');
  expect(findStrokePreset('豎折撇')?.spoken).toBe('豎，折，撇');
  expect(findStrokePreset('豎折折')?.spoken).toBe('豎，折，下折');
  expect(findStrokePreset('自訂')).toBeUndefined();
 });
});

it('補入口訣需重新確認，保留自訂及無對照項目',()=>{
 expect(fillStrokeMnemonic({name:'豎折',confirmed:true})).toEqual({name:'豎折',mnemonic:'豎，折',confirmed:false});
 const custom={name:'豎折',mnemonic:'自訂口訣',confirmed:true};expect(fillStrokeMnemonic(custom)).toBe(custom);
 const unknown={name:'長頓點',confirmed:true};expect(fillStrokeMnemonic(unknown)).toBe(unknown);
});

it('補齊舊名稱並保留連續轉折與鉤向',()=>{
 expect(findStrokePreset('橫曲鉤')?.spoken).toBe('橫，折，彎，鉤');
 expect(findStrokePreset('撇挑')?.spoken).toBe('撇，挑');
 expect(findStrokePreset('豎橫折鉤')?.spoken).toBe('豎，折，下折，左鉤');
 expect(findStrokePreset('橫撇橫折鉤')?.spoken).toBe('橫，撇，折，下折，左鉤');
 expect(findStrokePreset('長頓點')).toBeUndefined();
});

it('轉折省略規則一致，必要的第二折及鉤向保留',()=>{
 expect(findStrokePreset('橫撇彎鉤')?.spoken).toBe('橫，撇，彎，左鉤');
 expect(findStrokePreset('橫折折撇')?.spoken).toBe('橫，撇，折，撇');
 expect(findStrokePreset('豎折撇')?.spoken).toBe('豎，折，撇');
 expect(findStrokePreset('橫折折')?.spoken).toBe('橫，折，右折');
 expect(findStrokePreset('豎折折')?.spoken).toBe('豎，折，下折');
 expect(findStrokePreset('橫折鉤')?.spoken).toBe('橫，折，左鉤');
});
