import type { CharacterMaster } from "./model";
import { structureProfile } from "./structureProfiles";

export default function StructureDiagram({
  master,
}: {
  master: CharacterMaster;
}) {
  if (master.verificationStatus === "unavailable") return null;
  const parts = master.components.length
    ? master.components
    : [master.character];
  const profile = structureProfile(master);
  const tracks = profile?.weights
    .map((weight) => `minmax(0, ${weight}fr)`)
    .join(" ");
  return (
    <figure className="structure-diagram">
      <div
        className={`structure-square structure-${master.layout}`}
        style={
          tracks
            ? master.layout === "vertical"
              ? { gridTemplateRows: tracks }
              : { gridTemplateColumns: tracks }
            : undefined
        }
        role="img"
        aria-label={`${master.character}：${master.structure}${profile ? `，${profile.label}` : ""}，${parts.join("、")}，部件位置示意`}
      >
        {parts.map((_, index) => (
          <div className="structure-cell" key={index} aria-hidden="true" />
        ))}
      </div>
      <figcaption>
        {master.structure}
        {profile && `（${profile.label}）`} · 部件位置示意，分區比例非精確字形
      </figcaption>
    </figure>
  );
}
