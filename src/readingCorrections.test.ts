import { describe, expect, it, vi } from 'vitest';
vi.mock('./cloudSync', () => ({ cloudConfigured: false }));
import { applyReadingCorrections, validReadingCorrection } from './readingCorrections';
import bank from '../public/sentence-bank.json';

describe('課文指定讀音', () => {
  it('藉由的本課預設讀音正確，仍保留多音候選', () => {
    const row = bank.lessons.find(row => row.id === '4e8f9e56339c04e8')!.characters.find(row => row.character === '藉')!;
    expect(row.readings[0].reading).toBe('ㄐㄧㄝˋ');
    expect(row.readings).toHaveLength(2);
  });
  it('只修正指定課別、保留相符釋義，不污染原始候選', () => {
    const character = { character: '藉', readings: [{ reading: 'ㄐㄧˊ', definition: '其他讀音', source: '字典' }, { reading: 'ㄐㄧㄝˋ', definition: '憑藉', source: '字典' }] };
    const lessons = ['lesson-a', 'lesson-b'].map(id => ({ id, title: id, grade: 5, term: '上', year: '115', characters: [character] }));
    const result = applyReadingCorrections(lessons, [{ lessonId: 'lesson-a', character: '藉', reading: 'ㄐㄧㄝˋ' }]);
    expect(result[0].characters[0].readings).toEqual([character.readings[1]]);
    expect(result[1].characters[0].readings[0].reading).toBe('ㄐㄧˊ');
    expect(lessons[0].characters[0].readings).toHaveLength(2);
  });
  it('拒絕非注音與跨路徑課號，接受一聲無調號及四聲', () => {
    const value = { lessonId: 'lesson-a', character: '藉', reading: 'ㄐㄧㄝˋ' };
    expect(validReadingCorrection(value)).toBe(true);
    expect(validReadingCorrection({ ...value, reading: 'ㄏㄥ' })).toBe(true);
    expect(validReadingCorrection({ ...value, reading: 'jie4' })).toBe(false);
    expect(validReadingCorrection({ ...value, lessonId: '../other' })).toBe(false);
  });
});

it('課文語詞隨讀音套用，只接受含指定字的二至八字語詞', () => {
 const value = {lessonId:'lesson-a',character:'藉',reading:'ㄐㄧㄝˋ',contextWord:'藉由'};
 expect(validReadingCorrection(value)).toBe(true);
 expect(validReadingCorrection({...value,contextWord:'海灘'})).toBe(false);
 expect(validReadingCorrection({...value,contextWord:'藉'})).toBe(false);
 expect(validReadingCorrection({...value,contextWord:'<藉>'})).toBe(false);
 const lesson = {id:'lesson-a',title:'第九課',grade:5,term:'上',year:'115',characters:[{character:'藉',readings:[{reading:'ㄐㄧˊ',definition:'',source:''}]}]};
 const result = applyReadingCorrections([lesson], [value]);
 expect(result[0].characters[0].contextWord).toBe('藉由');
 expect(result[0].characters[0].readings[0].reading).toBe('ㄐㄧㄝˋ');
 expect(lesson.characters[0]).not.toHaveProperty('contextWord');
});
