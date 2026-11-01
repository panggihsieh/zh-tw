import { initializeApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
} from "firebase/auth";
import {
  collection,
  doc,
  getDocs,
  getFirestore,
  runTransaction,
} from "firebase/firestore";
import type { Collection } from "./model";
import { parseBackup } from "./storage";

export const CLOUD_ROOT = "hanzi_notebook_users";
export const cloudConfigured = Boolean(import.meta.env.VITE_FIREBASE_CONFIG);
let services: ReturnType<typeof createServices> | undefined;
function createServices() {
  const config = JSON.parse(import.meta.env.VITE_FIREBASE_CONFIG || "{}");
  if (
    config.projectId !== "voltaic-circuit-511310-a3" ||
    !config.apiKey ||
    !config.appId
  )
    throw new Error("Firebase 設定缺少資料或專案不符。");
  const app = initializeApp(config, "hanzi-notebook");
  return { auth: getAuth(app), db: getFirestore(app) };
}
export function cloudServices() {
  return (services ??= createServices());
}
export async function cloudLogin() {
  return signInWithPopup(cloudServices().auth, new GoogleAuthProvider());
}
export async function cloudLogout() {
  await signOut(cloudServices().auth);
}
function userCollections() {
  const { auth, db } = cloudServices();
  if (!auth.currentUser) throw new Error("請先登入 Google 帳號。");
  return collection(db, CLOUD_ROOT, auth.currentUser.uid, "collections");
}
export function collectionEnvelope(value: Collection) {
  if (!Number.isFinite(Date.parse(value.updatedAt)))
    throw new Error("收藏時間格式不符。");
  const payload = JSON.stringify(parseBackup(JSON.stringify(value)));
  if (new TextEncoder().encode(payload).length > 700_000)
    throw new Error(`「${value.sourcePhrase}」資料過大，請改用 JSON 備份。`);
  return { schemaVersion: 1, updatedAt: value.updatedAt, payload };
}
export function readCloudCollection(value: unknown): Collection {
  const envelope = value as ReturnType<typeof collectionEnvelope>;
  if (envelope?.schemaVersion !== 1 || typeof envelope.payload !== "string")
    throw new Error("雲端收藏格式不符。");
  const item = parseBackup(envelope.payload);
  if (
    item.updatedAt !== envelope.updatedAt ||
    !Number.isFinite(Date.parse(item.updatedAt))
  )
    throw new Error("雲端收藏時間格式不符。");
  return item;
}
export async function uploadCloudCollections(items: Collection[]) {
  const target = userCollections();
  for (const item of items) {
    const envelope = collectionEnvelope(item);
    const id = `c-${encodeURIComponent(item.id)}`;
    if (new TextEncoder().encode(id).length > 1400)
      throw new Error("收藏識別碼過長。");
    await runTransaction(cloudServices().db, async (tx) => {
      const ref = doc(target, id);
      const existing = await tx.get(ref);
      if (
        existing.exists() &&
        Date.parse(readCloudCollection(existing.data()).updatedAt) >=
          Date.parse(item.updatedAt)
      )
        return;
      tx.set(ref, envelope);
    });
  }
}
export async function downloadCloudCollections() {
  const result = await getDocs(userCollections());
  return result.docs.map((snapshot) => readCloudCollection(snapshot.data()));
}
