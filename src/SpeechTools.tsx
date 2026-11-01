import { createContext, useContext } from "react";
import { Volume2, Pause, Play, Square, RotateCcw } from "lucide-react";
import { speechTime, type SpeechState } from "./speech";
export const SpeechContext = createContext({
  state: "idle" as SpeechState,
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
}: {
  label: string;
  read: () => string;
  showVoice?: boolean;
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
      {speech.progress.total > 0 && (
        <>
          <button
            className="icon-btn"
            aria-label="從頭重播朗讀"
            onClick={speech.replay}
          >
            <RotateCcw size={16} />
          </button>
          <div className="speech-timeline">
            <label>
              <span>朗讀進度（估計時間）</span>
              <span>
                {speechTime(speech.progress.position, speech.progress.rate)} /{" "}
                {speechTime(speech.progress.total, speech.progress.rate)}
              </span>
              <input
                type="range"
                aria-label="朗讀時間位置"
                min={0}
                max={speech.progress.total}
                step={1}
                value={speech.progress.position}
                aria-valuetext={`約 ${speechTime(speech.progress.position, speech.progress.rate)}，共約 ${speechTime(speech.progress.total, speech.progress.rate)}`}
                onChange={(e) => speech.seek(Number(e.target.value))}
              />
            </label>
            <small>
              {speech.state === "paused"
                ? "已暫停，可按繼續朗讀。"
                : "拖曳可定位並暫停，再按繼續朗讀。"}
            </small>
          </div>
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
