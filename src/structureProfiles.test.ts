import { expect, it } from "vitest";
import { CHARACTERS } from "./data";
import { structureProfile } from "./structureProfiles";
it("uses a shorter roof and taller base for 察", () => {
  const profile = structureProfile(CHARACTERS.察)!;
  expect(profile.weights[0]).toBeLessThan(profile.weights[1]);
  expect(profile.weights.reduce((a, b) => a + b)).toBe(100);
  expect(profile.label).toBe("上矮下高");
});
it("does not apply the profile to another layout or decomposition", () => {
  expect(
    structureProfile({ ...CHARACTERS.察, components: ["其他", "部件"] }),
  ).toBeNull();
  expect(structureProfile(CHARACTERS.觀)).toBeNull();
});
