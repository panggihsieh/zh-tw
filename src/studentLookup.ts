import type { LessonContext } from "./curriculumLearning";
export interface SchoolBook {
  publisher: string;
  grade: number;
  term: string;
  year: string;
  lessons: { title: string; characters: string; source: string }[];
}
export function cleanTranscript(text: string) {
  return text.replace(/[\s\p{P}]/gu, "");
}
export function speechCandidates(result: ArrayLike<{ transcript: string }>) {
  return [
    ...new Set(
      Array.from(result, (x) => cleanTranscript(x.transcript)).filter((x) =>
        /^[\p{Script=Han}]{1,8}$/u.test(x),
      ),
    ),
  ].slice(0, 5);
}
export function findSchoolCharacters(books: SchoolBook[], query: string) {
  const chars = [...new Set(Array.from(cleanTranscript(query)))];
  if (
    !chars.length ||
    chars.length > 8 ||
    chars.some((c) => !/^\p{Script=Han}$/u.test(c))
  )
    return [];
  return books.flatMap((book) =>
    book.lessons.flatMap((lesson) => {
      const matched = chars.filter((c) => lesson.characters.includes(c));
      const context: LessonContext = {
        publisher: book.publisher,
        grade: book.grade,
        term: book.term,
        year: book.year,
        title: lesson.title,
        source: lesson.source,
      };
      return matched.length ? [{ characters: matched, context }] : [];
    }),
  );
}
export function recognitionError(error: string) {
  return (
    (
      {
        "not-allowed": "麥克風未獲允許，請允許後重試，或用打字找字。",
        "service-not-allowed":
          "此瀏覽器無法使用語音服務，請改用支援的瀏覽器或打字。",
        "no-speech": "沒有聽到聲音，請再念一次。",
        "audio-capture": "找不到麥克風，請檢查裝置或用打字找字。",
        network: "語音服務連線失敗，請檢查網路或用打字找字。",
        aborted: "已停止聆聽。",
      } as Record<string, string>
    )[error] || "語音辨識暫時無法使用，請重試或用打字找字。"
  );
}
