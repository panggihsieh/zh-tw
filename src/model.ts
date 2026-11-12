export interface Source {
  title: string;
  url: string;
}
export interface CharacterMaster {
  character: string;
  radical: string;
  structure: string;
  components: string[];
  layout: "vertical" | "horizontal" | "triple" | "whole";
  verificationStatus: "partial" | "unavailable";
  sources: Source[];
  version: string;
}
export interface VocabularyEntry {
  word: string;
  reading: string;
  meaning: string;
  example: string;
  sense: string;
  reviewStatus: "editorial" | "official";
  source: Source;
}
export interface PhraseContext {
  phrase: string;
  readings: string[];
  meanings: string[];
  simple: string[];
  explanation: string;
  source: Source;
}
export interface Card {
  id: string;
  character: string;
  position: number;
  reading: string;
  meaning: string;
  simple: string;
  master: CharacterMaster;
  vocabulary: VocabularyEntry[];
  rememberedWords: string[];
  visitedScenes: number[];
  source: Source | null;
}
export interface Collection {
  curriculum?: { publisher: string; grade: number; term: string; year: string; title: string; source: string };
  schemaVersion: 1;
  id: string;
  sourcePhrase: string;
  selectedCharacters: string[];
  cards: Card[];
  createdAt: string;
  updatedAt: string;
  reviewState: "practice" | "learned";
  dataVersion: string;
  scenes: string[];
}
export const SCENES = [
  "認識生字",
  "字形結構",
  "部件拆解",
  "看筆順",
  "語詞中的意思",
  "一字多詞",
];
/** 課本「自訂選取」一次可學的字數上限（目前各課最多 23 字）。 */
export const CURRICULUM_LIMIT = 40;
export function validatePhrase(input: string, max = 8): string {
  const text = input.trim();
  if (!text) return "先輸入一個想學的語詞吧。";
  if (!/^\p{Script=Han}+$/u.test(text) || Array.from(text).length > max)
    return `請輸入 1–${max} 個中文字，不包含空格、標點或英數字。`;
  return "";
}
export function safeFilename(name: string) {
  return name.replace(/[<>:"/\\|?*\x00-\x1f]/g, "_").slice(0, 80) || "生字收藏";
}
