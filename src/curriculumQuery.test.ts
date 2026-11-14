import { describe, expect, it } from "vitest";
import { compileCurriculumQuery, normalizeCurriculumPlan } from "./curriculumQuery";

describe("教材關聯查詢計畫", () => {
  it("將 AI 白名單欄位編譯成參數化查詢", () => {
    const result = compileCurriculumQuery({
      entity: "character",
      publisher: "南一",
      year: "115_1",
      grade: 5,
      term: "上",
      keyword: "際",
    });
    expect(result.sql).toContain("JOIN editions");
    expect(result.sql).toContain("lc.glyph LIKE ?");
    expect(result.sql).toContain("LIMIT 200");
    expect(result.params).toEqual(["南一", "115_1", 5, "上", "%際%", "%際%", "%際%"]);
    expect(result.sql).not.toContain("際");
  });

  it("拒絕未知實體、越界年級與過長欄位", () => {
    expect(() => normalizeCurriculumPlan({ entity: "drop" })).toThrow(/類型/);
    expect(() => normalizeCurriculumPlan({ entity: "lesson", grade: 7 })).toThrow(/年級/);
    expect(() => normalizeCurriculumPlan({ entity: "source", keyword: "x".repeat(161) })).toThrow(/keyword/);
  });
});
