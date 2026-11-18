import { useEffect, useRef, useState } from "react";
import { Pause, Play, Repeat, X } from "lucide-react";
import rows from "./strokeCatalogueSeed.json";
import { selectedStrokeSvg } from "./strokeSvg";
import { findStrokePreset } from "./strokeSpeechCatalog";
import { speakStrokeText, stopStrokeSpeech } from "./strokeSpeech";
import "./strokeSpeech.css";

export default function BasicStrokePractice() {
  const dialog = useRef<HTMLDialogElement>(null);
  const timer = useRef<number | undefined>(undefined);
  const generation = useRef(0);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const row = rows[index];
  const asset = selectedStrokeSvg(row);
  const reading = findStrokePreset(row.name)?.spoken || row.spoken;

  function cancel() {
    generation.current++;
    window.clearTimeout(timer.current);
    stopStrokeSpeech();
  }
  useEffect(() => () => {
    generation.current++;
    window.clearTimeout(timer.current);
    if (generation.current > 1) stopStrokeSpeech();
  }, []);

  function play(start: number) {
    const run = ++generation.current;
    function advance(position: number) {
      if (generation.current !== run) return;
      setIndex(position);
      const current = rows[position];
      const next = () => {
        if (generation.current === run) {
          timer.current = window.setTimeout(() => advance((position + 1) % rows.length), 1100);
        }
      };
      if (!speakStrokeText(findStrokePreset(current.name)?.spoken || current.spoken, next)) next();
    }
    advance(start);
  }

  return <>
    <button type="button" className="secondary basic-stroke-launch" onClick={() => {
      dialog.current?.showModal();
      setPaused(false);
      play(0);
    }}><Repeat size={18} aria-hidden="true" /> 基本筆畫循環播放</button>
    <dialog ref={dialog} className="basic-stroke-dialog" aria-label="基本筆畫循環播放" onClose={cancel}>
      <div className="basic-stroke-stage">
        <figure className="stroke-playback-square">
          {asset ? <img src={asset.src} alt={row.name} /> : <span>{row.symbol}</span>}
          <figcaption><strong>{row.name}</strong> · {reading}</figcaption>
        </figure>
        <div className="stroke-preview-actions">
          <button type="button" className="secondary" aria-label={paused ? "繼續試聽" : "暫停試聽"} title={paused ? "繼續試聽" : "暫停試聽"} onClick={() => {
            if (paused) play(index);
            else cancel();
            setPaused(!paused);
          }}>{paused ? <Play aria-hidden="true" /> : <Pause aria-hidden="true" />}</button>
          <button type="button" className="secondary" aria-label="停止並關閉" title="停止並關閉" onClick={() => dialog.current?.close()}><X aria-hidden="true" /></button>
        </div>
      </div>
    </dialog>
  </>;
}

