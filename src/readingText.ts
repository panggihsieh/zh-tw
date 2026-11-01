// Keep three code points so the reading cursor still maps to the original text.
// A comma requests a natural pause; the example label itself is not spoken.
export function readingText(text: string): string {
  return text.replace(/\[例\]|［例］/gu, "，  ");
}
