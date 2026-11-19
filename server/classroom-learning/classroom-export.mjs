import {validateLearningRecord} from "./learning-record.mjs";
/** SchoolIAM classroom records adapter. Call only after host-side teacher authorization. */
export const JPEG_LIMITS_KB = Object.freeze([20, 50, 100]);
const fail = (status, message) => { throw Object.assign(new Error(message), {status}); };

// Match zh-tw's server ranking, including correctness and answered count.
export function rankingRevision(ranking) {
  return JSON.stringify(ranking.map(row => [row.uid, row.rank, row.points, row.correct, row.index]));
}

export function buildClassroomRecord(room, ranking, input, config) {
  if (room.status !== 'closed' || room.testRoom || !ranking.length || ranking.some(row => row.gradingIndex != null))
    fail(409, '請等正式課堂結束且評分完成後再匯出。');
  if (input?.confirmed !== true) fail(400, '請先確認匯出。');
  if (input.revision !== rankingRevision(ranking)) fail(409, '排名已更新，請重新預覽。');
  const encoded = typeof input.image === 'string' && /^data:image\/jpeg;base64,([A-Za-z0-9+/]+={0,2})$/.exec(input.image)?.[1];
  const bytes = encoded ? Buffer.from(encoded, 'base64') : null;
  if (!JPEG_LIMITS_KB.includes(input.limitKB) || !bytes || bytes.length < 4 ||
      bytes.length > input.limitKB * 1000 || bytes[0] !== 255 || bytes[1] !== 216 ||
      bytes.at(-2) !== 255 || bytes.at(-1) !== 217)
    fail(400, 'JPEG 圖片格式或容量上限不正確。');
  const classId = Object.hasOwn(config.classes || {}, room.classId) && config.classes[room.classId];
  if (!config.sourceProject || !config.schoolId || !classId) fail(409, '尚未完成來源專案與班級對應設定。');
  const closedAt = room.closedAt ?? room.expiresAt;
  if (!Number.isFinite(closedAt) || closedAt <= 0 || !room.id || !room.title) fail(400, '課堂識別與結束時間不完整。');
  if (ranking.some(row => !Number.isInteger(row.rank) || row.rank < 1 || row.rank > ranking.length ||
      typeof row.name !== 'string' || !row.name.trim() || !Number.isFinite(row.points) ||
      !Number.isInteger(row.index) || row.index < 0)) fail(400, '排名統計欄位不完整。');
  return validateLearningRecord({
    schemaVersion: 2,
    activity: {kind: config.kind || 'kahoot', subject: config.subject, skills: config.skills || [],
      questionCount: room.questionCount, startedAt: room.startedAt ?? null},
    sourceProject: config.sourceProject, sourceClassroomId: room.id,
    schoolId: config.schoolId, classId, title: room.title, closedAt,
    ranking: ranking.map(row => ({studentId: config.students?.[row.uid] || row.studentId,
      rank: row.rank, name: row.name, score: row.points, answered: row.index, correct: row.correct,
      maxScore: row.maxScore ?? config.maxScore ?? null, activeMs: row.activeMs ?? null})),
    image: input.image, limitKB: input.limitKB,
  });
}

export async function exportClassroomRecord(room, ranking, input, config, fetcher = fetch) {
  const body = buildClassroomRecord(room, ranking, input, config);
  if (!config.token) fail(409, '尚未設定課堂紀錄匯出憑證。');
  let response;
  try {
    response = await fetcher('https://school-iam.web.app/v1/classroom-learning/import', {
      method: 'POST', headers: {Authorization: `Bearer ${config.token}`, 'Content-Type': 'application/json'},
      signal: AbortSignal.timeout(15000), body: JSON.stringify(body),
    });
  } catch { fail(502, 'SchoolIAM 連線失敗，可重送同一筆紀錄。'); }
  if (!response.ok) fail([400, 409].includes(response.status) ? response.status : 502,
    'SchoolIAM 無法接收紀錄，請檢查班級對應與預覽後重試。');
  const result = await response.json();
  if (result.schemaVersion !== 2 || typeof result.id !== 'string') fail(502, '接收端尚未支援學習統計版本，不能視為完成匯入。');
  return result;
}
