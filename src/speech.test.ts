import { describe, it, expect, vi } from "vitest";
import { buildCollection, PHRASES } from "./data";
import { sceneNarration, speechChunks, SpeechController } from "./speech";
function setup(voices: SpeechSynthesisVoice[] = []) {
  const utterances: SpeechSynthesisUtterance[] = [];
  const synth = {
    speak: vi.fn(),
    cancel: vi.fn(),
    pause: vi.fn(),
    resume: vi.fn(),
    getVoices: vi.fn(() => voices),
  };
  const state = vi.fn(),
    error = vi.fn();
  const controller = new SpeechController(
    synth as unknown as SpeechSynthesis,
    (text) => {
      const u = { text } as SpeechSynthesisUtterance;
      utterances.push(u);
      return u;
    },
    state,
    error,
  );
  return { controller, synth, utterances, state, error };
}
const end = (u: SpeechSynthesisUtterance) =>
  u.onend?.({} as SpeechSynthesisEvent);
describe("各幕完整朗讀內容", () => {
  const card = buildCollection("感謝", [1]).cards[0];
  it.each([0, 1, 2, 3, 4, 5])("第 %i 幕有教學內容而非只有標題", (scene) =>
    expect(
      sceneNarration(card, "感謝", scene, false, 3, PHRASES["感謝"].explanation)
        .length,
    ).toBeGreaterThan(25),
  );
  it("字義講簡單一點時讀出目前白話", () => {
    expect(sceneNarration(card, "感謝", 4, true, 3)).toContain(card.simple);
    expect(sceneNarration(card, "感謝", 4, false, 3)).toContain(card.meaning);
  });
  it("造詞包含解釋及例句，遵守三組或六組設定", () => {
    const three = sceneNarration(card, "感謝", 5, false, 3);
    expect(three).toContain(card.vocabulary[0].meaning);
    expect(three).toContain(card.vocabulary[0].example);
    expect(three).not.toContain(card.vocabulary[5].example);
    expect(sceneNarration(card, "感謝", 5, false, 6)).toContain(
      card.vocabulary[5].example,
    );
  });
  it("未知字詞如實朗讀資料缺漏", () =>
    expect(
      sceneNarration(buildCollection("𠀀", [0]).cards[0], "𠀀", 5, false, 3),
    ).toContain("沒有已核對"));
  it("多音字以語詞語境說明，不單獨猜讀行", () =>
    expect(
      sceneNarration(
        buildCollection("銀行", [1]).cards[0],
        "銀行",
        0,
        false,
        3,
      ),
    ).toContain("「銀行」中的第2個字"));
});
describe("TTS 佇列與操作", () => {
  it("長內容分段且沒有遺失漢字或代理字元", () => {
    const text = "𠮷".repeat(400);
    const chunks = speechChunks(text);
    expect(chunks.join("")).toBe(text);
    expect(chunks).toHaveLength(3);
    expect(chunks.every((s) => Array.from(s).length <= 160)).toBe(true);
  });
  it("忽略空白，不發出空的語音請求", () => {
    const t = setup();
    t.controller.speak("  \n  ", 0.85);
    expect(t.synth.speak).not.toHaveBeenCalled();
  });
  it("優先臺灣語音並套用速度", () => {
    const tw = { lang: "zh-TW" } as SpeechSynthesisVoice;
    const t = setup([{ lang: "en-US" } as SpeechSynthesisVoice, tw]);
    t.controller.speak("你好。", 0.7);
    expect(t.utterances[0].voice).toBe(tw);
    expect(t.utterances[0].lang).toBe("zh-TW");
    expect(t.utterances[0].rate).toBe(0.7);
  });
  it("語音清單尚未載入仍設定 zh-TW；下次重新查詢", () => {
    const t = setup();
    t.controller.speak("你好。", 0.85);
    expect(t.utterances[0].lang).toBe("zh-TW");
    t.controller.speak("謝謝。", 0.85);
    expect(t.synth.getVoices).toHaveBeenCalledTimes(2);
  });
  it("只有外文語音時提示安裝中文，不冒用其他語音", () => {
    const t = setup([{ lang: "en-US" } as SpeechSynthesisVoice]);
    t.controller.speak("你好。", 0.85);
    expect(t.synth.speak).not.toHaveBeenCalled();
    expect(t.error).toHaveBeenCalledWith(
      expect.stringContaining("沒有可用的中文語音"),
    );
  });
  it("前一段結束才朗讀下一段，最後回到閒置", () => {
    const t = setup();
    t.controller.speak("第一句。第二句。", 0.85);
    expect(t.synth.speak).toHaveBeenCalledTimes(1);
    end(t.utterances[0]);
    expect(t.utterances[1].text).toBe("第二句。");
    end(t.utterances[1]);
    expect(t.state).toHaveBeenLastCalledWith("idle");
  });
  it("停止後即使收到舊結束事件也不重啟佇列", () => {
    const t = setup();
    t.controller.speak("第一句。第二句。", 0.85);
    const old = t.utterances[0];
    t.controller.stop();
    end(old);
    expect(t.synth.speak).toHaveBeenCalledTimes(1);
    expect(t.state).toHaveBeenLastCalledWith("idle");
  });
  it("新朗讀取消舊內容，舊錯誤不干擾新朗讀", () => {
    const t = setup();
    t.controller.speak("舊內容。後半句。", 0.85);
    const old = t.utterances[0];
    t.controller.speak("新內容。", 0.85);
    old.onerror?.({ error: "network" } as SpeechSynthesisErrorEvent);
    end(old);
    expect(t.error).not.toHaveBeenCalled();
    expect(t.synth.speak).toHaveBeenCalledTimes(2);
  });
  it("暫停與繼續呼叫裝置控制", () => {
    const t = setup();
    t.controller.speak("你好。", 0.85);
    t.controller.pause();
    expect(t.synth.pause).toHaveBeenCalledOnce();
    expect(t.state).toHaveBeenLastCalledWith("paused");
    t.controller.resume();
    expect(t.synth.resume).toHaveBeenCalledOnce();
    expect(t.state).toHaveBeenLastCalledWith("speaking");
  });
  it("沒有朗讀內容時不顯示假暫停狀態", () => {
    const t = setup();
    t.controller.pause();
    expect(t.state).not.toHaveBeenCalled();
  });
  it("裝置缺少 TTS 時明確回報", () => {
    const error = vi.fn();
    const c = new SpeechController(
      undefined,
      () => ({}) as SpeechSynthesisUtterance,
      vi.fn(),
      error,
    );
    c.speak("你好。", 0.85);
    expect(error).toHaveBeenCalledWith(expect.stringContaining("未提供"));
  });
  it("網路或語音錯誤結束佇列並回報", () => {
    const t = setup();
    t.controller.speak("第一句。第二句。", 0.85);
    t.utterances[0].onerror?.({
      error: "network",
    } as SpeechSynthesisErrorEvent);
    expect(t.error).toHaveBeenCalledWith(expect.stringContaining("朗讀未成功"));
    expect(t.state).toHaveBeenLastCalledWith("idle");
    expect(t.synth.speak).toHaveBeenCalledTimes(1);
  });
  it("使用者中斷不顯示錯誤", () => {
    const t = setup();
    t.controller.speak("你好。", 0.85);
    t.utterances[0].onerror?.({
      error: "canceled",
    } as SpeechSynthesisErrorEvent);
    expect(t.error).not.toHaveBeenCalled();
  });
});
