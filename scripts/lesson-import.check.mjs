import {test} from 'node:test';
import assert from 'node:assert/strict';
import {uniqueCharacters,parseLessonFile,validateLessons} from '../public/structure-review/lesson-import.mjs';
import {figure} from '../public/structure-review/structure-figure.mjs';
test('lesson lists deduplicate Unicode Han characters without changing their forms',()=>{
  assert.deepEqual(uniqueCharacters('謝、謝；𠮷，台臺 123'),['謝','𠮷','台','臺']);
  assert.deepEqual(parseLessonFile('蚊、帳、洲、蚊','第一課.txt'),{title:'第一課',characters:['蚊','帳','洲']});
});
test('CSV uses the character column and ignores lesson titles, comments and other metadata',()=>{
  assert.deepEqual(parseLessonFile('\uFEFF課名,生字,說明\r\n"第一課,新版",蚊,昆蟲\r\n第一課,帳,帳篷','生字.csv').characters,['蚊','帳']);
  assert.throws(()=>parseLessonFile('名稱,說明\n蚊,昆蟲','錯誤.csv'));
});
test('JSON imports only declared characters and validates malformed or oversized lessons',()=>{
  assert.deepEqual(parseLessonFile('{"title":"上課","characters":["觀","察","觀"]}','課文.json'),{title:'上課',characters:['觀','察']});
  for(const [text,name]of [['abc','課文.txt'],['{}','課文.json'],['蚊','課文.pdf']])assert.throws(()=>parseLessonFile(text,name));
  assert.throws(()=>validateLessons([{id:'x',title:'課',characters:['觀','觀']}]));
  assert.throws(()=>validateLessons([{id:'x',title:'課',characters:['觀']},{id:'x',title:'課',characters:['察']}]));
});
test('shared assembly diagrams retain components and keep unknown parts static',()=>{
  const known=figure('謝','⿰言射',[35,65]);assert.equal(known.animated,true);assert.match(known.html,/class="part"/);
  assert.equal(figure('存','⿸③子',[50,50]).animated,false);
  assert.equal(figure('人','人',[100]).animated,false);
});
