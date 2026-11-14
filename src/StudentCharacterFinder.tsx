import { useEffect, useRef, useState } from "react";
import CurriculumDatabase from "./CurriculumDatabase";
import type { LessonContext } from "./curriculumLearning";
import {
  cleanTranscript,
  findSchoolCharacters,
  recognitionError,
  speechCandidates,
  type SchoolBook,
} from "./studentLookup";
import "./studentLookup.css";
interface Recognition {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onresult:
    | ((event: {
        results: ArrayLike<ArrayLike<{ transcript: string }>>;
      }) => void)
    | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  abort(): void;
}
type SpeechWindow = Window & {
  SpeechRecognition?: new () => Recognition;
  webkitSpeechRecognition?: new () => Recognition;
};
export default function StudentCharacterFinder({
  onLearn,
  onListen,
}: {
  onLearn: (chars: string[], context: LessonContext) => Promise<void>;
  onListen: () => void;
}) {
  const [books, setBooks] = useState<SchoolBook[]>([]),
    [query, setQuery] = useState(""),
    [searched, setSearched] = useState(""),
    [choices, setChoices] = useState<string[]>([]),
    [listening, setListening] = useState(false),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false),
    [loaded, setLoaded] = useState(false);
  const recognition = useRef<Recognition | null>(null),
    timeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const Constructor =
    (window as SpeechWindow).SpeechRecognition ||
    (window as SpeechWindow).webkitSpeechRecognition;
  async function load() {
    setMessage("");
    try {
      const r = await fetch(
        `${import.meta.env.BASE_URL}handwriting-curriculum.json`,
      );
      if (!r.ok) throw Error();
      const data = await r.json();
      setBooks(data.books);
      setLoaded(true);
    } catch {
      setMessage("課本字表載入失敗，請按重新載入。");
    }
  }
  useEffect(() => {
    void load();
    return () => {
      clearTimeout(timeout.current);
      const r = recognition.current;
      if (r) {
        r.onresult = null;
        r.onerror = null;
        r.onend = null;
        r.abort();
      }
    };
  }, []);
  function listen() {
    if (!Constructor) return;
    onListen();
    setChoices([]);
    setMessage("正在聆聽，請念一個字或短語詞…");
    const r = new Constructor();
    recognition.current = r;
    r.lang = "zh-TW";
    r.continuous = false;
    r.interimResults = false;
    r.maxAlternatives = 5;
    r.onresult = (e) => {
      const options = speechCandidates(e.results[0]);
      setChoices(options);
      setMessage(
        options.length
          ? "請確認聽到的字，再按查詢。"
          : "沒有辨識出 1–8 個中文字，請再念一次或打字。",
      );
      if (options[0]) setQuery(options[0]);
    };
    r.onerror = (e) => setMessage(recognitionError(e.error));
    r.onend = () => {
      clearTimeout(timeout.current);
      recognition.current = null;
      setListening(false);
      setMessage((prev) =>
        prev.startsWith("正在聆聽") ? "聆聽已結束，請重試或打字找字。" : prev,
      );
    };
    try {
      r.start();
      setListening(true);
      timeout.current = setTimeout(() => r.abort(), 15000);
    } catch {
      recognition.current = null;
      setListening(false);
      setMessage("無法啟動麥克風，請重試或打字找字。");
    }
  }
  const matches = findSchoolCharacters(books, searched);
  return (
    <section className="student-lookup" aria-label="念生字與課本找字">
      <h2>念生字，找課本，一起學</h2>
      <p>南一・康軒・翰林，一至六年級。可念字找字，也可直接選課。</p>
      <details open>
        <summary>依出版社、年級與課別選字</summary>
        <CurriculumDatabase student onLearn={onLearn} />
      </details>
      <p className="field-note">
        語音可能由瀏覽器送至語音服務處理；本站不保存錄音。辨識文字需自行確認，同音字可改字；這不是發音評分。
      </p>
      <div className="student-lookup-actions">
        <button
          type="button"
          className="primary"
          disabled={!Constructor || listening}
          onClick={listen}
        >
          念生字找字
        </button>
        {listening && (
          <button
            className="secondary"
            onClick={() => {
              setMessage("已停止聆聽。");
              if (recognition.current) recognition.current.onresult = null;
              recognition.current?.abort();
            }}
          >
            停止聆聽
          </button>
        )}
      </div>
      {!Constructor && <p>此瀏覽器不支援語音辨識，請使用下方打字或選課。</p>}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setSearched(cleanTranscript(query));
        }}
      >
        <label htmlFor="school-query">確認想學的字或語詞（1–8 字）</label>
        <div className="student-lookup-actions">
          <input
            id="school-query"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            maxLength={16}
            required
            pattern="[\p{Script=Han}]{1,8}"
          />
          <button className="secondary" disabled={!loaded || listening}>
            查詢課本生字
          </button>
        </div>
      </form>
      {choices.length > 0 && (
        <div className="student-lookup-actions" aria-label="語音候選">
          {choices.map((c) => (
            <button className="secondary" key={c} onClick={() => setQuery(c)}>
              {c}
            </button>
          ))}
        </div>
      )}
      <p role="status">{message || (!loaded ? "正在載入課本字表…" : "")}</p>
      {!loaded && (
        <button className="secondary" onClick={() => void load()}>
          重新載入字表
        </button>
      )}
      {searched && (
        <div className="student-search-results">
          <h3>「{searched}」出現的課本</h3>
          <p>
            {matches.length
              ? `找到 ${matches.length} 課；各字分別查找，不代表課文含有這個完整語詞。`
              : "這份課本字表沒有找到，請檢查同音字或改用下方選課。"}
          </p>
          {matches.map(({ characters, context }) => (
            <button
              disabled={busy}
              className="secondary school-result"
              key={context.source}
              onClick={async () => {
                setBusy(true);
                setMessage("準備字卡…");
                try {
                  await onLearn(characters, context);
                } catch {
                  setMessage("字卡準備失敗，請重試。");
                } finally {
                  setBusy(false);
                }
              }}
            >
              <strong>{characters.join("、")}</strong>
              <span>
                {context.publisher} {context.grade}
                {context.term} · {context.title}
              </span>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
