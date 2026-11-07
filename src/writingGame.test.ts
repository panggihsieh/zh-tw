import {describe,it,expect} from 'vitest';
import {readFileSync,readdirSync} from 'node:fs';
import {judgeStroke,sample,type Point} from './writingGame';
const data=(c:string)=>JSON.parse(readFileSync(`public/game-strokes/${c.codePointAt(0)!.toString(16)}.json`,'utf8'));
const normalized=(track:Point[])=>track.map(p=>({x:p.x/2048*1000,y:p.y/2048*1000}));
describe('Taiwan writing stroke checker',()=>{
  it('accepts small hand variation but rejects reverse, misplaced, short and wrong-order strokes',()=>{const reference=normalized(data('一')[0].track);expect(judgeStroke(reference.map(p=>({x:p.x+12,y:p.y-10})),reference)).toBe(true);expect(judgeStroke([...reference].reverse(),reference)).toBe(false);expect(judgeStroke(reference.map(p=>({x:p.x,y:p.y+250})),reference)).toBe(false);expect(judgeStroke(reference.slice(0,2),reference)).toBe(false);const cross=data('十');expect(judgeStroke(normalized(cross[1].track),normalized(cross[0].track))).toBe(false)});
  it('keeps endpoints when sampling and ignores repeated stationary points',()=>{expect(sample([{x:0,y:0},{x:0,y:0},{x:100,y:0}])[31]).toEqual({x:100,y:0});expect(judgeStroke([{x:1,y:1},{x:1,y:1}],[{x:1,y:1},{x:100,y:1}])).toBe(false)});
  it('validates every imported outline and accepts every original track in source order',()=>{let count=0;for(const file of readdirSync('public/game-strokes').filter(f=>/^[0-9a-f]+\.json$/.test(f))){if(!/^\p{Script=Han}$/u.test(String.fromCodePoint(parseInt(file,16))))continue;const strokes=JSON.parse(readFileSync(`public/game-strokes/${file}`,'utf8'));for(const s of strokes){expect(s.outline.every((p:any)=>['M','L','Q','C'].includes(p.type)),file).toBe(true);const ref=normalized(s.track);expect(ref.every((p:Point)=>p.x>=0&&p.x<=1000&&p.y>=0&&p.y<=1000),file).toBe(true);expect(judgeStroke(ref,ref),file).toBe(true);count++}}expect(count).toBeGreaterThan(40000)},30000);
});
