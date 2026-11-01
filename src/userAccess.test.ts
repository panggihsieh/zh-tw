import { expect, it } from "vitest";
import type { User } from "firebase/auth";
import { isAdmin, normalizeEmail } from "./userAccess";
const admin = {
  email: "teacher.hsieh@gmail.com",
  emailVerified: true,
  providerData: [{ providerId: "google.com" }],
} as User;
it("only accepts the verified Google administrator", () => {
  expect(isAdmin(admin)).toBe(true);
  expect(isAdmin(null)).toBeFalsy();
  expect(isAdmin({ ...admin, email: "other@gmail.com" })).toBeFalsy();
  expect(isAdmin({ ...admin, emailVerified: false })).toBeFalsy();
  expect(
    isAdmin({ ...admin, providerData: [{ providerId: "password" }] } as User),
  ).toBeFalsy();
});
it("normalizes account emails and prevents path injection", () => {
  expect(normalizeEmail(" Student@GMAIL.COM ")).toBe("student@gmail.com");
  for (const value of ["", "invalid", "a/b@gmail.com", "../root", "a@b"])
    expect(() => normalizeEmail(value)).toThrow();
});
