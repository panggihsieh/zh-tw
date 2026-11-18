import type { CharacterMaster } from "./model";
// Editorial teaching proportions, not measured outlines or official typography.
const profiles: Record<
  string,
  {
    layout: CharacterMaster["layout"];
    parts: string[];
    weights: number[];
    label: string;
    assemblyBoxes?: number[][];
  }
> = {
  稠: {
    layout: "horizontal",
    parts: ["禾", "周"],
    weights: [35, 65],
    label: "左窄右寬",
  },
  椒: {
    layout: "horizontal",
    parts: ["木", "叔"],
    weights: [35, 65],
    label: "左窄右寬",
  },
  葵: {
    layout: "vertical",
    parts: ["艹", "癸"],
    weights: [28, 72],
    label: "上短下長",
  },
  察: {
    layout: "vertical",
    parts: ["宀", "祭"],
    weights: [28, 72],
    label: "上短下長",
    // Teaching placement within the rendered full glyph's ink bounds.
    // The roof and base overlap vertically instead of occupying disjoint cells.
    assemblyBoxes: [[0, 0, 1, 0.38], [0.06, 0.23, 0.92, 0.77]],
  },
};
export function structureProfile(master: CharacterMaster) {
  const profile = profiles[master.character];
  return profile &&
    profile.layout === master.layout &&
    profile.parts.join("|") === master.components.map(part => part === "++" ? "艹" : part).join("|")
    ? profile
    : null;
}
