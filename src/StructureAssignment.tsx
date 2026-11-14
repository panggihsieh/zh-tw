import { useEffect, useState } from "react";

type Book = { publisher: string; grade: number; term: string; year: string; lessons: { title: string; characters: string }[] };
export default function StructureAssignment() {
  const [books, setBooks] = useState<Book[]>([]);
  const [bookIndex, setBook] = useState(0);
  const [lessonIndex, setLesson] = useState(0);
  const [selected, setSelected] = useState<string[]>([]);
  const [ids, setIds] = useState<Record<string,string>>({});
  const [error, setError] = useState("");
  useEffect(() => {
    const load = async (path: string) => {
      const response = await fetch(import.meta.env.BASE_URL + path);
      if (!response.ok) throw Error("教材資料載入失敗");
      return response.json();
    };
    void Promise.all([load("handwriting-curriculum.json"), load("structure-review/ids-catalog.json")])
      .then(([catalog, structures]) => { setBooks(catalog.books); setIds(structures); })
      .catch(() => setError("教材資料載入失敗，請重新整理。"));
  }, []);
  const lesson = books[bookIndex]?.lessons[lessonIndex];
  const href = `${location.origin}${location.pathname}#games/structure/${encodeURIComponent(selected.join(""))}`;
  return <section>
    <h2>指派生字結構練習</h2>
    {error && <p role="alert">{error}</p>}
    <label>教材<select value={bookIndex} onChange={e => { setBook(Number(e.target.value)); setLesson(0); setSelected([]); }}>
      {books.map((book, i) => <option key={i} value={i}>{book.publisher}・{book.grade}年級{book.term}・{book.year}</option>)}
    </select></label>
    <label>課文<select value={lessonIndex} onChange={e => { setLesson(Number(e.target.value)); setSelected([]); }}>
      {books[bookIndex]?.lessons.map((row,i) => <option key={i} value={i}>{row.title}</option>)}
    </select></label>
    <fieldset className="practice-character-picker"><legend>點選生字（最多八字）</legend>
      {[...new Set(lesson?.characters ?? "")].filter(char => simpleStructure(ids[char])).map(char =>
        <button type="button" key={char} className={selected.includes(char) ? "primary" : "secondary"} aria-pressed={selected.includes(char)}
          disabled={selected.length >= 8 && !selected.includes(char)}
          onClick={() => setSelected(items => items.includes(char) ? items.filter(item => item !== char) : [...items,char])}>{char}</button>)}
    </fieldset>
    <p>可選有明確兩部件候選資料的生字。</p>
    {!!selected.length && <label>學生練習連結<input readOnly value={href} onFocus={e => e.target.select()} /></label>}
  </section>;
}

export function simpleStructure(ids = "") {
  const [operator, first, second, ...rest] = Array.from(ids);
  const structure = ({ "⿰": "左右", "⿱": "上下", "⿴": "全包圍" } as Record<string,string>)[operator];
  if (!structure || rest.length || !first || !second || !/^[\p{Script=Han}\u2e80-\u2fff]{2}$/u.test(first + second)) return;
  return { structure, parts: [first, second] };
}
