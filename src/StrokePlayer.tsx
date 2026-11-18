import { useEffect, useState } from "react";
import { ExternalLink, RotateCcw } from "lucide-react";
import { MOE_LICENSE_URL, strokeFrameUrl } from "./strokeSource";
import CompetitionWriting from './CompetitionWriting';
import StrokePlayback from './StrokePlayback';

export default function StrokePlayer({ character }: { character: string }) {
  const url = strokeFrameUrl(character);
  const [localTab,setLocalTab]=useState<'playback'|'practice'>(() => {
    try { return sessionStorage.getItem('hanzi-notebook.stroke-tab.v1') === 'practice' ? 'practice' : 'playback'; }
    catch { return 'playback'; }
  });
  useEffect(() => {
    try { sessionStorage.setItem('hanzi-notebook.stroke-tab.v1', localTab); } catch { /* storage may be disabled */ }
  }, [localTab]);
  const [reload, setReload] = useState(0);
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
  const officialActions = <><button type="button" className="secondary" onClick={() => setReload(x => x + 1)}><RotateCcw size={15}/>重新載入</button><a className="secondary" href={url} target="_blank" rel="noreferrer">另開官方播放器<ExternalLink size={15}/></a></>;
  return (
    <div className="stroke-lesson">
      <div className="stroke-intro">
        <div>
          <span className="overline">第 4 幕 / 看筆順</span>
          <h2>「{character}」的筆順，慢慢學。</h2>
        </div>
      </div>
      <details className="stroke-local-player" open>
        <summary>本站筆順播放與語音練習</summary>
        <p>使用教師已確認的逐筆口訣。尚未發布語音的生字仍可觀看動畫及書寫。</p>
        <div role="tablist" aria-label="本站筆順模式" className="stroke-local-tabs">
          <button type="button" role="tab" id="stroke-tab-playback" aria-controls="stroke-local-panel" aria-selected={localTab==='playback'} onClick={()=>setLocalTab('playback')}>筆順播放</button>
          <button type="button" role="tab" id="stroke-tab-practice" aria-controls="stroke-local-panel" aria-selected={localTab==='practice'} onClick={()=>setLocalTab('practice')}>筆順練習</button>
        </div>
        <div role="tabpanel" id="stroke-local-panel" aria-labelledby={`stroke-tab-${localTab}`}>
          {localTab==='playback'?<><StrokePlayback key={`${character}-${reload}`} character={character}/><div className="competition-actions">{officialActions}</div></>:<CompetitionWriting key={`${character}-${reload}`} character={character} mode="practice" disabled={false} onSubmit={()=>{}} extraActions={officialActions}/>}
        </div>
      </details>
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
