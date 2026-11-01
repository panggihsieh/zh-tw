import type { Card } from "./model";
import { readingText } from "./readingText";
import { SCENES } from "./model";
import { selectVoice, type VoicePreference } from "./ttsPreferences";
export function speechChunks(text: string): string[] {
  return (
    readingText(text).match(/[^。！？!?；;\n]+[。！？!?；;]*/gu) || []
  ).flatMap((sentence) => {
    const chars = Array.from(sentence.trim());
    const parts: string[] = [];
    for (let i = 0; i < chars.length; i += 160)
      parts.push(chars.slice(i, i + 160).join(""));
    return parts;
  });
}
export function sceneNarration(
  card: Card,
  phrase: string,
  scene: number,
  simple: boolean,
  count: number,
  explanation = "",
) {
  const intro = `第${scene + 1}幕，${SCENES[scene]}。`;
  const context = `這是「${phrase}」中的第${card.position + 1}個字。`;
  if (scene === 0)
    return (
      intro +
      context +
      (explanation || card.meaning) +
      (card.source ? "" : "這個語詞的讀音與字義待核對。")
    );
  if (scene === 1)
    return (
      intro +
      context +
      `結構為${card.master.structure}。部首是${card.master.radical}。` +
      (card.master.components.length
        ? `部件包括${card.master.components.join("、")}。`
        : "目前沒有已核對的部件資料。") +
      "結構為教學示意，待教師審定。"
    );
  if (scene === 2)
    return (
      intro +
      (card.master.components.length
        ? `拆開觀察${card.master.components.join("、")}的位置，再組合起來。`
        : "目前沒有可用的拆解教材。") +
      "這是字型區域分離的示意，不代表字源或筆順。"
    );
  if (scene === 3)
    return (
      intro +
      "可以在教育部播放器按播放，連續觀看動畫；再按一次暫停。按下一畫，一次看一筆；按重播重新開始。筆順發音請使用官方播放器的聲音按鈕。學完後按下一步。"
    );
  if (scene === 4)
    return (
      intro +
      `在「${phrase}」裡的意思是：` +
      (simple ? card.simple : card.meaning)
    );
  const words = card.vocabulary.slice(0, count);
  return (
    intro +
    (words.length
      ? words
          .map(
            (v, i) => `第${i + 1}組，${v.word}。${v.meaning}例句：${v.example}`,
          )
          .join("")
      : "目前沒有已核對的造詞資料。")
  );
}
export type SpeechState = "idle" | "speaking" | "paused";
export interface SpeechProgress {
  position: number;
  total: number;
  rate: number;
}
export interface SpeechSession {
  text: string;
  position: number;
  rate: number;
  preference: VoicePreference | null;
}
export function speechTime(position: number, rate: number) {
  const seconds = Math.max(0, Math.round(position / (4 * rate)));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}
export class SpeechController {
  getSession(): SpeechSession | null {
    return this.text
      ? {
          text: this.text,
          position: Math.floor(this.position),
          rate: this.rate,
          preference: this.activePreference,
        }
      : null;
  }
  restoreSession(session: SpeechSession) {
    this.stop();
    this.text = session.text;
    this.rate = session.rate;
    this.activePreference = session.preference;
    this.seek(session.position);
  }
  private preference: VoicePreference | null = null;
  private activePreference: VoicePreference | null = null;
  setVoicePreference(preference: VoicePreference | null) {
    this.preference = preference;
  }
  private generation = 0;
  private current: SpeechSynthesisUtterance | null = null;
  private text = "";
  private rate = 0.85;
  private position = 0;
  private playbackState: SpeechState = "idle";
  private pendingSeek = false;
  private timer: ReturnType<typeof setInterval> | null = null;
  constructor(
    private synth: SpeechSynthesis | undefined,
    private makeUtterance: (text: string) => SpeechSynthesisUtterance,
    private onState: (state: SpeechState) => void,
    private onError: (text: string) => void,
    private onProgress: (progress: SpeechProgress) => void = () => {},
  ) {}
  private state(value: SpeechState) {
    this.playbackState = value;
    this.onState(value);
  }
  private report() {
    this.onProgress({
      position: Math.floor(this.position),
      total: Array.from(this.text).length,
      rate: this.rate,
    });
  }
  private halt() {
    this.generation++;
    this.current = null;
    this.pendingSeek = false;
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    this.synth?.cancel();
  }
  stop() {
    this.halt();
    this.text = "";
    this.position = 0;
    this.state("idle");
    this.report();
  }
  pause() {
    if (!this.current) return;
    this.synth?.pause();
    this.state("paused");
  }
  resume() {
    if (this.pendingSeek) {
      this.pendingSeek = false;
      this.startAt(Math.floor(this.position));
      return;
    }
    if (!this.current) return;
    this.synth?.resume();
    this.state("speaking");
  }
  replay() {
    if (this.text) this.speak(this.text, this.rate, this.activePreference);
  }
  seek(position: number) {
    if (!this.text) return;
    this.halt();
    this.position = Math.max(
      0,
      Math.min(Array.from(this.text).length, Math.round(position)),
    );
    this.report();
    this.pendingSeek = true;
    this.state("paused");
  }
  speak(text: string, rate: number, override?: VoicePreference | null) {
    this.stop();
    this.activePreference = override === undefined ? this.preference : override;
    this.text = speechChunks(text).join("");
    this.rate = rate;
    if (!this.text) return;
    this.report();
    this.startAt(0);
  }
  private startAt(offset: number) {
    if (!this.synth) {
      this.stop();
      this.onError("此瀏覽器未提供 TTS 朗讀功能，仍可閱讀文字。");
      return;
    }
    const characters = Array.from(this.text);
    while (offset < characters.length && /\s/u.test(characters[offset]))
      offset++;
    const chunks = speechChunks(characters.slice(offset).join(""));
    const generation = this.generation;
    const voices = this.synth.getVoices();
    const voice = selectVoice(voices, this.activePreference);
    if (voices.length && !voice) {
      this.stop();
      this.onError(
        "裝置目前沒有可用的中文語音，請先在系統安裝中文語音，再重新嘗試。",
      );
      return;
    }
    const next = (index: number, base: number) => {
      if (generation !== this.generation) return;
      if (this.timer) clearInterval(this.timer);
      this.timer = null;
      this.position = base;
      this.report();
      if (index >= chunks.length) {
        this.current = null;
        this.state("idle");
        return;
      }
      try {
        const text = chunks[index],
          length = Array.from(text).length;
        const utterance = this.makeUtterance(text);
        this.current = utterance;
        utterance.lang = voice?.lang || "zh-TW";
        utterance.rate = this.rate;
        if (voice) utterance.voice = voice;
        utterance.onboundary = (e) => {
          if (
            generation !== this.generation ||
            this.playbackState !== "speaking"
          )
            return;
          this.position = base + Array.from(text.slice(0, e.charIndex)).length;
          this.report();
        };
        utterance.onend = () => next(index + 1, base + length);
        utterance.onerror = (e) => {
          if (generation !== this.generation) return;
          this.stop();
          if (e.error !== "interrupted" && e.error !== "canceled")
            this.onError("朗讀未成功，請確認裝置有可用的中文語音，然後重試。");
        };
        this.state("speaking");
        let last = Date.now();
        this.timer = setInterval(() => {
          const now = Date.now();
          if (this.playbackState === "speaking") {
            this.position = Math.min(
              base + length - 1,
              this.position + ((now - last) / 1000) * 4 * this.rate,
            );
            this.report();
          }
          last = now;
        }, 250);
        if (this.synth!.paused) this.synth!.resume();
        this.synth!.speak(utterance);
      } catch {
        this.stop();
        this.onError("裝置無法啟動中文朗讀，請換用支援 TTS 的瀏覽器。");
      }
    };
    next(0, offset);
  }
}
