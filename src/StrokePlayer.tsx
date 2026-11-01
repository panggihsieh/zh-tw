import { useEffect, useState } from "react";
import { ExternalLink, RotateCcw } from "lucide-react";
import { MOE_LICENSE_URL, strokeFrameUrl } from "./strokeSource";

export default function StrokePlayer({ character }: { character: string }) {
  const url = strokeFrameUrl(character);
  const [reload, setReload] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    setLoaded(false);
    setSlow(false);
    const timer = setTimeout(() => setSlow(true), 12000);
    return () => clearTimeout(timer);
  }, [character, reload]);
  if (!url)
    return (
      <div className="stroke-unavailable">
        <h2>這個字的筆順尚未收錄</h2>
        <p>教育部嵌入清單沒有「{character}」，目前無可用的標準筆順播放器。</p>
        <a
          className="secondary"
          href="https://stroke-order.learningweb.moe.edu.tw/"
          target="_blank"
          rel="noreferrer"
        >
          開啟教育部筆順網 <ExternalLink size={16} />
        </a>
      </div>
    );
  return (
    <div className="stroke-lesson">
      <div className="stroke-intro">
        <div>
          <span className="overline">第 4 幕 / 看筆順</span>
          <h2>「{character}」的筆順，兩種方式慢慢學。</h2>
        </div>
        <span className="pill">教育部標準字體</span>
      </div>
      <div className="official-player">
        {!loaded && (
          <p className="stroke-loading" role="status">
            {slow
              ? "載入較久，請確認網路，或使用下方「另開官方播放器」。"
              : "正在載入教育部筆順播放器…"}
          </p>
        )}
        <iframe
          key={`${character}-${reload}`}
          title={`教育部「${character}」筆順動畫與逐筆播放器`}
          src={url}
          width="360"
          height="540"
          allow="fullscreen"
          referrerPolicy="no-referrer"
          onLoad={() => setLoaded(true)}
        />
      </div>
      <div className="stroke-links">
        <button className="secondary" onClick={() => setReload((x) => x + 1)}>
          <RotateCcw size={15} />
          重新載入
        </button>
        <a className="secondary" href={url} target="_blank" rel="noreferrer">
          另開官方播放器
          <ExternalLink size={15} />
        </a>
      </div>
      <p className="stroke-attribution">
        筆順動畫：中華民國教育部 ·{" "}
        <a
          href="https://stroke-order.learningweb.moe.edu.tw/"
          target="_blank"
          rel="noreferrer"
        >
          國字標準字體筆順學習網
        </a>{" "}
        ·{" "}
        <a href={MOE_LICENSE_URL} target="_blank" rel="noreferrer">
          CC 姓名標示－非商業性－禁止改作 3.0 臺灣
        </a>
        。需連線使用，保留官方原版內容；不納入圖片、PDF 或影片匯出。
      </p>
    </div>
  );
}
