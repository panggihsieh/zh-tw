import { useEffect, useState } from "react";
import type { LessonContext } from "./curriculumLearning";
import BackendCard from "./BackendCard";
import { loadCurriculumDefault, saveCurriculumDefault } from "./curriculumDefault";
import { Bookmark } from "lucide-react";
import "./handwriting.css";
interface Book {
  publisher: string;
  grade: number;
  term: string;
  year: string;
  source: string;
  lessons: { title: string; characters: string; source: string }[];
}
export default function CurriculumDatabase({
  onLearn, student = false,
}: {
  student?: boolean;
  onLearn: (chars: string[], context: LessonContext) => Promise<void>;
}) {
  const [draft, setDraft] = useState(() => {
    try {
      const value = JSON.parse(
        sessionStorage.getItem("hanzi-notebook.curriculum-selection.v1") ||
          "null",
      );
      return value &&
        ["南一", "康軒", "翰林"].includes(value.publisher) &&
        Number.isInteger(value.grade) &&
        value.grade >= 1 &&
        value.grade <= 6 &&
        ["上", "下"].includes(value.term)
        ? value
        : null;
    } catch {
      return null;
    }
  });
  const [books, setBooks] = useState<Book[]>([]),
    [publisher, setPublisher] = useState<string>(draft?.publisher || "南一"),
    [grade, setGrade] = useState<number>(draft?.grade || 1),
    [term, setTerm] = useState<string>(draft?.term || "上"),
    [lesson, setLesson] = useState<string>(
      typeof draft?.lesson === "string" ? draft.lesson : "",
    ),
    [selected, setSelected] = useState<string[]>([]),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  const [savingDefault, setSavingDefault] = useState(false);
  const [report, setReport] = useState<{
    generatedAt: string;
    browser?: { scope: string; checks: unknown[] };
    publishers: {
      publisher: string;
      uniqueCharacters: number;
      passed: boolean;
      books: number;
      lessons: number;
      missingDictionary: number;
      missingStructure: number;
      missingOfficialStroke: number;
    }[];
  } | null>(null);
  const book = books.find(
    (b) => b.publisher === publisher && b.grade === grade && b.term === term,
  );
  const current =
    book?.lessons.find((l) => l.title === lesson) || book?.lessons[0];
  useEffect(() => {
    const abort = new AbortController();
    fetch(`${import.meta.env.BASE_URL}handwriting-curriculum.json`, {
      signal: abort.signal,
    })
      .then((r) => {
        if (!r.ok) throw Error("字表載入失敗");
        return r.json();
      })
      .then(async (data) => {
        if (student) {
          try {
            const preset = await loadCurriculumDefault();
            const exists = preset && data.books.some((b: Book) =>
              b.publisher === preset.publisher && b.grade === preset.grade &&
              b.term === preset.term && b.lessons.some((l) => l.title === preset.lesson));
            if (!abort.signal.aborted && preset && exists) {
              setDraft(null);
              setPublisher(preset.publisher);
              setGrade(preset.grade);
              setTerm(preset.term);
              setLesson(preset.lesson);
            }
          } catch {
            if (!abort.signal.aborted) setMessage("老師預設課別載入失敗，仍可自行選課。");
          }
        }
        if (!abort.signal.aborted) setBooks(data.books);
      })
      .catch((e) => {
        if (!abort.signal.aborted) setMessage(e.message);
      });
    fetch(`${import.meta.env.BASE_URL}curriculum-test-report.json`, {
      signal: abort.signal,
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((r) => {
        if (!abort.signal.aborted) setReport(r);
      })
      .catch(() => {});
    return () => abort.abort();
  }, []);
  useEffect(() => {
    if (!current) return;
    const restored =
      draft?.publisher === publisher &&
      draft?.grade === grade &&
      draft?.term === term &&
      draft?.lesson === current.title &&
      Array.isArray(draft?.selected)
        ? draft.selected
            .filter(
              (c: unknown) =>
                typeof c === "string" &&
                Array.from(c).length === 1 &&
                current.characters.includes(c),
            )
            .slice(0, 8)
        : null;
    setSelected(restored || Array.from(current.characters).slice(0, 8));
  }, [current]);
  useEffect(() => {
    if (current)
      try {
        sessionStorage.setItem(
          "hanzi-notebook.curriculum-selection.v1",
          JSON.stringify({
            publisher,
            grade,
            term,
            lesson: current.title,
            selected,
          }),
        );
      } catch {}
  }, [current, publisher, grade, term, selected]);
  return (
    <section className="curriculum-database handwriting-lab">
      <p className="handwriting-notice">
        課本字表不等於審定教材。可預覽六階段，注音與釋義來自教育部字典；結構是候選，白話解說、課文語境及多音字仍待教師確認。115
        上／114 下兩個年版。
      </p>
      <div className="handwriting-filters">
        <label>
          出版社
          <select
            value={publisher}
            onChange={(e) => setPublisher(e.target.value)}
          >
            {["南一", "康軒", "翰林"].map((p) => (
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
          <select
            value={current?.title || ""}
            onChange={(e) => setLesson(e.target.value)}
          >
            {book?.lessons.map((l) => (
              <option key={l.source}>{l.title}</option>
            ))}
          </select>
        </label>
      </div>
      {current && (
        <>
          {!student && <button className="secondary" disabled={savingDefault} onClick={async () => {
            setSavingDefault(true);
            try {
              await saveCurriculumDefault({ publisher, grade, term, lesson: current.title });
              setMessage("已儲存：學生開啟前台時會預設顯示此課。");
            } catch (error) {
              setMessage(error instanceof Error ? error.message : "預設課別儲存失敗，請重試。");
            } finally { setSavingDefault(false); }
          }}><Bookmark size={18} />{savingDefault ? "正在儲存…" : "設為學生預設課別"}</button>}
          <h2>
            {publisher} {grade}
            {term} · {current.title}
          </h2>
          <p>
            <a href={current.source} target="_blank" rel="noreferrer">
              教育百科字表來源 ↗
            </a>{" "}
            · 本課 {Array.from(current.characters).length} 字
          </p>
          <div className="curriculum-character-selection">
            {Array.from(current.characters).map((c) => (
              <label key={c}>
                <input
                  type="checkbox"
                  checked={selected.includes(c)}
                  onChange={(e) => {
                    if (e.target.checked && selected.length >= 8) {
                      setMessage("每次最多選 8 字；可分批學習本課全部生字。");
                      return;
                    }
                    setSelected((prev) =>
                      e.target.checked
                        ? [...prev, c]
                        : prev.filter((x) => x !== c),
                    );
                    setMessage("");
                  }}
                />
                <span>{c}</span>
              </label>
            ))}
          </div>
          <div className="curriculum-batches">
            {Array.from(
              { length: Math.ceil(Array.from(current.characters).length / 8) },
              (_, i) => (
                <button
                  className="secondary"
                  key={i}
                  onClick={() => {
                    setSelected(
                      Array.from(current.characters).slice(i * 8, i * 8 + 8),
                    );
                    setMessage("");
                  }}
                >
                  第 {i + 1} 批
                </button>
              ),
            )}
          </div>
          <button
            className="primary"
            disabled={busy || !selected.length}
            onClick={async () => {
              setBusy(true);
              setMessage("準備字典與結構候選…");
              try {
                await onLearn(selected, {
                  publisher,
                  grade,
                  term,
                  year: book!.year,
                  title: current.title,
                  source: current.source,
                });
              } catch (e) {
                setMessage(
                  e instanceof Error ? e.message : "教材載入失敗，請重試",
                );
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy ? "正在準備…" : "開始逐字學習"}
          </button>
          <p role="status">
            {message || `已選 ${selected.length} 個字 · 每批最多 8 字`}
          </p>
        </>
      )}
      {!student && <BackendCard
        title="三家出版社逐字測試結果"
        description="全量程式檢查與教材缺漏分開記錄"
      >
        {report ? (
          <>
            {report.browser && (
              <p>
                瀏覽器已抽測 {report.browser.checks.length}{" "}
                冊的代表字六階段操作、選課及返回流程；不是逐字人工審定。
              </p>
            )}
            <p>
              {new Date(report.generatedAt).toLocaleString("zh-TW")} ·
              以下為資料格式、六階段講稿與字卡備份驗證；不等於每字已人工審定。
            </p>
            {report.publishers.map((r) => (
              <p key={r.publisher}>
                <strong>
                  {r.publisher}：{r.passed ? "程式檢查通過" : "尚有失敗"}
                </strong>{" "}
                · {r.books} 冊／{r.lessons} 課／{r.uniqueCharacters} 字；缺字典{" "}
                {r.missingDictionary} 字、缺可解析結構 {r.missingStructure}{" "}
                字、缺官方筆順入口 {r.missingOfficialStroke} 字。
              </p>
            ))}
            <a href="/curriculum-test-report.json" download>
              下載完整測試報告 JSON
            </a>
          </>
        ) : (
          <p>尚無可用測試報告。</p>
        )}
      </BackendCard>}
    </section>
  );
}
