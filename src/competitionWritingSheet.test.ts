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
