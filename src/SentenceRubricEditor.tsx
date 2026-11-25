import { RUBRIC_ITEMS, DEFAULT_RUBRIC, type RubricItem } from '../server/sentence-rubric.mjs';

export type RubricDraft = Record<string, { enabled: boolean; points: number }> & { custom: { enabled: boolean; points: number; rule?: string } };
/** 預設勾選原本固定五項（合計 100 分），其餘項目帶入建議配分但不勾選。 */
export function defaultRubricDraft(): RubricDraft {
  return Object.fromEntries(RUBRIC_ITEMS.map(item => [item.key, {
    enabled: DEFAULT_RUBRIC.some(base => base.key === item.key),
    points: item.points,
    ...(item.key === 'custom' ? { rule: '' } : {}),
  }])) as RubricDraft;
}
export function rubricFromDraft(draft: RubricDraft): RubricItem[] {
  return RUBRIC_ITEMS.filter(item => draft[item.key]?.enabled).map(item => ({
    key: item.key, label: item.label, kind: item.kind, points: draft[item.key].points,
    ...(item.key === 'custom' ? { rule: (draft.custom.rule ?? '').trim() } : {}),
  }));
}
/** 開課前檢查：總分 100、至少一項、自訂規則 2–80 字。 */
export function rubricProblem(draft: RubricDraft): string {
  const items = rubricFromDraft(draft);
  if (!items.length) return '請至少勾選一個評分項目。';
  const total = items.reduce((sum, item) => sum + item.points, 0);
  if (total !== 100) return `評分項目總分須為 100 分，目前是 ${total} 分。`;
  if (draft.custom.enabled && ((draft.custom.rule ?? '').trim().length < 2 || (draft.custom.rule ?? '').trim().length > 80)) return '老師自訂規則請填 2–80 字。';
  return '';
}

const GROUPS: [string, string[]][] = [
  ['基本項目', ['correctness', 'completeness', 'fluency', 'detail', 'mechanics']],
  ['人事時地物', ['person', 'event', 'time', 'place', 'object']],
  ['延伸要求', ['lesson', 'idiom', 'custom']],
];

export default function SentenceRubricEditor({ draft, onChange, disabled }: { draft: RubricDraft; onChange: (draft: RubricDraft) => void; disabled?: boolean }) {
  const total = rubricFromDraft(draft).reduce((sum, item) => sum + item.points, 0);
  const problem = rubricProblem(draft);
  const update = (key: string, value: Partial<RubricDraft[string]> & { rule?: string }) => onChange({ ...draft, [key]: { ...draft[key], ...value } } as RubricDraft);
  return <fieldset className="sentence-rubric-editor" disabled={disabled}>
    <legend>造句評分項目（總分須為 100）</legend>
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
    </div>)}
    <p className={problem ? 'sentence-rubric-total is-wrong' : 'sentence-rubric-total'} role="status">目前總分 {total} 分{problem ? `：${problem}` : '，可以開課。'}</p>
  </fieldset>;
}
