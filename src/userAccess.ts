import {
  doc,
  getDoc,
  getDocs,
  collection,
  runTransaction,
  setDoc,
} from "firebase/firestore";
import type { User } from "firebase/auth";
import { cloudServices } from "./cloudSync";

export const ADMIN_EMAIL = "teacher.hsieh@gmail.com";
export const ACCESS_ROOT = "hanzi_notebook_access";
export function isAdmin(user: User | null) {
  return (
    user?.email === ADMIN_EMAIL &&
    user.emailVerified &&
    user.providerData.some((provider) => provider.providerId === "google.com")
  );
}
export interface AppUser {
  email: string;
  displayName: string;
  enabled: boolean;
}
export function normalizeEmail(email: string) {
  const value = email.trim().toLowerCase();
  if (
    !/^[a-z0-9.!#$%&'*+?^_`{|}~-]+@[a-z0-9-]+(?:\.[a-z0-9-]+)+$/.test(value) ||
    value.length > 254
  )
    throw new Error("請輸入有效的 Google 帳號電子郵件。");
  return value;
}
export async function registerAppUser(user: User) {
  if (!user.email || !user.emailVerified)
    throw new Error("請使用已驗證的 Google 帳號。");
  const ref = doc(cloudServices().db, ACCESS_ROOT, normalizeEmail(user.email));
  await runTransaction(cloudServices().db, async (tx) => {
    const existing = await tx.get(ref);
    if (!existing.exists())
      tx.set(ref, {
        email: user.email!.toLowerCase(),
        displayName: (user.displayName || "").slice(0, 80),
        enabled: true,
      });
  });
}
export async function appUserEnabled(user: User) {
  if (isAdmin(user)) return true;
  if (!user.email || !user.emailVerified) return false;
  const value = await getDoc(
    doc(cloudServices().db, ACCESS_ROOT, normalizeEmail(user.email)),
  );
  return !value.exists() || value.data().enabled === true;
}
export async function listAppUsers(): Promise<AppUser[]> {
  if (!isAdmin(cloudServices().auth.currentUser))
    throw new Error("僅管理者可使用。");
  const result = await getDocs(collection(cloudServices().db, ACCESS_ROOT));
  return result.docs
    .map((entry) => entry.data() as AppUser)
    .sort((a, b) => a.email.localeCompare(b.email));
}
export async function saveAppUser(value: AppUser) {
  if (!isAdmin(cloudServices().auth.currentUser))
    throw new Error("僅管理者可使用。");
  const email = normalizeEmail(value.email);
  if (email === ADMIN_EMAIL) throw new Error("固定管理者不可停用或修改。");
  await setDoc(doc(cloudServices().db, ACCESS_ROOT, email), {
    email,
    displayName: value.displayName.trim().slice(0, 80),
    enabled: value.enabled,
  });
}
