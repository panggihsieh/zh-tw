import { describe, it, expect, vi } from "vitest";
import { buildCollection } from "./data";
import {
  defaultPageSession,
  loadPageSession,
  savePageSession,
  SESSION_KEY,
} from "./sessionState";
const load = (data: unknown) =>
  loadPageSession({ getItem: () => JSON.stringify(data) });
describe("重新整理頁面狀態", () => {
  it("保存後完整還原未收藏學習卡、分鏡與輸入", () => {
    const state = {
      ...defaultPageSession(),
      page: "learn" as const,
      input: "尚未送出",
      phrase: "感謝",
      positions: [1],
      collection: buildCollection("感謝", [0, 1]),
      cardIndex: 1,
      scene: 5,
      wordCount: 6,
      revealed: ["謝謝"],
      simple: true,
      grade: "低一年級",
      scrollY: 410,
    };
    const setItem = vi.fn();
    savePageSession({ setItem }, state);
    expect(setItem).toHaveBeenCalledWith(SESSION_KEY, expect.any(String));
    expect(
      loadPageSession({ getItem: () => setItem.mock.calls[0][1] }),
    ).toEqual(state);
  });
  it.each(["learn", "library", "resources", "tts"])("保留目前頁面 %s", (page) =>
    expect(load({ ...defaultPageSession(), page }).page).toBe(page),
  );
  it("保留搜尋、複習篩選及學習偏好", () => {
    const state = {
      ...defaultPageSession(),
      page: "library",
      search: "行",
      filter: "learned",
      voice: true,
      captions: false,
      showReading: false,
      speed: 1.5,
    };
    expect(load(state)).toMatchObject(state);
  });
  it("語詞與未送出的輸入分開保存", () =>
    expect(
      load({
        ...defaultPageSession(),
        input: "偵測",
        phrase: "銀行",
        positions: [1],
      }),
    ).toMatchObject({ input: "偵測", phrase: "銀行", positions: [1] }));
  it("還原語音只保留文字及位置，不保留播放中狀態", () => {
    const speech = {
      text: "謝謝你的幫忙。",
      position: 3,
      rate: 0.85,
      preference: null,
    };
    const state = load({ ...defaultPageSession(), speech, playing: true });
    expect(state.speech).toEqual(speech);
    expect(state).not.toHaveProperty("playing");
  });
  it("不保存 token、匯出忙碌狀態或刪除確認", () => {
    const state = load({
      ...defaultPageSession(),
      access_token: "not-a-real-token",
      busy: "upload",
      deleteId: "x",
      modal: "drive",
    });
    expect(state).not.toHaveProperty("access_token");
    expect(state).not.toHaveProperty("busy");
    expect(state).not.toHaveProperty("deleteId");
    expect(state.modal).toBeNull();
  });
  it("可還原設定視窗，沒有字卡不開啟匯出視窗", () => {
    expect(load({ ...defaultPageSession(), modal: "settings" }).modal).toBe(
      "settings",
    );
    expect(load({ ...defaultPageSession(), modal: "export" }).modal).toBeNull();
  });
  it("字卡損壞時保留輸入與目前頁面", () => {
    const state = load({
      ...defaultPageSession(),
      page: "library",
      input: "偵測",
      collection: { bad: true },
    });
    expect(state.page).toBe("library");
    expect(state.input).toBe("偵測");
    expect(state.collection).toBeNull();
  });
  it("還原時限制錯誤字卡索引及分鏡", () => {
    const state = load({
      ...defaultPageSession(),
      collection: buildCollection("感謝", [0]),
      cardIndex: 99,
      scene: 99,
    });
    expect(state.cardIndex).toBe(0);
    expect(state.scene).toBe(0);
  });
  it("忽略無效位置並去除重複選字", () =>
    expect(
      load({ ...defaultPageSession(), positions: [1, 1, -1, 9, "0"] })
        .positions,
    ).toEqual([1]));
  it("清除語詞後不留下預設選取位置", () =>
    expect(load({ version: 1, phrase: "" }).positions).toEqual([]));
  it.each([null, {}, [], { version: 99 }])("無效版本使用預設 %j", (data) =>
    expect(load(data)).toEqual(defaultPageSession()),
  );
  it("JSON 損壞或儲存區受限不會阻止啟動", () => {
    expect(loadPageSession({ getItem: () => "{bad" })).toEqual(
      defaultPageSession(),
    );
    expect(
      loadPageSession({
        getItem: () => {
          throw new Error("blocked");
        },
      }),
    ).toEqual(defaultPageSession());
  });
  it("保存失敗會拋出，讓畫面回報限制", () =>
    expect(() =>
      savePageSession(
        {
          setItem: () => {
            throw new Error("quota");
          },
        },
        defaultPageSession(),
      ),
    ).toThrow("quota"));
});
