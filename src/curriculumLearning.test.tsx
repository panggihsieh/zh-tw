/// <reference types="node" />
import { describe, it, expect, afterAll } from "vitest";
import { mkdirSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { renderToStaticMarkup } from "react-dom/server";
import source from "../public/handwriting-curriculum.json";
import dictionary from "../public/dictionaries/moe-concised.json";
import ids from "../public/structure-review/ids-catalog.json";
import {
  indexLearningResources,
  buildCurriculumCollection,
  type LessonContext,
} from "./curriculumLearning";
import { parseBackup } from "./storage";
import { sceneNarration } from "./speech";
import { strokeFrameUrl } from "./strokeSource";
import StructureDiagram from "./StructureDiagram";
const resources = indexLearningResources(dictionary, ids);
const publishers: {
  publisher: string;
  uniqueCharacters: number;
  books: number;
  lessons: number;
  passed: boolean;
  missingDictionary: number;
  missingStructure: number;
  missingOfficialStroke: number;
  missingVocabulary: number;
  failures: string[];
}[] = [];
describe("三家出版社逐字學習：南一優先，其次康軒、翰林", () => {
  for (const publisher of ["南一", "康軒", "翰林"])
    it(`${publisher} 一至六年級上下冊全部生字可建立六幕並還原備份`, () => {
      const books = source.books.filter((b) => b.publisher === publisher);
      expect(books).toHaveLength(12);
      const chars = [
        ...new Set(
          books.flatMap((b) =>
            b.lessons.flatMap((l) => Array.from(l.characters)),
          ),
        ),
      ];
      const report = {
        publisher,
        books: books.length,
        lessons: books.reduce((n, b) => n + b.lessons.length, 0),
        uniqueCharacters: chars.length,
        passed: true,
        missingDictionary: 0,
        missingStructure: 0,
        missingOfficialStroke: 0,
        missingVocabulary: 0,
        gaps: [] as {
          character: string;
          dictionary: boolean;
          structure: boolean;
          officialStroke: boolean;
          vocabulary: boolean;
        }[],
        failures: [] as string[],
      };
      for (const char of chars) {
        const book = books.find((b) =>
          b.lessons.some((l) => l.characters.includes(char)),
        )!;
        const lesson = book.lessons.find((l) => l.characters.includes(char))!;
        try {
          const collection = buildCurriculumCollection(
            [char],
            {
              publisher,
              grade: book.grade,
              term: book.term,
              year: book.year,
              title: lesson.title,
              source: lesson.source,
            },
            resources,
          );
          const card = collection.cards[0];
          expect(collection.scenes).toHaveLength(6);
          expect(
            parseBackup(JSON.stringify(collection)).cards[0].character,
          ).toBe(char);
          expect(card.reading).toBeTruthy();
          expect(card.meaning).toBeTruthy();
          for (let scene = 0; scene < 6; scene++) {
            const text = sceneNarration(card, char, scene, false, 6);
            expect(text.length).toBeGreaterThan(10);
            expect(text).not.toContain("undefined");
          }
          expect(
            renderToStaticMarkup(<StructureDiagram master={card.master} />),
          ).not.toContain("NaN");
          const gap = {
            character: char,
            dictionary: !resources.rows.has(char),
            structure: card.master.verificationStatus === "unavailable",
            officialStroke: !strokeFrameUrl(char),
            vocabulary: !card.vocabulary.length,
          };
          if (
            gap.dictionary ||
            gap.structure ||
            gap.officialStroke ||
            gap.vocabulary
          )
            report.gaps.push(gap);
          if (!resources.rows.has(char)) report.missingDictionary++;
          if (card.master.verificationStatus === "unavailable")
            report.missingStructure++;
          if (!strokeFrameUrl(char)) report.missingOfficialStroke++;
          if (!card.vocabulary.length) report.missingVocabulary++;
        } catch (e) {
          report.passed = false;
          report.failures.push(
            `${char}: ${e instanceof Error ? e.message : String(e)}`,
          );
        }
      }
      publishers.push(report);
      expect(report.failures).toEqual([]);
    });
  it("每批最多八字，保留多音、不捏造詞句，不將字串當成課文語詞", () => {
    const context: LessonContext = {
      publisher: "南一",
      grade: 1,
      term: "上",
      year: "115_1",
      title: "測試",
      source: "https://pedia.cloud.edu.tw/Bookmark/Textword",
    };
    const value = buildCurriculumCollection(
      ["行", "一", "行"],
      context,
      resources,
    );
    expect(value.cards).toHaveLength(2);
    expect(value.cards[0].reading).toContain("／");
    expect(parseBackup(JSON.stringify(value)).curriculum).toEqual(context);
    expect(() =>
      buildCurriculumCollection(
        Array.from("一二三四五六七八九"),
        context,
        resources,
      ),
    ).toThrow();
    expect(() =>
      parseBackup(
        JSON.stringify({ ...value, curriculum: { ...context, grade: 99 } }),
      ),
    ).toThrow();
  });
});
afterAll(() => {
  mkdirSync(".local", { recursive: true });
  writeFileSync(
    ".local/curriculum-test-report.json",
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        sourceHash: createHash("sha256")
          .update(JSON.stringify(source))
          .digest("hex"),
        scope:
          "資料格式、六幕講稿、結構圖伺服器渲染及字卡備份；非逐字真人教材審定或所有外部播放器連線驗收",
        publishers,
      },
      null,
      2,
    ),
  );
});
