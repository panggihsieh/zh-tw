import { useEffect, useState } from "react";
import type { CharacterMaster } from "./model";
import { structureProfile } from "./structureProfiles";
import { structureClues, type StructureClueKind } from "./structureClues";

export interface StructurePartAnalysis {
  name: string;
  position: string;
  role: "部首線索" | "組字部件";
}

const POSITION_LABELS: Record<CharacterMaster["layout"], string[]> = {
  vertical: ["上方", "下方"],
  horizontal: ["左側", "右側"],
  triple: ["左側", "中間", "右側"],
  whole: ["整體"],
};

function matchesRadical(part: string, radical: string) {
  return part === radical || part.startsWith(radical) || part.endsWith(radical);
}

export function analyzeStructure(
  master: CharacterMaster,
): StructurePartAnalysis[] {
  const labels = POSITION_LABELS[master.layout];
  return master.components.map((name, index) => ({
    name,
    position: labels[index] || `第 ${index + 1} 部分`,
    role: matchesRadical(name, master.radical) ? "部首線索" : "組字部件",
  }));
}

function structureSentence(
  master: CharacterMaster,
  parts: StructurePartAnalysis[],
) {
  if (!parts.length) {
    return master.layout === "whole"
      ? `${master.character}目前以完整字形觀察，不拆成第一層部件。`
      : `${master.character}目前還沒有已核對的第一層部件資料。`;
  }
  return `${master.character}是${master.structure}，第一層可先觀察${parts
    .map((part) => `${part.position}的「${part.name}」`)
    .join("、")}。`;
}

export default function CharacterStructureAnalysis({
  master,
}: {
  master: CharacterMaster;
}) {
  const parts = analyzeStructure(master);
  const [selectedPart, setSelectedPart] = useState<number | null>(
    parts.length ? 0 : null,
  );
  const [clueKind, setClueKind] = useState<StructureClueKind>("shape");
  useEffect(() => {
    setSelectedPart(parts.length ? 0 : null);
    setClueKind("shape");
  }, [master.character]);
  const clues = structureClues(master.character, master.components);
  const activeClue = clueKind === "shape" ? null : clues?.[clueKind];
  const highlightedParts = activeClue?.componentIndexes || [];
  const profile = structureProfile(master);
  const tracks = profile?.weights
    .map((weight) => `minmax(0, ${weight}fr)`)
    .join(" ");
  const gridStyle = tracks
    ? master.layout === "vertical"
      ? { gridTemplateRows: tracks }
      : { gridTemplateColumns: tracks }
    : undefined;

  return (
    <section
      className="character-structure-analysis"
      aria-labelledby={`structure-title-${master.character}`}
    >
      <div className="structure-analysis-heading">
        <div>
          <span className="overline">字形結構分析</span>
          <h2 id={`structure-title-${master.character}`}>
            {master.character}・{master.structure}
          </h2>
        </div>
        <span className="structure-radical">部首：{master.radical}</span>
      </div>

      {master.verificationStatus === "unavailable" ? (
        <div className="structure-analysis-empty" role="status">
          目前沒有已核對的結構資料，請由老師配合教育部字典確認。
        </div>
      ) : (
        <>
          <div
            className="structure-clue-tabs"
            role="tablist"
            aria-label="形音義線索"
          >
            {(["shape", "sound", "meaning"] as const).map((kind) => (
              <button
                type="button"
                role="tab"
                aria-selected={clueKind === kind}
                className={clueKind === kind ? "selected" : ""}
                onClick={() => setClueKind(kind)}
                key={kind}
              >
                <b>
                  {kind === "shape" ? "形" : kind === "sound" ? "音" : "義"}
                </b>
                <span>
                  {kind === "shape"
                    ? "看部件"
                    : kind === "sound"
                      ? "找聲符"
                      : "找形符"}
                </span>
              </button>
            ))}
          </div>
          <div className="structure-analysis-overview">
            <figure className="structure-part-map">
              <div
                className={`structure-part-grid structure-${master.layout}`}
                style={gridStyle}
                role="img"
                aria-label={`${master.character}的${master.structure}：${parts.map((part) => `${part.position}${part.name}`).join("、")}`}
              >
                {parts.length ? (
                  parts.map((part, index) => (
                    <button
                      type="button"
                      className={`structure-part-cell${clueKind === "shape" && selectedPart === index ? " selected" : ""}${highlightedParts.includes(index) ? ` clue-${clueKind}` : ""}${clueKind !== "shape" && !highlightedParts.includes(index) ? " muted" : ""}`}
                      key={`${part.name}-${index}`}
                      aria-pressed={selectedPart === index}
                      onClick={() => {
                        setClueKind("shape");
                        setSelectedPart(index);
                      }}
                    >
                      <b>{part.name}</b>
                      <span>{part.position}</span>
                    </button>
                  ))
                ) : (
                  <div className="structure-whole-character">
                    {master.character}
                  </div>
                )}
              </div>
              <figcaption>{profile?.label || "第一層部件位置示意"}</figcaption>
            </figure>

            <div className="structure-analysis-summary">
              {clueKind === "shape" ? (
                <p>{structureSentence(master, parts)}</p>
              ) : activeClue ? (
                <div
                  className={`structure-clue-explanation clue-${clueKind}`}
                  role="tabpanel"
                >
                  <span>{clueKind === "sound" ? "聲音線索" : "意義線索"}</span>
                  <h3>{activeClue.title}</h3>
                  <p>{activeClue.explanation}</p>
                  {activeClue.sources?.map(source => <p key={source.url}><a href={source.url} target="_blank" rel="noreferrer">{source.title}</a></p>)}
                </div>
              ) : (
                <div className="structure-clue-missing" role="tabpanel">
                  這個字的{clueKind === "sound" ? "聲音" : "意義"}
                  線索尚未經教師核對，先不自動猜測。
                </div>
              )}
              {clueKind === "shape" && parts.length > 0 && (
                <div className="structure-part-list" aria-label="部件分析">
                  {parts.map((part, index) => (
                    <button
                      type="button"
                      className={selectedPart === index ? "selected" : ""}
                      aria-pressed={selectedPart === index}
                      key={`${part.name}-${index}`}
                      onClick={() => setSelectedPart(index)}
                    >
                      <strong>
                        <span aria-hidden="true">{index + 1}</span>
                        {part.name}
                      </strong>
                      <small>
                        {part.position}・{part.role}
                      </small>
                    </button>
                  ))}
                </div>
              )}
              {selectedPart !== null && parts[selectedPart] && (
                <p
                  className="structure-selection-feedback"
                  role="status"
                  hidden={clueKind !== "shape"}
                >
                  現在觀察：
                  <b>
                    {parts[selectedPart].position}的「{parts[selectedPart].name}
                    」
                  </b>
                </p>
              )}
              {clueKind !== "shape" && clues?.synthesis && (
                <p className="structure-clue-synthesis">
                  <b>合起來想：</b>
                  {clues.synthesis}
                </p>
              )}
            </div>
          </div>
          <p className="structure-analysis-note">
            形、音、義是認字線索，不是看到部件就能直接相加出字義；未核對的內容不自動推論。
          </p>
        </>
      )}
    </section>
  );
}
