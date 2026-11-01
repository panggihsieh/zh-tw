import { createContext, useContext } from "react";
import { Volume2, Pause, Play, Square } from "lucide-react";
import type { SpeechState } from "./speech";
export const SpeechContext = createContext({
  state: "idle" as SpeechState,
  say: (_text: string) => {},
  stop: () => {},
  pause: () => {},
  resume: () => {},
});
export default function SpeechTools({
  label,
  read,
}: {
  label: string;
  read: () => string;
}) {
  const speech = useContext(SpeechContext);
  return (
    <div className="speech-tools" aria-label="TTS 朗讀控制">
      <button className="secondary" onClick={() => speech.say(read())}>
        <Volume2 size={16} />
        {label}
      </button>
      {speech.state !== "idle" && (
        <>
          <button
            className="icon-btn"
            aria-label={speech.state === "paused" ? "繼續朗讀" : "暫停朗讀"}
            onClick={speech.state === "paused" ? speech.resume : speech.pause}
          >
            {speech.state === "paused" ? (
              <Play size={16} />
            ) : (
              <Pause size={16} />
            )}
          </button>
          <button
            className="icon-btn"
            aria-label="停止朗讀"
            onClick={speech.stop}
          >
            <Square size={15} />
          </button>
        </>
      )}
    </div>
  );
}
