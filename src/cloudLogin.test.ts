import { beforeEach, expect, it, vi } from "vitest";
const fake = vi.hoisted(() => ({
  popup: vi.fn(),
  redirect: vi.fn(),
  result: vi.fn(),
  logout: vi.fn(),
  register: vi.fn(),
  enabled: vi.fn(),
}));
vi.mock("firebase/app", () => ({ initializeApp: () => ({}) }));
vi.mock("firebase/auth", () => ({
  getAuth: () => ({}),
  GoogleAuthProvider: class {
    setCustomParameters() {}
  },
  signInWithPopup: fake.popup,
  signInWithRedirect: fake.redirect,
  getRedirectResult: fake.result,
  signOut: fake.logout,
}));
vi.mock("firebase/firestore", () => ({
  getFirestore: () => ({}),
  collection: vi.fn(),
  doc: vi.fn(),
  getDocs: vi.fn(),
  runTransaction: vi.fn(),
}));
vi.mock("./userAccess", () => ({
  registerAppUser: fake.register,
  appUserEnabled: fake.enabled,
}));
import { cloudLogin, finishCloudRedirect } from "./cloudSync";
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv(
    "VITE_FIREBASE_CONFIG",
    JSON.stringify({
      projectId: "voltaic-circuit-511310-a3",
      apiKey: "test",
      appId: "test",
    }),
  );
  fake.enabled.mockResolvedValue(true);
});
it("registers and checks access after a popup login", async () => {
  const credential = { user: { email: "student@gmail.com" } };
  fake.popup.mockResolvedValue(credential);
  expect(await cloudLogin()).toEqual(credential);
  expect(fake.register).toHaveBeenCalledWith(credential.user);
  expect(fake.enabled).toHaveBeenCalledWith(credential.user);
});
it("signs out disabled accounts instead of leaving an active login", async () => {
  fake.popup.mockResolvedValue({ user: {} });
  fake.enabled.mockResolvedValue(false);
  await expect(cloudLogin()).rejects.toThrow("停用");
  expect(fake.logout).toHaveBeenCalledTimes(1);
});
it("offers full-page redirect without waiting on the popup", async () => {
  await cloudLogin(true);
  expect(fake.redirect).toHaveBeenCalledTimes(1);
  expect(fake.popup).not.toHaveBeenCalled();
  expect(fake.register).not.toHaveBeenCalled();
});
it("finishes a returned redirect only once", async () => {
  fake.result.mockResolvedValue({ user: {} });
  await Promise.all([finishCloudRedirect(), finishCloudRedirect()]);
  expect(fake.result).toHaveBeenCalledTimes(1);
  expect(fake.register).toHaveBeenCalledTimes(1);
});
