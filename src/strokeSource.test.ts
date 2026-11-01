import { describe, it, expect } from "vitest";
import characterIds from "./data/moe-characters.json";
import { strokeFrameUrl } from "./strokeSource";
describe("教育部正式嵌入清單", () => {
  it("包含 6063 個不重複的字碼", () => {
    expect(characterIds).toHaveLength(6063);
    expect(new Set(characterIds).size).toBe(6063);
    expect(
      characterIds.every((n) => Number.isInteger(n) && n > 0 && n <= 0x10ffff),
    ).toBe(true);
  });
  it.each(["感", "謝", "銀", "行", "走", "觀", "察"])(
    "使用官方清單中的 %s",
    (character) =>
      expect(strokeFrameUrl(character)).toBe(
        `https://stroke-order.learningweb.moe.edu.tw/dictFrame.jsp?ID=${character.codePointAt(0)}`,
      ),
  );
  it.each(["", "感謝", "A", "😊", "𠀀"])(
    "未收錄或無效輸入不猜測網址 %s",
    (character) => expect(strokeFrameUrl(character)).toBeNull(),
  );
});
