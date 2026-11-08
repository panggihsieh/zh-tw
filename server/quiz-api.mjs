import { randomUUID, randomInt } from "node:crypto";
import { writingIdentity } from "./writing-api.mjs";
export const CATEGORIES = [
  "字音字形",
  "字詞義及運用",
  "文意理解",
  "標點符號",
  "基本修辭",
];
const text = (s, max = 1000) =>
  typeof s === "string" && s.trim().length > 0 && s.length <= max;
const uuid = (s) => typeof s === "string" && /^[0-9a-f-]{36}$/.test(s);
export function validateQuiz(v) {
  if (
    !v ||
    !Array.isArray(v.roster) ||
    !v.roster.length ||
    v.roster.length > 100 ||
    v.roster.some(
      (x) => typeof x !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(x),
    ) ||
    !["original", "rephrase"].includes(v.questionMode) ||
    !text(v.title, 120) ||
    !text(v.className, 80) ||
    !text(v.passage, 12000) ||
    !text(v.lesson, 180) ||
    !Number.isInteger(v.grade) ||
    v.grade < 1 ||
    v.grade > 6 ||
    !Array.isArray(v.questions) ||
    !v.questions.length ||
    v.questions.length > 20
  )
    throw Error("國語試卷格式不符：需課名、班級、課文與1–20題");
  const seen = new Set();
  const questions = v.questions.map((q) => {
    if (
      !uuid(q.id) ||
      seen.has(q.id) ||
      !CATEGORIES.includes(q.category) ||
      !["易", "中", "難"].includes(q.difficulty) ||
      !text(q.stem, 600) ||
      !Array.isArray(q.variants) ||
      q.variants.length !== 2 ||
      !q.variants.every((s) => text(s, 600)) ||
      new Set([q.stem, ...q.variants]).size !== q.variants.length + 1 ||
      !Array.isArray(q.options) ||
      q.options.length !== 4 ||
      !q.options.every((s) => text(s, 300)) ||
      new Set(q.options.map((s) => s.trim())).size !== 4 ||
      !Number.isInteger(q.answer) ||
      q.answer < 0 ||
      q.answer > 3 ||
      !text(q.explanation, 1500) ||
      !text(q.evidence, 1000) ||
      !v.passage.includes(q.evidence)
    )
      throw Error(
        "題目格式不符：四個不同選項、唯一答案、不同措辭與課文原句依據皆必填",
      );
    seen.add(q.id);
    return {
      id: q.id,
      category: q.category,
      difficulty: q.difficulty,
      stem: q.stem,
      variants: q.variants,
      options: q.options,
      answer: q.answer,
      explanation: q.explanation,
      evidence: q.evidence,
      reviewed: q.reviewed === true,
    };
  });
  return {
    roster: [...new Set(v.roster.map((x) => x.toLowerCase()))],
    questionMode: v.questionMode,
    title: v.title.trim(),
    className: v.className.trim(),
    grade: v.grade,
    lesson: v.lesson.trim(),
    passage: v.passage,
    questions,
  };
}
export function quizStats(attempts, questions) {
  const tests = attempts
    .filter((a) => a.result && a.mode === "test")
    .sort((a, b) => a.completedAt.localeCompare(b.completedAt));
  return questions.map((q) => {
    const byUser = new Map();
    for (const a of tests) {
      const r = a.result.rows.find((r) => r.id === q.id);
      if (r) {
        const prior = byUser.get(a.uid);
        byUser.set(a.uid, { first: prior?.first || r, last: r, name: a.name });
      }
    }
    const rows = [...byUser.values()],
      choices = [0, 0, 0, 0];
    for (const r of rows) choices[r.last.choice]++;
    const wrong = rows.filter((r) => !r.last.correct);
    return {
      id: q.id,
      stem: q.stem,
      total: rows.length,
      wrong: wrong.length,
      rate: rows.length ? Math.round((wrong.length / rows.length) * 100) : 0,
      choices,
      firstWrong: rows.filter((r) => !r.first.correct).length,
      improved: rows.filter((r) => !r.first.correct && r.last.correct).length,
      names: wrong.map((r) => r.name),
    };
  });
}
export function wrongBook(attempts) {
  const map = new Map();
  for (const a of attempts
    .filter((a) => a.result)
    .sort((a, b) => a.completedAt.localeCompare(b.completedAt)))
    for (const r of a.result.rows) {
      const prev = map.get(r.id);
      if (!r.correct || prev)
        map.set(r.id, {
          ...r,
          quizId: a.quizId,
          familyId: a.familyId,
          title: a.title,
          wrongCount: (prev?.wrongCount || 0) + (r.correct ? 0 : 1),
          latestCorrect: r.correct,
          completedAt: a.completedAt,
        });
    }
  return [...map.values()].sort(
    (a, b) => Number(a.latestCorrect) - Number(b.latestCorrect),
  );
}
export function attemptView(a) {
  return {
    id: a.id,
    quizId: a.quizId,
    title: a.title,
    passage: a.passage,
    mode: a.mode,
    questions: a.questions.map((q) => ({
      id: q.id,
      stem: q.stem,
      options: q.options,
      category: q.category,
    })),
    result: a.result || null,
  };
}
export function selectStem(q, mode, previous) {
  if (mode === "original") return q.stem;
  const choices = q.variants.filter((s) => s !== previous);
  return (choices.length ? choices : q.variants)[
    randomInt(choices.length || q.variants.length)
  ];
}
async function body(req) {
  let size = 0,
    chunks = [];
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 200000) throw Error("試卷資料過大");
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}
export function createQuizHandler({
  store,
  origins,
  authenticate = writingIdentity,
  generate,
}) {
  const generating = new Set();
  async function scan(prefix) {
    let cursor,
      items = [],
      pages = 0;
    do {
      const page = await store.list(prefix, cursor);
      items.push(
        ...(await Promise.all(
          page.names.map(async (n) => (await store.get(n)).value),
        )),
      );
      cursor = page.nextCursor;
      if (++pages >= 100 && cursor)
        throw Error("資料量過大，請聯絡管理者分批匯出");
    } while (cursor);
    return items;
  }
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
        req.headers["x-notebook-request"] !== "quiz")
    )
      return send(403, { error: "不允許的來源" });
    let user;
    try {
      user = await authenticate(req);
    } catch {
      return send(401, { error: "請先登入 Google 帳號" });
    }
    try {
      const url = new URL(req.url, "http://localhost"),
        path = url.pathname.replace("/api/structure/quiz", "");
      if (path === "/papers" && req.method === "GET") {
        const papers = await scan("quiz-papers/");
        return send(200, {
          items: papers
            .filter(
              (q) =>
                user.admin ||
                (q.status === "published" &&
                  q.roster.includes(user.email?.toLowerCase())),
            )
            .map((q) => ({
              id: q.id,
              familyId: q.familyId,
              title: q.title,
              className: q.className,
              grade: q.grade,
              lesson: q.lesson,
              questionMode: q.questionMode,
              status: q.status,
              count: q.questions.length,
            })),
        });
      }
      if (path === "/wrong-book" && req.method === "GET")
        return send(200, {
          items: wrongBook(await scan(`quiz-attempts/${user.uid}/`)),
        });
      if (path === "/attempts" && req.method === "POST") {
        const v = await body(req);
        if (!uuid(v.quizId)) throw Error("試卷識別碼不符");
        const q = (await store.get(`quiz-papers/${v.quizId}.json`)).value;
        if (!user.admin && !q.roster.includes(user.email?.toLowerCase()))
          return send(403, { error: "這份測驗未指派給你的帳號" });
        if (q.status !== "published")
          return send(404, { error: "試卷尚未發布" });
        let questions = q.questions,
          mode =
            user.admin && !q.roster.includes(user.email?.toLowerCase())
              ? "preview"
              : "test";
        const questionMode =
          v.practice === true &&
          ["original", "rephrase"].includes(v.questionMode)
            ? v.questionMode
            : q.questionMode;
        const previous = await scan(`quiz-attempts/${user.uid}/`);
        if (v.practice === true) {
          mode = "practice";
          const own = wrongBook(previous);
          const ids = new Set(
            own
              .filter((r) => q.questions.some((x) => x.id === r.id))
              .map((r) => r.id),
          );
          if (
            v.ids !== undefined &&
            (!Array.isArray(v.ids) ||
              !v.ids.length ||
              v.ids.some((id) => !ids.has(id)))
          )
            throw Error("只能複習自己的錯題");
          questions = questions.filter(
            (x) => ids.has(x.id) && (!v.ids || v.ids.includes(x.id)),
          );
          if (!questions.length) throw Error("這張試卷沒有你的錯題");
        }
        const id = randomUUID(),
          a = {
            id,
            uid: user.uid,
            name: user.displayName || user.email,
            quizId: q.id,
            familyId: q.familyId || q.id,
            title: q.title,
            passage: q.passage,
            mode,
            startedAt: new Date().toISOString(),
            questions: questions.map((x) => ({
              ...x,
              stem: selectStem(
                x,
                questionMode,
                previous
                  .sort((a, b) => b.startedAt.localeCompare(a.startedAt))
                  .find((a) => a.questions.some((q) => q.id === x.id))
                  ?.questions.find((q) => q.id === x.id)?.stem,
              ),
            })),
          };
        await store.create(`quiz-attempts/${user.uid}/${id}.json`, a);
        return send(201, attemptView(a));
      }
      const match = path.match(/^\/attempts\/([0-9a-f-]{36})(\/submit)?$/);
      if (match) {
        const name = `quiz-attempts/${user.uid}/${match[1]}.json`,
          old = await store.get(name),
          a = old.value;
        if (!match[2] && req.method === "GET") return send(200, attemptView(a));
        if (match[2] && req.method === "POST") {
          if (a.result) return send(200, attemptView(a));
          const v = await body(req);
          if (
            !Array.isArray(v.answers) ||
            v.answers.length !== a.questions.length ||
            v.answers.some((x) => !Number.isInteger(x) || x < 0 || x > 3)
          )
            throw Error("請完成每題再交卷");
          a.result = {
            score: Math.round(
              (a.questions.filter((q, i) => q.answer === v.answers[i]).length /
                a.questions.length) *
                100,
            ),
            rows: a.questions.map((q, i) => ({
              ...q,
              choice: v.answers[i],
              correct: v.answers[i] === q.answer,
            })),
          };
          a.completedAt = new Date().toISOString();
          try {
            await store.update(name, a, old.generation);
          } catch (e) {
            if (e.status !== 412) throw e;
            return send(200, attemptView((await store.get(name)).value));
          }
          return send(200, attemptView(a));
        }
      }
      if (!user.admin)
        return send(403, { error: "僅管理者可組卷與查看全班統計" });
      if (path === "/generate" && req.method === "POST") {
        if (generating.has(user.uid))
          return send(429, { error: "上一份試卷仍在產生中" });
        const v = await body(req);
        if (
          !text(v.passage, 12000) ||
          !text(v.title, 120) ||
          !text(v.className, 80) ||
          !text(v.lesson, 180) ||
          !Number.isInteger(v.grade) ||
          v.grade < 1 ||
          v.grade > 6 ||
          !Number.isInteger(v.count) ||
          v.count < 1 ||
          v.count > 10 ||
          !Array.isArray(v.categories) ||
          !v.categories.length ||
          v.categories.some((c) => !CATEGORIES.includes(c)) ||
          !["易", "中", "難"].includes(v.difficulty)
        )
          throw Error("請填妥國語課文、班級、年級、題型與1–10題");
        generating.add(user.uid);
        try {
          if (
            !Array.isArray(v.roster) ||
            !v.roster.length ||
            v.roster.length > 100 ||
            v.roster.some(
              (x) =>
                typeof x !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(x),
            )
          )
            throw Error("請填寫班級學生 Google 帳號清單");
          const output = await generate(v);
          const quiz = validateQuiz({
            ...v,
            questions: output.questions.map((q) => ({
              ...q,
              id: randomUUID(),
              reviewed: false,
            })),
          });
          if (
            quiz.questions.length !== v.count ||
            quiz.questions.some(
              (q) =>
                !v.categories.includes(q.category) ||
                q.difficulty !== v.difficulty,
            )
          )
            throw Error("AI 題數、題型或難度不符合設定");
          const id = randomUUID(),
            record = {
              ...quiz,
              id,
              familyId: id,
              status: "draft",
              generatedAt: new Date().toISOString(),
              aiCheck: output.aiCheck,
            };
          await store.create(`quiz-papers/${id}.json`, record);
          return send(201, record);
        } finally {
          generating.delete(user.uid);
        }
      }
      const paper = path.match(
        /^\/papers\/([0-9a-f-]{36})(?:\/(stats|publish|save|remedial|reuse))?$/,
      );
      if (paper) {
        const name = `quiz-papers/${paper[1]}.json`,
          old = await store.get(name),
          q = old.value,
          action = paper[2];
        if (!action && req.method === "GET") return send(200, q);
        if (action === "stats" && req.method === "GET") {
          const attempts = (await scan("quiz-attempts/")).filter(
            (a) => a.familyId === q.familyId,
          );
          return send(200, {
            items: quizStats(attempts, q.questions),
            submitted: attempts.filter((a) => a.result && a.mode === "test")
              .length,
          });
        }
        if (
          (action === "remedial" || action === "reuse") &&
          req.method === "POST"
        ) {
          if (q.status !== "published") throw Error("請先審核發布母題");
          const v = await body(req),
            attempts = (await scan("quiz-attempts/")).filter(
              (a) => a.familyId === q.familyId,
            ),
            stats = quizStats(attempts, q.questions);
          if (
            !Array.isArray(v.ids) ||
            !v.ids.length ||
            v.ids.some(
              (id) =>
                !q.questions.some((r) => r.id === id) ||
                (action === "remedial" &&
                  !stats.some((r) => r.id === id && r.wrong > 0)),
            ) ||
            !["original", "rephrase"].includes(v.questionMode)
          )
            throw Error("請選有答錯學生的題目");
          const id = randomUUID(),
            record = {
              ...q,
              id,
              title: `${q.title.slice(0, 95)}・${action === "remedial" ? "錯題再測" : "母題再考"}`,
              questionMode: v.questionMode,
              parentId: q.id,
              status: "draft",
              questions: q.questions
                .filter((x) => v.ids.includes(x.id))
                .map((x) => ({ ...x, reviewed: false })),
              generatedAt: new Date().toISOString(),
            };
          await store.create(`quiz-papers/${id}.json`, record);
          return send(201, record);
        }
        if (
          (action === "save" || action === "publish") &&
          req.method === "POST"
        ) {
          if (q.status === "published")
            return send(409, { error: "已發布試卷不可覆寫，請建立錯題再測卷" });
          const v = validateQuiz(await body(req));
          if (
            q.questions.length !== v.questions.length ||
            q.questions.some((x, i) => x.id !== v.questions[i].id)
          )
            throw Error("母題識別碼不可變更");
          if (
            q.parentId &&
            JSON.stringify(v.roster) !== JSON.stringify(q.roster)
          )
            throw Error("再測卷不可更動班級學生");
          if (q.parentId && v.className !== q.className)
            throw Error("同一班級的再測不可變更班級");
          if (
            q.parentId &&
            (v.passage !== q.passage ||
              v.lesson !== q.lesson ||
              v.grade !== q.grade)
          )
            throw Error("再測卷不可變更原課文與學習條件");
          if (
            q.parentId &&
            q.questions.some(
              (x, i) =>
                JSON.stringify({ ...x, reviewed: false }) !==
                JSON.stringify({ ...v.questions[i], reviewed: false }),
            )
          )
            throw Error("再測卷保留原母題考點與選項，僅可選用既有改寫版");
          if (action === "publish" && !v.questions.every((x) => x.reviewed))
            throw Error("請逐題核對母題、所有改寫、答案、解析及課文依據");
          const record = {
            ...q,
            ...v,
            status: action === "publish" ? "published" : "draft",
            updatedAt: new Date().toISOString(),
            ...(action === "publish"
              ? { publishedAt: new Date().toISOString() }
              : {}),
          };
          await store.update(name, record, old.generation);
          return send(200, record);
        }
      }
      return send(404, { error: "找不到國語測驗 API" });
    } catch (e) {
      return send(e.status === 404 ? 404 : e.status === 412 ? 409 : 400, {
        error:
          e.status === 404
            ? "找不到試卷或作答紀錄"
            : e.status === 412
              ? "資料已更新，請重新讀取"
              : e.message?.startsWith("API ")
                ? e.message
                : e.message || "測驗處理失敗",
      });
    }
  };
}
