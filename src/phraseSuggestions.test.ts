import { describe, it, expect } from "vitest";
import { phraseSuggestions } from "./phraseSuggestions";
describe("動態選詞建議", () => {
  it("偵測可依相同字找到相關候選，不再固定四詞", () => {
    expect(phraseSuggestions("偵測")).toEqual(["偵查", "探測", "檢測", "測量"]);
  });
  it("輸入改變時建議跟著改變", () =>
    expect(phraseSuggestions("偵測")).not.toEqual(phraseSuggestions("感謝")));
  it("部分輸入也即時匹配，例如偵", () =>
    expect(phraseSuggestions("偵")[0]).toBe("偵測"));
  it("排除當前語詞與重複項", () => {
    const list = phraseSuggestions("感謝", ["感謝", "感謝", "行走"]);
    expect(list).not.toContain("感謝");
    expect(new Set(list).size).toBe(list.length);
  });
  it("空輸入提供可用教材，不回傳空詞", () => {
    const list = phraseSuggestions("");
    expect(list).toHaveLength(4);
    expect(list.every(Boolean)).toBe(true);
  });
  it("沒有字可匹配時，優先最近已收錄教材", () =>
    expect(phraseSuggestions("宇宙", ["銀行", "行走"])[0]).toBe("銀行"));
  it("收錄造詞也可作同字建議", () =>
    expect(phraseSuggestions("感")).toContain("感謝"));
  it("保留繁體原字、不偷偷轉換簡體", () =>
    expect(phraseSuggestions("侦测")).not.toContain("侦测"));
  it("遵守要求的建議數量", () =>
    expect(phraseSuggestions("偵測", [], 2)).toHaveLength(2));
});
