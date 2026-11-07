import { useEffect, useRef, useState, type PointerEvent } from "react";
import { openDB } from "idb";
import type { User } from "firebase/auth";
import {
  judgeStroke,
  sample,
  outlinePath,
  tracePath,
  snapshot,
  workComplete,
  type GameDraft,
  type Point,
} from "./writingGame";
import { submitGame } from "./gameApi";
import { strokeFrameUrl } from "./strokeSource";
interface Stroke {
  outline: any[];
  track: Point[];
}
const drafts = () =>
  openDB("hanzi-game-writing", 1, {
    upgrade(db) {
      db.createObjectStore("drafts");
    },
  });
export default function WritingPractice({
  user,
  characters,
  lesson,
  onBack,
  submit = submitGame,
}: {
  user: User;
  characters: string[];
  lesson: string;
  onBack: () => void;
  submit?: typeof submitGame;
}) {
  const key = JSON.stringify([user.uid, lesson, characters]);
  const [draft, setDraft] = useState<GameDraft | null>(null),
    [index, setIndex] = useState(0),
    [strokes, setStrokes] = useState<Stroke[] | null>(null),
    [error, setError] = useState(""),
    [status, setStatus] = useState(""),
    [guided, setGuided] = useState(true),
    [hint, setHint] = useState(false),
    [official, setOfficial] = useState(false),
    [preview, setPreview] = useState(""),
    [busy, setBusy] = useState(false),
    [sent, setSent] = useState(false),
    [live, setLive] = useState<Point[]>([]);
  const pen = useRef<{ id: number; points: Point[] } | null>(null),
    queue = useRef(Promise.resolve()),
    active = useRef(true),
    loaded = useRef("");
  const character = characters[index],
    work = draft?.works[character],
    accepted = work?.traces.filter((t) => t.correct).length || 0;
  useEffect(() => {
    active.current = true;
    let current = true;
    drafts()
      .then((db) => db.get("drafts", key))
      .then((value) => {
        if (current)
          setDraft(
            value || {
              id: crypto.randomUUID(),
              lesson,
              characters,
              works: {},
              updatedAt: new Date().toISOString(),
            },
          );
      })
      .catch(() => {
        if (current) {
          setError("無法讀取草稿，請允許瀏覽器儲存後重新整理。");
        }
      });
    return () => {
      current = false;
      active.current = false;
    };
  }, [key]);
  function change(value: GameDraft) {
    if (sent) value = {...value,id:crypto.randomUUID()};
    setDraft(value);
    setPreview("");
    setSent(false);
    queue.current = queue.current
      .catch(() => {})
      .then(async () => {
        await (await drafts()).put("drafts", value, key);
      })
      .catch(() => {
        if (active.current) setError("本機草稿儲存失敗，請勿關閉頁面。");
      });
  }
  useEffect(() => {
    const abort = new AbortController();
    loaded.current = "";
    setStrokes(null);
    setError("");
    setHint(false);
    setOfficial(false);
    pen.current = null;
    setLive([]);
    fetch(`/game-strokes/${character.codePointAt(0)!.toString(16)}.json`, {
      signal: abort.signal,
    })
      .then(async (r) => {
        if (!r.ok || !r.headers.get("Content-Type")?.includes("json"))
          throw Error("這個字尚無可用筆順資料；請選其他生字，或返回分批練習。");
        return r.json();
      })
      .then((value) => {
        if (!abort.signal.aborted) {
          setStrokes(value);
          loaded.current = character;
          setStatus("依照筆順開始寫字，字跡會留在格子中。");
        }
      })
      .catch((e) => {
        if (!abort.signal.aborted) setError(e.message);
      });
    return () => abort.abort();
  }, [character]);
  useEffect(() => {
    function prevent(e: BeforeUnloadEvent) {
      if (draft && Object.values(draft.works).some(w=>w.traces.length) && !sent) {
        e.preventDefault();
        e.returnValue = "";
      }
    }
    window.addEventListener("beforeunload", prevent);
    return () => window.removeEventListener("beforeunload", prevent);
  }, [draft, sent]);
  function point(e: PointerEvent<SVGSVGElement>) {
    const r = e.currentTarget.getBoundingClientRect();
    return {
      x: Math.round(
        Math.max(0, Math.min(1000, ((e.clientX - r.left) / r.width) * 1000)),
      ),
      y: Math.round(
        Math.max(0, Math.min(1000, ((e.clientY - r.top) / r.height) * 1000)),
      ),
    };
  }
  function finish(e: PointerEvent<SVGSVGElement>, cancel = false) {
    if (!pen.current || pen.current.id !== e.pointerId) return;
    const points = sample([...pen.current.points, point(e)]);
    pen.current = null;
    setLive([]);
    if (cancel || !draft || !strokes || loaded.current !== character) return;
    const reference = strokes[accepted]?.track.map((p) => ({
      x: (p.x / 2048) * 1000,
      y: (p.y / 2048) * 1000,
    }));
    if (!reference) return;
    const correct = judgeStroke(points, reference);
    const next = {
      character,
      expected: strokes.length,
      traces: [...(work?.traces || []), { points, stroke: accepted, correct }],
      complete: false,
    };
    next.complete = workComplete(next);
    change({
      ...draft,
      works: { ...draft.works, [character]: next },
      updatedAt: new Date().toISOString(),
    });
    setHint(!correct);
    setStatus(
      correct
        ? next.complete
          ? "這個字完成了！保留你的字跡，可以練下一字。"
          : `第 ${accepted + 1} 筆符合，請寫第 ${accepted + 2} 筆。`
        : `第 ${accepted + 1} 筆需要重試：注意起點、方向與形狀。`,
    );
  }
  const complete = !!draft && characters.every((c) => draft.works[c]?.complete);
  if (!draft) return <p role="status">{error || "恢復本機草稿…"}</p>;
  return (
    <section className="writing-practice">
      <div className="game-row">
        <div>
          <p className="eyebrow">書寫小達人</p>
          <h1>{lesson}</h1>
        </div>
        <button className="secondary" disabled={busy} onClick={onBack}>
          返回遊戲專區
        </button>
      </div>
      <nav className="game-character-nav" aria-label="練習生字">
        {characters.map((c, i) => (
          <button
            key={c}
            className={i === index ? "active" : ""}
            aria-current={i === index ? "step" : undefined}
            disabled={busy}
            onClick={() => {
              pen.current = null;
              setLive([]);
              setIndex(i);
            }}
          >
            {c}
            <span>{draft.works[c]?.complete ? "✓" : `${i + 1}`}</span>
          </button>
        ))}
      </nav>
      <div className="game-progress">
        <span>
          完成 {characters.filter((c) => draft.works[c]?.complete).length} /{" "}
          {characters.length} 字
        </span>
        <progress
          max={characters.length}
          value={characters.filter((c) => draft.works[c]?.complete).length}
        />
      </div>
      <div className="writing-layout">
        <div>
          <div className="game-row">
            <h2>
              「{character}」
              <small>
                {strokes ? `${accepted} / ${strokes.length} 筆` : ""}
              </small>
            </h2>
            <label className="game-toggle">
              <input
                type="checkbox"
                checked={guided}
                onChange={(e) => setGuided(e.target.checked)}
              />
              描紅輪廓
            </label>
          </div>
          <svg
            className="game-writing-pad"
            viewBox="0 0 1000 1000"
            aria-label={`書寫區 ${character}`}
            onPointerDown={(e) => {
              if (
                !strokes ||
                loaded.current !== character ||
                busy ||
                work?.complete ||
                pen.current ||
                e.button !== 0
              )
                return;
              if ((work?.traces.length || 0) >= 100) {
                setError("此字已達 100 次筆畫紀錄，請清除本字再練習。");
                return;
              }
              e.preventDefault();
              e.currentTarget.setPointerCapture(e.pointerId);
              pen.current = { id: e.pointerId, points: [point(e)] };
              setLive([point(e)]);
            }}
            onPointerMove={(e) => {
              if (pen.current?.id === e.pointerId) {
                pen.current.points.push(point(e));
                if (pen.current.points.length > 1000)
                  pen.current.points = sample(pen.current.points, 300);
                setLive([...pen.current.points]);
              }
            }}
            onPointerUp={(e) => finish(e)}
            onPointerCancel={(e) => finish(e, true)}
            onLostPointerCapture={() => {
              pen.current = null;
              setLive([]);
            }}
          >
            <rect width="1000" height="1000" fill="#fffdf8" />
            <path
              d="M500 0V1000M0 500H1000M0 0L1000 1000M1000 0L0 1000"
              stroke="#dce4df"
              strokeWidth="2"
              strokeDasharray="12 12"
            />
            {guided &&
              strokes?.map((s, i) => (
                <path
                  key={i}
                  d={outlinePath(s.outline)}
                  transform="scale(.48828125)"
                  fill="#e3e8df"
                />
              ))}
            {hint && strokes?.[accepted] && (
              <path
                d={tracePath(
                  strokes[accepted].track.map((p) => ({
                    x: (p.x / 2048) * 1000,
                    y: (p.y / 2048) * 1000,
                  })),
                )}
                stroke="#498d72"
                strokeWidth="12"
                strokeDasharray="18 15"
                fill="none"
              />
            )}
            {work?.traces.map((t, i) => (
              <path
                key={i}
                d={tracePath(t.points)}
                stroke={t.correct ? "#175d9a" : "#c35c30"}
                strokeWidth="12"
                opacity={t.correct ? 1 : 0.65}
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
            ))}
            <path
              d={tracePath(live)}
              stroke="#175d9a"
              strokeWidth="12"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <p className="game-ink-legend">
            ● 藍色：符合　<span>● 橘色：重試</span> · 保留自己的字跡
          </p>
        </div>
        <aside className="game-writing-tools">
          <p className="game-feedback" role="status" aria-live="polite">
            {status}
          </p>
          {error && (
            <p role="alert" className="alert error">
              {error}
            </p>
          )}
          <button
            className="secondary"
            disabled={!strokes || !!work?.complete || busy}
            onClick={() => setHint((v) => !v)}
          >
            {hint ? "收合" : "顯示"}下一筆提示
          </button>
          <button
            className="secondary"
            disabled={!work?.traces.length || busy}
            onClick={() => {
              const next = {
                ...work!,
                traces: work!.traces.slice(0, -1),
                complete: false,
              };
              change({
                ...draft,
                works: { ...draft.works, [character]: next },
              });
              setStatus("已退回上一筆。");
            }}
          >
            退回上一筆
          </button>
          <button
            className="secondary"
            disabled={!work?.traces.length || busy}
            onClick={() => {
              if (
                !window.confirm(
                  `清除「${character}」的字跡重新練習？其他字會保留。`,
                )
              )
                return;
              const works = { ...draft.works };
              delete works[character];
              change({ ...draft, works });
              setStatus("本字已清除，請從第一筆開始。");
            }}
          >
            清除本字
          </button>
          {index < characters.length - 1 && (
            <button
              className="primary"
              disabled={busy}
              onClick={() => setIndex(index + 1)}
            >
              下一個生字 →
            </button>
          )}
          <button className="secondary" onClick={() => setOfficial((v) => !v)}>
            {official ? "收合" : "觀看"}教育部官方示範
          </button>
          {official && strokeFrameUrl(character) && (
            <iframe
              title={`教育部${character}筆順示範`}
              src={strokeFrameUrl(character)!}
              className="game-official-frame"
            />
          )}
          <p className="game-source">
            檢核依據：教育部字形來源的 g0v
            筆順資料。位置與方向判定有容差，非教育部認證評分；字跡與作品由老師評閱。
            <a
              href="/game-strokes/SOURCE-LICENSE.md"
              target="_blank"
              rel="noreferrer"
            >
              資料來源說明
            </a>
          </p>
        </aside>
      </div>
      <section className="game-submit">
        <h2>把今天的練習交給老師</h2>
        <p>預覽會保存所有生字的原始筆跡與重試紀錄；完成全部生字後即可繳交。</p>
        <div className="game-row">
          <button
            className="secondary"
            disabled={!Object.keys(draft.works).length || busy}
            onClick={() => {
              try {
                setPreview(snapshot(draft));
              } catch (e) {
                setError((e as Error).message);
              }
            }}
          >
            預覽作品圖片
          </button>
          <button
            className="primary"
            disabled={!complete || busy || sent}
            onClick={async () => {
              setBusy(true);
              setError("");
              try {
                await queue.current;
                const image = snapshot(draft);
                setPreview(image);
                await submit({
                  ...draft,
                  image,
                  sourceRevision: "26f12d65063cc97d2773b7777232277bfca5f563",
                });
                setSent(true);
                setStatus("作品已成功繳交！可到「我的作品」查看老師評分。");
                await (await drafts()).delete("drafts", key);
              } catch (e) {
                setError((e as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy ? "繳交中…" : sent ? "已成功繳交" : "繳交給老師"}
          </button>
        </div>
        {!complete && (
          <p>
            尚有 {characters.filter((c) => !draft.works[c]?.complete).length}{" "}
            個字未完成。
          </p>
        )}
        {preview && (
          <img className="game-snapshot" src={preview} alt="本次書寫作品預覽" />
        )}
      </section>
    </section>
  );
}
