import { useEffect, useRef, useState } from "react";
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
  expression: "表達美感",
} as const;

export default function SentencePractice({
  onBack,
  request = defaultRequest,
  initialCard,
}: {
  onBack: () => void;
  request?: typeof defaultRequest;
  initialCard?: { phrase: string; character: string };
}) {
  const [phrase, setPhrase] = useState(initialCard?.phrase ?? "");
  const [character, setCharacter] = useState(initialCard?.character ?? "");
  const [original, setOriginal] = useState("");
  const [sentence, setSentence] = useState("");
  const [suggestion, setSuggestion] = useState("");
  const [grade, setGrade] = useState<SentencePracticeGrade | null>(null);
  const [listening, setListening] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const recognition = useRef<Recognition | null>(null);
  const finalTranscript = useRef("");
  const latestTranscript = useRef("");
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
    if (!SpeechRecognition || !character || listening || busy) return;
    const current = new SpeechRecognition();
    recognition.current = current;
    finalTranscript.current = "";
    latestTranscript.current = "";
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
      setSentence(latest);
    };
    current.onerror = (event) => {
      setMessage(
        event.error === "not-allowed"
          ? "麥克風未獲允許，可以直接打字。"
          : "語音辨識暫時中斷，請重試或直接打字。",
      );
    };
    current.onend = () => {
      const text = latestTranscript.current.trim();
      setOriginal(text);
      setSentence(text);
      setListening(false);
      recognition.current = null;
      if (text) setMessage("辨識完成，請先核對文字或使用同音語意校正。");
    };
    try {
      current.start();
      setListening(true);
    } catch {
      setMessage("無法啟動語音辨識，可以直接打字。");
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
    recognition.current?.abort();
    setOriginal("");
    setSentence("");
    setSuggestion("");
    setGrade(null);
    setMessage("已清除句子，可以重新說一次。");
  }

  return (
    <section className="sentence-practice sentence-workspace">
      <button className="secondary" onClick={onBack}>{initialCard ? "返回開課管理" : "返回遊戲專區"}</button>
      <p className="eyebrow">語詞 × 指定字 × 語音造句</p>
      <h1>一字多詞 AI 造句</h1>
      <p className="sentence-notice">
        輸入一個語詞，挑一個想練習的字，再說出包含這個字的完整句子。
      </p>

      <section className="practice-step" aria-labelledby="practice-phrase-title">
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
      </section>

      <section className="practice-step" aria-labelledby="practice-speech-title">
        <span className="practice-step-number">2</span>
        <div>
          <h2 id="practice-speech-title">說出一句話</h2>
          <p>{character ? <>句子中要使用「<strong>{character}</strong>」。</> : "請先選擇要練習的字。"}</p>
          <div className="sentence-toolbar practice-speech-actions">
            <button className="primary" disabled={!SpeechRecognition || !character || listening || busy} onClick={startListening}>
              <Mic size={20} />開始語音串流
            </button>
            <button className="secondary" disabled={!listening} onClick={() => recognition.current?.stop()}>
              <Square size={18} />停止並保留文字
            </button>
            <button className="secondary" disabled={busy || (!sentence && !original)} onClick={clearSentence}>
              <RotateCcw size={18} />清除重說
            </button>
          </div>
          {!SpeechRecognition && <p>此瀏覽器沒有語音辨識功能，可以直接在下方打字。</p>}
          <label>
            你的句子（最多 300 字）
            <textarea
              rows={5}
              maxLength={300}
              value={sentence}
              disabled={busy}
              onChange={(event) => {
                setSentence(event.target.value);
                setSuggestion("");
                setGrade(null);
              }}
              placeholder={character ? `請說出包含「${character}」的完整句子。` : "請先選擇一個字。"}
            />
          </label>
          {original && <p className="practice-original">原始語音辨識：{original}</p>}
          <button
            className="secondary"
            disabled={busy || listening || !character || !sentence.trim()}
            onClick={() => void run(async () => {
              const result = await request<{ suggestion: string }>("/practice/correct", {
                phrase,
                character,
                transcript: sentence,
              });
              setSuggestion(result.suggestion);
              setMessage("AI 已提出同音語意修正，請確認是否符合原意。");
            })}
          >
            <Sparkles size={18} />AI 同音語意校正
          </button>
          {suggestion && (
            <div className="sentence-suggestion">
              <strong>校正建議</strong>
              <p>{suggestion}</p>
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
              const result = await request<{ grade: SentencePracticeGrade }>("/practice/grade", { phrase, character, sentence });
              setGrade(result.grade);
              setMessage("評量完成，可以依建議修改後再評一次。");
            })}
          >
            <Sparkles size={18} />評量這個句子
          </button>
          {grade && (
            <article className="practice-grade" aria-live="polite">
              <div className="practice-level"><span>AI 建議等第</span><strong>{grade.level}</strong></div>
              <div className="practice-score-grid">
                {Object.entries(scoreLabels).map(([key, label]) => (
                  <div key={key}>
                    <span>{label}</span>
                    <strong>{grade.scores[key as keyof typeof grade.scores]}／4</strong>
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
