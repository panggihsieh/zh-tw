import { beforeEach, expect, it, vi } from "vitest";
import { buildCollection } from "./data";
const fake = vi.hoisted(() => ({
  auth: { currentUser: { uid: "owner" } as { uid: string } | null },
  data: new Map<string, unknown>(),
  paths: [] as string[],
  fail: false,
}));
vi.mock("firebase/app", () => ({ initializeApp: () => ({}) }));
vi.mock("firebase/auth", () => ({
  getAuth: () => fake.auth,
  GoogleAuthProvider: class {},
  signInWithPopup: vi.fn(),
  signOut: vi.fn(),
}));
vi.mock("firebase/firestore", () => ({
  getFirestore: () => ({}),
  collection: (_db: unknown, ...segments: string[]) => {
    const path = segments.join("/");
    fake.paths.push(path);
    return path;
  },
  doc: (path: string, id: string) => `${path}/${id}`,
  getDocs: async (path: string) => ({
    docs: [...fake.data.entries()]
      .filter(([key]) => key.startsWith(path + "/"))
      .map(([, value]) => ({ data: () => value })),
  }),
  runTransaction: async (
    _db: unknown,
    action: (tx: unknown) => Promise<void>,
  ) => {
    if (fake.fail) throw new Error("permission-denied");
    await action({
      get: async (path: string) => ({
        exists: () => fake.data.has(path),
        data: () => fake.data.get(path),
      }),
      set: (path: string, value: unknown) => fake.data.set(path, value),
    });
  },
}));
import {
  collectionEnvelope,
  downloadCloudCollections,
  uploadCloudCollections,
} from "./cloudSync";
beforeEach(() => {
  fake.auth.currentUser = { uid: "owner" };
  fake.data.clear();
  fake.paths.length = 0;
  fake.fail = false;
  vi.stubEnv(
    "VITE_FIREBASE_CONFIG",
    JSON.stringify({
      projectId: "voltaic-circuit-511310-a3",
      apiKey: "test",
      appId: "test",
    }),
  );
});
it("only targets the signed-in user's independent collection", async () => {
  const item = buildCollection("感謝", [0]);
  await uploadCloudCollections([item]);
  expect(fake.paths).toEqual(["hanzi_notebook_users/owner/collections"]);
  expect(await downloadCloudCollections()).toEqual([item]);
  fake.auth.currentUser = { uid: "other" };
  expect(await downloadCloudCollections()).toEqual([]);
});
it("does not overwrite a newer cloud snapshot", async () => {
  const item = {
    ...buildCollection("感謝", [0]),
    updatedAt: "2026-10-01T00:00:00.000Z",
  };
  const newer = { ...item, updatedAt: "2026-11-01T00:00:00.000Z" };
  fake.data.set(
    `hanzi_notebook_users/owner/collections/c-${encodeURIComponent(item.id)}`,
    collectionEnvelope(newer),
  );
  await uploadCloudCollections([item]);
  expect(await downloadCloudCollections()).toEqual([newer]);
});
it("rejects signed-out access and propagates write failures", async () => {
  fake.auth.currentUser = null;
  await expect(downloadCloudCollections()).rejects.toThrow("登入");
  expect(fake.paths).toEqual([]);
  fake.auth.currentUser = { uid: "owner" };
  fake.fail = true;
  await expect(
    uploadCloudCollections([buildCollection("感謝", [0])]),
  ).rejects.toThrow("permission-denied");
  expect(fake.data.size).toBe(0);
});
