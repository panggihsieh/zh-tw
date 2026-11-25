import { Lock, LockOpen } from 'lucide-react';
import { RUBRIC_ITEMS, DEFAULT_RUBRIC, parseLessonWords, type RubricItem } from '../server/sentence-rubric.mjs';

const STORAGE_KEY = 'competition-sentence-rubric';

export type RubricDraft = Record<string, { enabled: boolean; points: number }> & { custom: { enabled: boolean; points: number; rule?: string } };
/** 預設勾選原本固定五項（合計 100 分），其餘項目帶入建議配分但不勾選。 */
export function defaultRubricDraft(): RubricDraft {
  return Object.fromEntries(RUBRIC_ITEMS.map(item => [item.key, {
    enabled: DEFAULT_RUBRIC.some(base => base.key === item.key),
    points: item.points,
    ...(item.key === 'custom' ? { rule: '' } : {}),
  }])) as RubricDraft;
}
/** 讀回上次鎖定的評分設定（本機瀏覽器）；格式不符或總分不對時用預設值。 */
export function loadSavedRubricDraft(): RubricDraft {
  const base = defaultRubricDraft();
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null') as Record<string, { enabled?: unknown; points?: unknown; rule?: unknown }> | null;
    if (!saved) return base;
    for (const item of RUBRIC_ITEMS) {
      const value = saved[item.key];
      if (!value) continue;
      base[item.key] = { enabled: value.enabled === true, points: Number.isInteger(value.points) ? value.points as number : item.points, ...(item.key === 'custom' ? { rule: typeof value.rule === 'string' ? value.rule.slice(0, 80) : '' } : {}) };
    }
    return rubricProblem(base, '已儲存') ? defaultRubricDraft() : base;
  } catch { return base; }
}
function saveRubricDraft(draft: RubricDraft) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(draft)); } catch { /* 無法儲存時只影響下次預設值 */ }
}
export function rubricFromDraft(draft: RubricDraft): RubricItem[] {
  return RUBRIC_ITEMS.filter(item => draft[item.key]?.enabled).map(item => ({
    key: item.key, label: item.label, kind: item.kind, points: draft[item.key].points,
    ...(item.key === 'custom' ? { rule: (draft.custom.rule ?? '').trim() } : {}),
  }));
}
/** 開課前檢查：總分 100、至少一項、自訂規則 2–80 字、勾課文語詞須有語詞表。 */
export function rubricProblem(draft: RubricDraft, lessonWordsText = ''): string {
  const items = rubricFromDraft(draft);
  if (!items.length) return '請至少勾選一個評分項目。';
  const total = items.reduce((sum, item) => sum + item.points, 0);
  if (total !== 100) return `評分項目總分須為 100 分，目前是 ${total} 分。`;
  if (draft.custom.enabled && ((draft.custom.rule ?? '').trim().length < 2 || (draft.custom.rule ?? '').trim().length > 80)) return '老師自訂規則請填 2–80 字。';
  if (draft.lesson.enabled && !parseLessonWords(lessonWordsText).length) return '勾選「用到課文語詞」請填寫本課語詞（2 字以上，用頓號分隔）。';
  return '';
}

const GROUPS: [string, string[]][] = [
  ['基本項目', ['correctness', 'completeness', 'fluency', 'detail', 'mechanics']],
  ['人事時地物', ['person', 'event', 'time', 'place', 'object']],
  ['延伸要求', ['lesson', 'idiom', 'custom']],
];

/** 內建鎖定：預設鎖住避免誤改；解鎖後才能調整，鎖定時記住這組設定供下次開課使用。 */
export default function SentenceRubricEditor({ draft, onChange, disabled, locked, onLockedChange, lessonWords, onLessonWordsChange, suggestedWords }: { draft: RubricDraft; onChange: (draft: RubricDraft) => void; disabled?: boolean; locked: boolean; onLockedChange: (locked: boolean) => void; lessonWords: string; onLessonWordsChange: (text: string) => void; suggestedWords: string[] }) {
  const total = rubricFromDraft(draft).reduce((sum, item) => sum + item.points, 0);
  const problem = rubricProblem(draft, lessonWords);
  const wordCount = parseLessonWords(lessonWords).length;
  const update = (key: string, value: Partial<RubricDraft[string]> & { rule?: string }) => onChange({ ...draft, [key]: { ...draft[key], ...value } } as RubricDraft);
  return <section className={locked ? 'sentence-rubric-editor is-locked' : 'sentence-rubric-editor'}>
    <header className="sentence-rubric-head">
      <h3>造句評分項目（總分須為 100）</h3>
      {locked
        ? <button type="button" className="secondary" disabled={disabled} onClick={() => onLockedChange(false)}><LockOpen size={16} aria-hidden />解鎖修改</button>
        : <button type="button" className="primary" disabled={disabled || !!problem} title={problem || '鎖定並記住這組設定'} onClick={() => { saveRubricDraft(draft); onLockedChange(true); }}><Lock size={16} aria-hidden />鎖定</button>}
    </header>
    <p className="sentence-rubric-lock-note">{locked ? '已鎖定，開課時使用這組評分項目。要調整請按「解鎖修改」。' : '修改中：調整完成並確認總分 100 後，請按「鎖定」，才能建立開課大廳。'}</p>
    <fieldset disabled={disabled || locked}>
    {GROUPS.map(([title, keys]) => <div key={title} className="sentence-rubric-group">
      <h4>{title}</h4>
      {keys.map(key => {
        const base = RUBRIC_ITEMS.find(item => item.key === key)!;
        const value = draft[key];
        return <div key={key} className={value.enabled ? 'sentence-rubric-row is-on' : 'sentence-rubric-row'}>
          <label><input type="checkbox" checked={value.enabled} onChange={event => update(key, { enabled: event.target.checked })} /><strong>{base.label}</strong></label>
          <label className="sentence-rubric-points"><input type="number" min={1} max={100} value={value.points} disabled={!value.enabled} onChange={event => update(key, { points: Math.max(0, Math.round(Number(event.target.value) || 0)) })} aria-label={`${base.label}配分`} />分</label>
          {key === 'custom'
            ? <input className="sentence-rubric-rule" type="text" maxLength={80} placeholder="例如：句中要表達感受" value={draft.custom.rule ?? ''} disabled={!value.enabled} onChange={event => update('custom', { rule: event.target.value })} aria-label="老師自訂規則" />
            : <small>{base.hint}</small>}
        </div>;
      })}
      {keys.includes('lesson') && draft.lesson.enabled && <div className="sentence-rubric-words">
        <label htmlFor="sentence-rubric-words">本課語詞（2 字以上，用頓號、逗號或換行分隔；目前 {wordCount} 個）</label>
        <textarea id="sentence-rubric-words" rows={3} value={lessonWords} placeholder="例如：沙灘、海灘、夕陽、晚霞" onChange={event => onLessonWordsChange(event.target.value)} />
        <div className="competition-actions"><button type="button" className="secondary" disabled={!suggestedWords.length} onClick={() => onLessonWordsChange([...new Set([...parseLessonWords(lessonWords), ...suggestedWords])].join('、'))}>從所選課文生字帶入建議語詞（{suggestedWords.length}）</button></div>
        <small>建議語詞取自生字的字典例詞，請刪改成課文中真正出現的語詞。含本題指定字的語詞不計分，學生須另外用到一個本課語詞。</small>
      </div>}
    </div>)}
    </fieldset>
    <p className={problem ? 'sentence-rubric-total is-wrong' : 'sentence-rubric-total'} role="status">目前總分 {total} 分{problem ? `：${problem}` : locked ? '，已鎖定。' : '，請按「鎖定」。'}</p>
  </section>;
}
