import { useEffect, useRef, useState } from "react";
import { Check, Cloud, Monitor, RefreshCw, Volume2 } from "lucide-react";
import {
  isChineseVoice,
  preferredVoice,
  voiceKey,
  voicePreference,
  type VoicePreference,
} from "./ttsPreferences";
import SpeechTools from "./SpeechTools";
import StructureAiSettings from "./StructureAiSettings";
interface Props {
  voices: SpeechSynthesisVoice[];
  saved: VoicePreference | null;
  supported: boolean;
  refresh: () => void;
  save: (preference: VoicePreference | null) => void;
  preview: (text: string, preference: VoicePreference | null) => void;
}
export default function TtsSettings({
  voices,
  saved,
  supported,
  refresh,
  save,
  preview,
}: Props) {
  const savedKey = saved ? voiceKey(saved) : "auto";
  const [restored] = useState(() => {
    try {
      const data = JSON.parse(
        sessionStorage.getItem("hanzi-notebook.tts-draft.v1") || "null",
      );
      return data?.version === 1 ? data : null;
    } catch {
      return null;
    }
  });
  const [filter, setFilter] = useState(
    ["all", "local", "online"].includes(restored?.filter)
      ? restored.filter
      : "all",
  );
  const [draft, setDraft] = useState(
    restored?.savedKey === savedKey &&
      typeof restored?.draft === "string" &&
      restored.draft.length < 2000
      ? restored.draft
      : savedKey,
  );
  const [sample, setSample] = useState(
    typeof restored?.sample === "string" && restored.sample.length <= 300
      ? restored.sample
      : "你好，我們一起認識生字。感謝別人的幫忙，也把今天的小小進步收藏起來。",
  );
  const previousSaved = useRef(savedKey);
  useEffect(() => {
    if (previousSaved.current !== savedKey) {
      previousSaved.current = savedKey;
      setDraft(savedKey);
    }
  }, [savedKey]);
  useEffect(() => {
    try {
      sessionStorage.setItem(
        "hanzi-notebook.tts-draft.v1",
        JSON.stringify({ version: 1, filter, draft, sample, savedKey }),
      );
    } catch {
      /* main page persistence already reports blocked storage */
    }
  }, [filter, draft, sample, savedKey]);
  const chinese = voices.filter(isChineseVoice);
  const selected = chinese.find((v) => voiceKey(v) === draft);
  const missing = !!saved && !preferredVoice(voices, saved);
  const filtered = chinese.filter(
    (v) =>
      filter === "all" ||
      (filter === "local" ? v.localService : !v.localService),
  );
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">
            <Volume2 size={15} />
            本機設定後台
          </div>
          <h1>TTS 來源與預設音色</h1>
          <p>先試聽，再把喜歡的聲音設為前台預設。</p>
        </div>
        <button className="secondary" onClick={refresh}>
          <RefreshCw size={16} />
          重新偵測語音
        </button>
      </div>
      <div className="tts-default">
        <span>目前前台預設</span>
        <strong>{saved ? saved.name : "自動選擇（優先臺灣中文）"}</strong>
        <small>
          {saved
            ? `${saved.lang} · ${saved.localService ? "裝置本機語音" : "瀏覽器線上語音"}`
            : "依目前裝置可用的中文語音自動選擇。"}
        </small>
        {missing && (
          <p role="status">
            此音色目前不可用，前台暫用自動選擇。可重新偵測或改選其他聲音。
          </p>
        )}
      </div>
      <div className="tts-sources">
        <div>
          <Monitor size={22} />
          <span>裝置本機語音</span>
          <b>{chinese.filter((v) => v.localService).length} 種</b>
          <small>作業系統提供，依瀏覽器回報分類。</small>
        </div>
        <div>
          <Cloud size={22} />
          <span>瀏覽器線上語音</span>
          <b>{chinese.filter((v) => !v.localService).length} 種</b>
          <small>由瀏覽器提供，可能需要網路連線。</small>
        </div>
      </div>
      {!supported && (
        <p className="alert error" role="alert">
          此瀏覽器沒有 Web Speech TTS，請使用支援中文朗讀的瀏覽器。
        </p>
      )}
      <section className="tts-config" aria-label="TTS 音色設定">
        <h2>選擇前台預設音色</h2>
        <p className="small-copy">
          只列出裝置實際提供的中文音色。試聽不會變更目前預設。
        </p>
        <label className="tts-auto-option">
          <input
            type="radio"
            name="tts-voice"
            checked={draft === "auto"}
            onChange={() => setDraft("auto")}
          />
          自動選擇（優先臺灣中文）
        </label>
        <label className="tts-filter">
          篩選來源
          <select
            aria-label="篩選 TTS 來源"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option value="all">所有可用來源</option>
            <option value="local">裝置本機語音</option>
            <option value="online">瀏覽器線上語音</option>
          </select>
        </label>
        <div className="tts-voice-list">
          {filtered.map((v) => (
            <label
              key={voiceKey(v)}
              className={
                draft === voiceKey(v)
                  ? "tts-voice-row selected"
                  : "tts-voice-row"
              }
            >
              <input
                type="radio"
                name="tts-voice"
                aria-label={`選擇音色 ${v.name} ${v.lang}`}
                checked={draft === voiceKey(v)}
                onChange={() => setDraft(voiceKey(v))}
              />
              <span>
                <strong>{v.name}</strong>
                <small>
                  {v.lang} · {v.localService ? "裝置本機" : "瀏覽器線上"}
                  {v.default ? " · 系統預設" : ""}
                </small>
              </span>
              {saved && voiceKey(saved) === voiceKey(v) && (
                <span className="tts-saved">
                  <Check size={14} />
                  前台預設
                </span>
              )}
            </label>
          ))}
        </div>
        {!filtered.length && (
          <p className="tts-empty" role="status">
            {chinese.length
              ? "這個來源目前沒有可用的中文音色。"
              : "尚未偵測到中文音色。可按重新偵測；若仍為空，請先在作業系統安裝中文語音，或換用其他瀏覽器。"}
          </p>
        )}
        <label className="tts-sample">
          試聽文字
          <textarea
            aria-label="試聽文字"
            rows={3}
            maxLength={300}
            value={sample}
            onChange={(e) => setSample(e.target.value)}
          />
        </label>
        <div className="tts-config-actions">
          <button
            className="secondary"
            disabled={
              !supported || !sample.trim() || (draft !== "auto" && !selected)
            }
            onClick={() =>
              preview(
                sample,
                draft === "auto" ? null : voicePreference(selected!),
              )
            }
          >
            <Volume2 size={17} />
            試聽所選音色
          </button>
          <button
            className="primary"
            disabled={draft !== "auto" && !selected}
            onClick={() =>
              save(draft === "auto" ? null : voicePreference(selected!))
            }
          >
            <Check size={17} />
            設為前台預設
          </button>
        </div>
        <SpeechTools
          label="朗讀設定說明"
          read={() =>
            "這裡可以選擇 TTS 語音來源。選擇中文音色後，先按試聽；確認喜歡後按設為前台預設。設定只影響目前瀏覽器。"
          }
        />
      </section>
      <section className="tts-cloud-note">
        <h2>其他雲端 TTS 服務</h2>
        <span className="warning-pill">尚未串接</span>
        <p>
          Google Cloud、Azure、OpenAI 等獨立 API
          服務，目前不能選為前台預設。需另建安全後端及服務授權，API
          金鑰不會放在這個前端設定頁。
        </p>
      </section>
      <StructureAiSettings />
      <p className="backup-note">
        此頁管理這台瀏覽器的朗讀偏好，沒有管理員登入或跨裝置同步；其他電腦需要重新設定。教育部筆順播放器的聲音仍獨立控制。
      </p>
    </>
  );
}
