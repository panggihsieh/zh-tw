import { strokeAuditionText } from "./strokePronunciation";
import type { CatalogueRow } from "./StrokeCatalogue";
import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Maximize, Pause, Play, Repeat, LogOut } from "lucide-react";
import seed from "./strokeCatalogueSeed.json";
import { matchedStrokeSvg, selectedStrokeSvg } from "./strokeSvg";
import { upgradeStrokeMnemonic } from "./strokeSpeechCatalog";
import { speakStrokeText, stopStrokeSpeech } from "./strokeSpeech";
import "./strokeSpeech.css";

export default function BasicStrokePractice() {
  const dialog = useRef<HTMLDialogElement>(null);
  const timer = useRef<number | undefined>(undefined);
  const generation = useRef(0);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [rows, setRows] = useState<CatalogueRow[]>(() => seed.map(upgradeStrokeMnemonic));
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const request = useRef<AbortController | null>(null);
  const row = rows[index];
  const thumbnails: Record<string,string> = {};
  for (const item of rows) {
    const match = matchedStrokeSvg(item.name);
    if (match && item.thumbnail) thumbnails[match.id] = item.thumbnail;
  }
  const asset = selectedStrokeSvg(row, thumbnails);
  const reading = strokeAuditionText(row);

  function cancel() {
    generation.current++;
    window.clearTimeout(timer.current);
    stopStrokeSpeech();
  }
  useEffect(() => () => {
    request.current?.abort();
    if (generation.current) cancel();
  }, []);

  function play(start: number, playlist = rows) {
    const run = ++generation.current;
    function advance(position: number) {
      if (generation.current !== run) return;
      setIndex(position);
      const current = playlist[position];
      const next = () => {
        if (generation.current === run) {
          timer.current = window.setTimeout(() => advance((position + 1) % playlist.length), 650);
        }
      };
      if (!speakStrokeText(strokeAuditionText(current), next)) next();
    }
    advance(start);
  }

  function move(offset: number) {
    cancel();
    const target = (index + offset + rows.length) % rows.length;
    if (paused) setIndex(target);
    else play(target);
  }

  return <>
    <button type="button" className="secondary basic-stroke-launch" disabled={loading} onClick={async () => {
      const controller = new AbortController();
      request.current = controller;
      setLoading(true);
      setStatus("");
      try {
        const response = await fetch("/api/structure/stroke-speech/catalogue-playback", {
          signal: AbortSignal.any([controller.signal, AbortSignal.timeout(10000)]),
        });
        if (!response.ok) throw Error();
        const data = await response.json();
        if (controller.signal.aborted) return;
        const playlist: CatalogueRow[] = (data.rows ?? seed.map(upgradeStrokeMnemonic)).filter(
          (item: CatalogueRow) => strokeAuditionText(item).trim(),
        );
        if (!playlist.length) throw Error();
        setRows(playlist);
        dialog.current?.showModal();
        setPaused(false);
        play(0, playlist);
      } catch {
        if (!controller.signal.aborted) setStatus("目前無法載入筆畫播放資料，請稍後重試。");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }}><Repeat size={26} aria-hidden="true" /> 基本筆劃循環播放</button>
    {status && <p role="status">{status}</p>}
    <dialog ref={dialog} className="basic-stroke-dialog" aria-label="基本筆劃循環播放" onClose={() => { cancel(); if (dialog.current?.contains(document.fullscreenElement)) void document.exitFullscreen().catch(() => {}); }}>
      <div className="basic-stroke-stage">
        <span className="basic-stroke-sound">筆畫語音已開啟</span>
        <figure className="stroke-playback-square">
          {asset ? <img src={asset.src} alt={row.name} /> : <span>{row.symbol}</span>}
          <figcaption><strong>{row.name}</strong> · {reading}</figcaption>
        </figure>
        <div className="stroke-preview-actions">
          <button type="button" className="secondary" aria-label="上一個筆畫" title="上一個筆畫" onClick={() => move(-1)}><ChevronLeft aria-hidden="true" />上一個</button>
          <button type="button" className="secondary" aria-label="下一個筆畫" title="下一個筆畫" onClick={() => move(1)}><ChevronRight aria-hidden="true" />下一個</button>
          <button type="button" className="secondary" aria-label="切換全螢幕" title="切換全螢幕" onClick={async () => {
            try {
              if (document.fullscreenElement) await document.exitFullscreen();
              else await dialog.current?.querySelector(".basic-stroke-stage")?.requestFullscreen();
            } catch { /* The dialog already fills the viewport. */ }
          }}><Maximize aria-hidden="true" />全螢幕</button>
          <button type="button" className="secondary" aria-label={paused ? "繼續試聽" : "暫停試聽"} title={paused ? "繼續試聽" : "暫停試聽"} onClick={() => {
            if (paused) play(index);
            else cancel();
            setPaused(!paused);
          }}>{paused ? <Play aria-hidden="true" /> : <Pause aria-hidden="true" />}{paused ? "繼續" : "暫停"}</button>
          <button type="button" className="secondary" aria-label="離開筆畫播放" title="離開筆畫播放" onClick={() => dialog.current?.close()}><LogOut aria-hidden="true" />離開</button>
        </div>
      </div>
    </dialog>
  </>;
}

