import { useEffect, useRef, useState } from "react";
import { quizRequest } from "./quizApi";
import {
  draftBooks,
  bookResources,
  canCreateDraft,
  resourceDraftStatus,
  draftReviewUrl,
  academicYears,
  type PublisherResource as Resource,
} from "./publisherSelection";
interface Discovery {
  publisher: string;
  analysis: string;
  message: string;
  checkedAt: string;
}
interface ReferenceSource {
  id: string;
  name: string;
  category: string;
  url: string;
  status?: "updated" | "unchanged";
  message?: string;
  checkedAt?: string;
}
export default function PublisherSync({
  request = quizRequest,
  updateButtonId,
}: { request?: typeof quizRequest; updateButtonId?: string } = {}) {
  const [items, setItems] = useState<Resource[]>([]),
    [reports, setReports] = useState<Discovery[]>([]),
    [references, setReferences] = useState<ReferenceSource[]>([]),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [bookKey, setBookKey] = useState(""),
    [lessonId, setLessonId] = useState(""),
    [academicYear, setAcademicYear] = useState("");
  const years = academicYears(items);
  const selectedYear = years.includes(academicYear) ? academicYear : years[0] || "";
  const yearItems = items.filter((item) => !selectedYear || item.year === selectedYear);
  const books = draftBooks(items);
  const selectedBookKey = books.some((b) => b.key === bookKey)
    ? bookKey
    : books[0]?.key || "";
  const lessons = bookResources(items, selectedBookKey);
  const selectedLessonId =
    lessonId === "all" || lessons.some((r) => r.id === lessonId)
      ? lessonId
      : lessons[0]?.id || "";
  const selectedResources =
    selectedLessonId === "all"
      ? lessons
      : lessons.filter((r) => r.id === selectedLessonId);
  const draftTargets = selectedResources.filter(canCreateDraft);
  const stop = useRef(false);
  async function load() {
    const [a, b, c] = await Promise.all([
      request<{ items: Resource[] }>("/resources"),
      request<{ items: Discovery[] }>("/resources/discoveries"),
      request<{ items: ReferenceSource[] }>("/references"),
    ]);
    setItems(a.items);
    setReports(b.items);
    setReferences(c.items);
  }
  useEffect(() => {
    void load().catch((e) => setMessage(e.message));
    return () => {
      stop.current = true;
    };
  }, []);
  async function batch(kind: "discover" | "update" | "draft") {
    setBusy(true);
    stop.current = false;
    const targets =
      kind === "discover"
        ? ["南一", "康軒", "翰林"]
        : kind === "draft"
          ? draftTargets
          : yearItems;
    let ok = 0,
      failed = 0,
      skipped = 0,
      updated = 0;
    for (let i = 0; i < targets.length && !stop.current; i++) {
      const x = targets[i];
      setMessage(
        `${kind === "discover" ? "AI盤點" : kind === "update" ? "下載與比對" : "AI製作母題"} ${i + 1}/${targets.length}：${typeof x === "string" ? x : x.title}`,
      );
      try {
        const result = await request<{
          status?: string;
          lastError?: string;
        }>(
          typeof x === "string"
            ? "/resources/discover"
            : `/resources/${x.id}/${kind}`,
          typeof x === "string" ? { publisher: x } : {},
        );
        if (result.status === "needs_review")
          throw Error(result.lastError || "教材待核對");
        if (kind === "update" && result.status === "unchanged") skipped++;
        if (kind === "update" && result.status === "updated") updated++;
        ok++;
      } catch (e) {
        failed++;
        setMessage(`${(e as Error).message}；本課保留待檢查，繼續下一課`);
      }
      await load().catch(() => {});
    }
    await load().catch(() => {});
    setMessage(
      `本批${stop.current ? "已停止" : "已完成"}：處理成功 ${ok}，內容異動 ${updated}，重複跳過 ${skipped}，失敗 ${failed}。下載／辨識失敗不代表課文未變。`,
    );
    setBusy(false);
  }
  async function updateAll() {
    await batch("discover");
    if (!stop.current) await batch("update");
  }
  return (
    <details className="publisher-sync" open>
      <summary>
        <strong>三家出版社 AI 網路國語教材抓取更新</strong>
      </summary>
      <p>
        按下即時執行：官方入口下載與 AI 盤點 → 已登記教材下載 →
        內容雜湊比對。只有取得相同課文全文才可判定課文未變；題卷未變與課文未變分開顯示。
      </p>
      <p>
        AI
        盤點與母題製作使用已儲存的模型，會傳送官方頁面／題目資料並可能計費。登入限定資源須先在官方網站確認下載入口；本站不接收出版社帳密或瀏覽器權杖。
      </p>
      <div className="quiz-actions">
        <label>
          更新學年度
          <select
            value={selectedYear}
            disabled={busy || !years.length}
            onChange={(event) => setAcademicYear(event.target.value)}
          >
            {!years.length && <option value="">尚無已登記教材</option>}
            {years.map((year) => (
              <option key={year} value={year}>
                {year.replace("_1", " 學年度上學期").replace("_2", " 學年度下學期")}
              </option>
            ))}
          </select>
        </label>
        <button
          className="primary"
          disabled={busy}
          id={updateButtonId}
          onClick={() => void updateAll()}
        >
          AI 即時抓取更新三家國語教材
        </button>
        <button
          className="primary"
          disabled={busy}
          onClick={() => void batch("discover")}
        >
          即時 AI 盤點三家官方資源
        </button>
        <button
          className="secondary"
          disabled={busy || !items.length}
          onClick={() => void batch("update")}
        >
          下載／比對所選學年度教材（{yearItems.length}）
        </button>
        <button
          className="secondary"
          disabled={busy}
          onClick={() => void load().catch((e) => setMessage(e.message))}
        >
          重新讀取更新狀態
        </button>
        {busy && (
          <button
            className="secondary"
            onClick={() => {
              stop.current = true;
              setMessage("本課完成後停止，不會啟動下一課。");
            }}
          >
            本課完成後停止
          </button>
        )}
      </div>
      <section className="publisher-draft-selection" aria-label="固定資料來源狀態">
        <h2>固定國語與經典資料來源</h2>
        <p>
          只檢查官方入口內容指紋；相同即跳過。入口異動不會直接覆蓋詞庫或經典，仍須核對下載版本與授權。
        </p>
        <button
          className="secondary"
          disabled={busy || !references.length}
          onClick={() =>
            void (async () => {
              setBusy(true);
              let unchanged = 0,
                changed = 0,
                failed = 0;
              for (const source of references) {
                setMessage(`檢查固定來源：${source.name}`);
                try {
                  const result = await request<ReferenceSource>("/references/check", {
                    id: source.id,
                  });
                  result.status === "unchanged" ? unchanged++ : changed++;
                } catch {
                  failed++;
                }
              }
              await load().catch(() => {});
              setMessage(
                `固定來源檢查完成：入口異動 ${changed}，重複跳過 ${unchanged}，失敗 ${failed}。`,
              );
              setBusy(false);
            })()
          }
        >
          檢查固定資料來源（{references.length}）
        </button>
        <div className="publisher-selected-resources">
          {references.map((source) => (
            <article key={source.id}>
              <strong>{source.name}</strong>
              <p>
                {source.category} · {source.message || "尚未檢查"}
              </p>
              <a href={source.url} target="_blank" rel="noreferrer">
                官方來源 ↗
              </a>
            </article>
          ))}
        </div>
      </section>
      <label>
        登記已確認的官方來源清單（JSON）
        <input
          type="file"
          accept="application/json,.json"
          disabled={busy}
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            setBusy(true);
            try {
              const json = JSON.parse(await file.text());
              const r = await request<{ registered: number }>(
                "/resources/register",
                json,
              );
              await load();
              setMessage(`新登記 ${r.registered} 個來源。`);
            } catch (err) {
              setMessage((err as Error).message);
            } finally {
              setBusy(false);
              e.target.value = "";
            }
          }}
        />
      </label>
      <section
        className="publisher-draft-selection"
        aria-label="按年段與課別製作母題"
      >
        <h2>南一待審母題草稿</h2>
        <div className="quiz-grid">
          <label>
            年段／學期
            <select
              value={selectedBookKey}
              disabled={busy || !books.length}
              onChange={(e) => {
                setBookKey(e.target.value);
                setLessonId("");
              }}
            >
              {!books.length && (
                <option value="">尚無已登記的南一五、六年級來源</option>
              )}
              {books.map((b) => (
                <option key={b.key} value={b.key}>
                  {b.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            課別
            <select
              value={selectedLessonId}
              disabled={busy || !lessons.length}
              onChange={(e) => setLessonId(e.target.value)}
            >
              {!lessons.length && <option value="">本冊尚無課別</option>}
              {lessons.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.title.replace(/\.pdf$/i, "")}
                  {r.draftId ? " · 已有草稿" : ""}
                </option>
              ))}
              {lessons.length > 0 && (
                <option value="all">本冊全部課別（{lessons.length} 課）</option>
              )}
            </select>
          </label>
        </div>
        <p>
          所選 {selectedResources.length} 課 · 可建立 {draftTargets.length} 課 ·
          已有草稿 {selectedResources.filter((r) => r.draftId).length}{" "}
          課。已有草稿會保留，不重複製作。
        </p>
        <button
          className="primary"
          disabled={busy || !draftTargets.length}
          onClick={() => void batch("draft")}
        >
          AI 建立所選課別母題草稿（{draftTargets.length} 課）
        </button>
        <div className="publisher-selected-resources">
          {selectedResources.map((r) => (
            <article key={r.id}>
              <strong>{r.title.replace(/\.pdf$/i, "")}</strong>
              <p>{resourceDraftStatus(r)}</p>
              {r.lastDraftError && <p>待確認：{r.lastDraftError}</p>}
              {r.draftId && (
                <a
                  className="secondary publisher-review-link"
                  href={draftReviewUrl(r.draftId)}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  另開視窗檢視查核 ↗
                </a>
              )}
            </article>
          ))}
        </div>
      </section>
      <p role="status">{message}</p>
      <p>
        已登記 {items.length} 份 · 已取得{" "}
        {items.filter((x) => x.rawHash && x.status !== "needs_review").length}{" "}
        份 · 待審草稿 {items.filter((x) => x.draftId).length} 課 · 待確認{" "}
        {items.filter((x) => x.lastError || x.lastDraftError).length} 課 ·
        尚無母題草稿{" "}
        {items.filter((x) => x.publisher === "南一" && !x.draftId).length} 課
      </p>
      {reports.map((r) => (
        <details key={r.publisher}>
          <summary>
            {r.publisher} AI 即時盤點 ·{" "}
            {new Date(r.checkedAt).toLocaleString("zh-TW")}
          </summary>
          <p style={{ whiteSpace: "pre-wrap" }}>{r.analysis}</p>
          <p>{r.message}</p>
        </details>
      ))}
      <div className="quiz-paper-list">
        {["南一", "康軒", "翰林"].map((p) => (
          <details key={p}>
            <summary>
              {p}：{items.filter((x) => x.publisher === p).length} 個已確認來源
            </summary>
            {items
              .filter((x) => x.publisher === p)
              .map((x) => (
                <article key={x.id}>
                  <strong>{x.title}</strong>
                  <p>
                    {x.year} · {x.status} · {x.courseComparison || "待下載核對"}
                  </p>
                  {x.lastError && <p>{x.lastError}</p>}
                  {!x.draftId && <p>尚無母題草稿，待製作或核對。</p>}
                  {x.lastDraftError && <p>母題待確認：{x.lastDraftError}</p>}
                  {x.draftId && (
                    <a
                      className="secondary publisher-review-link"
                      href={draftReviewUrl(x.draftId)}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      另開視窗檢視查核 ↗
                    </a>
                  )}
                  <a href={x.url} target="_blank" rel="noreferrer">
                    官方原檔 ↗
                  </a>
                </article>
              ))}
          </details>
        ))}
      </div>
    </details>
  );
}
