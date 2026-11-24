import { describe, expect, it } from 'vitest';
import { SHEET_COLUMNS, SHEET_HEIGHT, SHEET_WIDTH, writingSheetLayout } from './competitionWritingSheet';

describe('competition writing sheet layout', () => {
  it('uses A4 landscape proportions', () => {
    expect(SHEET_WIDTH / SHEET_HEIGHT).toBeCloseTo(Math.SQRT2, 2);
  });
  it('places seven characters per row and keeps every cell on the page', () => {
    for (const count of [1, 7, 8, 20, 35, 60]) {
      const { rows, cell, cells } = writingSheetLayout(count);
      expect(rows).toBe(Math.ceil(count / SHEET_COLUMNS));
      expect(new Set(cells.slice(0, SHEET_COLUMNS).map(c => c.y)).size).toBe(1);
      if (count > SHEET_COLUMNS) expect(cells[SHEET_COLUMNS].x).toBe(cells[0].x);
      for (const c of cells) {
        expect(c.x).toBeGreaterThanOrEqual(0);
        expect(c.x + cell).toBeLessThanOrEqual(SHEET_WIDTH);
        expect(c.y + cell + 54).toBeLessThanOrEqual(SHEET_HEIGHT);
      }
    }
  });
});

import { workSheetKind, wrapText } from './competitionWritingSheet';
describe('competition work sheet helpers', () => {
  it('detects the game kind, treating older saved entries as handwriting', () => {
    expect(workSheetKind([{ number: 1, character: '春', traces: [] }])).toBe('writing');
    expect(workSheetKind([{ kind: 'structure', number: 1, character: '明', answer: '左右', choice: '左右', correct: true }])).toBe('structure');
    expect(workSheetKind([{ kind: 'sentence', number: 1, character: '花', sentence: '花開了。', score: 90 }])).toBe('sentence');
  });
  it('wraps Chinese sentences character by character within the width', () => {
    const lines = wrapText(text => [...text].length * 10, '春天來了花園裡開滿美麗的花朵', 50);
    expect(lines).toEqual(['春天來了花', '園裡開滿美', '麗的花朵']);
    expect(wrapText(text => text.length, '', 10)).toEqual(['']);
  });
});
