import { PHRASES } from "./data";
import type { PageSession } from "./sessionState";
export function refreshOpeningPhrase(
  state: PageSession,
  previous: string | null,
  next: string,
) {
  const untouched =
    state.page === "learn" &&
    !state.collection &&
    state.input === state.phrase &&
    state.phrase === (previous || "感謝") &&
    state.positions.length === Array.from(state.phrase).length;
  return untouched
    ? {
        ...state,
        input: next,
        phrase: next,
        positions: Array.from(next).map((_, i) => i),
        speech: null,
        scrollY: 0,
      }
    : state;
}
export const STARTUP_PHRASE_KEY = "hanzi-notebook.last-startup-phrase";
export function randomStartupPhrase(
  previous: string | null,
  random = Math.random,
): string {
  const words = Object.keys(PHRASES).filter((word) => word !== previous);
  return (
    words[
      Math.min(
        words.length - 1,
        Math.max(0, Math.floor(random() * words.length)),
      )
    ] || "感謝"
  );
}
