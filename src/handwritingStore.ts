import { openDB } from "idb";
export interface PracticeRecord {
  id: string;
  character: string;
  totalMistakes: number;
  strokes: number;
  completedAt: string;
  mode: "guided" | "blind";
  dataVersion: string;
}
export interface CourseRecord {
  id: string;
  publisher: string;
  grade: number;
  term: string;
  title: string;
  characters: string;
  updatedAt: string;
}
const db = () =>
  openDB("hanzi-notebook-handwriting", 1, {
    upgrade(database) {
      database.createObjectStore("attempts", { keyPath: "id" });
      database.createObjectStore("courses", { keyPath: "id" });
    },
  });
export function lessonCharacters(text: string) {
  return [
    ...new Set(Array.from(text).filter((c) => /^\p{Script=Han}$/u.test(c))),
  ].join("");
}
export function validateCourse(value: CourseRecord) {
  if (
    !["康軒", "南一", "翰林"].includes(value.publisher) ||
    !Number.isInteger(value.grade) ||
    value.grade < 1 ||
    value.grade > 6 ||
    !["上", "下"].includes(value.term)
  )
    throw Error("課本版本、年級或學期不符。");
  const characters = lessonCharacters(value.characters);
  if (
    !value.title.trim() ||
    value.title.length > 80 ||
    !characters ||
    Array.from(characters).length > 500
  )
    throw Error("請填課名及 1–500 個不重複生字。");
  return { ...value, title: value.title.trim(), characters };
}
export async function saveCourse(course: CourseRecord) {
  await (await db()).put("courses", validateCourse(course));
}
export async function listCourses(): Promise<CourseRecord[]> {
  return (await db()).getAll("courses");
}
export async function savePractice(record: PracticeRecord) {
  if (
    !/^\p{Script=Han}$/u.test(record.character) ||
    !Number.isInteger(record.totalMistakes) ||
    record.totalMistakes < 0 ||
    !Number.isInteger(record.strokes) ||
    record.strokes < 1
  )
    throw Error("練習紀錄格式不符。");
  await (await db()).put("attempts", record);
}
export async function listPractice(): Promise<PracticeRecord[]> {
  return (await (await db()).getAll("attempts")).sort((a, b) =>
    b.completedAt.localeCompare(a.completedAt),
  );
}
