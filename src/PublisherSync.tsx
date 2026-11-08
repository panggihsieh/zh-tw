import { useEffect, useRef, useState } from "react";
import { quizRequest } from "./quizApi";
interface Resource {
  id: string;
  publisher: string;
  grade: number;
  term: string;
  year: string;
  title: string;
  url: string;
  kind: string;
  status: string;
  courseComparison?: string;
  lastError?: string;
  lastDraftError?: string;
  draftId?: string;
  rawHash?: string;
}
interface Discovery {
  publisher: string;
  analysis: string;
  message: string;
  checkedAt: string;
}
export default function PublisherSync({
  onDraft,
}: {
  onDraft: (id: string) => void;
}) {
  const [items, setItems] = useState<Resource[]>([]),
    [reports, setReports] = useState<Discovery[]>([]),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [limit, setLimit] = useState("1");
  const stop = useRef(false);
  async function load() {
    const [a, b] = await Promise.all([
      quizRequest<{ items: Resource[] }>("/resources"),
      quizRequest<{ items: Discovery[] }>("/resources/discoveries"),
    ]);
    setItems(a.items);
    setReports(b.items);
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
        : items
            .filter(
              (x) =>
                kind === "update" ||
                (x.publisher === "南一" &&
                  [5, 6].includes(x.grade) &&
                  x.rawHash &&
                  !x.draftId),
            )
            .slice(0, kind === "draft" && limit !== "all" ? +limit : undefined);
    let ok = 0,
      failed = 0;
    for (let i = 0; i < targets.length && !stop.current; i++) {
      const x = targets[i];
      setMessage(
        `${kind === "discover" ? "AI盤點" : kind === "update" ? "下載與比對" : "AI製作母題"} ${i + 1}/${targets.length}：${typeof x === "string" ? x : x.title}`,
      );
      try {
        const result = await quizRequest<{
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
        ok++;
      } catch (e) {
        failed++;
        setMessage(`${(e as Error).message}；本課保留待檢查，繼續下一課`);
      }
      await load().catch(() => {});
    }
    await load().catch(() => {});
    setMessage(
      `本批${stop.current ? "已停止" : "已完成"}：處理成功 ${ok}，失敗 ${failed}。下載／辨識失敗不代表課文未變。`,
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
        <button
          className="primary"
          disabled={busy}
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
          下載／比對已登記教材（{items.length}）
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
              const r = await quizRequest<{ registered: number }>(
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
      <label>
        南一高年級待審母題製作批次
        <select
          value={limit}
          disabled={busy}
          onChange={(e) => setLimit(e.target.value)}
        >
          <option value="1">先做1課讓老師檢查</option>
          <option value="5">5課</option>
          <option value="all">所有已下載的南一五六年級</option>
        </select>
      </label>
      <button
        className="primary"
        disabled={
          busy ||
          !items.some((x) => x.publisher === "南一" && x.rawHash && !x.draftId)
        }
        onClick={() => void batch("draft")}
      >
        AI 建立南一高年級母題草稿
      </button>
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
                    <button
                      className="secondary"
                      onClick={() => onDraft(x.draftId!)}
                    >
                      檢查本課母題草稿
                    </button>
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
