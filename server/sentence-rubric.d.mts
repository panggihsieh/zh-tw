export type RubricKind = 'scale' | 'evidence' | 'lesson' | 'idiom';
export interface RubricDefinition { key: string; label: string; kind: RubricKind; points: number; hint: string }
export interface RubricItem { key: string; label: string; kind: RubricKind; points: number; rule?: string }
export interface RubricScore extends RubricItem { score: number; evidence: string }
export const RUBRIC_ITEMS: RubricDefinition[];
export const DEFAULT_RUBRIC: { key: string; points: number }[];
export function validateRubric(value: unknown): RubricItem[];
export function normalizeLessonCharacters(value: unknown): string;
export function normalizeLessonWords(value: unknown): string[];
export function parseLessonWords(text: string): string[];
export function rubricInstruction(rubric: RubricItem[]): string;
export function gradeRubric(sentence: string, character: string, rubric: RubricItem[], analysis: unknown, lessonWords?: string[] | string): {
  targetOk: boolean; meaningOk: boolean; uncertain: boolean; scores: Record<string, number>; rubric: RubricScore[];
  total: number | null; level: string; highlight: string; feedback: string; polished: string;
};
