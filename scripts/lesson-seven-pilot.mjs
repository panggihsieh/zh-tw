import { DatabaseSync } from 'node:sqlite';
import { readFileSync, writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';

const source = 'public/sentence-bank.json';
const lesson = JSON.parse(readFileSync(source, 'utf8')).lessons.find(row => row.id === 'adef31e164c28151');
assert(lesson?.characters.length && lesson.grade === 5 && lesson.term === '上');
const db = new DatabaseSync(':memory:');
db.exec(`
  PRAGMA foreign_keys = ON;
  CREATE TABLE editions (id TEXT PRIMARY KEY, publisher TEXT, grade INTEGER, term TEXT, year TEXT);
  CREATE TABLE lessons (id TEXT PRIMARY KEY, edition_id TEXT REFERENCES editions(id), title TEXT, source TEXT);
  CREATE TABLE characters (glyph TEXT PRIMARY KEY);
  CREATE TABLE lesson_characters (
    lesson_id TEXT REFERENCES lessons(id), glyph TEXT REFERENCES characters(glyph),
    position INTEGER, reading TEXT, definition TEXT, source TEXT,
    PRIMARY KEY (lesson_id, glyph), UNIQUE (lesson_id, position)
  );
`);
db.prepare('INSERT INTO editions VALUES (?, ?, ?, ?, ?)').run('nani-115-5-1', '南一', lesson.grade, lesson.term, lesson.year);
db.prepare('INSERT INTO lessons VALUES (?, ?, ?, ?)').run(lesson.id, 'nani-115-5-1', lesson.title, source);
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
