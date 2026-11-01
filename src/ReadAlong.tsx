import { useContext } from "react";
import { SpeechContext } from "./SpeechTools";
import { readingText } from "./readingText";
// Positions are Unicode code points, matching SpeechController (not UTF-16 offsets).
export function readingIndex(
  text: string,
  spoken: string,
  position: number,
): number {
  const compact = (value: string) =>
    Array.from(readingText(value)).flatMap((character, index) =>
      /\s/u.test(character) ? [] : [{ character, index }],
    );
  const visible = compact(text),
    audio = compact(spoken);
  const needle = visible.map((item) => item.character).join("");
  const haystack = audio.map((item) => item.character).join("");
  if (!needle) return -1;
  let start = haystack.indexOf(needle);
  while (start >= 0) {
    const offset = Array.from(haystack.slice(0, start)).length;
    const match = audio
      .slice(offset, offset + visible.length)
      .findIndex((item) => item.index === position);
    if (match >= 0) {
      const index = visible[match].index;
      // Do not highlight the label during the pause.
      if (Array.from(text)[index] !== Array.from(readingText(text))[index])
        return -1;
      return index;
    }
    start = haystack.indexOf(needle, start + needle.length);
  }
  return -1;
}
export default function ReadAlong({ text }: { text: string }) {
  const speech = useContext(SpeechContext);
  const index =
    speech.state === "idle"
      ? -1
      : readingIndex(text, speech.text, speech.progress.position);
  if (index < 0) return <>{text}</>;
  const chars = Array.from(text);
  return (
    <>
      {chars.slice(0, index).join("")}
      <mark className="read-along-current">{chars[index]}</mark>
      {chars.slice(index + 1).join("")}
    </>
  );
}
