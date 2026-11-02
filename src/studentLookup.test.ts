import { describe, expect, it } from "vitest";
import {
  cleanTranscript,
  findSchoolCharacters,
  recognitionError,
  speechCandidates,
} from "./studentLookup";
import curriculum from "../public/handwriting-curriculum.json";
import { readFileSync } from "node:fs";
describe("學生語音與課本找字", () => {
  it("清除辨識標點，不擅自將同音字或簡體字換成另一個字", () => {
    expect(cleanTranscript(" 銀行， ")).toBe("銀行");
    expect(cleanTranscript("银型")).toBe("银型");
  });
  it("三家一至六年級上下冊均可查詢，每課每個字均可追溯到該課", () => {
    expect(curriculum.books).toHaveLength(36);
    for (const publisher of ["南一", "康軒", "翰林"])
      for (let grade = 1; grade <= 6; grade++)
        for (const term of ["上", "下"])
          expect(
            curriculum.books.some(
              (b) =>
                b.publisher === publisher &&
                b.grade === grade &&
                b.term === term &&
                b.complete,
            ),
          ).toBe(true);
    for (const book of curriculum.books)
      for (const lesson of book.lessons)
        for (const c of Array.from(lesson.characters)) {
          const found = findSchoolCharacters([book], c);
          expect(
            found.some(
              (m) =>
                m.context.source === lesson.source && m.characters.includes(c),
            ),
          ).toBe(true);
        }
  });
  it("拒絕空值、非中文與超長輸入，不把跨課查字當成語詞", () => {
    for (const query of ["", "abc", "一二三四五六七八九"])
      expect(findSchoolCharacters(curriculum.books, query)).toEqual([]);
    const book = {
      publisher: "南一",
      grade: 1,
      term: "上",
      year: "115_1",
      lessons: [
        { title: "第一課", characters: "天地", source: "https://example.com" },
      ],
    };
    expect(findSchoolCharacters([book], "天空")[0].characters).toEqual(["天"]);
  });
  it("辨識候選去重、保留同音字且拒絕非中文結果", () => {
    expect(
      speechCandidates([
        { transcript: "銀行。" },
        { transcript: "銀型" },
        { transcript: "銀行" },
        { transcript: "hello" },
      ]),
    ).toEqual(["銀行", "銀型"]);
  });
  it("每種語音失敗皆有可採取的提示", () => {
    for (const error of [
      "not-allowed",
      "service-not-allowed",
      "audio-capture",
      "network",
      "no-speech",
      "aborted",
      "unknown",
    ])
      expect(recognitionError(error).length).toBeGreaterThan(5);
  });
  it("字表附來源與學年，避免將資料缺漏宣稱為教材審定", () => {
    const text = readFileSync(
      new URL("../public/handwriting-curriculum.json", import.meta.url),
      "utf8",
    );
    expect(text).toContain("pedia.cloud.edu.tw");
    expect(new Set(curriculum.books.map((b) => b.year))).toEqual(
      new Set(["115_1", "114_2"]),
    );
  });
});
