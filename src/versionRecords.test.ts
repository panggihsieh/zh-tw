import { describe, expect, it } from "vitest";
import { addVersionRecord, readVersionRecords } from "./versionRecords";

function memoryStorage(initial = "") {
  let value = initial;
  return {
    getItem: () => value || null,
    setItem: (_key: string, next: string) => {
      value = next;
    },
    value: () => value,
  };
}

describe("version records", () => {
  it("ignores invalid saved data", () => {
    expect(
      readVersionRecords(memoryStorage("not-json") as unknown as Storage),
    ).toEqual([]);
  });

  it("stores the latest record once per version", () => {
    const storage = memoryStorage();
    const base = {
      id: "one",
      version: "1.5.4",
      date: "2026/11/14",
      summary: "初版",
      submittedAt: "2026-11-14T01:00:00.000Z",
    };
    addVersionRecord(storage as unknown as Storage, base);
    const records = addVersionRecord(storage as unknown as Storage, {
      ...base,
      id: "two",
      summary: "更新摘要",
    });
    expect(records).toHaveLength(1);
    expect(records[0].summary).toBe("更新摘要");
    expect(JSON.parse(storage.value())).toEqual(records);
  });
});
