import { describe, expect, it } from "vitest";
import data from "../public/dictionaries/moe-concised.json";
import { lookupEntries, officialLinks } from "./OfficialDictionary";

describe("official dictionary", () => {
  it("includes the complete version and all original columns", () => {
    expect(data.version).toBe("2014_20260929");
    expect(data.entries).toHaveLength(45178);
    expect(data.columns).toHaveLength(15);
    expect(data.entries.every((entry) => entry.length === 15)).toBe(true);
  });
  it("looks up the screenshot's missing phrase with official reading and full definition", () => {
    const entries = lookupEntries(data, "測量");
    expect(entries).toHaveLength(1);
    expect(entries[0][6]).toBe("ㄘㄜˋ　ㄌㄧㄤˊ");
    expect(entries[0][13]).toContain("使用儀器或量具");
    expect(entries[0][13]).toContain("絲毫馬虎不得。");
  });
  it("keeps multiple pronunciations instead of selecting one arbitrarily", () => {
    const entries = lookupEntries(data, "量");
    expect(entries.length).toBeGreaterThan(1);
    expect(new Set(entries.map((entry) => entry[6])).size).toBeGreaterThan(1);
  });
  it("does not replace missing phrases with partial matches", () => {
    expect(lookupEntries(data, "測量測量測量")).toEqual([]);
  });
  it("encodes the current phrase in both official search links", () => {
    const links = officialLinks("測量");
    expect(new URL(links.moe).searchParams.get("word")).toBe("測量");
    expect(new URL(links.naer).searchParams.get("WORD")).toBe("測量");
  });
});
