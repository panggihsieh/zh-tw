import { PHRASES, VOCABULARY } from "./data";
import { hasRepeatedCharacter } from "./phraseRules";
// 僅供選詞提示；這些詞不代表已建立或審定語境教材。
const extraWords = [
  "偵測",
  "偵查",
  "探測",
  "檢測",
  "測量",
  "觀測",
  "檢查",
  "調查",
  "發現",
];
const words = [
  ...new Set([
    ...Object.keys(PHRASES),
    ...Object.values(VOCABULARY).flatMap((entries) =>
      entries.map((entry) => entry.word),
    ),
    ...extraWords,
  ]),
];
export function phraseSuggestions(
  input: string,
  recent: string[] = [],
  limit = 4,
  dictionaryWords: string[] = [],
): string[] {
  const text = input.trim();
  const characters = new Set(Array.from(text));
  const candidates = [...new Set([...words, ...recent, ...dictionaryWords])].filter(
    (word) => word !== text && !hasRepeatedCharacter(word),
  );
  const ranked = candidates.map((word, index) => ({
    word,
    index,
    related: Array.from(word).some((c) => characters.has(c)),
    score:
      Array.from(new Set(word)).filter((c) => characters.has(c)).length * 10 +
      (text && word.startsWith(Array.from(text)[0]) ? 4 : 0) +
      (Array.from(word).length === 2 ? 8 : 0) +
      (PHRASES[word] ? 2 : 0),
  }));
  const related = ranked
    .filter((item) => item.related)
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map((item) => item.word);
  const fallback = [
    ...new Set([
      ...recent.filter((word) => PHRASES[word]),
      ...Object.keys(PHRASES),
    ]),
  ].filter((word) => word !== text && !hasRepeatedCharacter(word));
  return [...new Set([...related, ...fallback])].slice(0, Math.max(0, limit));
}
