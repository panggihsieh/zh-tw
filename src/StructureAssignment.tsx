import "./structureAssignment.css";
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
  const book = books[bookIndex];
  const publisherBooks = books.filter(row => row.publisher === book?.publisher);
  const gradeBooks = publisherBooks.filter(row => row.grade === book?.grade);
  const lesson = book?.lessons[lessonIndex];
  function changeBook(nextBook: Book) {
    setBook(books.indexOf(nextBook));
    setLesson(0);
    setSelected([]);
  }
  const href = `${location.origin}${location.pathname}#games/structure/${encodeURIComponent(selected.join(""))}`;
  return <section>
    <h2>指派生字結構練習</h2>
    {error && <p role="alert">{error}</p>}
    <div className="structure-assignment-filters">
      <label>教材<select disabled={!book} value={book?.publisher ?? ""} onChange={e => {
        const matches = books.filter(row => row.publisher === e.target.value);
        const next = matches.find(row => row.grade === book?.grade && row.term === book.term) ?? matches[0];
        if (next) changeBook(next);
      }}>
        {[...new Set(books.map(row => row.publisher))].map(publisher => <option key={publisher}>{publisher}</option>)}
      </select></label>
      <label>年級<select disabled={!book} value={book?.grade ?? ""} onChange={e => {
        const matches = publisherBooks.filter(row => row.grade === Number(e.target.value));
        const next = matches.find(row => row.term === book?.term) ?? matches[0];
        if (next) changeBook(next);
      }}>
        {[...new Set(publisherBooks.map(row => row.grade))].sort((a, b) => a - b).map(grade =>
          <option key={grade} value={grade}>{grade} 年級</option>)}
      </select></label>
      <label>學期<select disabled={!book} value={bookIndex} onChange={e => changeBook(books[Number(e.target.value)])}>
        {["上", "下"].flatMap(term => gradeBooks.filter(row => row.term === term)).map(row =>
          <option key={books.indexOf(row)} value={books.indexOf(row)}>{row.term}學期（{row.year}）</option>)}
      </select></label>
      <label>課文<select disabled={!book?.lessons.length} value={lessonIndex} onChange={e => {
        setLesson(Number(e.target.value));
        setSelected([]);
      }}>
        {book?.lessons.map((row, i) => <option key={i} value={i}>{row.title}</option>)}
      </select></label>
    </div>
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
