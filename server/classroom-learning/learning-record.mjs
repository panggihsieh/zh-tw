/** Version 2 contract. Server-side validation; IDs must come from SchoolIAM mappings. */
export const PROTOCOL_VERSION = 2;
export const identifier = value => typeof value === 'string' && /^[A-Za-z0-9_-]{1,128}$/.test(value);
const text = (value, max) => typeof value === 'string' && value.trim() && value.length <= max;
const count = value => Number.isSafeInteger(value) && value >= 0;
const fail = message => { throw Object.assign(new Error(message), {status: 400}); };
export function validateLearningRecord(value) {
  if (!value || value.schemaVersion !== PROTOCOL_VERSION) fail('不支援的學習統計版本。');
  const {sourceProject, sourceClassroomId, schoolId, classId, title, closedAt, activity, ranking, image, limitKB} = value;
  if (![sourceProject, sourceClassroomId, schoolId, classId].every(identifier) || !text(title, 200) ||
      !Number.isSafeInteger(closedAt) || closedAt <= 0) fail('課堂識別、標題或結束時間不正確。');
  if (!activity || !['kahoot', 'quiz', 'writing', 'structure', 'sentence-practice'].includes(activity.kind) ||
      !text(activity.subject, 80) || !count(activity.questionCount) || !activity.questionCount || activity.questionCount > 10000 ||
      !Array.isArray(activity.skills) || activity.skills.length > 50 || !activity.skills.every(identifier) ||
      activity.startedAt != null && (!Number.isSafeInteger(activity.startedAt) || activity.startedAt <= 0 || activity.startedAt > closedAt))
    fail('學習活動、題數或技能代碼不正確。');
  if (!Array.isArray(ranking) || !ranking.length || ranking.length > 150) fail('請提供 1–150 位學生統計。');
  const seen = new Set();
  const students = ranking.map(row => {
    if (!row || !identifier(row.studentId) || seen.has(row.studentId)) fail('缺少 SchoolIAM 學生識別碼或同堂重複學生。');
    seen.add(row.studentId);
    if (!text(row.name, 100) || !count(row.rank) || row.rank < 1 || row.rank > ranking.length ||
        !count(row.answered) || row.answered > activity.questionCount || !count(row.correct) || row.correct > row.answered ||
        !Number.isFinite(row.score) || row.score < 0 ||
        row.maxScore != null && (!Number.isFinite(row.maxScore) || row.maxScore <= 0 || row.score > row.maxScore) ||
        row.activeMs != null && (!count(row.activeMs) || row.activeMs > 86400000)) fail('學生學習統計不正確。');
    return {studentId: row.studentId, name: row.name.trim(), rank: row.rank, score: row.score,
      maxScore: row.maxScore ?? null, answered: row.answered, correct: row.correct, activeMs: row.activeMs ?? null};
  });
  const encoded = typeof image === 'string' && /^data:image\/jpeg;base64,([A-Za-z0-9+/]+={0,2})$/.exec(image)?.[1];
  const jpeg = encoded && Buffer.from(encoded, 'base64');
  if (![20, 50, 100].includes(limitKB) || !jpeg || jpeg.length < 4 || jpeg.length > limitKB * 1000 ||
      jpeg[0] !== 255 || jpeg[1] !== 216 || jpeg.at(-2) !== 255 || jpeg.at(-1) !== 217) fail('排行截圖必須為符合容量上限的 JPEG。');
  return {schemaVersion: PROTOCOL_VERSION, sourceProject, sourceClassroomId, schoolId, classId,
    title: title.trim(), closedAt, activity: {kind: activity.kind, subject: activity.subject.trim(),
      questionCount: activity.questionCount, startedAt: activity.startedAt ?? null, skills: [...new Set(activity.skills)]},
    ranking: students, image, limitKB};
}
