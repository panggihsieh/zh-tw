import { expect, it } from "vitest";
import { CHARACTERS } from "./data";
import { structureProfile } from "./structureProfiles";
it("uses a shorter roof and taller base for 察", () => {
  const profile = structureProfile(CHARACTERS.察)!;
  expect(profile.weights[0]).toBeLessThan(profile.weights[1]);
  expect(profile.weights.reduce((a, b) => a + b)).toBe(100);
  expect(profile.label).toBe("上短下長");
});
it("does not apply the profile to another layout or decomposition", () => {
  expect(
    structureProfile({ ...CHARACTERS.察, components: ["其他", "部件"] }),
  ).toBeNull();
  expect(structureProfile(CHARACTERS.觀)).toBeNull();
});

it("shows 稠 as left-narrow right-wide only for 禾 plus 周", () => {
  const master = { ...CHARACTERS.椒, character: "稠", layout: "horizontal" as const, components: ["禾", "周"] };
  expect(structureProfile(master)).toMatchObject({label: "左窄右寬", weights: [35, 65]});
  expect(structureProfile({...master, components: ["禾", "其他"]})).toBeNull();
});
