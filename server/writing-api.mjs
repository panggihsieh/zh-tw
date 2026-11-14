import { createRemoteJWKSet, jwtVerify } from "jose";
import { randomUUID } from "node:crypto";
import { ADMIN_EMAIL, FIREBASE_PROJECT } from "./admin-auth.mjs";
const keys = createRemoteJWKSet(
  new URL(
    "https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com",
  ),
);
export const SOURCE_REVISION = "26f12d65063cc97d2773b7777232277bfca5f563";
export async function writingIdentity(req) {
  if (!req.headers.authorization?.startsWith("Bearer "))
    throw Error("請先登入 Google 帳號");
  const token = req.headers.authorization.slice(7);
  const { payload: p } = await jwtVerify(token, keys, {
    algorithms: ["RS256"],
    issuer: `https://securetoken.google.com/${FIREBASE_PROJECT}`,
    audience: FIREBASE_PROJECT,
    requiredClaims: ["exp", "iat", "sub", "auth_time"],
  });
  if (
    !p.sub ||
    p.sub.length > 128 ||
    !p.email ||
    p.email_verified !== true ||
    p.firebase?.sign_in_provider !== "google.com" ||
    p.iat > Date.now() / 1000 ||
    typeof p.auth_time !== "number" ||
    p.auth_time > Date.now() / 1000
  )
    throw Error("Google 登入身分無效");
  const response = await fetch(
    `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT}/databases/(default)/documents/hanzi_notebook_access/${encodeURIComponent(p.email.toLowerCase())}`,
    {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(15000),
    },
  );
  if (response.status !== 404) {
    if (!response.ok) throw Error("帳號權限檢查失敗");
    const access = await response.json();
    if (access.fields?.enabled?.booleanValue !== true)
      throw Error("此帳號已停用");
  }
  return {
    uid: p.sub,
    email: p.email,
    displayName: typeof p.name === "string" ? p.name.slice(0, 80) : p.email,
    admin: p.email === ADMIN_EMAIL,
  };
}
export function validateSubmission(v) {
  const fail = () => {
    throw Error("作品格式不符，請回到練習重新送出");
  };
  if (
    !v ||
    !/^[0-9a-f-]{36}$/i.test(v.id) ||
    typeof v.lesson !== "string" ||
    !v.lesson.trim() ||
    v.lesson.length > 150 ||
    v.sourceRevision !== SOURCE_REVISION ||
    !Array.isArray(v.characters) ||
    v.characters.length < 1 ||
    v.characters.length > 8 ||
    new Set(v.characters).size !== v.characters.length ||
    !v.characters.every(
      (c) => typeof c === "string" && /^\p{Script=Han}$/u.test(c),
    )
  )
    fail();
  const works = {};
  for (const c of v.characters) {
    const w = v.works?.[c];
    if (
      !w ||
      w.character !== c ||
      !Number.isInteger(w.expected) ||
      w.expected < 1 ||
      w.expected > 64 ||
      !Array.isArray(w.traces) ||
      w.traces.length > 100 ||
      !w.traces.length
    )
      fail();
    let accepted = 0;
    const traces = w.traces.map((t) => {
      if (
        typeof t.correct !== "boolean" ||
        t.stroke !== accepted ||
        !Array.isArray(t.points) ||
        t.points.length < 2 ||
        t.points.length > 64 ||
        !t.points.every(
          (p) =>
            Number.isFinite(p.x) &&
            Number.isFinite(p.y) &&
            p.x >= 0 &&
            p.x <= 1000 &&
            p.y >= 0 &&
            p.y <= 1000,
        ) ||
        accepted >= w.expected
      )
        fail();
      if (t.correct) accepted++;
      return {
        stroke: t.stroke,
        correct: t.correct,
        points: t.points.map((p) => ({ x: p.x, y: p.y })),
      };
    });
    if (accepted !== w.expected) fail();
    works[c] = { character: c, expected: w.expected, traces, complete: true };
  }
  if (
    typeof v.image !== "string" ||
    !/^data:image\/png;base64,[A-Za-z0-9+/]+=*$/.test(v.image) ||
    v.image.length > 900000
  )
    fail();
  const png = Buffer.from(v.image.split(",")[1], "base64");
  if (
    png.length < 24 ||
    png.subarray(0, 8).toString("hex") !== "89504e470d0a1a0a" ||
    png.readUInt32BE(16) !== 1000 ||
    png.readUInt32BE(20) !== 130 + Math.ceil(v.characters.length / 2) * 440
  )
    fail();
  return {
    id: v.id,
    lesson: v.lesson.trim(),
    characters: v.characters,
    works,
    image: v.image,
    sourceRevision: SOURCE_REVISION,
  };
}
export function validateGrade(v) {
  if (
    !v ||
    !Number.isInteger(v.score) ||
    v.score < 0 ||
    v.score > 100 ||
    typeof v.comment !== "string" ||
    v.comment.length > 1000
  )
    throw Error("分數須為 0–100 整數，評語最多 1000 字");
  return {
    score: v.score,
    comment: v.comment.trim(),
    gradedAt: new Date().toISOString(),
  };
}
export function validateAssignment(v) {
  if (!v || typeof v.title !== "string" || !v.title.trim() || v.title.length > 100 ||
      typeof v.classId !== "string" || !v.classId || typeof v.className !== "string" || !v.className.trim() || v.className.length > 80 ||
      typeof v.lesson !== "string" || !v.lesson.trim() || v.lesson.length > 150 || !Array.isArray(v.characters) || v.characters.length < 1 || v.characters.length > 8 ||
      new Set(v.characters).size !== v.characters.length || !v.characters.every(c => typeof c === "string" && /^\p{Script=Han}$/u.test(c)) ||
      !Array.isArray(v.students) || !v.students.length || v.students.length > 100)
    throw Error("請選擇班級、課文與 1–8 個生字");
  const students = v.students.filter(student => student.active !== false).map(student => ({
    seat: Number(student.seat), name: String(student.name || "").trim(), email: String(student.email || "").trim().toLowerCase(),
    ...(student.avatar ? { avatar: student.avatar } : {}),
  }));
  if (!students.length || new Set(students.map(student => student.email)).size !== students.length || students.some(student => !Number.isInteger(student.seat) || student.seat < 1 || student.seat > 999 || !student.name || student.name.length > 80 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(student.email) || student.avatar && (student.avatar.length > 12000 || !/^data:image\/jpeg;base64,\/9j\/[A-Za-z0-9+/]+={0,2}$/.test(student.avatar))))
    throw Error("班級學生資料不完整");
  return { title: v.title.trim(), classId: v.classId, className: v.className.trim(), lesson: v.lesson.trim(), characters: v.characters, students };
}
async function body(req) {
  let size = 0;
  const chunks = [];
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 1500000) throw Error("作品過大，請減少練習字數");
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}
export function createWritingHandler({
  store,
  authenticate = writingIdentity,
  origins,
}) {
  return async (req, res) => {
    const send = (status, data) => {
      res.writeHead(status, {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      });
      res.end(JSON.stringify(data));
    };
    if (
      req.method === "POST" &&
      (!origins.includes(req.headers.origin) ||
        req.headers["x-notebook-request"] !== "writing-game")
    )
      return send(403, { error: "不允許的來源" });
    let user;
    try {
      user = await authenticate(req);
    } catch (e) {
      return send(401, { error: e.message });
    }
    try {
      const url = new URL(req.url, "http://localhost");
      const base = "/api/structure/writing";
      const scan = async prefix => { let cursor, rows = [], pages = 0; do { const page = await store.list(prefix, cursor); rows.push(...await Promise.all(page.names.map(async name => (await store.get(name)).value))); cursor = page.nextCursor; if (++pages > 30) throw Error("資料量過大"); } while (cursor); return rows; };
      if (url.pathname === `${base}/structure-assignments`) {
        if (req.method === "GET") {
          const items = (await scan("structure-assignments/"))
            .filter(item => user.admin || item.students.some(student => student.email === user.email.toLowerCase()))
            .map(({students, ...item}) => item);
          return send(200, { items });
        }
        if (req.method === "POST") {
          if (!user.admin) return send(403, { error: "僅管理者可派送練習" });
          const value = validateAssignment(await body(req));
          const id = randomUUID();
          await store.create(`structure-assignments/${id}.json`, { ...value, id, createdAt: new Date().toISOString() });
          return send(201, { id });
        }
      }
      if (url.pathname === `${base}/assignments` && req.method === "GET") {
        const rows = (await scan("writing-assignments/")).filter(assignment => user.admin || assignment.students.some(student => student.email === user.email.toLowerCase()));
        const mine = user.admin ? [] : await scan(`submissions/${encodeURIComponent(user.uid)}/`);
        return send(200, { items: rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map(assignment => ({ ...assignment, students: user.admin ? assignment.students : undefined, ...(!user.admin && mine.some(item => item.assignmentId === assignment.id) ? { submitted: true } : {}) })) });
      }
      if (url.pathname === `${base}/assignments` && req.method === "POST") {
        if (!user.admin) return send(403, { error: "僅教師可以派發書寫作業" });
        const value = validateAssignment(await body(req)), id = randomUUID(), createdAt = new Date().toISOString();
        const assignment = { ...value, id, createdAt, createdBy: user.uid };
        await store.create(`writing-assignments/${id}.json`, assignment);
        return send(201, assignment);
      }
      const assignmentEditMatch = url.pathname.match(/^\/api\/structure\/writing\/assignments\/([0-9a-f-]{36})$/i);
      if (assignmentEditMatch && req.method === "POST") {
        if (!user.admin) return send(403, { error: "僅教師可以編修書寫作業" });
        const key = `writing-assignments/${assignmentEditMatch[1]}.json`, current = await store.get(key);
        if ((await scan("submissions/")).some(item => item.assignmentId === assignmentEditMatch[1]))
          return send(409, { error: "已有學生繳交，為保留作品對應，不能再修改課文或生字" });
        const value = validateAssignment(await body(req)), updated = { ...current.value, ...value, updatedAt: new Date().toISOString() };
        await store.update(key, updated, current.generation);
        return send(200, updated);
      }
      const assignmentMatch = url.pathname.match(/^\/api\/structure\/writing\/assignments\/([0-9a-f-]{36})\/status$/i);
      if (assignmentMatch && req.method === "GET") {
        if (!user.admin) return send(403, { error: "僅教師可以查看全班進度" });
        const assignment = (await store.get(`writing-assignments/${assignmentMatch[1]}.json`)).value;
        const submissions = (await scan("submissions/")).filter(item => item.assignmentId === assignment.id);
        return send(200, { assignment, students: assignment.students.map(student => { const work = submissions.filter(item => item.email.toLowerCase() === student.email).sort((a,b) => b.submittedAt.localeCompare(a.submittedAt))[0]; return { ...student, status: work?.grade ? "graded" : work ? "submitted" : "pending", submission: work ? { uid: work.uid, id: work.id, image: work.thumbnail || work.image, submittedAt: work.submittedAt, grade: work.grade } : null }; }) });
      }
      if (url.pathname === `${base}/submissions` && req.method === "POST") {
        const input = await body(req), value = validateSubmission(input);
        let assignment;
        if (input.assignmentId) {
          if (!/^[0-9a-f-]{36}$/i.test(input.assignmentId)) throw Error("作業代碼格式不符");
          assignment = (await store.get(`writing-assignments/${input.assignmentId}.json`)).value;
          if (!assignment.students.some(student => student.email === user.email.toLowerCase()) || assignment.lesson !== value.lesson || JSON.stringify(assignment.characters) !== JSON.stringify(value.characters))
            return send(403, { error: "這份作品不符合老師指派的作業" });
        }
        const name = `submissions/${encodeURIComponent(user.uid)}/${value.id}.json`;
        const record = {
          ...value,
          ...(typeof input.thumbnail === "string" && input.thumbnail.length <= 50000 && /^data:image\/jpeg;base64,\/9j\/[A-Za-z0-9+/]+={0,2}$/.test(input.thumbnail) ? { thumbnail: input.thumbnail } : {}),
          ...(assignment ? { assignmentId: assignment.id } : {}),
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          submittedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        try {
          await store.create(name, record);
        } catch (e) {
          if (e.status !== 412) throw e;
          const existing = await store.get(name);
          if (
            JSON.stringify(existing.value.works) !==
              JSON.stringify(record.works) ||
            existing.value.image !== record.image ||
            existing.value.lesson !== record.lesson
          )
            return send(409, { error: "此作品已繳交，請查看繳交紀錄" });
          return send(200, {
            id: value.id,
            submittedAt: existing.value.submittedAt,
          });
        }
        return send(201, { id: value.id, submittedAt: record.submittedAt });
      }
      if (url.pathname === `${base}/submissions` && req.method === "GET") {
        const page = await store.list(
          user.admin
            ? "submissions/"
            : `submissions/${encodeURIComponent(user.uid)}/`,
          url.searchParams.get("cursor") || undefined,
        );
        const rows = await Promise.all(
          page.names.map(async (name) => {
            const { value } = await store.get(name);
            const { image, works, ...summary } = value;
            return summary;
          }),
        );
        return send(200, { items: rows, nextCursor: page.nextCursor || null });
      }
      const match = url.pathname.match(
        /^\/api\/structure\/writing\/submissions\/([^/]+)\/([0-9a-f-]{36})$/i,
      );
      if (match) {
        const uid = decodeURIComponent(match[1]);
        if (!user.admin && uid !== user.uid)
          return send(403, { error: "無法查看其他學生的作品" });
        const name = `submissions/${encodeURIComponent(uid)}/${match[2]}.json`;
        if (req.method === "GET")
          return send(200, (await store.get(name)).value);
        if (req.method === "POST") {
          if (!user.admin) return send(403, { error: "僅教師可以評分" });
          const grade = validateGrade(await body(req));
          const old = await store.get(name);
          await store.update(name, { ...old.value, grade }, old.generation);
          return send(200, { grade });
        }
      }
      return send(404, { error: "找不到此作品操作" });
    } catch (e) {
      return send(e.status === 404 ? 404 : e.status === 412 ? 409 : 400, {
        error:
          e.status === 404
            ? "找不到作品"
            : e.status === 412
              ? "作品已更新，請重新載入"
              : e.message || "雲端儲存失敗",
      });
    }
  };
}
export function createWritingCloudStore(auth, bucket) {
  const base = `https://storage.googleapis.com/storage/v1/b/${bucket}/o`;
  async function request(options) {
    try {
      return await auth.request({ ...options, timeout: 30000 });
    } catch (e) {
      const error = Error("雲端作品儲存失敗，請稍後重試");
      error.status = e.response?.status;
      throw error;
    }
  }
  async function save(name, value, generation) {
    await request({
      url: `https://storage.googleapis.com/upload/storage/v1/b/${bucket}/o`,
      method: "POST",
      params: { uploadType: "media", name, ifGenerationMatch: generation },
      headers: { "Content-Type": "application/json" },
      data: JSON.stringify(value),
    });
  }
  return {
    create: (n, v) => save(n, v, 0),
    update: save,
    async get(name) {
      const meta = await request({
        url: `${base}/${encodeURIComponent(name)}`,
      });
      const data = await request({
        url: `${base}/${encodeURIComponent(name)}`,
        params: { alt: "media", generation: meta.data.generation },
      });
      return {
        value:
          typeof data.data === "string" ? JSON.parse(data.data) : data.data,
        generation: meta.data.generation,
      };
    },
    async list(prefix, pageToken) {
      const r = await request({
        url: base,
        params: { prefix, maxResults: 20, ...(pageToken ? { pageToken } : {}) },
      });
      return {
        names: (r.data.items || []).map((x) => x.name),
        nextCursor: r.data.nextPageToken,
      };
    },
  };
}
