import { useEffect, useState } from "react";
import { Check, Palette, Plus, Star, BookOpen } from "lucide-react";
import { builtInThemes, colorKeys, themeVariables, watchThemeLibrary, saveSiteTheme, type SiteTheme } from "./siteThemes";
const labels = { primary: "主色", dark: "深色", accent: "點綴色", background: "頁面背景", surface: "卡片背景", ink: "文字", border: "邊框" };
export default function SiteThemeLibrary({ active }: { active: SiteTheme }) {
  const [themes, setThemes] = useState(builtInThemes);
  const [draft, setDraft] = useState<SiteTheme>(active);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  useEffect(() => watchThemeLibrary(setThemes, () => setMessage("目前顯示內建樣式；雲端樣式庫尚未連線，請確認權限規則。")), []);
  async function save(apply: boolean) {
    setBusy(true); setMessage("");
    try {
      await saveSiteTheme(draft, apply);
      setMessage(apply ? "已套用全站，開啟中的網站也會同步更新。" : "已儲存樣式。若此樣式正在使用，全站會同步更新。");
    } catch(e) { setMessage(e instanceof Error ? e.message : "儲存失敗，請重試。"); }
    finally { setBusy(false); }
  }
  return <section className="theme-library">
    <p>目前全站樣式：<strong>{active.name}</strong>。選取樣式可先預覽，按「套用全站」後立即生效。</p>
    <div className="theme-library-grid">{themes.map(t => <button key={t.id} className={`theme-choice${draft.id === t.id ? " selected" : ""}`} aria-pressed={draft.id === t.id} disabled={busy} onClick={() => { setDraft(structuredClone(t)); setMessage(""); }}>
      <span className="theme-swatches">{[t.colors.primary,t.colors.accent,t.colors.background].map((c,i) => <i key={i} style={{background:c}} />)}</span>
      <strong>{t.name}</strong><span>{active.id === t.id ? "目前使用中" : "點選預覽"}</span>
    </button>)}</div>
    <button className="secondary" disabled={busy} onClick={() => { setDraft({ ...structuredClone(draft), id: `style-${crypto.randomUUID()}`, name: "新樣式" }); setMessage("已建立草稿，調整後請儲存。"); }}><Plus size={18}/>新增樣式</button>
    <div className="theme-editor">
      <div className="theme-fields"><label>樣式名稱<input value={draft.name} maxLength={40} disabled={busy} onChange={e => setDraft({...draft,name:e.target.value})}/></label>
        <div className="theme-colors">{colorKeys.map(k => <label key={k}>{labels[k]}<input type="color" value={draft.colors[k]} disabled={busy} onChange={e => setDraft({...draft,colors:{...draft.colors,[k]:e.target.value}})}/><small>{draft.colors[k]}</small></label>)}</div>
        <label>卡片圓角：{draft.radius}px<input type="range" min="8" max="32" value={draft.radius} disabled={busy} onChange={e => setDraft({...draft,radius:Number(e.target.value)})}/></label>
      </div>
      <div className="theme-preview" style={themeVariables(draft)} aria-label="樣式即時預覽">
        <div className="theme-preview-bar"><Palette size={20}/>{draft.name}</div>
        <div className="theme-preview-card"><Star size={32}/><h2>一起探索生字世界！</h2><p>同一個網站，多種喜歡的風格。</p><button type="button" tabIndex={-1}>開始學習</button><span><BookOpen size={18}/> 我的生字收藏本</span></div>
      </div>
    </div>
    <div className="theme-save-actions"><button className="secondary" disabled={busy || !draft.name.trim()} onClick={() => void save(false)}>儲存樣式</button><button className="primary" disabled={busy || !draft.name.trim()} onClick={() => void save(true)}><Check size={18}/>{busy ? "處理中…" : "套用全站"}</button></div>
    <p role="status">{message}</p>
    <details><summary>森林冒險風格參考圖</summary><img className="theme-reference" src={`${import.meta.env.BASE_URL}style-references/forest-adventure.png`} alt="綠色冒險風格參考：森林、圓角卡片、鮮綠按鈕與金色點綴"/></details>
  </section>;
}
