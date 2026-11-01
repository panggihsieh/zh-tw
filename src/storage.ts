import { openDB } from "idb";
import type { Collection } from "./model";
import { validatePhrase } from "./model";
const db = () =>
  openDB("hanzi-notebook", 1, {
    upgrade(database) {
      database.createObjectStore("collections", { keyPath: "id" });
    },
  });
export async function saveCollection(collection: Collection) {
  const database = await db();
  await database.put(
    "collections",
    structuredClone({ ...collection, updatedAt: new Date().toISOString() }),
  );
}
export async function listCollections(): Promise<Collection[]> {
  const database = await db();
  const list: Collection[] = await database.getAll("collections");
  return list.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}
export async function deleteCollection(id: string) {
  const database = await db();
  await database.delete("collections", id);
}
export function parseBackup(text: string): Collection {
  const data = JSON.parse(text);
  if (
    data?.schemaVersion !== 1 ||
    typeof data.id !== "string" ||
    typeof data.sourcePhrase !== "string" ||
    validatePhrase(data.sourcePhrase) !== "" ||
    !Array.isArray(data.cards) ||
    !data.cards.length ||
    data.cards.length > 8 ||
    !Array.isArray(data.scenes) ||
    data.scenes.length !== 6 ||
    !["practice", "learned"].includes(data.reviewState) ||
    typeof data.updatedAt !== "string" ||
    typeof data.createdAt !== "string" ||
    typeof data.dataVersion !== "string" ||
    !Array.isArray(data.selectedCharacters)
  )
    throw new Error("不是有效的生字本備份。");
  for (const c of data.cards) {
    if (
      typeof c?.id !== "string" ||
      typeof c.character !== "string" ||
      Array.from(c.character).length !== 1 ||
      typeof c.reading !== "string" ||
      typeof c.meaning !== "string" ||
      typeof c.simple !== "string" ||
      !Number.isInteger(c.position) ||
      Array.from(data.sourcePhrase)[c.position] !== c.character ||
      !c.master ||
      typeof c.master.structure !== "string" ||
      typeof c.master.radical !== "string" ||
      !["whole", "vertical", "horizontal", "triple"].includes(
        c.master.layout,
      ) ||
      !["partial", "unavailable"].includes(c.master.verificationStatus) ||
      !Array.isArray(c.master.components) ||
      !c.master.components.every((x: unknown) => typeof x === "string") ||
      !Array.isArray(c.master.sources) ||
      !Array.isArray(c.vocabulary) ||
      c.vocabulary.length > 9 ||
      !Array.isArray(c.rememberedWords) ||
      !c.rememberedWords.every((x: unknown) => typeof x === "string") ||
      !Array.isArray(c.visitedScenes) ||
      !c.visitedScenes.every(
        (x: unknown) => Number.isInteger(x) && Number(x) >= 0 && Number(x) < 6,
      )
    )
      throw new Error("備份的字卡格式不完整。");
    if (
      [
        c.reading,
        c.meaning,
        c.simple,
        c.master.structure,
        c.master.radical,
      ].some((value) => value.length > 1000)
    )
      throw new Error("備份的文字超過字卡可用長度。");
    for (const v of c.vocabulary) {
      if (
        !["word", "reading", "meaning", "example", "sense"].every(
          (k) => typeof v?.[k] === "string" && v[k].length <= 300,
        )
      )
        throw new Error("備份的造詞格式不完整。");
    }
    for (const s of [
      ...c.master.sources,
      ...c.vocabulary.map((v: { source: unknown }) => v.source),
      ...(c.source ? [c.source] : []),
    ]) {
      if (
        typeof s?.title !== "string" ||
        typeof s?.url !== "string" ||
        !/^https:\/\//.test(s.url)
      )
        throw new Error("備份的來源網址格式不正確。");
    }
  }
  return data as Collection;
}
