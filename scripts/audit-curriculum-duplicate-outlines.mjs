import fs from 'node:fs';

const root = new URL('../', import.meta.url);
const read = path => JSON.parse(fs.readFileSync(new URL(path, root), 'utf8'));
const groups = read('reports/stroke-voice-curriculum-queue.json');
const characters = [...new Set(groups.flatMap(group => group.rows.map(row => row.character)))];
const rows = [];
const missingCharacters = [];

for (const character of characters) {
  const path = new URL(`public/game-strokes/${character.codePointAt(0).toString(16)}.json`, root);
  if (!fs.existsSync(path)) {
    missingCharacters.push(character);
    continue;
  }
  const strokes = JSON.parse(fs.readFileSync(path, 'utf8'));
  const seen = new Map();
  const identicalOutlinePairs = [];
  strokes.forEach((stroke, index) => {
    if (!Array.isArray(stroke.outline) || !stroke.outline.length) {
      throw new Error(`${character}: missing outline at stroke ${index + 1}`);
    }
    const key = JSON.stringify(stroke.outline);
    if (seen.has(key)) identicalOutlinePairs.push([seen.get(key) + 1, index + 1]);
    else seen.set(key, index);
  });
  if (identicalOutlinePairs.length) {
    rows.push({ character, strokeCount: strokes.length, identicalOutlinePairs, status: 'needs-review' });
  }
}

const report = {
  checkedCharacters: characters.length - missingCharacters.length,
  missingCharacters,
  scope: '完全相同的輪廓檢查；不涵蓋近似輪廓、筆順順序或念法正確性。',
  rows,
};
fs.writeFileSync(new URL('reports/curriculum-duplicate-outline-audit.json', root), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
if (rows.length) process.exitCode = 1;
