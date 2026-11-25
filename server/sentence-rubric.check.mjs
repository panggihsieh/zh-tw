import test from 'node:test';
import assert from 'node:assert/strict';
import { gradeRubric, rubricInstruction, validateRubric, DEFAULT_RUBRIC, normalizeLessonCharacters } from './sentence-rubric.mjs';

const rubric = validateRubric([
  { key: 'correctness', points: 20 }, { key: 'person', points: 10 }, { key: 'event', points: 10 }, { key: 'time', points: 10 },
  { key: 'place', points: 10 }, { key: 'object', points: 10 }, { key: 'lesson', points: 10 }, { key: 'idiom', points: 15 },
  { key: 'custom', points: 5, rule: '句中要表達感受' },
]);

test('validates teacher rubric totals and custom rules', () => {
  assert.equal(validateRubric(DEFAULT_RUBRIC).length, 5);
  assert.throws(() => validateRubric([{ key: 'correctness', points: 90 }]), /總分須為 100/);
  assert.throws(() => validateRubric([{ key: 'custom', points: 100, rule: '' }]), /自訂規則/);
  assert.throws(() => validateRubric([{ key: 'correctness', points: 50 }, { key: 'correctness', points: 50 }]), /重複/);
  assert.throws(() => validateRubric([{ key: 'hack', points: 100 }]), /不存在/);
  assert.equal(normalizeLessonCharacters('灘a灘拖'), '灘拖');
});

test('instruction only asks AI for the chosen items', () => {
  const text = rubricInstruction(rubric);
  assert.match(text, /person=人/);
  assert.match(text, /idiomAppropriate/);
  assert.match(text, /custom 0–5（句中要表達感受）/);
  assert.doesNotMatch(text, /mechanics/);
});

test('scores evidence only when AI quotes the sentence, lesson characters by program', () => {
  const sentence = '星期天早上，小明在海灘撿貝殼，玩得興高采烈，覺得好開心。';
  const grade = gradeRubric(sentence, '灘', rubric, {
    targetOk: true, meaningOk: true, uncertain: false, scores: { correctness: 18, custom: 5 },
    evidence: { person: '小明', event: '撿貝殼', time: '星期天早上', place: '火星', object: '貝殼' },
    idiom: '興高采烈', idiomAppropriate: true, highlight: '興高采烈', feedback: '很棒！', polished: sentence,
  }, '灘拖殼');
  const by = Object.fromEntries(grade.rubric.map(item => [item.key, item]));
  assert.equal(by.place.score, 0, '引用不在原句中的地點不給分');
  assert.equal(by.person.score, 10);
  assert.equal(by.lesson.score, 10);
  assert.equal(by.lesson.evidence, '殼');
  assert.equal(by.idiom.score, 15);
  assert.equal(grade.total, 18 + 10 + 10 + 10 + 0 + 10 + 10 + 15 + 5);
  assert.equal(grade.level, '甲等');
});

test('missing target character scores zero; uncertain stays pending', () => {
  const analysis = { targetOk: false, meaningOk: true, uncertain: false, scores: { correctness: 20, custom: 5 }, evidence: {}, idiom: '', idiomAppropriate: false, feedback: '再試試' };
  assert.equal(gradeRubric('小明去海邊', '灘', rubric, analysis, '灘').total, 0);
  assert.equal(gradeRubric('海灘很美', '灘', rubric, { ...analysis, targetOk: true, uncertain: true }, '灘').total, null);
  assert.throws(() => gradeRubric('海灘很美', '灘', rubric, { ...analysis, targetOk: true, scores: { correctness: 99, custom: 5 } }), /格式不符/);
});
