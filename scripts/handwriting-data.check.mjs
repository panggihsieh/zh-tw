import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
const folder = new URL("../public/handwriting-data/", import.meta.url);
const catalog = JSON.parse(
  await fs.readFile(new URL("catalog.json", folder), "utf8"),
);
test("all local handwriting files preserve upstream data and valid stroke geometry", async () => {
  assert.equal(catalog.characters.length, 9574);
  for (const item of catalog.characters) {
    const bytes = await fs.readFile(new URL(item.file, folder));
    const original = await fs.readFile(
      new URL(
        `../node_modules/hanzi-writer-data/${item.character}.json`,
        import.meta.url,
      ),
    );
    assert.ok(bytes.equals(original), item.character);
    const data = JSON.parse(bytes);
    assert.equal(data.strokes.length, item.strokes, item.character);
    assert.equal(data.medians.length, item.strokes, item.character);
    assert.ok(
      data.medians.every(
        (line) =>
          line.length >= 2 &&
          line.every((p) => p.length === 2 && p.every(Number.isFinite)),
      ),
      item.character,
    );
  }
  assert.equal(catalog.taiwanStandardVerified, false);
  assert.match(
    await fs.readFile(new URL("ARPHICPL.TXT", folder), "utf8"),
    /ARPHIC PUBLIC LICENSE/,
  );
});
test("36 sourced books and 408 lessons have complete public word-list snapshots", () => {
  assert.equal(catalog.curriculum.length, 36);
  assert.equal(
    new Set(
      catalog.curriculum.map((b) => `${b.publisher}-${b.grade}-${b.term}`),
    ).size,
    36,
  );
  assert.equal(
    catalog.curriculum.reduce((n, b) => n + b.lessons.length, 0),
    408,
  );
  const available = new Set(catalog.characters.map((c) => c.character));
  for (const book of catalog.curriculum) {
    assert.ok(book.lessons.length > 0);
    assert.equal(book.year, book.term === "上" ? "115_1" : "114_2");
    for (const lesson of book.lessons) {
      assert.match(
        lesson.source,
        /^https:\/\/pedia\.cloud\.edu\.tw\/Bookmark\/TCollection\?/,
      );
      assert.ok(lesson.characters.length > 0);
    }
    const chars = [
      ...new Set(book.lessons.flatMap((l) => Array.from(l.characters))),
    ];
    assert.equal(book.mapped, chars.filter((c) => available.has(c)).length);
    assert.equal(book.missing, chars.filter((c) => !available.has(c)).join(""));
  }
});
