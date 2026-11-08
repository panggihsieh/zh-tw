import { createHash, randomUUID } from "node:crypto";
export const PUBLISHERS = [
  {
    name: "南一",
    url: "https://nanidigi.nani.com.tw/?fs=e",
    login: "https://box3.nani.com.tw/",
  },
  {
    name: "康軒",
    url: "https://945cloud.knsh.com.tw/",
    login: "https://digitalmaster.knsh.com.tw/",
  },
  {
    name: "翰林",
    url: "https://hanlindigi.hle.com.tw/main",
    login: "https://edisc3.hle.com.tw/",
  },
];
export const sha = (s) => createHash("sha256").update(s).digest("hex");
export const normalize = (s) =>
  s.normalize("NFC").replace(/\r\n?/g, "\n").trim();
export function approvedURL(raw) {
  const u = new URL(raw);
  if (
    u.protocol !== "https:" ||
    u.username ||
    u.password ||
    u.port ||
    u.search ||
    u.hash
  )
    throw Error("教材下載網址須為無驗證參數的官方 HTTPS 網址");
  const hosts = [
    "gcdn.nani.com.tw",
    "cdn.nani.cool",
    "website.hle.com.tw",
    "hanlindigi.hle.com.tw",
    "digitalmaster.knsh.com.tw",
    "webetextbook.knsh.com.tw",
  ];
  if (!(
    hosts.includes(u.hostname) ||
    (u.hostname === "storage.googleapis.com" &&
      u.pathname.startsWith("/onebox3/"))
  ))
    throw Error("僅允許已確認的官方教材下載來源");
  return u.href;
}
export async function readResource(url, fetcher = fetch) {
  const r = await fetcher(approvedURL(url), {
    redirect: "error",
    signal: AbortSignal.timeout(20000),
  });
  if (!r.ok)
    throw Error(`官方教材下載 HTTP ${r.status}，請重新登入官方確認來源`);
  if (+r.headers.get("content-length") > 8_000_000)
    throw Error("教材超過8MB，請分檔匯入");
  const reader = r.body.getReader();
  let chunks = [],
    size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > 8_000_000) {
      await reader.cancel();
      throw Error("教材超過8MB");
    }
    chunks.push(value);
  }
  const bytes = Buffer.concat(chunks);
  if (!bytes.subarray(0, 5).equals(Buffer.from("%PDF-")))
    throw Error("官方連結沒有回傳 PDF，可能需要登入；不可標為未變更");
  const { getDocument } = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const task = getDocument({
    data: new Uint8Array(bytes),
    useSystemFonts: true,
    isEvalSupported: false,
  });
  let pages = [];
  try {
    const doc = await task.promise;
    if (doc.numPages > 30) throw Error("請使用30頁以內的逐課教材");
    for (let i = 1; i <= doc.numPages; i++) {
      const p = await doc.getPage(i),
        t = await p.getTextContent();
      pages.push({
        page: i,
        width: p.view[2] - p.view[0],
        height: p.view[3] - p.view[1],
        rotation: p.rotate,
        text: t.items.map((x) => x.str || "").join(""),
      });
      p.cleanup();
    }
  } finally {
    await task.destroy();
  }
  const text = normalize(pages.map((p) => p.text).join("\n"));
  if (text.length < 50)
    throw Error("無可用文字層，需OCR與人工核對，不能判定未更新");
  return {
    bytes: bytes.toString("base64"),
    rawHash: sha(bytes),
    text,
    textHash: sha(text),
    pages: pages.length,
    pageInfo: pages.map(({ text, ...p }) => p),
    parserVersion: "publisher-sync-v1",
  };
}
export function extractChoices(text) {
  const s = text.replace(/\s+/g, "");
  const anchors = [
    ...s.matchAll(/[(（]([①②③④])[)）]([⒈⒉⒊⒋⒌⒍⒎⒏⒐⒑\d]+)[.．、]?/g),
  ];
  let result = [];
  for (let i = 0; i < anchors.length; i++) {
    const a = anchors[i],
      segment = s.slice(a.index + a[0].length, anchors[i + 1]?.index);
    const m = segment.match(
      /^([\s\S]+?)[（︵]①([\s\S]+?)②([\s\S]+?)③([\s\S]+?)④([\s\S]+?)[）︶]/,
    );
    if (!m) continue;
    const stem = m[1],
      options = m.slice(2, 6);
    if (
      stem.length > 600 ||
      options.some((o) => !o || o.length > 300) ||
      new Set(options).size !== 4
    )
      continue;
    result.push({
      stem,
      options,
      answer: "①②③④".indexOf(a[1]),
      evidence: m[0],
    });
  }
  return result;
}
export function makeResourceHandlers({
  store,
  scan,
  generate,
  validateQuiz,
  analyzeLanding,
  read = readResource,
  fetchLanding = fetch,
}) {
  const busy = new Set();
  return async (path, method, input, uid) => {
    if (path === "/resources" && method === "GET")
      return {
        publishers: PUBLISHERS,
        items: (await scan("publisher-index/"))
          .sort(
            (a, b) =>
              a.publisher.localeCompare(b.publisher) ||
              a.grade - b.grade ||
              ["上", "下"].indexOf(a.term) - ["上", "下"].indexOf(b.term) ||
              +(a.title.match(/第(\d+)課/)?.[1] || 0) -
                +(b.title.match(/第(\d+)課/)?.[1] || 0),
          )
          .map(({ text, bytes, ...r }) => r),
      };
    if (path === "/resources/register" && method === "POST") {
      if (!Array.isArray(input.items) || input.items.length > 100)
        throw Error("每次最多登記100個教材來源");
      let count = 0;
      for (const v of input.items) {
        if (
          !PUBLISHERS.some((p) => p.name === v.publisher) ||
          ![5, 6].includes(v.grade) ||
          !["上", "下"].includes(v.term) ||
          !/^\d{3}_[12]$/.test(v.year) ||
          typeof v.title !== "string" ||
          v.title.length > 200 ||
          !["assessment", "lesson"].includes(v.kind)
        )
          throw Error("教材來源資料不符");
        const url = approvedURL(v.url),
          id = sha(
            `${v.publisher}|${v.grade}|${v.term}|${v.title.match(/第(\d+)課/)?.[1] || v.title}`,
          ),
          name = `publisher-index/${id}.json`;
        try {
          const old = await store.get(name);
          await store.update(
            name,
            {
              ...old.value,
              url,
              year: v.year,
              title: v.title,
              pendingURL:
                url !== old.value.url || old.value.pendingURL === true,
              status: url !== old.value.url ? "registered" : old.value.status,
            },
            old.generation,
          );
        } catch (e) {
          if (e.status !== 404) throw e;
          await store.create(name, {
            id,
            publisher: v.publisher,
            grade: v.grade,
            term: v.term,
            year: v.year,
            title: v.title,
            url,
            kind: v.kind,
            status: "registered",
            confirmedListing: v.confirmedListing === true,
          });
          count++;
        }
      }
      return { registered: count };
    }
    if (path === "/resources/discover" && method === "POST") {
      const p = PUBLISHERS.find((p) => p.name === input.publisher);
      if (!p) throw Error("出版社不符");
      const r = await fetchLanding(p.url, {
        redirect: "follow",
        signal: AbortSignal.timeout(15000),
      });
      if (!r.ok) throw Error(`官方入口 HTTP ${r.status}`);
      const html = (await r.text()).slice(0, 180000),
        analysis = await analyzeLanding(p, html);
      const id = sha(p.name),
        record = {
          publisher: p.name,
          checkedAt: new Date().toISOString(),
          url: p.url,
          landingHash: sha(html),
          analysis,
          status: "needs_authenticated_listing",
          message:
            "已即時下載入口並執行AI盤點；入口不是課文全文，尚不能據此略過課文更新。",
        };
      try {
        const old = await store.get(`publisher-discovery/${id}.json`);
        await store.update(
          `publisher-discovery/${id}.json`,
          record,
          old.generation,
        );
      } catch (e) {
        if (e.status !== 404) throw e;
        await store.create(`publisher-discovery/${id}.json`, record);
      }
      return record;
    }
    if (path === "/resources/discoveries" && method === "GET")
      return { items: await scan("publisher-discovery/") };
    const match = path.match(/^\/resources\/([0-9a-f]{64})\/(update|draft)$/);
    if (!match || method !== "POST") return null;
    const id = match[1],
      name = `publisher-index/${id}.json`;
    if (busy.has(id)) throw Error("此課教材正在處理");
    busy.add(id);
    try {
      const old = await store.get(name),
        v = old.value;
      if (match[2] === "update") {
        let source;
        try {
          source = await read(v.url);
        } catch (e) {
          const record = {
            ...v,
            status: "needs_review",
            lastError: e.message,
            checkedAt: new Date().toISOString(),
          };
          await store.update(name, record, old.generation);
          return record;
        }
        const unchanged = v.textHash === source.textHash,
          version = source.rawHash;
        try {
          await store.create(`publisher-originals/${id}/${version}.json`, {
            ...source,
            url: v.url,
            downloadedAt: new Date().toISOString(),
          });
        } catch (e) {
          if (e.status !== 412) throw e;
        }
        const record = {
          ...v,
          rawHash: source.rawHash,
          textHash: source.textHash,
          pages: source.pages,
          status: unchanged ? "unchanged" : "updated",
          courseComparison:
            v.kind === "lesson"
              ? unchanged
                ? "課文全文一致"
                : "課文新增或變更，待核對"
              : "僅比對題卷；未取得課文全文，不能宣稱課文未變",
          checkedAt: new Date().toISOString(),
          lastError: null,
          pendingURL: false,
          ...(!unchanged ? { draftId: null } : {}),
        };
        await store.update(name, record, old.generation);
        return record;
      }
      if (v.publisher !== "南一") throw Error("第一批AI母題僅處理南一五六年級");
      if (v.pendingURL || v.lastError)
        throw Error("最新來源尚未取得，請先完成下載與比對");
      if (!v.rawHash) throw Error("請先下載教材");
      if (v.draftId) return { draftId: v.draftId, skipped: true };
      const source = (
          await store.get(`publisher-originals/${id}/${v.rawHash}.json`)
        ).value,
        mothers = extractChoices(source.text);
      if (!mothers.length || mothers.length > 10)
        throw Error("選擇題格式或題數待核對，未自動入庫");
      const evidence = mothers.map((m) => m.evidence).join("\n"),
        data = {
          title: v.title.replace(/\.pdf$/i, "").slice(0, 110),
          className: "南一高年級母題待審（未指派學生）",
          roster: ["teacher.hsieh@gmail.com"],
          grade: v.grade,
          lesson: v.title,
          passage: evidence,
          count: mothers.length,
          categories: [
            "字音字形",
            "字詞義及運用",
            "文意理解",
            "標點符號",
            "基本修辭",
          ],
          difficulty: "中",
          questionMode: "original",
          mothers,
        };
      const output = await generate(data);
      if (
        !Array.isArray(output.questions) ||
        output.questions.length !== mothers.length ||
        output.questions.some(
          (q, i) =>
            q.stem !== mothers[i].stem ||
            q.answer !== mothers[i].answer ||
            JSON.stringify(q.options) !== JSON.stringify(mothers[i].options),
        )
      )
        throw Error("AI 修改了原題或答案，未入庫");
      const paper = validateQuiz({
          ...data,
          questions: output.questions.map((q) => ({
            ...q,
            id: randomUUID(),
            reviewed: false,
          })),
        }),
        paperId = randomUUID(),
        record = {
          ...paper,
          id: paperId,
          familyId: paperId,
          status: "draft",
          sourceKind: "assessment",
          source: {
            publisher: v.publisher,
            url: v.url,
            rawHash: v.rawHash,
            textHash: v.textHash,
            resourceId: id,
            title: v.title,
            year: v.year,
            grade: v.grade,
            term: v.term,
          },
          generatedAt: new Date().toISOString(),
          aiCheck: output.aiCheck,
        };
      await store.create(`quiz-papers/${paperId}.json`, record);
      await store.update(
        name,
        {
          ...v,
          draftId: paperId,
          lastDraftError: null,
          draftCreatedAt: new Date().toISOString(),
        },
        old.generation,
      );
      return { draftId: paperId, count: mothers.length };
    } catch (e) {
      if (match[2] === "draft") {
        try {
          const latest = await store.get(name);
          await store.update(
            name,
            { ...latest.value, lastDraftError: e.message },
            latest.generation,
          );
        } catch {
          /* Preserve the original failure if recording it also fails. */
        }
      }
      throw e;
    } finally {
      busy.delete(id);
    }
  };
}
