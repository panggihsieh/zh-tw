import { type ReactNode, useEffect, useRef, useState } from "react";
import { Check, Mic, RotateCcw, Sparkles, Square } from "lucide-react";
import {
  sentenceRequest as defaultRequest,
  type SentencePracticeGrade,
} from "./sentenceApi";
import "./sentencePractice.css";

interface SpeechAlternative {
  transcript: string;
}

interface SpeechResult extends ArrayLike<SpeechAlternative> {
  isFinal: boolean;
}

interface SpeechEvent {
  resultIndex: number;
  results: ArrayLike<SpeechResult>;
}

interface Recognition {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((event: SpeechEvent) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

type SpeechWindow = Window & {
  SpeechRecognition?: new () => Recognition;
  webkitSpeechRecognition?: new () => Recognition;
};

const scoreLabels = {
  correctness: "語意正確",
  fluency: "句子流暢",
  detail: "內容具體合理",
  mechanics: "文字與標點",
} as const;

function compareSentences(original: string, polished: string) {
  const before = Array.from(original), after = Array.from(polished);
  const lengths = before.map(() => new Uint16Array(after.length + 1));
  lengths.push(new Uint16Array(after.length + 1));
  for (let i = before.length - 1; i >= 0; i--)
    for (let j = after.length - 1; j >= 0; j--)
      lengths[i][j] = before[i] === after[j] ? 1 + lengths[i + 1][j + 1] : Math.max(lengths[i + 1][j], lengths[i][j + 1]);
  const originalParts = [], polishedParts = [];
  let i = 0, j = 0;
  while (i < before.length || j < after.length) {
    if (i < before.length && before[i] === after[j]) {
      originalParts.push(before[i++]);
      polishedParts.push(after[j++]);
    } else if (i < before.length && (j === after.length || lengths[i + 1][j] >= lengths[i][j + 1])) {
      originalParts.push(<del key={i}>{before[i++]}</del>);
    } else {
      polishedParts.push(<ins key={j}>{after[j++]}</ins>);
    }
  }
  return { originalParts, polishedParts };
}

function highlightExample(text: string, expression?: string) {
  if (!expression || !text.includes(expression)) return text;
  const [before, ...after] = text.split(expression);
  return <>{before}<mark className="practice-example-expression">{expression}</mark>{after.join(expression)}</>;
}

export default function SentencePractice({
  onBack,
  request = defaultRequest,
  initialCard,
  fixedCharacter = false,
  lessonTitle,
  correctionOption,
  simulated = false,
}: {
  onBack: () => void;
  request?: typeof defaultRequest;
  fixedCharacter?: boolean;
  initialCard?: { phrase: string; character: string; sentence?: string };
  lessonTitle?: string;
  simulated?: boolean;
  correctionOption?: ReactNode;
}) {
  const [phrase, setPhrase] = useState(initialCard?.phrase ?? "");
  const [character, setCharacter] = useState(initialCard?.character ?? "");
  const [original, setOriginal] = useState("");
  const [sentence, setSentence] = useState(initialCard?.sentence ?? "");
  const [suggestion, setSuggestion] = useState("");
  const [fontSize, setFontSize] = useState(20);
  const [grade, setGrade] = useState<SentencePracticeGrade | null>(null);
  const [listening, setListening] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const recognition = useRef<Recognition | null>(null);
  const sentenceInput = useRef<HTMLTextAreaElement>(null);
  const finalTranscript = useRef("");
  const latestTranscript = useRef("");
  const spokenPunctuation = useRef<{ offset: number; symbol: string }[]>([]);
  function sentenceWithPunctuation(transcript: string) {
    let result = transcript;
    for (const { offset, symbol } of [...spokenPunctuation.current].reverse()) {
      result = result.slice(0, offset) + symbol + result.slice(offset);
    }
    return result.slice(0, 300);
  }
  const SpeechRecognition =
    (window as SpeechWindow).SpeechRecognition ||
    (window as SpeechWindow).webkitSpeechRecognition;
  const characters = [...new Set(Array.from(phrase))];

  useEffect(
    () => () => {
      recognition.current?.abort();
    },
    [],
  );

  function updatePhrase(value: string) {
    const next = Array.from(value.replace(/[^\p{Script=Han}]/gu, ""))
      .slice(0, 8)
      .join("");
    setPhrase(next);
    if (!next.includes(character)) setCharacter("");
    setOriginal("");
    setSentence("");
    setSuggestion("");
    setGrade(null);
    setMessage("");
  }

  function startListening() {
    if (!SpeechRecognition || !character || listening || busy || grade) return;
    const current = new SpeechRecognition();
    recognition.current = current;
    finalTranscript.current = "";
    latestTranscript.current = "";
    spokenPunctuation.current = [];
    setOriginal("");
    setSentence("");
    setSuggestion("");
    setGrade(null);
    setMessage("即時辨識中，可以連續說完整句子。");
    current.lang = "zh-TW";
    current.continuous = true;
    current.interimResults = true;
    current.maxAlternatives = 1;
    current.onresult = (event) => {
      let interim = "";
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const text = event.results[index]?.[0]?.transcript || "";
        if (event.results[index].isFinal) finalTranscript.current += text;
        else interim += text;
      }
      const latest = (finalTranscript.current + interim).slice(0, 300);
      latestTranscript.current = latest;
      setSentence(sentenceWithPunctuation(latest));
    };

    current.onerror = (event) => {
      setMessage(
        event.error === "not-allowed"
          ? "請允許使用麥克風，再開始說話。"
          : "語音辨識暫時中斷，請重試。",
      );
    };
    current.onend = () => {
      const text = latestTranscript.current.trim();
      setOriginal(text);
      setSentence(sentenceWithPunctuation(latestTranscript.current).trim());
      setListening(false);
      recognition.current = null;
      if (text) setMessage("辨識完成，請先核對文字或使用同音語意校正。");
    };
    try {
      current.start();
      setListening(true);
    } catch {
      setMessage("無法啟動語音辨識，請檢查麥克風後重試。");
    }
  }

  async function run(task: () => Promise<void>) {
    setBusy(true);
    setMessage("");
    try {
      await task();
    } catch (error) {
      setMessage((error as Error).message);
    } finally {
      setBusy(false);
    }
  }

  function clearSentence() {
    spokenPunctuation.current = [];
    latestTranscript.current = "";
    finalTranscript.current = "";
    recognition.current?.abort();
    setOriginal("");
    setSentence("");
    setSuggestion("");
    setGrade(null);
    setMessage("已清除句子，可以重新說一次。");
  }

  return (
    <section className="sentence-practice sentence-workspace" style={{ fontSize }}>
      <div className="practice-font-controls" role="group" aria-label="本頁字體大小">
      <button className="secondary" onClick={onBack}>{initialCard ? "返回開課管理" : "返回遊戲專區"}</button>
        <div className="practice-font-buttons">
          <button type="button" className="secondary" aria-label="縮小本頁字體" disabled={fontSize <= 18} onClick={() => setFontSize(size => size - 2)}>−</button>
          <output aria-live="polite">字體 {fontSize}</output>
          <button type="button" className="secondary" aria-label="放大本頁字體" disabled={fontSize >= 32} onClick={() => setFontSize(size => size + 2)}>＋</button>
        </div>
      </div>
      <p className="eyebrow">語詞 × 指定字 × 語音造句</p>
      <h1>一字多詞 AI 造句</h1>
      <p className="sentence-notice">
        {fixedCharacter ? "用選定的字想一個語詞，再說出完整句子。" : "輸入一個語詞，挑一個想練習的字，再說出包含這個字的完整句子。"}
      </p>

      {!fixedCharacter && <section className="practice-step" aria-labelledby="practice-phrase-title">
        <span className="practice-step-number">1</span>
        <div>
          <h2 id="practice-phrase-title">輸入語詞並選一個字</h2>
          <label>
            語詞（2–8 個中文字）
            <input
              value={phrase}
              onChange={(event) => updatePhrase(event.target.value)}
              placeholder="例如：美麗海灘"
              inputMode="text"
              maxLength={8}
            />
          </label>
          {phrase.length > 0 && phrase.length < 2 && <p role="status">請再輸入一個字。</p>}
          {phrase.length >= 2 && (
            <fieldset className="practice-character-picker">
              <legend>選擇這次要練習的字</legend>
              {characters.map((item) => (
                <button
                  type="button"
                  key={item}
                  className={character === item ? "primary" : "secondary"}
                  aria-pressed={character === item}
                  onClick={() => {
                    setCharacter(item);
                    setOriginal("");
                    setSentence("");
                    setSuggestion("");
                    setGrade(null);
                  }}
                >
                  {item}
                </button>
              ))}
            </fieldset>
          )}
        </div>
      </section>}

      <section className="practice-step" aria-labelledby="practice-speech-title">
        <span className="practice-step-number">2</span>
        <div>
          <h2 id="practice-speech-title">說出一句話</h2>
          <p id="practice-voice-hint" className="practice-voice-hint">請用口說造句。{grade ? '評量完成後無法清除重說。' : '說錯了，點「清除重說」。'}</p>
          <p>{character ? <>句子中要使用「<strong>{character}</strong>」。</> : "請先選擇要練習的字。"}</p>
          <div className="sentence-toolbar practice-speech-actions">
            <button className="primary" disabled={!SpeechRecognition || !character || listening || busy || Boolean(grade)} onClick={startListening}>
              <Mic size={20} />開始語音串流
            </button>
            <button className="secondary" disabled={!listening} onClick={() => recognition.current?.stop()}>
              <Square size={18} />結束造句送出
            </button>
            <button className="secondary" disabled={busy || Boolean(grade) || (!sentence && !original)} onClick={clearSentence}>
              <RotateCcw size={18} />清除重說
            </button>
          </div>
          {!SpeechRecognition && <p>請使用支援語音辨識的瀏覽器進行口說練習。</p>}
          <label htmlFor="practice-sentence">你的句子（最多 300 字）</label>
          <div className="practice-punctuation" role="group" aria-label="插入標點符號">
            {["，", "。", "、", "？", "！", "：", "；", "「", "」"].map((symbol) => (
              <button type="button" className="secondary" key={symbol}
                aria-label={`插入 ${symbol}`}
                disabled={busy || Boolean(grade)}
                onClick={() => {
                  if (listening) {
                    if (sentence.length >= 300) return;
                    spokenPunctuation.current.push({ offset: latestTranscript.current.length, symbol });
                    setSentence(sentenceWithPunctuation(latestTranscript.current));
                    return;
                  }
                  const input = sentenceInput.current;
                  if (!input) return;
                  const { selectionStart, selectionEnd } = input;
                  if (sentence.length - (selectionEnd - selectionStart) >= 300) return;
                  input.setRangeText(symbol, selectionStart, selectionEnd, "end");
                  setSentence(input.value);
                  setSuggestion("");
                  setGrade(null);
                  input.focus();
                }}>{symbol}</button>
            ))}
          </div>
            <textarea
              id="practice-sentence"
              ref={sentenceInput}
              rows={5}
              maxLength={300}
              value={sentence}
              disabled={busy}
              readOnly
              aria-describedby="practice-voice-hint"
              placeholder={character ? `請說出包含「${character}」的完整句子。` : "請先選擇一個字。"}
            />
          {original && <p className="practice-original">原始語音辨識：{original}</p>}
          <div className="practice-correction-actions">
            <button
              className="secondary"
              disabled={busy || listening || Boolean(grade) || !character || !sentence.trim()}
              onClick={() => void run(async () => {
                const result = await request<{ suggestion: string; issueReason?: string }>("/practice/correct", {
                  phrase,
                  character,
                  transcript: sentence,
                  lessonTitle,
                });
                if (result.suggestion.trim() === sentence.trim()) {
                  setSuggestion(simulated || result.issueReason ? "" : sentence.trim());
                  setMessage(result.issueReason || (simulated ? "目前為模擬模式，請勾選「使用真實 AI」測試校正。" : ""));
                  return;
                }
                setSuggestion(result.suggestion);
                setMessage(result.issueReason || "AI 已提出同音語意修正，請確認是否符合原意。");
              })}
            >
              <Sparkles size={18} />AI 同音語意校正
            </button>
            {correctionOption}
          </div>
          <p className="practice-correction-tip">按下後，AI 會修正辨識到的同音錯詞，並列出校正句。改動以紅字標示，核對後可採用。若沒有發現需要校正的錯詞，會顯示「不須修改」。</p>
          {suggestion === sentence.trim() && suggestion ? (
            <p className="sentence-suggestion" role="status"><strong>不須修改</strong>，已保留原句。</p>
          ) : suggestion && (
            <div className="sentence-suggestion practice-comparison" aria-live="polite">
              <strong>校正建議</strong>
              <p>改動對照：{compareSentences(sentence.trim(), suggestion.trim()).polishedParts}</p>
              <p>完整校正句：{suggestion}</p>
              <button className="primary" onClick={() => { setSentence(suggestion); setSuggestion(""); setGrade(null); }}>
                <Check size={18} />採用校正
              </button>
              <button className="secondary" onClick={() => setSuggestion("")}>保留原句</button>
            </div>
          )}
        </div>
      </section>

      <section className="practice-step" aria-labelledby="practice-grade-title">
        <span className="practice-step-number">3</span>
        <div>
          <h2 id="practice-grade-title">取得 AI 建議等第</h2>
          <button
            className="primary"
            disabled={busy || listening || !character || !sentence.includes(character) || Array.from(sentence.replace(/[^\p{Script=Han}]/gu, "")).length < 5}
            onClick={() => void run(async () => {
              const result = await request<{ grade: SentencePracticeGrade }>("/practice/grade", { phrase, character, sentence, lessonTitle });
              setSuggestion("");
              setGrade(result.grade);
              setMessage("評量完成，請查看等第與建議。");
            })}
          >
            <Sparkles size={18} />評量這個句子
          </button>
          {grade && (
            <article className="practice-grade" aria-live="polite">
          {(grade.polished || grade.fullScoreExample || grade.creativeExample) && (() => {
            const { originalParts, polishedParts } = compareSentences(sentence.trim(), grade.polished || sentence.trim());
            return <section className="practice-comparison">
              <h3>AI 潤稿</h3>
              <p>原句：{originalParts}</p>
              {grade.polished && <p><strong>原句潤稿：</strong>{polishedParts}</p>}
              {grade.fullScoreExample && <p><strong>滿分規準示例（參考）：</strong>{highlightExample(grade.fullScoreExample, grade.fullScoreExpression)}</p>}
              {grade.creativeExample && <p><strong>AI 創意示例：</strong>{grade.creativeExample}</p>}
              {grade.issueReason && <p>{grade.issueReason}</p>}
            </section>;
          })()}
              <div className="practice-level"><span>AI 建議等第</span><strong>{grade.level}</strong></div>
              <p className="practice-total">總分 {grade.total === null ? "待確認" : `${grade.total}／100`}
                {grade.total !== null && grade.total > 0 && (() => {
                  const stars = [60, 70, 80, 90].filter((threshold) => grade.total! >= threshold).length + 1;
                  return <span className="practice-stars" role="img" aria-label={`五顆星中獲得 ${stars} 顆`}>
                    {"★".repeat(stars)}{"☆".repeat(5 - stars)}
                  </span>;
                })()}
              </p>
              <div className="practice-score-grid">
                {Object.entries(scoreLabels).map(([key, label]) => (
                  <div key={key}>
                    <span>{label}</span>
                    <strong>{grade.scores[key as keyof typeof grade.scores]}／{key === "correctness" ? 30 : key === "mechanics" ? 10 : 20}</strong>
                  </div>
                ))}
              </div>
              {grade.highlight && <p>句子亮點：「{grade.highlight}」</p>}
              <p>{grade.feedback}</p>
            </article>
          )}
        </div>
      </section>
      <p role="status">{message}</p>
    </section>
  );
}
