import { expect, it } from "vitest";
import { PHRASES } from "./data";
import { randomStartupPhrase } from "./startupPhrase";
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
