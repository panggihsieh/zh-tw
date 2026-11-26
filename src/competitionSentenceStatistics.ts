export interface SentenceStatisticItem { key: string; label: string; points: number; score: number | null; evidence: string }
export interface SentenceStatisticRow {
  id: string; name: string; seat: number | null; status: 'graded' | 'pending' | 'unanswered' | 'missing-history';
  sentence?: string; word?: string; polished?: string; suggestedWord?: string; qualityScore?: number | null;
  points?: number; competitionMaximum?: number; timedOut?: boolean; targetOk?: boolean; feedback?: string; issueReason?: string; items?: SentenceStatisticItem[];
}
export interface SentenceStatisticQuestion { questionIndex: number; character: string; reading: string; prompt: string; rows: SentenceStatisticRow[] }
export interface TextPart { text: string; added: boolean }

/** Red marks inserted/replaced Unicode characters in the suggestion only. */
export function suggestionTextParts(original: string, suggestion: string): TextPart[] {
  const a = [...original], b = [...suggestion], width = b.length + 1;
  if (a.length > 800 || b.length > 800) return [{ text: suggestion, added: true }];
  const lengths = new Uint16Array((a.length + 1) * width);
  for (let i = a.length - 1; i >= 0; i--) for (let j = b.length - 1; j >= 0; j--) {
    lengths[i * width + j] = a[i] === b[j] ? lengths[(i + 1) * width + j + 1] + 1 : Math.max(lengths[(i + 1) * width + j], lengths[i * width + j + 1]);
  }
  const result: TextPart[] = [];
  function append(text: string, added: boolean) {
    if (result.at(-1)?.added === added) result[result.length - 1].text += text;
    else result.push({ text, added });
  }
  let i = 0, j = 0;
  while (j < b.length) {
    if (i < a.length && a[i] === b[j]) { append(b[j++], false); i++; }
    else if (i < a.length && lengths[(i + 1) * width + j] >= lengths[i * width + j + 1]) i++;
    else append(b[j++], true);
  }
  return result;
}
export function scorePercent(score: number, maximum: number) {
  return maximum > 0 ? `${Math.round(score / maximum * 1000) / 10}%` : '—';
}
