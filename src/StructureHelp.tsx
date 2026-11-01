import atlas from "./structureAtlas.json";

export default function StructureHelp() {
  return (
    <section
      id="structure-help"
      className="structure-help"
      aria-label="字形結構說明"
    >
      <h2>字形結構說明</h2>
      <p>八大主結構與子結構縮圖。正方形內只畫部件位置，名稱與比例標在框外。</p>
      <div className="structure-help-links">
        <a href="/structure-atlas/" target="_blank" rel="noreferrer">
          開啟完整 SVG 圖例 ↗
        </a>
        <a href="/structure-review/editor.html?mode=lesson">
          每課生字結構筆畫查詢
        </a>
      </div>
      {atlas.map((group) => (
        <details key={group.title}>
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
