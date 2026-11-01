import { PHRASES } from "./data";
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
