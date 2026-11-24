import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { structureQuestion, teachingStructure, subtypeFromShares, type Catalog } from './structureSubtype';

const catalog = JSON.parse(readFileSync('public/structure-review/ids-catalog.json', 'utf8')) as Catalog;
const load = async (character: string) => {
  const path = `public/game-strokes/${character.codePointAt(0)!.toString(16)}.json`;
  return existsSync(path) ? JSON.parse(readFileSync(path, 'utf8')) : null;
};
const answerOf = async (character: string) => {
  const question = await structureQuestion(character, catalog, load);
  return question && question.options[question.answer];
};

describe('structure subtypes from stroke order', () => {
  it('maps half-enclosure operators directly to their direction', async () => {
    expect(await answerOf('這')).toBe('左下包圍');
    expect(await answerOf('問')).toBe('上三包圍');
    const question = await structureQuestion('這', catalog, load);
    expect(question?.options).toHaveLength(4);
    expect(new Set(question?.options).size).toBe(4);
  });
  it('matches the hand-written teaching proportions', async () => {
    expect(await answerOf('稠')).toBe('左窄右寬');
    expect(await answerOf('葵')).toBe('上短下長');
    expect(await answerOf('察')).toBe('上短下長');
    expect(await answerOf('鄰')).toBe('左寬右窄');
  });
  it('treats a left-right part that splits again as 左中右 (椒 = 木＋尗＋又)', async () => {
    expect(teachingStructure('椒', catalog)).toEqual({ structure: '左中右', parts: ['木', '尗', '又'] });
    const question = await structureQuestion('椒', catalog, load);
    expect(question?.options).toHaveLength(4);
    expect(['三部分近等寬', '中寬兩側窄', '左部較寬', '右部較寬', '左中右']).toContain(question!.options[question!.answer]);
  });
  it('keeps top-bottom characters as 上下 instead of guessing 上中下', () => {
    for (const character of ['亡', '市', '秀', '葵']) expect(teachingStructure(character, catalog)?.structure).toBe('上下');
  });
  it('offers four similar options and skips borderline proportions', async () => {
    const question = await structureQuestion('花', catalog, load);
    expect(question?.options.sort()).toEqual(['三部分近等長', '上下等長', '上短下長', '上長下短'].sort());
    expect(subtypeFromShares('左右', [.43, .57])).toBeNull();
  });
  it('uses the administrator correction first', async () => {
    const corrected = await structureQuestion('椒', catalog, load, { structure: '左右', subtype: '左窄右寬', exclude: false });
    expect(corrected?.options[corrected.answer]).toBe('左窄右寬');
    expect(corrected?.options).toHaveLength(4);
    const bigOnly = await structureQuestion('孝', catalog, load, { structure: '上下', subtype: '', exclude: false });
    expect(bigOnly?.options).toHaveLength(8);
    expect(bigOnly?.options[bigOnly.answer]).toBe('上下');
    expect(await structureQuestion('乃', catalog, load, { structure: '獨體', subtype: '', exclude: true })).toBeNull();
    const single = await structureQuestion('人', catalog, load, { structure: '獨體', subtype: '整體一區', exclude: false });
    expect(single?.options[single.answer]).toBe('整體一區');
  });
});
