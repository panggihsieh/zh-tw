import { beforeEach, expect, it, vi } from 'vitest';
import { defaultRubricDraft, loadSavedRubricSettings, saveRubricSettings } from './SentenceRubricEditor';

let storage: Map<string, string>;
beforeEach(() => {
  storage = new Map();
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => storage.set(key, value),
  });
});
it('還原上次鎖定的配分、自訂規則與語詞，不保存未鎖定修改', () => {
  const draft = defaultRubricDraft();
  draft.correctness.points = 10;
  draft.lesson.enabled = true;
  draft.custom = { enabled: true, points: 10, rule: '要表達感受' };
  saveRubricSettings(draft, '一律、律法');
  draft.custom.rule = '尚未鎖定的新規則';
  const restored = loadSavedRubricSettings();
  expect(restored.lessonWords).toBe('一律、律法');
  expect(restored.draft.custom.rule).toBe('要表達感受');
  expect(restored.draft.correctness.points).toBe(10);
});
it('相容舊版設定，損壞的儲存資料則恢復有效預設', () => {
  storage.set('competition-sentence-rubric', JSON.stringify(defaultRubricDraft()));
  expect(loadSavedRubricSettings().draft).toEqual(defaultRubricDraft());
  storage.set('competition-sentence-rubric', '{invalid');
  expect(loadSavedRubricSettings()).toEqual({ draft: defaultRubricDraft(), lessonWords: '' });
});
it('缺少課文語詞或配分無效時不可覆寫最後鎖定設定', () => {
  saveRubricSettings(defaultRubricDraft(), '');
  const previous = storage.get('competition-sentence-rubric');
  const draft = defaultRubricDraft();
  draft.lesson.enabled = true;
  draft.correctness.points = 20;
  expect(() => saveRubricSettings(draft, '')).toThrow('本課語詞');
  expect(storage.get('competition-sentence-rubric')).toBe(previous);
});
it('瀏覽器拒絕儲存時回報失敗', () => {
  vi.stubGlobal('localStorage', { setItem: () => { throw Error('QuotaExceeded'); } });
  expect(() => saveRubricSettings(defaultRubricDraft(), '')).toThrow('QuotaExceeded');
});
