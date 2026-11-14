import {readFileSync, writeFileSync, existsSync} from 'node:fs';
const path = 'src/soundClueAudit.json';
const catalog = JSON.parse(readFileSync('public/handwriting-curriculum.json','utf8'));
const glyphs = [...new Set(catalog.books.flatMap(book => book.lessons.flatMap(lesson => [...lesson.characters])).filter(glyph => /\p{Script=Han}/u.test(glyph)))].sort();
const records = existsSync(path) ? JSON.parse(readFileSync(path,'utf8')) : {};
// 教材只決定本次要補查的字，歷年字形紀錄以單字為鍵永久保留。
const pending = glyphs.filter(glyph => !records[glyph]?.semanticComponent && records[glyph]?.status !== 'reviewed');
const base = 'https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=';
let cursor = 0;
let processed = 0;
await Promise.all(Array.from({length: 12}, async () => {
  while (cursor < pending.length) {
    const glyph = pending[cursor++];
    try {
      const response = await fetch(base + encodeURIComponent(glyph), {signal: AbortSignal.timeout(10000)});
      if (!response.ok) throw Error(String(response.status));
      const html = await response.text();
      const intro = html.match(/&nbsp;略說:<\/span>([\s\S]*?)<br\s*\/?\s*>/i)?.[1]?.replace(/<[^>]+>/g, '').trim();
      const match = intro?.match(/^從「([^」]+)」[，、\s]*「([^」]+)」(?:亦|也)?聲[。．，、；]/u);
      records[glyph] = match ? {
        ...records[glyph],
        status:'documented',
        semanticComponent:match[1],
        component:match[2],
        sourceUrl:base + encodeURIComponent(glyph),
        firstRecordedAt:records[glyph]?.firstRecordedAt ?? new Date().toISOString(),
      } : {...records[glyph], status:'pending'};
    } catch { records[glyph] = {...records[glyph], status:'unavailable'}; }
    processed++;
    if (processed % 25 === 0) save();
    await new Promise(resolve => setTimeout(resolve, 100));
  }
}));
function save() {
  writeFileSync(path, JSON.stringify(Object.fromEntries(Object.entries(records).sort(([left], [right]) => left.localeCompare(right, 'zh-TW'))),null,2)+'\n');
}
save();
console.log(Object.values(records).reduce((counts,row)=>(counts[row.status]=(counts[row.status]??0)+1,counts),{}));
