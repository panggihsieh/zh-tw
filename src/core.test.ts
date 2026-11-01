import { describe, it, expect, beforeEach, vi } from "vitest";
import "fake-indexeddb/auto";
import { buildCollection, CHARACTERS, VOCABULARY } from "./data";
import { validatePhrase, safeFilename, SCENES } from "./model";
import {
  saveCollection,
  listCollections,
  deleteCollection,
  parseBackup,
} from "./storage";

describe("語詞輸入與逐字建立", () => {
  it.each(["感謝", "銀行", "行走", "謝謝", "𠮷野家", "一二三四五六七八"])(
    "接受漢字：%s",
    (text) => expect(validatePhrase(text)).toBe(""),
  );
  it.each([
    "",
    "  ",
    "hello",
    "感謝！",
    "一二三四五六七八九",
    "感 謝",
    "感謝123",
    "😊",
  ])("阻止無效輸入：%s", (text) => expect(validatePhrase(text)).not.toBe(""));
  it("依選取位置保留獨立字卡", () => {
    const c = buildCollection("感謝", [0, 1]);
    expect(c.cards.map((x) => x.character)).toEqual(["感", "謝"]);
    expect(c.cards[0].id).not.toBe(c.cards[1].id);
    expect(c.scenes).toHaveLength(6);
  });
  it("只建立所選的字", () =>
    expect(buildCollection("感謝", [1]).cards.map((c) => c.character)).toEqual([
      "謝",
    ]));
  it("同字重複保留位置與不同讀音", () => {
    const c = buildCollection("謝謝", [0, 1]);
    expect(c.cards.map((c) => c.position)).toEqual([0, 1]);
    expect(c.cards.map((c) => c.reading)).toEqual(["ㄒㄧㄝˋ", "˙ㄒㄧㄝ"]);
  });
  it("多音字依語境區分且不互相覆蓋", () => {
    const a = buildCollection("銀行", [1]),
      b = buildCollection("行走", [0]);
    expect(a.cards[0].reading).toBe("ㄏㄤˊ");
    expect(b.cards[0].reading).toBe("ㄒㄧㄥˊ");
    expect(a.cards[0].meaning).not.toBe(b.cards[0].meaning);
    expect(a.cards[0].master).toEqual(b.cards[0].master);
  });
  it("未知語詞不臆測讀音或詞義", () => {
    const c = buildCollection("宇宙", [0]);
    expect(c.cards[0].reading).toContain("待核對");
    expect(c.cards[0].master.verificationStatus).toBe("unavailable");
    expect(c.cards[0].vocabulary).toEqual([]);
  });
  it("已知字在未知語境也不沿用不明讀音", () =>
    expect(buildCollection("行星", [0]).cards[0].reading).toContain("待核對"));
  it("教材快照不共用學生記錄", () => {
    const a = buildCollection("感謝", [0]);
    const b = buildCollection("感謝", [0]);
    a.cards[0].rememberedWords.push("感謝");
    expect(b.cards[0].rememberedWords).toEqual([]);
  });
  it("不把示意資料標為已驗證或虛構筆畫", () => {
    for (const m of Object.values(CHARACTERS)) {
      expect(m.verificationStatus).toBe("partial");
      expect(m).not.toHaveProperty("strokes");
    }
  });
  it("造詞保留字形，含讀音、釋義、例句和來源", () => {
    for (const [c, words] of Object.entries(VOCABULARY)) {
      expect(words.length).toBeGreaterThanOrEqual(3);
      for (const word of words) {
        expect(word.word).toContain(c);
        expect(word.reading).toBeTruthy();
        expect(word.example).toContain(word.word);
        expect(word.meaning).toBeTruthy();
        expect(word.source.url).toMatch(/^https:/);
        expect(word.reviewStatus).toBe("editorial");
      }
    }
  });
  it("謝字含常用與延伸義，沒有混成同義", () => {
    expect(VOCABULARY["謝"]).toHaveLength(6);
    expect(new Set(VOCABULARY["謝"].map((v) => v.sense)).size).toBeGreaterThan(
      1,
    );
  });
});
describe("本機收藏與還原", () => {
  beforeEach(async () => {
    for (const c of await listCollections()) await deleteCollection(c.id);
  });
  it("IndexedDB 保存並可重新讀取兩張字卡", async () => {
    const c = buildCollection("感謝", [0, 1]);
    await saveCollection(c);
    const list = await listCollections();
    expect(list).toHaveLength(1);
    expect(list[0].cards).toEqual(c.cards);
  });
  it("保存同一份時更新，不重複新增", async () => {
    const c = buildCollection("感謝", [0]);
    await saveCollection(c);
    c.reviewState = "learned";
    await saveCollection(c);
    const list = await listCollections();
    expect(list).toHaveLength(1);
    expect(list[0].reviewState).toBe("learned");
  });
  it("同字不同語境各自保留", async () => {
    await saveCollection(buildCollection("銀行", [1]));
    await saveCollection(buildCollection("行走", [0]));
    expect(await listCollections()).toHaveLength(2);
  });
  it("可刪除指定收藏", async () => {
    const c = buildCollection("感謝", [0]);
    await saveCollection(c);
    await deleteCollection(c.id);
    expect(await listCollections()).toEqual([]);
  });
  it("JSON 可還原完整分鏡、進度與記住的詞", () => {
    const c = buildCollection("感謝", [0, 1]);
    c.cards[0].visitedScenes = [0, 1, 2];
    c.cards[0].rememberedWords = ["感謝"];
    const restored = parseBackup(JSON.stringify(c));
    expect(restored).toEqual(c);
    expect(restored.scenes).toEqual(SCENES);
  });
  it.each(["{}", "[]", "null", "broken", '{"schemaVersion":99}'])(
    "拒絕無效備份 %s",
    (text) => expect(() => parseBackup(text)).toThrow(),
  );
  it("拒絕含可執行連結的備份", () => {
    const c = buildCollection("感謝", [0]);
    c.cards[0].source = { title: "不安全來源", url: "javascript:alert(1)" };
    expect(() => parseBackup(JSON.stringify(c))).toThrow("網址");
  });
  it("拒絕壞掉的字卡或進度資料", () => {
    const c = buildCollection("感謝", [0]);
    c.cards[0].visitedScenes = [99];
    expect(() => parseBackup(JSON.stringify(c))).toThrow();
  });
  it("來源快照與本機資料不被後續資料修改影響", async () => {
    const c = buildCollection("感謝", [0]);
    await saveCollection(c);
    c.cards[0].simple = "後來改寫";
    expect((await listCollections())[0].cards[0].simple).not.toBe("後來改寫");
  });
  it("拒絕超過長度的備份語詞", () => {
    const c = buildCollection("感謝", [0]);
    c.sourcePhrase = "感".repeat(10000);
    expect(() => parseBackup(JSON.stringify(c))).toThrow();
  });
  it("拒絕位置和原語詞不符的字卡", () => {
    const c = buildCollection("感謝", [0]);
    c.cards[0].position = 7;
    expect(() => parseBackup(JSON.stringify(c))).toThrow();
  });
  it("儲存失敗確實回報，不偽造成功", async () => {
    const spy = vi.spyOn(indexedDB, "open").mockImplementation(() => {
      throw new Error("storage unavailable");
    });
    await expect(saveCollection(buildCollection("感謝", [0]))).rejects.toThrow(
      "storage unavailable",
    );
    spy.mockRestore();
  });
});
describe("檔案名稱", () => {
  it("移除不安全字元且保留繁體中文字", () =>
    expect(safeFilename("感謝/學習:卡?.png")).toBe("感謝_學習_卡_.png"));
  it("限制檔名長度", () =>
    expect(safeFilename("感".repeat(200)).length).toBe(80));
});
