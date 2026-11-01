import type { Card } from "./model";
import { SCENES } from "./model";
export function speechChunks(text: string): string[] {
  return (text.match(/[^。！？!?；;\n]+[。！？!?；;]*/gu) || []).flatMap(
    (sentence) => {
      const chars = Array.from(sentence.trim());
      const parts: string[] = [];
      for (let i = 0; i < chars.length; i += 160)
        parts.push(chars.slice(i, i + 160).join(""));
      return parts;
    },
  );
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
export class SpeechController {
  private generation = 0;
  private current: SpeechSynthesisUtterance | null = null;
  constructor(
    private synth: SpeechSynthesis | undefined,
    private makeUtterance: (text: string) => SpeechSynthesisUtterance,
    private onState: (state: SpeechState) => void,
    private onError: (text: string) => void,
  ) {}
  stop() {
    this.generation++;
    this.current = null;
    this.synth?.cancel();
    this.onState("idle");
  }
  pause() {
    if (!this.current) return;
    this.synth?.pause();
    this.onState("paused");
  }
  resume() {
    if (!this.current) return;
    this.synth?.resume();
    this.onState("speaking");
  }
  speak(text: string, rate: number) {
    this.stop();
    if (!this.synth) {
      this.onError("此瀏覽器未提供 TTS 朗讀功能，仍可閱讀文字。");
      return;
    }
    const chunks = speechChunks(text);
    if (!chunks.length) return;
    const generation = this.generation;
    const voices = this.synth.getVoices();
    const voice =
      voices.find((v) => /^zh[-_]TW$/i.test(v.lang)) ||
      voices.find((v) => /^zh[-_]Hant/i.test(v.lang)) ||
      voices.find((v) => /^zh/i.test(v.lang));
    if (voices.length && !voice) {
      this.onError(
        "裝置目前沒有可用的中文語音，請先在系統安裝中文語音，再重新嘗試。",
      );
      return;
    }
    const next = (index: number) => {
      if (generation !== this.generation) return;
      if (index >= chunks.length) {
        this.current = null;
        this.onState("idle");
        return;
      }
      try {
        const utterance = this.makeUtterance(chunks[index]);
        this.current = utterance;
        utterance.lang = "zh-TW";
        utterance.rate = rate;
        if (voice) utterance.voice = voice;
        utterance.onend = () => next(index + 1);
        utterance.onerror = (e) => {
          if (generation !== this.generation) return;
          this.stop();
          if (e.error !== "interrupted" && e.error !== "canceled")
            this.onError("朗讀未成功，請確認裝置有可用的中文語音，然後重試。");
        };
        this.onState("speaking");
        this.synth!.speak(utterance);
      } catch {
        this.stop();
        this.onError("裝置無法啟動中文朗讀，請換用支援 TTS 的瀏覽器。");
      }
    };
    next(0);
  }
}
