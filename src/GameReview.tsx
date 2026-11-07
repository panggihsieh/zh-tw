import { useEffect, useState } from "react";
import { gameRequest } from "./gameApi";
import type { GameSubmission } from "./writingGame";
import "./games.css";
export default function GameReview({ teacher = false, request = gameRequest }: { teacher?: boolean; request?: typeof gameRequest }) {
  const [items, setItems] = useState<GameSubmission[]>([]),
    [cursor, setCursor] = useState<string | null>(null),
    [work, setWork] = useState<GameSubmission | null>(null),
    [score, setScore] = useState(""),
    [comment, setComment] = useState(""),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false),
    [query, setQuery] = useState("");
  async function load(next?: string) {
    setBusy(true);
    setMessage("讀取作品…");
    try {
      const r = await request(
        `/submissions${next ? "?cursor=" + encodeURIComponent(next) : ""}`,
      );
      setItems((prev) => (next ? [...prev, ...r.items] : r.items));
      setCursor(r.nextCursor);
      setMessage("");
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    void load();
  }, []);
  async function open(item: GameSubmission) {
    setBusy(true);
    setMessage("讀取作品圖片…");
    try {
      const r = await request(
        `/submissions/${encodeURIComponent(item.uid!)}/${item.id}`,
      );
      setWork(r);
      setScore(r.grade ? String(r.grade.score) : "");
      setComment(r.grade?.comment || "");
      setMessage("");
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section
      className="game-review"
      aria-label={teacher ? "書寫作品評分" : "我的繳交紀錄"}
    >
      <div className="game-row">
        <h2>{teacher ? "書寫作品評分" : "我的繳交紀錄"}</h2>
        <button
          className="secondary"
          disabled={busy}
          onClick={() => void load()}
        >
          重新整理
        </button>
      </div>
      <label>
        搜尋已載入的學生／課文
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="姓名、信箱或課名"
        />
      </label>
      <p role="status">{message}</p>
      {!items.length && !busy && !message && <p>尚無繳交作品。</p>}
      <div className="game-submissions">
        {items
          .filter((i) =>
            `${i.displayName} ${i.email} ${i.lesson}`.includes(query),
          )
          .map((i) => (
            <button
              key={`${i.uid}/${i.id}`}
              disabled={busy}
              onClick={() => void open(i)}
              className="game-submission"
            >
              <strong>{i.lesson}</strong>
              <span>
                {i.displayName} · {i.characters.join("、")}
              </span>
              <span>
                {new Date(i.submittedAt!).toLocaleString("zh-TW")} ·{" "}
                {i.grade ? `${i.grade.score} 分` : "待老師評分"}
              </span>
            </button>
          ))}
      </div>
      {cursor && (
        <button
          className="secondary"
          disabled={busy}
          onClick={() => void load(cursor)}
        >
          載入更多
        </button>
      )}
      {work && (
        <article className="game-work-detail">
          <div className="game-row">
            <h3>
              {work.displayName} · {work.lesson}
            </h3>
            <button className="secondary" onClick={() => setWork(null)}>
              收合作品
            </button>
          </div>
          <p>
            藍色為檢核符合筆畫，橘色為需重試筆畫。系統檢核是輔助，書寫品質由老師判斷。
          </p>
          <img src={work.image} alt={`${work.displayName}的原始書寫作品`} />
          <a
            className="secondary"
            download={`書寫作品-${work.id}.png`}
            href={work.image}
          >
            下載作品圖片
          </a>
          <details>
            <summary>查看逐筆紀錄</summary>
            {work.characters.map((c) => (
              <div key={c}>
                <h4>
                  「{c}」 · 共 {work.works[c].expected} 筆
                </h4>
                <p>
                  {work.works[c].traces
                    .map(
                      (t, i) =>
                        `${i + 1}. 第 ${t.stroke + 1} 筆 ${t.correct ? "符合" : "重試"}`,
                    )
                    .join("；")}
                </p>
              </div>
            ))}
          </details>
          {teacher ? (
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setBusy(true);
                setMessage("儲存評分…");
                try {
                  const r = await request(
                    `/submissions/${encodeURIComponent(work.uid!)}/${work.id}`,
                    { score: Number(score), comment },
                  );
                  setWork({ ...work, grade: r.grade });
                  setItems((prev) =>
                    prev.map((i) =>
                      i.uid === work.uid && i.id === work.id
                        ? { ...i, grade: r.grade }
                        : i,
                    ),
                  );
                  setMessage("評分已儲存，學生可查看。");
                } catch (e) {
                  setMessage((e as Error).message);
                } finally {
                  setBusy(false);
                }
              }}
            >
              <label>
                分數（0–100）
                <input
                  type="number"
                  required
                  min="0"
                  max="100"
                  step="1"
                  value={score}
                  onChange={(e) => setScore(e.target.value)}
                />
              </label>
              <label>
                老師評語
                <textarea
                  maxLength={1000}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                />
              </label>
              <button className="primary" disabled={busy}>
                儲存評分
              </button>
            </form>
          ) : (
            <p>
              {work.grade
                ? `老師評分：${work.grade.score} 分。${work.grade.comment}`
                : "已繳交，等待老師評分。"}
            </p>
          )}
        </article>
      )}
    </section>
  );
}
