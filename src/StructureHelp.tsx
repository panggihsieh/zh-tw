import { useState } from "react";
import atlas from "./structureAtlas.json";

export default function StructureHelp() {
  const [query, setQuery] = useState("");
  const keyword = query.trim();
  const groups = atlas.map(group => ({
    ...group,
    items: group.items.filter(item => [group.title, item.title, item.caption].some(text => text.includes(keyword))),
  })).filter(group => group.items.length);
  const total = atlas.reduce((count, group) => count + group.items.length, 0);

  return (
    <section
      id="structure-help"
      className="structure-help"
      aria-label="字形結構資料庫"
    >
      <h2>字形結構資料庫</h2>
      <p>{atlas.length} 大類 · {total} 張縮圖</p>
      <div className="structure-help-links">
        <a href="/structure-atlas/" target="_blank" rel="noreferrer">
          開啟完整 SVG 圖例 ↗
        </a>
        <a href="/structure-review/editor.html?mode=lesson">
          每課生字結構筆畫查詢
        </a>
      </div>
      <label>搜尋結構名稱或比例
        <input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="例如：上下、上短下長、35 : 65" />
      </label>
      {groups.length === 0 && <p role="status">找不到符合的結構。</p>}
      {groups.map((group) => (
        <details key={group.title + Boolean(keyword)} open={keyword ? true : undefined}>
          <summary>
            {group.title}
            <span>{group.items.length} 種圖例</span>
          </summary>
          <div className="structure-help-grid">
            {group.items.map((item) => (
              <figure key={item.image}>
                <img
                  src={item.image}
                  alt={`${item.title}位置示意`}
                  width="160"
                  height="160"
                  loading="lazy"
                />
                <figcaption>
                  <strong>{item.title}</strong>
                  <span>{item.caption}</span>
                </figcaption>
              </figure>
            ))}
          </div>
        </details>
      ))}
      <p className="backup-note">
        比例是教學示意，可依生字微調；色塊不代表精確字形輪廓。品字形表示三個同類部件；形音義與字源仍須另外查證。
      </p>
    </section>
  );
}
