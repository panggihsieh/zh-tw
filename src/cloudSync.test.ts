import { beforeEach, expect, it } from "vitest";
import "fake-indexeddb/auto";
import { buildCollection } from "./data";
import { collectionEnvelope, readCloudCollection } from "./cloudSync";
import {
  deleteCollection,
  listCollections,
  mergeCloudCollections,
} from "./storage";

beforeEach(async () => {
  for (const item of await listCollections()) await deleteCollection(item.id);
});
it("roundtrips a validated collection without sending extra local secrets", () => {
  const item = buildCollection("觀察", [1]);
  const envelope = collectionEnvelope(item);
  expect(Object.keys(envelope).sort()).toEqual([
    "payload",
    "schemaVersion",
    "updatedAt",
  ]);
  expect(readCloudCollection(envelope)).toEqual(item);
});
it("rejects malformed cloud data before importing", () => {
  expect(() =>
    readCloudCollection({ schemaVersion: 2, payload: "{}" }),
  ).toThrow();
  const envelope = collectionEnvelope(buildCollection("感謝", [0]));
  expect(() =>
    readCloudCollection({ ...envelope, updatedAt: "invalid" }),
  ).toThrow();
  expect(() =>
    collectionEnvelope({
      ...buildCollection("感謝", [0]),
      updatedAt: "invalid",
    }),
  ).toThrow();
});
it("preserves timestamps, keeps newer local versions and never deletes unrelated collections", async () => {
  const item = {
    ...buildCollection("感謝", [0]),
    updatedAt: "2026-10-01T00:00:00.000Z",
  };
  const unrelated = buildCollection("銀行", [1]);
  expect(await mergeCloudCollections([item, unrelated])).toBe(2);
  expect(
    await mergeCloudCollections([
      { ...item, updatedAt: "2026-09-01T00:00:00.000Z" },
    ]),
  ).toBe(0);
  const newer = {
    ...item,
    updatedAt: "2026-11-01T00:00:00.000Z",
    reviewState: "learned" as const,
  };
  expect(await mergeCloudCollections([newer])).toBe(1);
  expect(await listCollections()).toEqual(
    expect.arrayContaining([newer, unrelated]),
  );
});
it("validates the whole download before writing any local collection", async () => {
  const item = buildCollection("感謝", [0]);
  await expect(
    mergeCloudCollections([item, {} as typeof item]),
  ).rejects.toThrow();
  expect(await listCollections()).toEqual([]);
});
