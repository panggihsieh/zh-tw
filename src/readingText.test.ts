import { expect, it } from "vitest";
import { readingText } from "./readingText";
import { speechChunks } from "./speech";
import { readingIndex } from "./ReadAlong";
it("replaces example labels with a pause and preserves character offsets", () => {
  const original = "仔細察看。[例]那個小男孩。";
  const spoken = speechChunks(original).join("");
  expect(spoken).toBe("仔細察看。，  那個小男孩。");
  expect(Array.from(spoken)).toHaveLength(Array.from(original).length);
  expect(readingIndex(original, spoken, 8)).toBe(8);
  expect(readingIndex(original, spoken, 5)).toBe(-1);
  expect(readingText("［例］觀察")).toBe("，  觀察");
});
