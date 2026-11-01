import type { CharacterMaster } from "./model";
// Editorial teaching proportions, not measured outlines or official typography.
const profiles: Record<
  string,
  {
    layout: CharacterMaster["layout"];
    parts: string[];
    weights: number[];
    label: string;
  }
> = {
  察: {
    layout: "vertical",
    parts: ["宀", "祭"],
    weights: [28, 72],
    label: "上短下長",
  },
};
export function structureProfile(master: CharacterMaster) {
  const profile = profiles[master.character];
  return profile &&
    profile.layout === master.layout &&
    profile.parts.join("|") === master.components.join("|")
    ? profile
    : null;
}
