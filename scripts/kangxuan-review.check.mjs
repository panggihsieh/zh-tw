import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {parseIds,validateWeights,validateCorrection,suggestedWeights} from '../public/structure-review/review-model.mjs';
const data=JSON.parse(readFileSync(new URL('../public/structure-review/books.json',import.meta.url)));
test('four books contain complete cached lesson sets and valid structural candidates',()=>{
  assert.deepEqual(data.books.map(b=>[b.id,b.lessons.length,b.lessons.reduce((n,l)=>n+l.characters.length,0)]),[['5-上',12,224],['5-下',12,217],['6-上',12,217],['6-下',9,153]]);
  for(const b of data.books) for(const l of b.lessons){assert.match(l.source,/^https:\/\/pedia.cloud.edu.tw\/Bookmark\/TCollection\?TextNameId=\d+$/);for(const c of l.characters){assert.match(c.character,/^\p{Script=Han}$/u);const tree=parseIds(c.ids||c.character);validateWeights(suggestedWeights(tree).join(','),tree.children.length||1);}}
});
test('nested structures and rare components preserve exact components',()=>{const t=parseIds('⿰耳𢇇');assert.equal(t.children[1].value,'𢇇');assert.deepEqual(suggestedWeights(t),[38,62]);assert.equal(parseIds('⿱宀⿰示見').children[1].children.length,2);assert.throws(()=>parseIds('⿰耳'));assert.throws(()=>parseIds('⿰耳見木'));});
test('invalid proportions and malformed imports are rejected before persistence',()=>{
  for(const s of ['0,100','-5,105','50,20','NaN,50','100'])assert.throws(()=>validateWeights(s,2));
  const value={ids:'⿱宀祭',weights:[28,72],radical:'宀',explanation:'',source:'',note:'',status:'corrected'};
  assert.equal(validateCorrection(value),value);assert.throws(()=>validateCorrection({...value,weights:'28,72'}));assert.throws(()=>validateCorrection({...value,status:'automatic'}));
});
