import type { CharacterMaster } from "./model";

export default function StructureDiagram({
  master,
}: {
  master: CharacterMaster;
}) {
  if (master.verificationStatus === "unavailable") return null;
  const parts = master.components.length
    ? master.components
    : [master.character];
  return (
    <figure className="structure-diagram">
      <div
        className={`structure-square structure-${master.layout}`}
        role="img"
        aria-label={`${master.character}：${master.structure}，${parts.join("、")}，部件位置示意`}
      >
        {parts.map((part, index) => (
          <div className="structure-cell" key={index}>
            <span>{part}</span>
          </div>
        ))}
      </div>
      <figcaption>
        {master.structure} · 部件位置示意，分區比例非精確字形
      </figcaption>
    </figure>
  );
}
