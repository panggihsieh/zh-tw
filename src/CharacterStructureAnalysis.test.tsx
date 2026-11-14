import { describe, expect, it } from "vitest";
import { analyzeStructure } from "./CharacterStructureAnalysis";
import type { CharacterMaster } from "./model";
import { structureClues } from "./structureClues";

const master = (overrides: Partial<CharacterMaster> = {}): CharacterMaster => ({
  character: "銀",
  radical: "金",
  structure: "左右結構",
  components: ["金字旁", "艮"],
  layout: "horizontal",
  verificationStatus: "partial",
  sources: [],
  version: "test",
  ...overrides,
});

describe("analyzeStructure", () => {
  it("describes positions and identifies the radical component", () => {
    expect(analyzeStructure(master())).toEqual([
      { name: "金字旁", position: "左側", role: "部首線索" },
      { name: "艮", position: "右側", role: "組字部件" },
    ]);
  });

  it("supports three-part structures", () => {
    expect(
      analyzeStructure(
        master({
          radical: "言",
          layout: "triple",
          components: ["言", "身", "寸"],
        }),
      ),
    ).toEqual([
      { name: "言", position: "左側", role: "部首線索" },
      { name: "身", position: "中間", role: "組字部件" },
      { name: "寸", position: "右側", role: "組字部件" },
    ]);
  });

  it("keeps sound and meaning clues tied to reviewed components", () => {
    expect(structureClues("銀")?.sound?.componentIndexes).toEqual([1]);
    expect(structureClues("銀")?.meaning?.componentIndexes).toEqual([0]);
    expect(structureClues("未收錄")).toBeNull();
  });
});
