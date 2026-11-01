import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {matchStructurePreset,presetCorrection} from '../public/structure-review/inline-structure.mjs';
const presets=JSON.parse(readFileSync(new URL('../public/structure-atlas/catalog.json',import.meta.url)));
const value={ids:'⿰彳𢛳',weights:[30,70],radical:'彳',explanation:'保留依據',source:'原來源',note:'原備註',status:'pending'};
test('backend atlas provides 23 selectable thumbnails and fills current shape from actual root and ratios',()=>{
  assert.equal(presets.length,23);assert.equal(matchStructurePreset(value,presets).title,'左窄右寬');
  assert.equal(matchStructurePreset({...value,weights:[65,35]},presets).title,'左寬右窄');
  assert.equal(matchStructurePreset({...value,ids:'⿳亠口衣',weights:[25,50,25]},presets).title,'中長上下短');
});
test('inline edits preserve existing components and notes and require real third parts',()=>{
  const next=presetCorrection('德',value,presets.find(p=>p.title==='左寬右窄'));
  assert.equal(next.ids,value.ids);assert.deepEqual(next.weights,[65,35]);assert.equal(next.note,value.note);
  assert.throws(()=>presetCorrection('德',value,presets.find(p=>p.operator==='⿲')));
  assert.throws(()=>presetCorrection('德',value,presets.find(p=>p.operator==='品')));
  const pin={...value,ids:'⿱木⿰木木',weights:[50,50]};assert.equal(matchStructurePreset(pin,presets).operator,'品');
});
