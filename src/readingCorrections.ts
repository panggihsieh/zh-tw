import { collection, deleteDoc, doc, getDocs, serverTimestamp, setDoc, runTransaction } from 'firebase/firestore';
import { cloudConfigured, cloudServices } from './cloudSync';
import type { SentenceLesson } from './sentenceApi';

export const READING_COLLECTION = 'hanzi_notebook_reading_corrections';
export interface ReadingCorrection { lessonId: string; character: string; reading: string; contextWord?: string }
export const readingKey = (lessonId: string, character: string) => `${lessonId}_${character}`;
export function validReadingCorrection(value: ReadingCorrection) {
  return /^[a-zA-Z0-9-]{1,80}$/.test(value.lessonId) && /^\p{Script=Han}$/u.test(value.character)
    && (value.contextWord === undefined || value.contextWord === "" || (/^\p{Script=Han}{2,8}$/u.test(value.contextWord) && value.contextWord.includes(value.character)))
    && /^[\u3105-\u3129]{1,3}[ˊˇˋ˙]?$/.test(value.reading);
}
export function applyReadingCorrections(lessons: SentenceLesson[], corrections: ReadingCorrection[]) {
  const index = new Map(corrections.filter(validReadingCorrection).map(value => [readingKey(value.lessonId, value.character), value]));
  return lessons.map(lesson => ({ ...lesson, characters: lesson.characters.map(character => {
    const correction = index.get(readingKey(lesson.id, character.character));
    if (!correction) return character;
    const { reading, contextWord } = correction;
    const match = character.readings.find(row => row.reading === reading);
    return { ...character, ...(contextWord ? { contextWord } : {}), readings: [match || { reading, definition: '教師依課文語境指定讀音，釋義請參考課文。', source: '教師課文讀音修正' }] };
  }) }));
}
export async function loadReadingCorrections(): Promise<ReadingCorrection[]> {
  if (!cloudConfigured) return [];
  const snapshot = await getDocs(collection(cloudServices().db, READING_COLLECTION));
  return snapshot.docs.map(row => row.data() as ReadingCorrection).filter(validReadingCorrection);
}
export async function correctedLessons(lessons: SentenceLesson[]) {
  return applyReadingCorrections(lessons, await loadReadingCorrections());
}
export async function saveReadingCorrection(value: ReadingCorrection) {
  if (!validReadingCorrection(value)) throw Error('請填寫完整注音（例如 ㄐㄧㄝˋ）；課文語詞需為包含此字的 2–8 個中文字，或留空。');
  const user = cloudServices().auth.currentUser;
  if (!user) throw Error('請先以教師帳號登入。');
  await setDoc(doc(cloudServices().db, READING_COLLECTION, readingKey(value.lessonId, value.character)), {
    ...value, updatedAt: serverTimestamp(), updatedBy: user.uid,
  });
}
export async function removeReadingCorrection(lessonId: string, character: string) {
  await deleteDoc(doc(cloudServices().db, READING_COLLECTION, readingKey(lessonId, character)));
}

/** AI僅補缺額；交易中重新讀取，保留老師已存的圈詞與不同讀音。 */
export async function saveAutomaticReadingCorrection(value: ReadingCorrection) {
 if(!validReadingCorrection(value))throw Error('AI圈詞格式不符，未儲存。');
 const {db,auth}=cloudServices();if(!auth.currentUser)throw Error('請先登入教師帳號');
 const ref=doc(db,READING_COLLECTION,readingKey(value.lessonId,value.character));
 return runTransaction(db,async transaction=>{const old=await transaction.get(ref);if(old.exists()){const existing=old.data() as ReadingCorrection;if(existing.contextWord||existing.reading!==value.reading)return existing;}
 transaction.set(ref,{...value,updatedAt:serverTimestamp(),updatedBy:auth.currentUser!.uid});return value;});
}
