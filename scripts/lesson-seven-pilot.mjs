import { DatabaseSync } from 'node:sqlite';
import { readFileSync, writeFileSync, rmSync } from 'node:fs';
import assert from 'node:assert/strict';

const source = 'public/sentence-bank.json';
const lesson = JSON.parse(readFileSync(source, 'utf8')).lessons.find(row => row.id === 'adef31e164c28151');
assert(lesson?.characters.length && lesson.grade === 5 && lesson.term === '上');
const db = new DatabaseSync(':memory:');
db.exec(`
  PRAGMA foreign_keys = ON;
  CREATE TABLE editions (id TEXT PRIMARY KEY, publisher TEXT, grade INTEGER, term TEXT, year TEXT);
  CREATE TABLE lessons (id TEXT PRIMARY KEY, edition_id TEXT REFERENCES editions(id), title TEXT, source TEXT, lesson_number INTEGER NOT NULL, UNIQUE(edition_id, lesson_number));
  CREATE TABLE characters (glyph TEXT PRIMARY KEY);
  CREATE TABLE lesson_characters (
    lesson_id TEXT REFERENCES lessons(id), glyph TEXT REFERENCES characters(glyph),
    position INTEGER, reading TEXT, definition TEXT, source TEXT,
    PRIMARY KEY (lesson_id, glyph), UNIQUE (lesson_id, position)
  );
`);
db.prepare('INSERT INTO editions VALUES (?, ?, ?, ?, ?)').run('nani-115-5-1', '南一', lesson.grade, lesson.term, lesson.year);
db.prepare('INSERT INTO lessons VALUES (?, ?, ?, ?, ?)').run(lesson.id, 'nani-115-5-1', lesson.title, source, 7);
for (const [index, row] of lesson.characters.entries()) {
  db.prepare('INSERT INTO characters VALUES (?)').run(row.character);
  const reading = row.readings[0];
  db.prepare('INSERT INTO lesson_characters VALUES (?, ?, ?, ?, ?, ?)')
    .run(lesson.id, row.character, index + 1, reading?.reading ?? '', reading?.definition ?? '', reading?.source ?? '');
}
const rows = db.prepare(`
  SELECT c.glyph AS character, lc.reading, lc.definition, lc.source
  FROM lesson_characters lc JOIN characters c ON c.glyph = lc.glyph
  JOIN lessons l ON l.id = lc.lesson_id JOIN editions e ON e.id = l.edition_id
  WHERE e.publisher = ? AND e.grade = ? AND e.term = ? AND l.id = ?
  ORDER BY lc.position
`).all('南一', 5, '上', lesson.id);
assert.deepEqual(rows.map(row => row.character), lesson.characters.map(row => row.character));
assert.deepEqual(db.prepare('PRAGMA foreign_key_check').all(), []);
writeFileSync('src/lessonSevenPilot.json', JSON.stringify({ id: lesson.id, title: lesson.title, rows }, null, 2) + '\n');
console.log(`SQLite 課次關聯與外鍵驗證通過，共 ${rows.length} 字。`);

db.exec(`
  CREATE TABLE sources (url TEXT PRIMARY KEY, title TEXT NOT NULL, kind TEXT NOT NULL CHECK(kind IN ('publisher','moe','naer','glyph','classical','buddhist')));
  CREATE TABLE character_structures (id INTEGER PRIMARY KEY, glyph TEXT NOT NULL REFERENCES characters(glyph), analysis TEXT NOT NULL, source_url TEXT NOT NULL REFERENCES sources(url));
  CREATE TABLE text_versions (id TEXT PRIMARY KEY, lesson_id TEXT NOT NULL REFERENCES lessons(id), revision INTEGER NOT NULL, source_url TEXT NOT NULL REFERENCES sources(url), UNIQUE(lesson_id, revision));
  CREATE TABLE passages (id INTEGER PRIMARY KEY, text_version_id TEXT NOT NULL REFERENCES text_versions(id), position INTEGER NOT NULL, text TEXT NOT NULL, UNIQUE(text_version_id, position));
  CREATE TABLE words (id INTEGER PRIMARY KEY, text TEXT NOT NULL UNIQUE, reading TEXT, definition TEXT, source_url TEXT REFERENCES sources(url));
  CREATE TABLE lesson_words (lesson_id TEXT REFERENCES lessons(id), word_id INTEGER REFERENCES words(id), meaning TEXT, source TEXT REFERENCES sources(url), PRIMARY KEY(lesson_id, word_id));
  CREATE TABLE word_characters (word_id INTEGER REFERENCES words(id), position INTEGER, glyph TEXT NOT NULL REFERENCES characters(glyph), PRIMARY KEY(word_id, position));
  CREATE TABLE word_occurrences (passage_id INTEGER REFERENCES passages(id), word_id INTEGER REFERENCES words(id), start_offset INTEGER, end_offset INTEGER NOT NULL CHECK(end_offset > start_offset), PRIMARY KEY(passage_id, word_id, start_offset));
  CREATE TABLE rhetoric (id INTEGER PRIMARY KEY, passage_id INTEGER NOT NULL REFERENCES passages(id), device TEXT NOT NULL, excerpt TEXT NOT NULL, explanation TEXT NOT NULL, source TEXT REFERENCES sources(url));
  CREATE TABLE interpretations (id INTEGER PRIMARY KEY, passage_id INTEGER NOT NULL REFERENCES passages(id), explanation TEXT NOT NULL, source TEXT REFERENCES sources(url));
`);
assert.deepEqual(db.prepare('PRAGMA foreign_key_check').all(), []);
db.exec("INSERT INTO sources SELECT DISTINCT source, '教育部國語辭典條目'  , 'moe' FROM lesson_characters WHERE source <> ''");
db.exec(`
  CREATE TABLE character_occurrences (
    passage_id INTEGER NOT NULL REFERENCES passages(id),
    glyph TEXT NOT NULL REFERENCES characters(glyph),
    start_offset INTEGER NOT NULL CHECK(start_offset >= 0),
    reading TEXT, meaning TEXT, source_url TEXT REFERENCES sources(url),
    PRIMARY KEY(passage_id, glyph, start_offset)
  );
  CREATE TABLE reference_texts (
    id TEXT PRIMARY KEY, source_url TEXT NOT NULL REFERENCES sources(url),
    title TEXT NOT NULL, locator TEXT NOT NULL, excerpt TEXT, UNIQUE(source_url, locator)
  );
  CREATE TABLE character_references (
    glyph TEXT NOT NULL REFERENCES characters(glyph),
    reference_id TEXT NOT NULL REFERENCES reference_texts(id),
    PRIMARY KEY(glyph, reference_id)
  );
  CREATE VIEW character_impact AS
    SELECT c.glyph, l.id AS lesson_id, l.title, e.publisher, e.year
    FROM lesson_characters c JOIN lessons l ON l.id = c.lesson_id
    JOIN editions e ON e.id = l.edition_id;
  CREATE VIEW word_impact AS
    SELECT w.text, l.id AS lesson_id, l.title, e.publisher, e.year
    FROM lesson_words lw JOIN words w ON w.id = lw.word_id
    JOIN lessons l ON l.id = lw.lesson_id JOIN editions e ON e.id = l.edition_id;
`);
assert.deepEqual(db.prepare('PRAGMA foreign_key_check').all(), []);
const verified = JSON.parse(readFileSync('src/verifiedSoundClues.json', 'utf8'));
for (const reference of verified.sources) {
  db.prepare('INSERT OR IGNORE INTO sources VALUES (?, ?, ?)').run(reference.url, reference.title, reference.kind);
}
for (const [glyph, entry] of Object.entries(verified.entries)) {
  db.prepare('INSERT OR IGNORE INTO characters VALUES (?)').run(glyph);
  db.prepare('INSERT INTO character_structures (glyph, analysis, source_url) VALUES (?, ?, ?)')
    .run(glyph, entry.explanation, verified.sources[0].url);
}
assert.deepEqual(db.prepare('PRAGMA foreign_key_check').all(), []);
const audit = JSON.parse(readFileSync('src/soundClueAudit.json','utf8'));
const curriculum = JSON.parse(readFileSync('public/handwriting-curriculum.json','utf8'));
db.exec(`CREATE TABLE character_etymologies (
  glyph TEXT PRIMARY KEY REFERENCES characters(glyph),
  formation_type TEXT NOT NULL DEFAULT 'unknown' CHECK(formation_type IN ('phono-semantic','unknown')),
  status TEXT NOT NULL CHECK(status IN ('documented','reviewed','pending','unavailable','unchecked')),
  semantic_component TEXT,
  phonetic_component TEXT,
  source_url TEXT REFERENCES sources(url),
  first_recorded_at TEXT
)`);
const dictionary = verified.sources[0];
const glyphs = new Set(curriculum.books.flatMap(book => book.lessons.flatMap(lesson => [...lesson.characters])));
for (const glyph of glyphs) {
  if (!/\p{Script=Han}/u.test(glyph)) continue;
  const row = audit[glyph];
  const url = new URL(dictionary.url);
  url.searchParams.set('word',glyph);
  db.prepare('INSERT OR IGNORE INTO characters VALUES (?)').run(glyph);
  db.prepare('INSERT OR IGNORE INTO sources VALUES (?, ?, ?)').run(url.href,dictionary.title,dictionary.kind);
  db.prepare('INSERT INTO character_etymologies VALUES (?, ?, ?, ?, ?, ?, ?)').run(
    glyph,
    row?.semanticComponent && row?.component ? 'phono-semantic' : 'unknown',
    row?.status ?? 'unchecked',
    row?.semanticComponent ?? null,
    row?.component ?? null,
    row?.sourceUrl ?? url.href,
    row?.firstRecordedAt ?? null,
  );
}
assert.deepEqual(db.prepare('PRAGMA foreign_key_check').all(), []);
assert.equal(db.prepare("SELECT COUNT(*) AS total FROM character_etymologies WHERE semantic_component IS NOT NULL AND phonetic_component IS NOT NULL").get().total > 0, true);
rmSync("src/lessonSeven.sqlite", { force: true });
db.exec("VACUUM INTO 'src/lessonSeven.sqlite'");
