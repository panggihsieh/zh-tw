// Derive candidate prompts from the existing official dictionary and textbook word lists.
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const books=JSON.parse(await readFile('public/handwriting-curriculum.json','utf8')).books;
const dictionary=JSON.parse(await readFile('public/dictionaries/moe-concised.json','utf8'));
const index=new Map();
for(const e of dictionary.entries) if(/^\p{Script=Han}$/u.test(e[0]) && e[6] && e[13]) {
  const rows=index.get(e[0])||[];
  if(!rows.some(r=>r.reading===e[6])) rows.push({reading:e[6],definition:e[13],source:`https://dict.concised.moe.edu.tw/search.jsp?md=1&word=${encodeURIComponent(e[0])}`});
  index.set(e[0],rows);
}
const lessons=books.filter(b=>b.publisher==='南一'&&[5,6].includes(b.grade)).flatMap(b=>b.lessons.map(l=>({
  id:createHash('sha256').update(`${b.grade}/${b.term}/${b.year}/${l.title}`).digest('hex').slice(0,16),
  title:l.title,grade:b.grade,term:b.term,year:b.year,source:l.source,
  characters:[...new Set(Array.from(l.characters))].filter(c=>index.has(c)).map(character=>({character,readings:index.get(character)})),
})));
const data={publisher:'南一',notice:'依課本生字表產生候選題，非課文全文；教師須核對課文中讀音。字典定義源自教育部國語辭典簡編本。',dictionaryVersion:dictionary.version,lessons};
const json=JSON.stringify(data);
await writeFile('server/sentence-bank.json',json);
await writeFile('public/sentence-bank.json',json);
console.log(`Sentence bank: ${lessons.length} Nani grade 5/6 lessons`);

 // Use a single-reading homophone when the target has multiple dictionary readings.
const homophones=new Map();
for(const [character,rows] of index){
  if(rows.length===1&&!homophones.has(rows[0].reading))homophones.set(rows[0].reading,character);
}
const speechText={};
for(const {characters} of lessons)for(const {character,readings} of characters)for(const {reading} of readings){
  const text=readings.length===1?character:homophones.get(reading);
  if(text)speechText[character+reading]=text;
}
await writeFile('src/sentenceSpeechText.json',JSON.stringify(speechText)+'\n');
