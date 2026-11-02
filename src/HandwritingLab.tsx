import { useEffect, useRef, useState } from "react";
import HanziWriter, { type CharacterJson } from "hanzi-writer";
import BackendCard from "./BackendCard";
import {
  lessonCharacters,
  listCourses,
  listPractice,
  saveCourse,
  savePractice,
  type CourseRecord,
  type PracticeRecord,
} from "./handwritingStore";
import "./handwriting.css";

interface Book {
  publisher: string;
  grade: number;
  term: string;
  year: string | null;
  status: string;
  characters: string;
  mapped: number;
  missing: string;
  lessons: { title: string; source: string; characters: string }[];
}
interface Catalog {
  dataVersion: string;
  characters: { character: string; file: string; strokes: number }[];
  curriculum: Book[];
}
export default function HandwritingLab({
  mode,
  onPractice,
}: {
  mode: "test" | "database";
  onPractice: () => void;
}) {
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [loadError, setLoadError] = useState("");
  const [character, setCharacter] = useState("一");
  const [input, setInput] = useState("一");
  const [guided, setGuided] = useState(true);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("選擇生字後，按「開始手寫檢核」。");
  const [records, setRecords] = useState<PracticeRecord[]>([]);
  const [courses, setCourses] = useState<CourseRecord[]>([]);
  const [publisher, setPublisher] = useState("康軒");
  const [grade, setGrade] = useState(5);
  const [term, setTerm] = useState("上");
  const [lesson, setLesson] = useState("");
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [query, setQuery] = useState("");
  const [databaseMessage, setDatabaseMessage] = useState("");
  const host = useRef<HTMLDivElement>(null);
  const writer = useRef<HanziWriter | null>(null);
  const run = useRef(0);
  const demoStroke = useRef(0);
  const meta = catalog?.characters.find((c) => c.character === character);
  const book = catalog?.curriculum.find(
    (b) => b.publisher === publisher && b.grade === grade && b.term === term,
  );
  const localCourses = courses.filter(
    (c) => c.publisher === publisher && c.grade === grade && c.term === term,
  );
  const availableLessons = [
    ...(book?.lessons || []),
    ...localCourses.map((c) => ({
      title: c.title,
      characters: c.characters,
      source: "",
    })),
  ];
  const selected = availableLessons.find((l) => l.title === lesson);

  useEffect(() => {
    const abort = new AbortController();
    fetch(`${import.meta.env.BASE_URL}handwriting-data/catalog.json`, {
      signal: abort.signal,
    })
      .then((r) => {
        if (!r.ok) throw Error("筆順資料庫載入失敗。");
        return r.json();
      })
      .then((value) => {
        if (!abort.signal.aborted) setCatalog(value);
      })
      .catch((e) => {
        if (!abort.signal.aborted) setLoadError(String(e.message));
      });
    Promise.all([listPractice(), listCourses()])
      .then(([r, c]) => {
        if (!abort.signal.aborted) {
          setRecords(r);
          setCourses(c);
        }
      })
      .catch(() => {
        if (!abort.signal.aborted)
          setDatabaseMessage("無法讀取本機紀錄，請確認瀏覽器允許 IndexedDB。");
      });
    return () => abort.abort();
  }, []);
  useEffect(() => {
    setLesson("");
  }, [publisher, grade, term]);
  useEffect(() => {
    if (mode !== "test" || !host.current || !catalog) return;
    const node = host.current;
    const abort = new AbortController();
    let active = true;
    run.current++;
    demoStroke.current = 0;
    setReady(false);
    setBusy(false);
    setMessage("正在載入筆順資料…");
    node.replaceChildren();
    if (!meta) {
      setMessage(`尚未收錄「${character}」的測試筆順。`);
      return;
    }
    const size = Math.min(420, node.clientWidth || 320);
    const instance = HanziWriter.create(node, character, {
      width: size,
      height: size,
      padding: 24,
      showCharacter: false,
      showOutline: guided,
      strokeColor: "#285d50",
      drawingColor: "#2369b7",
      outlineColor: "#d9e3e9",
      highlightColor: "#cd733d",
      strokeAnimationSpeed: 1,
      delayBetweenStrokes: 280,
      charDataLoader: async () => {
        const response = await fetch(
          `${import.meta.env.BASE_URL}handwriting-data/${meta.file}`,
          { signal: abort.signal },
        );
        if (!response.ok) throw Error("字形檔案載入失敗");
        return response.json() as Promise<CharacterJson>;
      },
      onLoadCharDataSuccess: () => {
        if (active) {
          setReady(true);
          setMessage(
            `「${character}」共 ${meta.strokes} 筆，可開始檢核或觀看示範。`,
          );
        }
      },
      onLoadCharDataError: () => {
        if (active) setMessage("筆順資料載入失敗，請重新選字或重新整理。");
      },
    });
    writer.current = instance;
    const observer = new ResizeObserver(() =>
      instance.updateDimensions({
        width: Math.min(420, node.clientWidth),
        height: Math.min(420, node.clientWidth),
        padding: 24,
      }),
    );
    observer.observe(node);
    return () => {
      active = false;
      run.current++;
      abort.abort();
      observer.disconnect();
      instance.cancelQuiz();
      writer.current = null;
      node.replaceChildren();
    };
  }, [mode, character, guided, catalog]);

  function pick(c: string) {
    setCharacter(c);
    setInput(c);
  }
  function reset() {
    run.current++;
    writer.current?.cancelQuiz();
    void writer.current?.hideCharacter();
    demoStroke.current = 0;
    setBusy(false);
    setMessage("已清除，按「開始手寫檢核」重新開始。");
  }
  function quiz() {
    if (!writer.current || !meta || !catalog) return;
    const token = ++run.current;
    writer.current.cancelQuiz();
    void writer.current.hideCharacter();
    demoStroke.current = 0;
    setBusy(false);
    setMessage(`請寫第 1 筆，共 ${meta.strokes} 筆。`);
    void writer.current.quiz({
      leniency: 1,
      acceptBackwardsStrokes: false,
      showHintAfterMisses: 3,
      markStrokeCorrectAfterMisses: false,
      onMistake: (data) => {
        if (run.current === token)
          setMessage(
            `第 ${data.strokeNum + 1} 筆再試一次，請注意位置、方向與形狀。累計 ${data.totalMistakes} 次未符合。`,
          );
      },
      onCorrectStroke: (data) => {
        if (run.current === token)
          setMessage(
            `第 ${data.strokeNum + 1} 筆符合，剩下 ${data.strokesRemaining} 筆。`,
          );
      },
      onComplete: async (summary) => {
        if (run.current !== token) return;
        const record: PracticeRecord = {
          id: crypto.randomUUID(),
          character,
          totalMistakes: summary.totalMistakes,
          strokes: meta.strokes,
          completedAt: new Date().toISOString(),
          mode: guided ? "guided" : "blind",
          dataVersion: catalog.dataVersion,
        };
        try {
          await savePractice(record);
          if (run.current === token) {
            setRecords(await listPractice());
            setMessage(
              `完成 ${meta.strokes} 筆；未符合 ${summary.totalMistakes} 次。結果已儲存本機。`,
            );
          }
        } catch {
          if (run.current === token)
            setMessage("已完成練習，但本機儲存失敗，請確認瀏覽器儲存權限。");
        }
      },
    });
  }
  async function demonstrate(step = false) {
    if (!writer.current || !meta) return;
    const token = ++run.current;
    const instance = writer.current;
    instance.cancelQuiz();
    setBusy(true);
    try {
      if (step) {
        if (demoStroke.current === 0) await instance.hideCharacter();
        await instance.animateStroke(demoStroke.current);
        demoStroke.current = (demoStroke.current + 1) % meta.strokes;
      } else {
        await instance.animateCharacter();
        demoStroke.current = 0;
      }
      if (run.current === token)
        setMessage(
          step
            ? `已示範第 ${demoStroke.current || meta.strokes} 筆。手寫請按「開始手寫檢核」。`
            : "筆順示範完成。手寫請按「開始手寫檢核」。",
        );
    } finally {
      if (run.current === token) setBusy(false);
    }
  }
  function exportData() {
    const blob = new Blob(
      [JSON.stringify({ version: 1, courses, records }, null, 2)],
      { type: "application/json" },
    );
    const url = URL.createObjectURL(blob),
      a = document.createElement("a");
    a.href = url;
    a.download = "手寫測試-本機紀錄.json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  if (!catalog)
    return <p role="status">{loadError || "載入筆順測試資料庫…"}</p>;
  return (
    <section
      className="handwriting-lab"
      aria-label={mode === "test" ? "平板手寫檢核測試" : "筆順資料庫"}
    >
      <p className="handwriting-notice">
        測試版 ·
        依開放字形路徑檢查筆畫順序、方向與位置，並非書法評分或教育部標準認證。滑鼠、手指與觸控筆可操作；實體平板仍待驗收。
      </p>
      <div className="handwriting-filters">
        <label>
          出版社
          <select
            value={publisher}
            onChange={(e) => setPublisher(e.target.value)}
          >
            {["康軒", "南一", "翰林"].map((p) => (
              <option key={p}>{p}</option>
            ))}
          </select>
        </label>
        <label>
          年級
          <select
            value={grade}
            onChange={(e) => setGrade(Number(e.target.value))}
          >
            {[1, 2, 3, 4, 5, 6].map((g) => (
              <option key={g} value={g}>
                {g} 年級
              </option>
            ))}
          </select>
        </label>
        <label>
          學期
          <select value={term} onChange={(e) => setTerm(e.target.value)}>
            <option>上</option>
            <option>下</option>
          </select>
        </label>
        <label>
          課別
          <select value={lesson} onChange={(e) => setLesson(e.target.value)}>
            <option value="">選擇課別</option>
            {availableLessons.map((l, i) => (
              <option key={i} value={l.title}>
                {l.title}
              </option>
            ))}
          </select>
        </label>
      </div>
      <p>
        {book?.year
          ? `${book.year} · ${book.status} · ${book.mapped} 字有測試筆順`
          : "本冊尚未匯入課本字表，請由下方建立本機課別。"}
        {localCourses.length > 0 && ` · 本機新增 ${localCourses.length} 課`}
      </p>
      {book?.missing && (
        <p>本冊缺少測試筆順：{book.missing}。這些字不會使用其他字形替代。</p>
      )}
      {selected && (
        <div className="handwriting-characters">
          {Array.from(selected.characters).map((c) => (
            <button
              className="secondary"
              key={c}
              onClick={() => {
                pick(c);
                onPractice();
              }}
            >
              {c}
            </button>
          ))}
        </div>
      )}
      {mode === "test" ? (
        <div className="handwriting-workspace">
          <div>
            <form
              className="handwriting-character-form"
              onSubmit={(e) => {
                e.preventDefault();
                if (/^\p{Script=Han}$/u.test(input.trim())) pick(input.trim());
                else setMessage("請輸入一個中文字。");
              }}
            >
              <label>
                練習生字
                <input
                  aria-label="手寫測試生字"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  maxLength={2}
                />
              </label>
              <button className="secondary">載入生字</button>
            </form>
            <label className="handwriting-guided">
              <input
                type="checkbox"
                checked={guided}
                onChange={(e) => setGuided(e.target.checked)}
              />
              顯示描紅輪廓（切換會重新開始）
            </label>
            <div
              ref={host}
              className="handwriting-pad"
              aria-label={`手寫區 ${character}`}
            />
          </div>
          <div className="handwriting-controls">
            <h2>「{character}」手寫檢核</h2>
            <p role="status" aria-live="polite">
              {message}
            </p>
            <button
              className="primary"
              disabled={!ready || busy}
              onClick={quiz}
            >
              開始手寫檢核
            </button>
            <button
              className="secondary"
              disabled={!ready || busy}
              onClick={() => void demonstrate()}
            >
              播放筆順示範
            </button>
            <button
              className="secondary"
              disabled={!ready || busy}
              onClick={() => void demonstrate(true)}
            >
              下一筆示範
            </button>
            <button className="secondary" disabled={!ready} onClick={reset}>
              清除重寫
            </button>
            <p>
              示範會結束本次檢核；完成全部筆畫才儲存結果。原始手寫軌跡不會上傳或保存。
            </p>
          </div>
        </div>
      ) : (
        <>
          <p>
            本機筆順庫：{catalog.characters.length.toLocaleString()}{" "}
            字。已建立三家出版社 36 冊、
            {catalog.curriculum.reduce((n, b) => n + b.lessons.length, 0)}{" "}
            課公開字表對照（115 學年度上學期／114 學年度下學期），仍待教師核對。
          </p>
          <label>
            查筆順資料
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="輸入生字，例如：評性似"
            />
          </label>
          <div className="handwriting-data-grid">
            {catalog.characters
              .filter((c) =>
                query
                  ? query.includes(c.character)
                  : (
                      selected?.characters ||
                      book?.characters ||
                      "一二三十人木日月"
                    ).includes(c.character),
              )
              .slice(0, 60)
              .map((c) => (
                <article key={c.character}>
                  <strong>{c.character}</strong>
                  <span>{c.strokes} 筆 · 未核對臺灣標準</span>
                  <button
                    className="secondary"
                    onClick={() => {
                      pick(c.character);
                      onPractice();
                    }}
                  >
                    練習此字
                  </button>
                </article>
              ))}
          </div>
          <p>留空顯示所選課本或課別，最多 60 字；輸入生字可查全部筆順庫。</p>
        </>
      )}
      <BackendCard
        title="建立本機課別字表"
        description="康軒、南一、翰林 · 一至六年級上下學期"
      >
        <form
          className="handwriting-course-form"
          onSubmit={async (e) => {
            e.preventDefault();
            try {
              await saveCourse({
                id: crypto.randomUUID(),
                publisher,
                grade,
                term,
                title,
                characters: text,
                updatedAt: new Date().toISOString(),
              });
              setCourses(await listCourses());
              setTitle("");
              setText("");
              setDatabaseMessage("課別已儲存本機，可在課別選單選取。");
            } catch (e) {
              setDatabaseMessage(e instanceof Error ? e.message : "儲存失敗");
            }
          }}
        >
          <p>
            儲存到上方所選的 {publisher} {grade} 年級{term}
            學期；請只貼課本生字清單，不貼課文。
          </p>
          <label>
            課名
            <input
              required
              maxLength={80}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </label>
          <label>
            本課生字
            <textarea
              required
              maxLength={3000}
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
          </label>
          <p>
            預覽：{lessonCharacters(text) || "尚未輸入"}（
            {Array.from(lessonCharacters(text)).length} 字）
          </p>
          <button className="primary">儲存本機課別</button>
        </form>
      </BackendCard>
      <p role="status">{databaseMessage}</p>
      <BackendCard
        title="本機練習紀錄"
        description={`${records.length} 次完成紀錄 · 未連接 Firebase`}
      >
        <button className="secondary" onClick={exportData}>
          匯出課別與練習紀錄 JSON
        </button>
        {!records.length ? (
          <p>尚無完成紀錄。完成全部筆畫後會自動儲存。</p>
        ) : (
          <ul>
            {records.slice(0, 20).map((r) => (
              <li key={r.id}>
                {r.character} · {r.strokes} 筆 · 未符合 {r.totalMistakes} 次 ·{" "}
                {r.mode === "guided" ? "有輪廓" : "無輪廓"} ·{" "}
                {new Date(r.completedAt).toLocaleString("zh-TW")}
              </li>
            ))}
          </ul>
        )}
        <p>
          顯示最近 20 次，匯出包含全部紀錄。換電腦前請匯出；GitHub 與 Firebase
          不會同步這些本機資料。
        </p>
      </BackendCard>
      <BackendCard
        title="資料來源、授權與涵蓋範圍"
        description="筆順資料與課本字表分開管理"
      >
        <p>
          Hanzi Writer（MIT）；字形為 Hanzi Writer Data {catalog.dataVersion}
          ／Make Me a Hanzi，Copyright © 1999 Arphic Technology Co., Ltd.，依
          Arphic Public License
          原樣散布，無品質保證，得依該授權再散布。字形與筆順可能與臺灣教育部不同。
        </p>
        <p>
          <a
            href="/handwriting-data/ARPHICPL.TXT"
            target="_blank"
            rel="noreferrer"
          >
            字形資料授權
          </a>{" "}
          ·{" "}
          <a
            href="/handwriting-data/HANZI-WRITER-LICENSE.txt"
            target="_blank"
            rel="noreferrer"
          >
            程式授權
          </a>{" "}
          ·{" "}
          <a
            href="https://github.com/chanind/hanzi-writer-data"
            target="_blank"
            rel="noreferrer"
          >
            資料原始碼
          </a>
        </p>
        <p>
          雄筆順僅列為參考，未搬用作者的程式、拆解表、音檔或出版社課本對照。
        </p>
        <div className="handwriting-coverage">
          {catalog.curriculum.map((b) => (
            <p key={`${b.publisher}${b.grade}${b.term}`}>
              {b.publisher} {b.grade}
              {b.term}：
              {b.lessons.length
                ? `${b.lessons.length} 課／${Array.from(b.characters).length} 字，${b.status}`
                : b.status}
            </p>
          ))}
        </div>
        {book?.lessons.map((l) => (
          <p key={l.source}>
            <a href={l.source} target="_blank" rel="noreferrer">
              {l.title} · 字表來源
            </a>
          </p>
        ))}
      </BackendCard>
    </section>
  );
}
