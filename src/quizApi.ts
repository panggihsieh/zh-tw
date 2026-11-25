export const SIX_QUIZ_CATEGORIES = ["字音字形", "字詞義及運用", "文意理解", "標點符號", "修辭", "成語"];
export const QUIZ_CATEGORY_HINTS: Record<string, string> = {
  字音字形: "注音、聲調、同音與形近字",
  字詞義及運用: "語境詞義、近反義與填空",
  文意理解: "訊息、推論、主旨與生活應用",
  標點符號: "符號選用與語意判讀",
  修辭: "修辭辨識與表達效果",
  成語: "生字延伸、釋義與情境運用",
};
export const QUIZ_CATEGORIES = [
  "課文理解（閱讀素養）", "成語", "修辭", "改錯",
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
  readingSkill?: string;
}
export interface QuizPaper {
  aiCheck?: { model: string; checkedAt: string; repaired?: boolean; checks: {index: number; ok: boolean; reason: string}[]; notice: string };
  dueAt?: string;
  shuffleOptions?: boolean;
  sourceKind?: string;
  source?: {
    publisher: string;
    url: string;
    title: string;
    rawHash: string;
    year: string;
  };
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
  dueAt?:string;
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
