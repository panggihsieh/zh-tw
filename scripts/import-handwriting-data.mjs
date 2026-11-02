import fs from "node:fs/promises";
import path from "node:path";
const source = path.resolve("node_modules/hanzi-writer-data");
const target = path.resolve("public/handwriting-data");
await fs.mkdir(target, { recursive: true });
const characters = [];
for (const name of await fs.readdir(source)) {
  if (!/^\p{Script=Han}\.json$/u.test(name)) continue;
  const bytes = await fs.readFile(path.join(source, name));
  const data = JSON.parse(bytes);
  if (!data.strokes?.length || data.strokes.length !== data.medians?.length)
    throw Error(`Invalid data: ${name}`);
  const character = name.slice(0, -5);
  const file = `${character.codePointAt(0).toString(16)}.json`;
  // Preserve original file contents; only the filename uses its Unicode code point.
  await fs.writeFile(path.join(target, file), bytes);
  characters.push({ character, file, strokes: data.strokes.length });
}
characters.sort(
  (a, b) => a.character.codePointAt(0) - b.character.codePointAt(0),
);
await fs.copyFile(
  path.join(source, "ARPHICPL.TXT"),
  path.join(target, "ARPHICPL.TXT"),
);
await fs.copyFile(
  "node_modules/hanzi-writer/LICENSE",
  path.join(target, "HANZI-WRITER-LICENSE.txt"),
);
const pkg = JSON.parse(
  await fs.readFile(path.join(source, "package.json"), "utf8"),
);
const snapshot = JSON.parse(
  await fs.readFile("public/handwriting-curriculum.json", "utf8"),
);
const available = new Set(characters.map((c) => c.character));
const curriculum = snapshot.books.map((book) => {
  const lessons = book.lessons
    .filter((l) => !l.error && l.characters)
    .map((l) => ({
      title: l.title,
      source: l.source,
      characters: l.characters,
    }));
  const chars = [...new Set(lessons.flatMap((l) => Array.from(l.characters)))];
  return {
    publisher: book.publisher,
    grade: book.grade,
    term: book.term,
    year: book.year,
    source: book.source,
    lessons,
    characters: chars.join(""),
    mapped: chars.filter((c) => available.has(c)).length,
    missing: chars.filter((c) => !available.has(c)).join(""),
    status: book.complete ? "字表已擷取，待教師核對" : "字表未完整，待補充",
  };
});
await fs.writeFile(
  path.join(target, "catalog.json"),
  JSON.stringify({
    version: 1,
    source: "https://github.com/chanind/hanzi-writer-data",
    dataVersion: pkg.version,
    license: "Arphic Public License",
    taiwanStandardVerified: false,
    characters,
    curriculum,
  }),
);
console.log(
  `Imported ${characters.length} characters; ${curriculum.filter((b) => b.lessons.length).length}/36 book mappings available.`,
);
