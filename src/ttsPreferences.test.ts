import { describe, it, expect, vi } from "vitest";
import {
  isChineseVoice,
  loadVoicePreference,
  saveVoicePreference,
  TTS_PREFERENCE_KEY,
  voiceKey,
  voicePreference,
  selectVoice,
  preferredVoice,
} from "./ttsPreferences";
const local = {
  voiceURI: "local-tw",
  name: "本機中文",
  lang: "zh-TW",
  localService: true,
  default: true,
} as SpeechSynthesisVoice;
const online = {
  voiceURI: "online-tw",
  name: "線上中文",
  lang: "zh-TW",
  localService: false,
  default: false,
} as SpeechSynthesisVoice;
describe("TTS 來源與預設儲存", () => {
  it("保留瀏覽器提供的來源資訊，不猜測供應商", () => {
    expect(voicePreference(local)).toEqual({
      voiceURI: "local-tw",
      name: "本機中文",
      lang: "zh-TW",
      localService: true,
    });
    expect(voicePreference(online).localService).toBe(false);
  });
  it("同名不同來源仍有不同識別", () =>
    expect(voiceKey(local)).not.toBe(
      voiceKey({ ...local, localService: false }),
    ));
  it("以儲存的指定音色優先於自動選擇", () =>
    expect(selectVoice([local, online], voicePreference(online))).toBe(online));
  it("原音色不可用時退回臺灣中文", () => {
    expect(preferredVoice([local], voicePreference(online))).toBeUndefined();
    expect(selectVoice([local], voicePreference(online))).toBe(local);
  });
  it("自動選擇優先臺灣語音", () =>
    expect(selectVoice([{ ...local, lang: "zh-CN" }, local], null)).toBe(
      local,
    ));
  it("支援 cmn 臺灣華語標籤", () =>
    expect(
      selectVoice(
        [
          { ...local, lang: "zh-CN" },
          { ...local, lang: "cmn-TW" },
        ],
        null,
      )?.lang,
    ).toBe("cmn-TW"));
  it.each(["zh-TW", "zh-CN", "zh-Hant-TW", "cmn-TW"])("中文標籤 %s", (lang) =>
    expect(isChineseVoice({ lang })).toBe(true),
  );
  it("沒有中文時不選外文", () =>
    expect(selectVoice([{ ...local, lang: "en-US" }], null)).toBeUndefined());
  it("保存後可重新讀回相同偏好", () => {
    let content = "";
    const storage = {
      setItem: vi.fn((_k: string, value: string) => {
        content = value;
      }),
      removeItem: vi.fn(),
      getItem: () => content,
    };
    saveVoicePreference(storage, voicePreference(online));
    expect(storage.setItem).toHaveBeenCalledWith(
      TTS_PREFERENCE_KEY,
      expect.any(String),
    );
    expect(loadVoicePreference(storage)).toEqual(voicePreference(online));
  });
  it("自動模式移除明確預設", () => {
    const storage = { setItem: vi.fn(), removeItem: vi.fn() };
    saveVoicePreference(storage, null);
    expect(storage.removeItem).toHaveBeenCalledWith(TTS_PREFERENCE_KEY);
  });
  it.each([
    "bad",
    "{}",
    "null",
    '{"voiceURI":1}',
    '{"voiceURI":"x","name":"x","lang":"en-US","localService":false}',
  ])("忽略損壞或無效設定 %s", (text) =>
    expect(loadVoicePreference({ getItem: () => text })).toBeNull(),
  );
  it("儲存區讀取受限時仍可使用自動模式", () =>
    expect(
      loadVoicePreference({
        getItem: () => {
          throw new Error("blocked");
        },
      }),
    ).toBeNull());
  it("寫入受限會拋錯，避免虛報保存成功", () =>
    expect(() =>
      saveVoicePreference(
        {
          setItem: () => {
            throw new Error("blocked");
          },
          removeItem: vi.fn(),
        },
        voicePreference(local),
      ),
    ).toThrow("blocked"));
  it("不保存額外資訊或任何憑證欄位", () => {
    const pref = loadVoicePreference({
      getItem: () =>
        JSON.stringify({
          ...voicePreference(local),
          access_token: "not-a-real-token",
        }),
    });
    expect(pref).not.toHaveProperty("access_token");
  });
});
