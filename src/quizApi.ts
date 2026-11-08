export const QUIZ_CATEGORIES = [
  "字音字形",
  "字詞義及運用",
  "文意理解",
  "標點符號",
  "基本修辭",
];
export interface QuizQuestion {
  id: string;
  category: string;
  difficulty: string;
  stem: string;
  variants: string[];
  options: string[];
  answer: number;
  explanation: string;
  evidence: string;
  reviewed: boolean;
}
export interface QuizPaper {
  roster: string[];
  id: string;
  familyId: string;
  parentId?: string;
  title: string;
  className: string;
  grade: number;
  lesson: string;
  passage: string;
  questionMode: "original" | "rephrase";
  status: "draft" | "published";
  questions: QuizQuestion[];
  count?: number;
}
export interface QuizRow extends QuizQuestion {
  choice: number;
  correct: boolean;
  quizId?: string;
  title?: string;
  latestCorrect?: boolean;
  wrongCount?: number;
}
export interface QuizAttempt {
  id: string;
  quizId: string;
  title: string;
  passage: string;
  mode: string;
  questions: Pick<QuizQuestion, "id" | "stem" | "options" | "category">[];
  result?: { score: number; rows: QuizRow[] };
}
export interface QuizStat {
  id: string;
  stem: string;
  total: number;
  wrong: number;
  rate: number;
  choices: number[];
  firstWrong: number;
  improved: number;
  names: string[];
}
export async function quizRequest<T>(path: string, body?: unknown): Promise<T> {
  const { cloudServices } = await import("./cloudSync");
  const user = cloudServices().auth.currentUser;
  if (!user) throw Error("請先登入 Google 帳號");
  const response = await fetch(`/api/structure/quiz${path}`, {
    method: body ? "POST" : "GET",
    headers: {
      Authorization: `Bearer ${await user.getIdToken()}`,
      "Content-Type": "application/json",
      "X-Notebook-Request": "quiz",
    },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(140000),
  });
  const v = await response.json();
  if (!response.ok) throw Error(v.error || "測驗服務暫時無法使用");
  return v;
}
