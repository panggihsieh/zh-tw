import { readFile } from 'node:fs/promises';
import { judgeStroke } from './stroke-judge.mjs';

export async function writingReferences(character) {
 if (!/^\p{Script=Han}$/u.test(character)) throw Error('書寫生字格式不符。');
 return JSON.parse(await readFile(new URL(`../public/game-strokes/${character.codePointAt(0).toString(16)}.json`,import.meta.url),'utf8'));
}
export async function judgeCompetitionWriting(character,traces) {
 const references=await writingReferences(character);
 if (!Array.isArray(traces)||traces.length!==references.length) return false;
 return references.every((reference,index)=>{
  const points=traces[index];
  return Array.isArray(points)&&points.length>=2&&points.length<=256&&points.every(p=>p&&Number.isFinite(p.x)&&Number.isFinite(p.y)&&p.x>=0&&p.x<=1000&&p.y>=0&&p.y<=1000)&&judgeStroke(points,reference.track.map(p=>({x:p.x/2048*1000,y:p.y/2048*1000})));
 });
}
