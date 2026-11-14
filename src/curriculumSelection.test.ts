import { describe, expect, it } from "vitest";
import { orderCurriculumSelection } from "./curriculumSelection";

describe("課本自訂選字順序", () => {
  it("依課文字表排序，不受使用者點選先後影響", () => {
    expect(orderCurriculumSelection("設弧杆棟磁鱗薑霜爪聖", ["聖", "設", "磁"]))
      .toEqual(["設", "磁", "聖"]);
  });

  it("忽略不在本課的字並去除重複", () => {
    expect(orderCurriculumSelection("設弧設杆", ["設", "設", "外"]))
      .toEqual(["設"]);
  });
});
