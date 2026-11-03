import { doc, getDoc, setDoc } from "firebase/firestore";
import { cloudConfigured, cloudServices } from "./cloudSync";
import { isAdmin } from "./userAccess";

export interface CurriculumDefault {
  publisher: string;
  grade: number;
  term: string;
  lesson: string;
}
export function parseCurriculumDefault(value: unknown): CurriculumDefault {
  const item = value as CurriculumDefault | null;
  if (!item || !["南一", "康軒", "翰林"].includes(item.publisher) ||
      !Number.isInteger(item.grade) || item.grade < 1 || item.grade > 6 ||
      !["上", "下"].includes(item.term) || typeof item.lesson !== "string" ||
      !item.lesson.trim() || item.lesson.length > 200)
    throw Error("預設課別格式不符。");
  return { publisher: item.publisher, grade: item.grade, term: item.term, lesson: item.lesson };
}
export async function loadCurriculumDefault() {
  if (!cloudConfigured) return null;
  const snapshot = await getDoc(doc(cloudServices().db, "hanzi_notebook_settings", "curriculum"));
  return snapshot.exists() ? parseCurriculumDefault(snapshot.data()) : null;
}
export async function saveCurriculumDefault(value: CurriculumDefault) {
  if (!cloudConfigured) throw Error("尚未設定雲端連線，無法儲存學生預設課別。");
  const { auth, db } = cloudServices();
  if (!isAdmin(auth.currentUser)) throw Error("僅管理者可設定學生預設課別。");
  await setDoc(doc(db, "hanzi_notebook_settings", "curriculum"), parseCurriculumDefault(value));
}
