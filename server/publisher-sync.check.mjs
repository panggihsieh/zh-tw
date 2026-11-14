import test from "node:test";
import assert from "node:assert/strict";
import {
  approvedURL,
  extractChoices,
  normalize,
  sha,
  makeResourceHandlers,
} from "./publisher-sync.mjs";
test("只接受官方來源，禁止任意主機、signed query、credential與重新導向網址", () => {
  assert.ok(approvedURL("https://storage.googleapis.com/onebox3/test.pdf"));
  for (const u of [
    "https://evil.test/a.pdf",
    "http://gcdn.nani.com.tw/a.pdf",
    "https://storage.googleapis.com/other/a.pdf",
    "https://gcdn.nani.com.tw/a.pdf?token=secret",
    "https://u:p@gcdn.nani.com.tw/a.pdf",
  ])
    assert.throws(() => approvedURL(u));
});
test("保留題意內容，提取四選一且不猜缺失答案", () => {
  const text =
    "（①）⒈誰帶傘？（①小明②小美③老師④爸爸）（③）⒉去哪裡？（①學校②家裡③車站④公園）";
  const q = extractChoices(text);
  assert.equal(q.length, 2);
  assert.deepEqual(
    q.map((x) => x.answer),
    [0, 2],
  );
  assert.deepEqual(q[0].options, ["小明", "小美", "老師", "爸爸"]);
  assert.equal(extractChoices("⒈沒有教用答案（①甲②乙③丙④丁）").length, 0);
  assert.notEqual(sha(normalize("不可以。")), sha(normalize("可以。")));
  assert.notEqual(sha(normalize("10元")), sha(normalize("100元")));
});
test("跨學期更新保留基準；題卷相同不宣稱課文沒變；下載失敗不可略過", async () => {
  const db = new Map(),
    store = {
      async get(n) {
        if (!db.has(n)) throw Object.assign(Error(), { status: 404 });
        return structuredClone(db.get(n));
      },
      async create(n, v) {
        db.set(n, { value: structuredClone(v), generation: 1 });
      },
      async update(n, v, g) {
        assert.equal(db.get(n).generation, g);
        db.set(n, { value: structuredClone(v), generation: g + 1 });
      },
    };
  let fail = false,
    content = "教材原文。";
  const h = makeResourceHandlers({
    store,
    generate: async () => ({questions: []}),
    validateQuiz: () => {throw Error("不應略過原題數量檢查");},
    scan: async (p) =>
      [...db].filter(([k]) => k.startsWith(p)).map(([, v]) => v.value),
    read: async () => {
      if (fail) throw Error("HTTP 403");
      return {
        rawHash: sha(content),
        textHash: sha(content),
        text: content,
        bytes: "AA==",
        pages: 1,
      };
    },
  });
  const item = {
    publisher: "南一",
    grade: 5,
    term: "上",
    year: "115_1",
    title: "第1課測試.pdf",
    url: "https://storage.googleapis.com/onebox3/115/test.pdf",
    kind: "assessment",
  };
  await h("/resources/register", "POST", { items: [item] }, "teacher");
  const { items } = await h("/resources", "GET", null, "teacher");
  const id = items[0].id;
  assert.equal(
    (await h(`/resources/${id}/update`, "POST", {}, "teacher")).status,
    "updated",
  );
  const same = await h(`/resources/${id}/update`, "POST", {}, "teacher");
  assert.equal(same.status, "unchanged");
  assert.match(same.courseComparison, /不能宣稱/);
  await h(
    "/resources/register",
    "POST",
    {
      items: [
        {
          ...item,
          year: "116_1",
          url: "https://storage.googleapis.com/onebox3/116/test.pdf",
        },
      ],
    },
    "teacher",
  );
  assert.equal(
    (await h("/resources", "GET", null, "teacher")).items[0].pendingURL,
    true,
  );
  await assert.rejects(
    h(`/resources/${id}/draft`, "POST", {}, "teacher"),
    /最新來源/,
  );
  content = "課文內容已修改。";
  assert.equal(
    (await h(`/resources/${id}/update`, "POST", {}, "teacher")).status,
    "updated",
  );
  fail = true;
  const denied = await h(`/resources/${id}/update`, "POST", {}, "teacher");
  assert.equal(denied.status, "needs_review");
  assert.match(denied.lastError, /403/);
  fail = false;
  content = "（①）⒈誰帶傘？（①小明②小美③老師④爸爸）";
  await h(`/resources/${id}/update`, "POST", {}, "teacher");
  await assert.rejects(h(`/resources/${id}/draft`, "POST", {}, "teacher"), /AI 修改了原題或答案/);
  const failedDraft=(await h("/resources", "GET", null, "teacher")).items[0];
  assert.match(failedDraft.lastDraftError, /AI 修改/);
  assert.ok(!failedDraft.draftId);
});
test("固定來源內容相同時跳過，異動時只標示待核對", async () => {
  const db = new Map(),
    store = {
      async get(name) {
        if (!db.has(name)) throw Object.assign(Error(), { status: 404 });
        return structuredClone(db.get(name));
      },
      async create(name, value) {
        db.set(name, { value: structuredClone(value), generation: 1 });
      },
      async update(name, value, generation) {
        assert.equal(db.get(name).generation, generation);
        db.set(name, { value: structuredClone(value), generation: generation + 1 });
      },
    };
  let content = "版本一";
  const handler = makeResourceHandlers({
    store,
    scan: async (prefix) =>
      [...db].filter(([key]) => key.startsWith(prefix)).map(([, row]) => row.value),
    fetchLanding: async () => ({ ok: true, text: async () => content }),
  });
  const first = await handler("/references/check", "POST", { id: "cbeta" });
  assert.equal(first.status, "updated");
  const same = await handler("/references/check", "POST", { id: "cbeta" });
  assert.equal(same.status, "unchanged");
  assert.match(same.message, /跳過/);
  content = "版本二";
  const changed = await handler("/references/check", "POST", { id: "cbeta" });
  assert.equal(changed.status, "updated");
  assert.match(changed.message, /待管理者核對/);
});
