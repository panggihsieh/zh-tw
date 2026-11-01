import { afterEach, beforeEach, expect, it, vi } from "vitest";
const fake = vi.hoisted(() => ({ initialize: vi.fn((_options: unknown) => ({})) }));
vi.mock("firebase/app", () => ({ initializeApp: fake.initialize }));
vi.mock("firebase/auth", () => ({
  getAuth: () => ({}),
  GoogleAuthProvider: class {},
  signInWithPopup: vi.fn(),
  signInWithRedirect: vi.fn(),
  getRedirectResult: vi.fn(),
  signOut: vi.fn(),
}));
vi.mock("firebase/firestore", () => ({
  getFirestore: () => ({}),
  collection: vi.fn(),
  doc: vi.fn(),
  getDocs: vi.fn(),
  runTransaction: vi.fn(),
}));
beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  vi.stubEnv(
    "VITE_FIREBASE_CONFIG",
    JSON.stringify({
      projectId: "voltaic-circuit-511310-a3",
      apiKey: "test",
      appId: "test",
      authDomain: "original.firebaseapp.com",
    }),
  );
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});
it.each([
  [
    "voltaic-circuit-511310-a3-zh-tw.web.app",
    "voltaic-circuit-511310-a3-zh-tw.web.app",
  ],
  [
    "voltaic-circuit-511310-a3-zh-tw.firebaseapp.com",
    "voltaic-circuit-511310-a3-zh-tw.firebaseapp.com",
  ],
  ["127.0.0.1", "original.firebaseapp.com"],
  ["attacker.example", "original.firebaseapp.com"],
])(
  "uses same-origin OAuth helpers only for the dedicated site: %s",
  async (hostname, domain) => {
    vi.stubGlobal("window", { location: { hostname } });
    const { cloudServices } = await import("./cloudSync");
    cloudServices();
    expect(fake.initialize.mock.calls[0][0]).toMatchObject({
      authDomain: domain,
    });
  },
);
