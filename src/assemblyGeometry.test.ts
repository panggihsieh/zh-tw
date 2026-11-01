import { expect, it } from "vitest";
import { fitInk, relativeInkBox } from "./assemblyGeometry";
import { CHARACTERS } from "./data";
import { structureProfile } from "./structureProfiles";
it("fits actual ink bounds without carrying the font's empty viewbox margins", () => {
  expect(fitInk({x:30,y:40,width:240,height:80},{x:20,y:25,width:260,height:90})).toBe("matrix(1.0833333333333333 0 0 1.125 -12.5 -20)");
  expect(fitInk({x:0,y:0,width:0,height:80},{x:0,y:0,width:100,height:100})).toBeNull();
});
it("assembles 察 with overlapping roof and base placements within the full glyph", () => {
  const boxes=structureProfile(CHARACTERS.察)!.assemblyBoxes!;
  const full={x:25,y:20,width:250,height:260};
  const roof=relativeInkBox(full,boxes[0]),base=relativeInkBox(full,boxes[1]);
  expect(roof.y+roof.height).toBeGreaterThan(base.y);
  expect(roof.x).toBe(full.x);
  expect(base.y+base.height).toBeCloseTo(full.y+full.height);
});
