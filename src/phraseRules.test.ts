import { expect, it } from "vitest";
import { hasRepeatedCharacter } from "./phraseRules";
import { phraseSuggestions } from "./phraseSuggestions";
import { validatePhrase } from "./model";
it("excludes repeated characters from automatic suggestions", () => {
  for (const word of ["謝謝", "看看", "高高興興", "研究研究"])
    expect(hasRepeatedCharacter(word)).toBe(true);
  expect(hasRepeatedCharacter("感謝")).toBe(false);
  for (const input of ["謝", "", "宇宙"]) {
    expect(
      phraseSuggestions(input, ["謝謝"], 100).every(
        (word) => !hasRepeatedCharacter(word),
      ),
    ).toBe(true);
  }
});
it("still accepts a manually entered repeated word", () =>
  expect(validatePhrase("謝謝")).toBe(""));
