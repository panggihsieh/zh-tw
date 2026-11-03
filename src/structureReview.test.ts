import { describe, expect, it } from "vitest";
import { confirmedStructureLabel, structureFingerprint } from "./structureReview";
import type { CharacterMaster } from "./model";
const master: CharacterMaster = {
  character: "駛", radical: "馬", structure: "左右結構（候選，待核對）",
  components: ["馬", "史"], layout: "horizontal", verificationStatus: "partial",
  sources: [], version: "1",
};
describe("管理者核對結構", () => {
  it("確認後標題及圖說可顯示已確認，不再標示候選", () => {
    expect(confirmedStructureLabel(master.structure)).toBe("左右結構（已確認）");
    expect(confirmedStructureLabel("左右結構")).toBe("左右結構");
  });
  it("同一字同一版本的結構有固定識別，結構異動必須重新確認", () => {
    const signature = structureFingerprint(master);
    expect(structureFingerprint({ ...master })).toBe(signature);
    for (const change of [{ character: "馳" }, { version: "2" }, { components: ["馬", "也"] }, { layout: "vertical" as const }, { structure: "上下結構" }, { radical: "史" }])
      expect(structureFingerprint({ ...master, ...change })).not.toBe(signature);
  });
});
