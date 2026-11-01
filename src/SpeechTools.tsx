import { createContext, useContext } from "react";
import { Volume2, Pause, Play, Square, RotateCcw } from "lucide-react";
import { speechTime, type SpeechState } from "./speech";
export const SpeechContext = createContext({
  state: "idle" as SpeechState,
  text: "",
  voiceLabel: "自動選擇（優先臺灣中文）",
  progress: { position: 0, total: 0, rate: 0.85 },
  seek: (_position: number) => {},
  replay: () => {},
  say: (_text: string) => {},
  stop: () => {},
  pause: () => {},
  resume: () => {},
});
export default function SpeechTools({
  label,
  read,
  showVoice = true,
  expanded = false,
}: {
  label: string;
  read: () => string;
  showVoice?: boolean;
  expanded?: boolean;
}) {
  const speech = useContext(SpeechContext);
  return (
    <div className="speech-tools" aria-label="TTS 朗讀控制">
      <button className="secondary" onClick={() => speech.say(read())}>
        <Volume2 size={16} />
        {label}
      </button>
      {(expanded || speech.state !== "idle") && (
        <>
          <button
            className="icon-btn"
            disabled={speech.state === "idle"}
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
            disabled={speech.state === "idle" && speech.progress.total === 0}
            onClick={speech.stop}
          >
            <Square size={15} />
          </button>
        </>
      )}
      {(expanded || speech.progress.total > 0) && (
        <>
          <button
            className="icon-btn"
            aria-label="從頭重播朗讀"
            onClick={() =>
              speech.progress.total > 0 ? speech.replay() : speech.say(read())
            }
          >
            <RotateCcw size={16} />
          </button>
          {speech.progress.total > 0 && (
            <div className="speech-timeline">
              <div className="speech-time-values">
                <span>朗讀進度（估計時間）</span>
                <span>
                  {speechTime(speech.progress.position, speech.progress.rate)} /{" "}
                  {speechTime(speech.progress.total, speech.progress.rate)}
                </span>
              </div>
            </div>
          )}
        </>
      )}
      {showVoice && (
        <span className="speech-voice-label" title={speech.voiceLabel}>
          預設音色：{speech.voiceLabel}
        </span>
      )}
    </div>
  );
}
