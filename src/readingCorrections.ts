import { collection, deleteDoc, doc, getDocs, serverTimestamp, setDoc } from 'firebase/firestore';
import { cloudConfigured, cloudServices } from './cloudSync';
import type { SentenceLesson } from './sentenceApi';

export const READING_COLLECTION = 'hanzi_notebook_reading_corrections';
export interface ReadingCorrection { lessonId: string; character: string; reading: string }
export const readingKey = (lessonId: string, character: string) => `${lessonId}_${character}`;
export function validReadingCorrection(value: ReadingCorrection) {
  return /^[a-zA-Z0-9-]{1,80}$/.test(value.lessonId) && /^\p{Script=Han}$/u.test(value.character)
    && /^[\u3105-\u3129]{1,3}[ˊˇˋ˙]?$/.test(value.reading);
}
export function applyReadingCorrections(lessons: SentenceLesson[], corrections: ReadingCorrection[]) {
  const index = new Map(corrections.filter(validReadingCorrection).map(value => [readingKey(value.lessonId, value.character), value.reading]));
  return lessons.map(lesson => ({ ...lesson, characters: lesson.characters.map(character => {
    const reading = index.get(readingKey(lesson.id, character.character));
    if (!reading) return character;
    const match = character.readings.find(row => row.reading === reading);
    return { ...character, readings: [match || { reading, definition: '教師依課文語境指定讀音，釋義請參考課文。', source: '教師課文讀音修正' }] };
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
  if (!validReadingCorrection(value)) throw Error('請輸入一個字的完整注音，例如 ㄐㄧㄝˋ。');
  const user = cloudServices().auth.currentUser;
  if (!user) throw Error('請先以教師帳號登入。');
  await setDoc(doc(cloudServices().db, READING_COLLECTION, readingKey(value.lessonId, value.character)), {
    ...value, updatedAt: serverTimestamp(), updatedBy: user.uid,
  });
}
export async function removeReadingCorrection(lessonId: string, character: string) {
  await deleteDoc(doc(cloudServices().db, READING_COLLECTION, readingKey(lessonId, character)));
}
