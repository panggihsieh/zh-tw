import { expect, it } from "vitest";
import { readingIndex } from "./ReadAlong";
it("maps a passage to the current spoken character", () => {
  expect(readingIndex("仔細察看。", "第一幕。仔細察看。", 5)).toBe(1);
  expect(readingIndex("仔細察看。", "第一幕。仔細察看。", 1)).toBe(-1);
  expect(readingIndex("仔細察看。", "第一幕。仔細察看。", 9)).toBe(-1);
});
it("counts supplementary characters as one character", () => {
  expect(readingIndex("𠮷祥", "𠮷。𠮷祥", 3)).toBe(1);
  expect(readingIndex("其他", "𠮷。𠮷祥", 3)).toBe(-1);
});
it("preserves original line breaks while matching chunked speech", () => {
  expect(readingIndex("1.察看。\r\n2.留意。", "詞義。1.察看。2.留意。", 10)).toBe(9);
});
