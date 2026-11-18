import { readFileSync, writeFileSync } from "node:fs";
import { createServer } from "vite";

const readJson = (path) => JSON.parse(readFileSync(path, "utf8"));
const curriculum = readJson("public/handwriting-curriculum.json");
const ids = readJson("public/structure-review/ids-catalog.json");
const historical = readJson("src/shuowenClues.json");
const server = await createServer({ configFile: false, server: { middlewareMode: true, ws: false } });
try {
  const { candidateMaster } = await server.ssrLoadModule("/src/curriculumLearning.ts");
  const { structureClues } = await server.ssrLoadModule("/src/structureClues.ts");
  const glyphsFor = (books) => [...new Set(books.flatMap((book) =>
    book.lessons.flatMap((lesson) => [...lesson.characters].filter((glyph) => /\p{Script=Han}/u.test(glyph)))
  ))].sort();
  const all = glyphsFor(curriculum.books);
  const entries = Object.fromEntries(all.map((glyph) => {
    const { components } = candidateMaster(glyph, { rows: new Map(), ids });
    const clues = structureClues(glyph, components);
    const sourced = Boolean(clues?.sound?.sources?.length && clues?.meaning?.sources?.length);
    const mapped = Boolean(sourced && clues.sound.componentIndexes.length && clues.meaning.componentIndexes.length &&
      [...clues.sound.componentIndexes, ...clues.meaning.componentIndexes].every((index) => Number.isInteger(index) && components[index]) &&
      (["句", "主", "兩", "嗅", "嚮", "夜", "太", "庶", "泰", "舍"].includes(glyph) || !clues.sound.componentIndexes.some((index) => clues.meaning.componentIndexes.includes(index))));
    return [glyph, {
      components,
      status: !sourced ? "missing" : mapped ? "mapped" :
        historical[glyph]?.pictograph && clues.sound.title.includes("象形") ? "documented-pictograph" :
        (/^依《說文》，這是(?:指事|會意)字$/u.test(clues.sound.title) ||
          /^一種字源解讀：(?:指事|會意|擬聲|分化字|歌唱的古字|俗字借用|變體表意)$/u.test(clues.sound.title) ||
          (glyph === "鼓" && clues.sound.title === "「鼓」的字形以會意說明") ||
          (glyph === "去" && clues.sound.title === "依張口的構形解讀，沒有獨立聲符") ||
          (glyph === "身" && clues.sound.title === "甲金文以人形和指事記號表意") ||
          (glyph === "言" && clues.sound.title === "依甲金文的指事解讀，沒有獨立聲符") ||
          (glyph === "食" && clues.sound.title === "依甲金文的會意解讀，沒有獨立聲符")) ? "documented-non-phonetic" : "mapping-review",
      sound: clues?.sound,
      meaning: clues?.meaning,
    }];
  }));
  const summarize = (books) => {
    const glyphs = glyphsFor(books);
    const counts = { total: glyphs.length, mapped: 0, "documented-pictograph": 0, "documented-non-phonetic": 0, "mapping-review": 0, missing: 0 };
    for (const glyph of glyphs) counts[entries[glyph].status]++;
    const documented = counts.mapped + counts["documented-pictograph"] + counts["documented-non-phonetic"];
    return { ...counts, documented, coveragePercent: Number((100 * documented / counts.total).toFixed(2)) };
  };
  const publishers = [...new Set(curriculum.books.map((book) => book.publisher))];
  const report = {
    combined: summarize(curriculum.books),
    publishers: Object.fromEntries(publishers.map((publisher) => [
      publisher, summarize(curriculum.books.filter((book) => book.publisher === publisher)),
    ])),
    books: curriculum.books.map((book) => ({
      publisher: book.publisher, grade: book.grade, term: book.term, year: book.year, ...summarize([book]),
    })),
    entries,
  };
  writeFileSync("reports/structure-clue-coverage.json", JSON.stringify(report, null, 2) + "\n");
  console.log(report.combined, report.publishers);
} finally {
  await server.close();
}
