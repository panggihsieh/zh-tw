/**
 * 管理者修正生字結構：存於 Firestore `hanzi_notebook_structure_overrides/{字}`。
 * 出題時優先採用修正值；刪除修正即恢復自動判斷。寫入權限由 firestore.rules 限定管理者。
 */
import { collection, deleteDoc, doc, getDocs, serverTimestamp, setDoc } from 'firebase/firestore';
import { cloudConfigured, cloudServices } from './cloudSync';
import structureAtlas from './structureAtlas.json';

export const OVERRIDE_COLLECTION = 'hanzi_notebook_structure_overrides';
export const BIG_STRUCTURES = ['左右', '上下', '左中右', '上中下', '全包圍', '半包圍', '獨體', '品字形'] as const;
export type BigStructureName = typeof BIG_STRUCTURES[number];
/** subtype 空字串表示只出八大類題；exclude 表示這個字不出結構題。 */
export interface StructureOverride { character: string; structure: BigStructureName; subtype: string; exclude: boolean }

/** 各大類可選的細分結構（與結構縮圖庫一致）。 */
export function subtypesOf(structure: string): string[] {
  return (structureAtlas as { title: string; items: { title: string }[] }[]).find(group => group.title === `${structure}結構`)?.items.map(item => item.title) ?? [];
}

export function validOverride(value: unknown): value is StructureOverride {
  const item = value as StructureOverride;
  return !!item && typeof item.character === 'string' && [...item.character].length === 1
    && (BIG_STRUCTURES as readonly string[]).includes(item.structure)
    && typeof item.subtype === 'string' && (item.subtype === '' || subtypesOf(item.structure).includes(item.subtype))
    && typeof item.exclude === 'boolean';
}

export async function loadStructureOverrides(): Promise<Record<string, StructureOverride>> {
  if (!cloudConfigured) return {};
  const snapshot = await getDocs(collection(cloudServices().db, OVERRIDE_COLLECTION));
  const result: Record<string, StructureOverride> = {};
  for (const entry of snapshot.docs) {
    const data = entry.data();
    const value = { character: data.character, structure: data.structure, subtype: data.subtype, exclude: data.exclude };
    if (validOverride(value) && value.character === entry.id) result[entry.id] = value;
  }
  return result;
}

export async function saveStructureOverride(value: StructureOverride) {
  if (!validOverride(value)) throw Error('結構修正資料不完整。');
  const user = cloudServices().auth.currentUser;
  if (!user) throw Error('請先以管理者帳號登入。');
  await setDoc(doc(cloudServices().db, OVERRIDE_COLLECTION, value.character), {
    character: value.character, structure: value.structure, subtype: value.subtype, exclude: value.exclude,
    updatedAt: serverTimestamp(), updatedBy: user.uid,
  });
}

export async function removeStructureOverride(character: string) {
  await deleteDoc(doc(cloudServices().db, OVERRIDE_COLLECTION, character));
}
