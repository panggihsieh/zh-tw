import test from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { once } from "node:events";
import { randomUUID } from "node:crypto";
import {
  createQuizHandler,
  validateQuiz,
  quizStats,
  wrongBook,
  selectStem,
} from "./quiz-api.mjs";
const question = () => ({
  id: randomUUID(),
  category: "文意理解",
  difficulty: "中",
  stem: "小明為什麼帶傘？",
  variants: ["小明帶傘的原因是什麼？", "小明因為什麼原因準備雨傘？"],
  options: ["因為下雨", "因為天晴", "因為游泳", "因為吃飯"],
  answer: 0,
  explanation: "課文說因為下雨而帶傘。",
  evidence: "下雨了，小明帶傘出門。",
  reviewed: false,
});
test("原題固定，同義改寫避開上次措辭且不改動選項答案", () => {
  const q = question();
  assert.equal(selectStem(q, "original", q.stem), q.stem);
  for (let i = 0; i < 10; i++)
    assert.equal(selectStem(q, "rephrase", q.variants[0]), q.variants[1]);
  assert.equal(q.answer, 0);
});
const paper = () => ({
  roster: ["student@example.com"],
  title: "國語測試",
  className: "測試班",
  grade: 2,
  lesson: "帶傘",
  passage: "下雨了，小明帶傘出門。",
  questionMode: "original",
  questions: [question()],
});
function memoryStore() {
  const db = new Map();
  return {
    db,
    async list(prefix) {
      return { names: [...db.keys()].filter((x) => x.startsWith(prefix)) };
    },
    async get(n) {
      if (!db.has(n)) throw Object.assign(Error("missing"), { status: 404 });
      return structuredClone(db.get(n));
    },
    async create(n, v) {
      if (db.has(n)) throw Object.assign(Error("conflict"), { status: 412 });
      db.set(n, { value: structuredClone(v), generation: 1 });
    },
    async update(n, v, g) {
      if (db.get(n)?.generation !== g)
        throw Object.assign(Error("conflict"), { status: 412 });
      db.set(n, { value: structuredClone(v), generation: g + 1 });
    },
  };
}
test("母題嚴格檢查：答案、選項、原句依據、改寫差異、識別碼", () => {
  assert.equal(validateQuiz(paper()).questions.length, 1);
  for (const change of [
    (q) => (q.answer = 4),
    (q) => (q.options[1] = q.options[0]),
    (q) => (q.evidence = "課文沒有這句"),
    (q) => (q.variants[0] = q.stem),
    (q) => (q.variants = [q.variants[0]]),
    (q) => (q.id = "fake"),
  ]) {
    const v = paper();
    change(v.questions[0]);
    assert.throws(() => validateQuiz(v));
  }
  const v = paper();
  v.questions.push(v.questions[0]);
  assert.throws(() => validateQuiz(v));
});
test("錯題統計以學生最近一次測驗計算，自行複習另外記錄", () => {
  const q = question(),
    a = (uid, time, correct, choice, mode = "test") => ({
      uid,
      name: uid,
      completedAt: time,
      mode,
      result: { rows: [{ ...q, correct, choice }] },
    });
  const attempts = [
    a("a", "1", false, 1),
    a("b", "2", false, 2),
    a("a", "3", true, 0),
    a("b", "4", true, 0, "practice"),
  ];
  const [r] = quizStats(attempts, [q]);
  assert.deepEqual(
    [r.total, r.wrong, r.rate, r.firstWrong, r.improved],
    [2, 1, 50, 2, 1],
  );
  assert.deepEqual(r.choices, [1, 0, 1, 0]);
  const w = wrongBook(attempts.filter((a) => a.uid === "b"));
  assert.equal(w[0].wrongCount, 1);
  assert.equal(w[0].latestCorrect, true);
});
test("國語錯題端到端：權限、答案隱藏、固定版本、交卷冪等、複習、再出卷", async (t) => {
  const store = memoryStore(),
    handler = createQuizHandler({
      store,
      origins: ["https://test"],
      authenticate: async (req) => {
        const uid = req.headers["x-test-user"];
        if (!uid) throw Error();
        return {
          uid,
          email: uid + "@example.com",
          admin: uid === "teacher",
          displayName: uid,
        };
      },
      generate: async () => ({
        questions: [question()],
        aiCheck: { checks: [{ reason: "正解A" }] },
      }),
    });
  const server = http.createServer(handler);
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  t.after(() => server.close());
  async function request(
    path,
    body,
    user = "teacher",
    origin = "https://test",
  ) {
    const r = await fetch(
      `http://127.0.0.1:${server.address().port}/api/structure/quiz${path}`,
      {
        method: body ? "POST" : "GET",
        headers: {
          ...(user ? { "x-test-user": user } : {}),
          Origin: origin,
          "X-Notebook-Request": "quiz",
          "Content-Type": "application/json",
        },
        body: body ? JSON.stringify(body) : undefined,
      },
    );
    return { status: r.status, data: await r.json() };
  }
  assert.equal((await request("/papers", null, "")).status, 401);
  assert.equal((await request("/generate", {}, "student")).status, 403);
  const input = {
    ...paper(),
    count: 1,
    categories: ["文意理解"],
    difficulty: "中",
  };
  delete input.questions;
  assert.equal(
    (await request("/generate", input, "teacher", "https://evil")).status,
    403,
  );
  const created = await request("/generate", input);
  assert.equal(created.status, 201);
  const q = created.data;
  assert.equal((await request(`/papers/${q.id}/publish`, q)).status, 400);
  q.questions[0].reviewed = true;
  assert.equal((await request(`/papers/${q.id}/publish`, q)).status, 200);
  const list = (await request("/papers", null, "student")).data;
  assert.ok(!JSON.stringify(list).includes("正解A"));
  assert.ok(!JSON.stringify(list).includes("answer"));
  assert.equal(
    (await request("/attempts", { quizId: q.id }, "other")).status,
    403,
  );
  assert.equal((await request(`/papers/${q.id}`, null, "student")).status, 403);
  assert.equal((await request("/papers", null, "other")).data.items.length, 0);
  const attempt = (await request("/attempts", { quizId: q.id }, "student"))
    .data;
  assert.equal(attempt.questions[0].stem, q.questions[0].stem);
  assert.equal(attempt.questions[0].answer, undefined);
  assert.equal(
    (await request(`/attempts/${attempt.id}`, null, "other")).status,
    404,
  );
  assert.deepEqual(
    (await request(`/attempts/${attempt.id}`, null, "student")).data,
    attempt,
  );
  assert.equal(
    (
      await request(
        `/attempts/${attempt.id}/submit`,
        { answers: [] },
        "student",
      )
    ).status,
    400,
  );
  const failed = (
    await request(`/attempts/${attempt.id}/submit`, { answers: [1] }, "student")
  ).data;
  assert.equal(failed.result.score, 0);
  assert.equal(
    (
      await request(
        `/attempts/${attempt.id}/submit`,
        { answers: [0] },
        "student",
      )
    ).data.result.score,
    0,
  );
  assert.equal(
    (await request("/wrong-book", null, "other")).data.items.length,
    0,
  );
  assert.equal(
    (await request("/wrong-book", null, "student")).data.items.length,
    1,
  );
  assert.equal(
    (await request(`/papers/${q.id}/stats`, null, "student")).status,
    403,
  );
  assert.equal(
    (await request(`/papers/${q.id}/stats`)).data.items[0].rate,
    100,
  );
  assert.equal(
    (
      await request(
        "/attempts",
        { quizId: q.id, practice: true, ids: [randomUUID()] },
        "student",
      )
    ).status,
    400,
  );
  const practice = (
    await request(
      "/attempts",
      { quizId: q.id, practice: true, ids: [q.questions[0].id] },
      "student",
    )
  ).data;
  await request(`/attempts/${practice.id}/submit`, { answers: [0] }, "student");
  assert.equal(
    (await request("/wrong-book", null, "student")).data.items[0].latestCorrect,
    true,
  );
  assert.equal(
    (await request(`/papers/${q.id}/stats`)).data.items[0].rate,
    100,
  );
  const retry = (
    await request(`/papers/${q.id}/remedial`, {
      ids: [q.questions[0].id],
      questionMode: "rephrase",
    })
  ).data;
  assert.equal(retry.familyId, q.id);
  assert.equal(retry.questions[0].id, q.questions[0].id);
  assert.equal(retry.questions[0].reviewed, false);
  retry.questions[0].reviewed = true;
  assert.equal((await request(`/papers/${retry.id}/publish`,{...retry,passage:retry.passage+'追加課文。'})).status,400);
  assert.equal(
    (await request(`/papers/${retry.id}/publish`, retry)).status,
    200,
  );
  const retryAttempt = (
    await request("/attempts", { quizId: retry.id }, "student")
  ).data;
  assert.ok(q.questions[0].variants.includes(retryAttempt.questions[0].stem));
  await request(
    `/attempts/${retryAttempt.id}/submit`,
    { answers: [0] },
    "student",
  );
  const stats = (await request(`/papers/${q.id}/stats`)).data.items[0];
  assert.deepEqual([stats.total, stats.wrong, stats.improved], [1, 0, 1]);
  assert.equal((await request(`/papers/${q.id}/save`, q)).status, 409);
});
