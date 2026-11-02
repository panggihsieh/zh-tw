import "fake-indexeddb/auto";
import { describe, it, expect } from "vitest";
import {
  lessonCharacters,
  validateCourse,
  saveCourse,
  listCourses,
  savePractice,
  listPractice,
} from "./handwritingStore";
const course = {
  id: "one",
  publisher: "康軒",
  grade: 1,
  term: "上",
  title: "第一課",
  characters: "一二一三",
  updatedAt: new Date().toISOString(),
};
describe("手寫測試本機資料庫", () => {
  it("保留繁體原字並去重、排除標點", () =>
    expect(lessonCharacters("評、性似評123")).toBe("評性似"));
  it("拒絕無效年級或空生字", () => {
    expect(() => validateCourse({ ...course, grade: 7 })).toThrow();
    expect(() => validateCourse({ ...course, characters: "123" })).toThrow();
  });
  it("課本記錄存入獨立資料庫並可讀回", async () => {
    await saveCourse(course);
    expect((await listCourses())[0].characters).toBe("一二三");
  });
  it("儲存完成結果與錯筆次數，不包含姓名與手寫軌跡", async () => {
    await savePractice({
      id: "practice",
      character: "一",
      strokes: 1,
      totalMistakes: 2,
      completedAt: new Date().toISOString(),
      mode: "guided",
      dataVersion: "2.0.1",
    });
    expect((await listPractice())[0]).toMatchObject({
      character: "一",
      totalMistakes: 2,
    });
    await expect(
      savePractice({
        id: "bad",
        character: "兩字",
        strokes: 2,
        totalMistakes: 0,
        completedAt: "",
        mode: "blind",
        dataVersion: "2.0.1",
      }),
    ).rejects.toThrow();
  });
});
