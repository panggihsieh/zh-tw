import { openDB } from "idb";
import type { Collection } from "./model";
import { CURRICULUM_LIMIT, validatePhrase } from "./model";
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
export async function mergeCloudCollections(items: Collection[]) {
  const database = await db();
  const checked = items.map((item) => parseBackup(JSON.stringify(item)));
  const tx = database.transaction("collections", "readwrite");
  let count = 0;
  for (const item of checked) {
    const local = await tx.store.get(item.id);
    if (!local || Date.parse(item.updatedAt) > Date.parse(local.updatedAt)) {
      await tx.store.put(item);
      count++;
    }
  }
  await tx.done;
  return count;
}
export function parseBackup(text: string): Collection {
  const data = JSON.parse(text);
  const limit = data?.curriculum ? CURRICULUM_LIMIT : 8;
  if (
    data?.schemaVersion !== 1 ||
    typeof data.id !== "string" ||
    typeof data.sourcePhrase !== "string" ||
    validatePhrase(data.sourcePhrase, limit) !== "" ||
    !Array.isArray(data.cards) ||
    !data.cards.length ||
    data.cards.length > limit ||
    !Array.isArray(data.scenes) ||
    data.scenes.length !== 6 ||
    !["practice", "learned"].includes(data.reviewState) ||
    typeof data.updatedAt !== "string" ||
    typeof data.createdAt !== "string" ||
    typeof data.dataVersion !== "string" ||
    !Array.isArray(data.selectedCharacters)
  )
    throw new Error("不是有效的生字本備份。");
  if (
    data.curriculum &&
    (!["南一", "康軒", "翰林"].includes(data.curriculum.publisher) ||
      !Number.isInteger(data.curriculum.grade) ||
      data.curriculum.grade < 1 ||
      data.curriculum.grade > 6 ||
      !["上", "下"].includes(data.curriculum.term) ||
      typeof data.curriculum.title !== "string" ||
      data.curriculum.title.length > 100 ||
      typeof data.curriculum.year !== "string" ||
      !/^\d{3}_[12]$/.test(data.curriculum.year) ||
      typeof data.curriculum.source !== "string" ||
      !data.curriculum.source.startsWith(
        "https://pedia.cloud.edu.tw/Bookmark/",
      ))
  )
    throw new Error("課本來源資料格式不符。");
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
