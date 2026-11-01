import { expect, it } from "vitest";
import { PHRASES } from "./data";
import { randomStartupPhrase, refreshOpeningPhrase } from "./startupPhrase";
import { defaultPageSession } from "./sessionState";
import { buildCollection } from "./data";
it("refreshes an untouched opening but preserves drafts, selections and learning", () => {
  const state = defaultPageSession();
  expect(refreshOpeningPhrase(state, "感謝", "觀察").input).toBe("觀察");
  for (const changed of [
    { ...state, input: "測量" },
    { ...state, positions: [1] },
    { ...state, collection: buildCollection("感謝", [0]) },
  ]) {
    expect(refreshOpeningPhrase(changed, "感謝", "觀察")).toBe(changed);
  }
});
import { loadPageSession } from "./sessionState";
it("uses a known teaching phrase and avoids the previous phrase", () => {
  for (const previous of Object.keys(PHRASES)) {
    for (const value of [0, 0.5, 0.999999]) {
      const phrase = randomStartupPhrase(previous, () => value);
      expect(PHRASES[phrase]).toBeDefined();
      expect(phrase).not.toBe(previous);
    }
  }
});
it("uses the random default only for a fresh session", () => {
  expect(loadPageSession({ getItem: () => null }, false, "觀察").input).toBe(
    "觀察",
  );
  const restored = loadPageSession(
    {
      getItem: () =>
        JSON.stringify({
          version: 1,
          input: "測量",
          phrase: "測量",
          positions: [1],
        }),
    },
    false,
    "觀察",
  );
  expect(restored.input).toBe("測量");
  expect(restored.positions).toEqual([1]);
});
