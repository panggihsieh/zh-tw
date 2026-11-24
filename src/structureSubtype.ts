/**
 * 生字結構遊戲：依筆順資料推算 25 種細分結構，出四個相似選項。
 *
 * - 字形拆解（IDS）只記錄最外層，例如「椒」記為 ⿰木叔；但「叔」本身是 ⿰尗又，
 *   教學上把「椒」視為木、尗、又三部件並排的左中右結構。因此左右結構會再看一層。
 * - 上下結構不往下拆：亡、市、秀、券等字的內層拆法與課本的上下結構不一致。
 * - 比例取自筆順中線：依部件筆畫數把筆畫分段，量各段在橫向（或縱向）所佔比例。
 *   比例落在交界附近（0.43–0.46、0.54–0.57）時不出細分題，改出原本的八大類題，避免答案有爭議。
 */
export type Catalog = Record<string, string>;
export type Stroke = { track: { x: number; y: number }[] };
export type BigStructure = '左右' | '上下' | '左中右' | '全包圍' | '半包圍';
/** 半包圍：拆解符號直接對應細分方向。 */
const HALF_ENCLOSURE: Record<string, string> = { '⿸': '左上包圍', '⿺': '左下包圍', '⿹': '右上包圍', '⿵': '上三包圍', '⿶': '下三包圍', '⿷': '左三包圍' };

import structureAtlas from './structureAtlas.json';

/** 結構縮圖：大類（例如「左右」）取該類第一張，細分（例如「左窄右寬」）取對應圖。 */
export function structureImage(name: string) {
  const groups = structureAtlas as { title: string; items: { title: string; image: string }[] }[];
  return groups.find(group => group.title === `${name}結構`)?.items[0]?.image ?? groups.flatMap(group => group.items).find(item => item.title === name)?.image ?? '';
}

const HAN = /^[\p{Script=Han}⺀-⿿]$/u;
/** 部首變形沒有獨立筆順檔，使用教育部常見筆畫數。 */
const VARIANT_STROKES: Record<string, number> = {
  '阝': 3, '艹': 4, '氵': 3, '宀': 3, '亻': 2, '扌': 3, '糹': 6, '釒': 8, '忄': 3, '訁': 7, '⺮': 6, '礻': 4, '衤': 5,
  '犭': 3, '彳': 3, '刂': 2, '攵': 4, '冫': 2, '灬': 4, '罒': 5, '飠': 8, '⻊': 7, '牜': 4, '⺼': 4, '爫': 4, '⺈': 2,
  '乚': 1, '丬': 3, '卩': 2, '㔾': 2, '⺌': 3, '⺀': 2, '亠': 2, '冖': 2,
};

function split(ids?: string) {
  const [op, a, b, ...rest] = Array.from(ids ?? '');
  return !rest.length && a && b && HAN.test(a) && HAN.test(b) ? { op, a, b } : null;
}

/** 教學用結構與部件（左右結構再看一層，判斷是否為左中右）。 */
export function teachingStructure(character: string, catalog: Catalog): { structure: BigStructure; parts: string[]; subtype?: string } | null {
  const top = split(catalog[character]);
  if (!top) return null;
  if (HALF_ENCLOSURE[top.op]) return { structure: '半包圍', parts: [top.a, top.b], subtype: HALF_ENCLOSURE[top.op] };
  if (top.op === '⿴') return { structure: '全包圍', parts: [top.a, top.b] };
  if (top.op === '⿱') return { structure: '上下', parts: [top.a, top.b] };
  if (top.op !== '⿰') return null;
  const left = split(catalog[top.a]), right = split(catalog[top.b]);
  const innerLeft = left?.op === '⿰', innerRight = right?.op === '⿰';
  if (innerLeft && innerRight) return null; // 四部件，不出題
  if (innerLeft) return { structure: '左中右', parts: [left!.a, left!.b, top.b] };
  if (innerRight) return { structure: '左中右', parts: [top.a, right!.a, right!.b] };
  return { structure: '左右', parts: [top.a, top.b] };
}

/** 依部件筆畫數分段，回傳各部件所佔比例（0–1）；無法可靠分段時回傳 null。 */
export function partShares(strokes: Stroke[], counts: (number | null)[], axis: 'x' | 'y') {
  const unknown = counts.filter(count => count == null).length;
  if (unknown > 1) return null;
  const known = counts.reduce<number>((sum, count) => sum + (count ?? 0), 0);
  const filled = counts.map(count => count ?? strokes.length - known);
  if (filled.some(count => count <= 0) || filled.reduce((a, b) => a + b, 0) !== strokes.length) return null;
  let start = 0;
  const ranges = filled.map(count => {
    const values = strokes.slice(start, start += count).flatMap(stroke => stroke.track.map(point => point[axis]));
    return { min: Math.min(...values), max: Math.max(...values), mid: values.reduce((a, b) => a + b, 0) / values.length };
  });
  // 筆順須依部件先後（左到右或上到下），否則代表筆畫不是逐部件書寫，不推算。
  if (ranges.some((range, index) => index && !(ranges[index - 1].mid < range.mid))) return null;
  const lo = Math.min(...ranges.map(range => range.min)), hi = Math.max(...ranges.map(range => range.max));
  if (!(hi > lo)) return null;
  const bounds = [lo, ...ranges.slice(1).map((range, index) => (ranges[index].max + range.min) / 2), hi];
  return bounds.slice(1).map((bound, index) => (bound - bounds[index]) / (hi - lo));
}

/** 比例對應細分結構；落在交界附近回傳 null。 */
export function subtypeFromShares(structure: BigStructure, shares: number[]): string | null {
  if (structure === '左右' || structure === '上下') {
    const [first] = shares, wide = structure === '左右';
    if (first < .43) return wide ? '左窄右寬' : '上短下長';
    if (first > .57) return wide ? '左寬右窄' : '上長下短';
    if (first >= .46 && first <= .54) return wide ? '左右等寬' : '上下等長';
    return null;
  }
  if (structure === '左中右') {
    const sorted = [...shares].sort((a, b) => b - a);
    if (sorted[0] - sorted[2] < .10) return '三部分近等寬';
    if (sorted[0] >= .40 && sorted[0] - sorted[1] >= .08) return ['左部較寬', '中寬兩側窄', '右部較寬'][shares.indexOf(sorted[0])];
    return null;
  }
  return null;
}

const SIMILAR: Partial<Record<string, string[]>> = {
  左右: ['左窄右寬', '左右等寬', '左寬右窄', '三部分近等寬'],
  上下: ['上短下長', '上下等長', '上長下短', '三部分近等長'],
  左中右: ['三部分近等寬', '中寬兩側窄', '左部較寬', '右部較寬'],
  全包圍: ['四面包圍', '上三包圍', '左三包圍', '下三包圍'],
};
const HALF_TYPES = ['上三包圍', '下三包圍', '左三包圍', '右三包圍', '左上包圍', '右上包圍', '左下包圍', '右下包圍'];
/** 半包圍：正確方向＋三個其他半包圍方向（依字固定挑選）。 */
function halfOptions(subtype: string, character: string) {
  return [subtype, ...shuffled(HALF_TYPES.filter(type => type !== subtype), character).slice(0, 3)];
}
/** 依字固定打亂，避免正確答案總在同一位置。 */
function shuffled(options: string[], seed: string) {
  let state = [...seed].reduce((sum, char) => (sum * 31 + char.codePointAt(0)!) >>> 0, 7);
  const next = () => (state = (state * 1103515245 + 12345) >>> 0) / 2 ** 32;
  const result = [...options];
  for (let index = result.length - 1; index > 0; index--) {
    const swap = Math.floor(next() * (index + 1));
    [result[index], result[swap]] = [result[swap], result[index]];
  }
  return result;
}

export const STRUCTURE_CHOICES = ['左右', '上下', '左中右', '上中下', '全包圍', '半包圍', '獨體', '品字形'];
export type StructureQuestion = { type: 'structure'; character: string; prompt: string; options: string[]; answer: number; seconds: number };

/**
 * 產生結構題：能可靠推算細分結構時出四個相似的細分選項，否則出八大類題；
 * 拆解資料無法判斷結構時回傳 null（不出題）。
 */
export async function structureQuestion(character: string, catalog: Catalog, loadStrokes: (character: string) => Promise<Stroke[] | null>): Promise<StructureQuestion | null> {
  const teaching = teachingStructure(character, catalog);
  if (!teaching) return null;
  const base = { type: 'structure' as const, character, prompt: `「${character}」是哪一種字形結構？`, seconds: 20 };
  if (teaching.subtype) {
    const options = shuffled(halfOptions(teaching.subtype, character), character + '#');
    return { ...base, options, answer: options.indexOf(teaching.subtype) };
  }
  let subtype: string | null = teaching.structure === '全包圍' ? '四面包圍' : null;
  if (!subtype) {
    const strokes = await loadStrokes(character);
    if (strokes?.length) {
      const counts = await Promise.all(teaching.parts.map(async part => (await loadStrokes(part))?.length ?? VARIANT_STROKES[part] ?? null));
      const shares = partShares(strokes, counts, teaching.structure === '上下' ? 'y' : 'x');
      if (shares) subtype = subtypeFromShares(teaching.structure, shares);
    }
  }
  if (subtype) {
    const options = shuffled(SIMILAR[teaching.structure]!, character);
    return { ...base, options, answer: options.indexOf(subtype) };
  }
  return { ...base, options: STRUCTURE_CHOICES, answer: STRUCTURE_CHOICES.indexOf(teaching.structure) };
}
