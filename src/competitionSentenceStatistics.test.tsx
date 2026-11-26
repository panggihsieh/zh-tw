import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { SentenceStatisticsTable } from './CompetitionSentenceReview';
import { suggestionTextParts, scorePercent, type SentenceStatisticQuestion } from './competitionSentenceStatistics';

describe('造詞逐題表列統計', () => {
  it('只標紅新增或替換的字，保留原字，不拆開 Unicode 字元', () => {
    const parts = suggestionTextParts('我在海灘玩。', '我在美麗的海灘玩。');
    expect(parts.filter(part => part.added).map(part => part.text).join('')).toBe('美麗的');
    expect(parts.map(part => part.text).join('')).toBe('我在美麗的海灘玩。');
    expect(suggestionTextParts('我看書。', '我讀書。').filter(part => part.added).map(part => part.text).join('')).toBe('讀');
    expect(suggestionTextParts('我在海灘玩。', '我在海灘玩。').some(part => part.added)).toBe(false);
    expect(suggestionTextParts('𠮷在海灘', '𠮷在海灘。')[0].text).toBe('𠮷在海灘');
  });
  it('配分占比與得分率使用不同分母，無有效滿分時不製造百分比', () => {
    expect(scorePercent(30, 100)).toBe('30%');
    expect(scorePercent(25, 30)).toBe('83.3%');
    expect(scorePercent(0, 10)).toBe('0%');
    expect(scorePercent(1, 0)).toBe('—');
  });
  it('表格包含學生、原語詞紅字、評分項目及 AI 新增紅字，缺漏作答不顯示零分', () => {
    const question: SentenceStatisticQuestion = { questionIndex: 0, character: '灘', reading: 'ㄊㄢ', prompt: '', rows: [
      { id: 'example-1', name: '示例小安', seat: 1, status: 'graded', sentence: '我在海灘玩。', word: '海灘', polished: '我在美麗的海灘玩。', suggestedWord: '海灘', qualityScore: 85, points: 850, competitionMaximum: 1000, items: [{ key: 'correctness', label: '用詞正確', points: 30, score: 25, evidence: '海灘' }, { key: 'other', label: '其他項目', points: 70, score: 60, evidence: '' }] },
      { id: 'example-2', name: '<示例小晴>', seat: 2, status: 'unanswered' },
    ] };
    const html = renderToStaticMarkup(<SentenceStatisticsTable question={question}/>);
    expect(html).toContain('示例小安');
    expect(html).toContain('<strong class="sentence-stat-red">海灘</strong>');
    expect(html).toContain('<span class="sentence-stat-red">美麗的</span>');
    expect(html).toContain('配分占 30%'); expect(html).toContain('得分率 83.3%');
    expect(html).toContain('&lt;示例小晴&gt;');
    expect(html).toContain('未作答');
    expect(html).toContain('競賽得分：850／1000');
  });
});
