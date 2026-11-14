import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Clock3, RefreshCw, Send } from "lucide-react";
import { gameRequest } from "./gameApi";
import { quizRequest } from "./quizApi";
import type { QuizClass } from "./ClassRoster";
import "./writingAssignments.css";

type Book = {
  publisher: string;
  grade: number;
  term: string;
  lessons: { id: string; title: string; characters: string }[];
};
type Assignment = {
  id: string;
  classId: string;
  title: string;
  className: string;
  lesson: string;
  characters: string[];
  createdAt: string;
};
type StudentStatus = {
  seat: number;
  name: string;
  email: string;
  avatar?: string;
  status: "pending" | "submitted" | "graded";
  submission: null | {
    uid: string;
    id: string;
    image: string;
    submittedAt: string;
    grade?: { score: number; comment: string };
  };
};

export default function WritingAssignmentAdmin() {
  const [classes, setClasses] = useState<QuizClass[]>([]),
    [books, setBooks] = useState<Book[]>([]),
    [allowed, setAllowed] = useState<Set<string>>(new Set()),
    [assignments, setAssignments] = useState<Assignment[]>([]);
  const [classId, setClassId] = useState(""),
    [publisher, setPublisher] = useState("南一"),
    [grade, setGrade] = useState(5),
    [term, setTerm] = useState("上"),
    [lessonId, setLessonId] = useState(""),
    [characters, setCharacters] = useState<string[]>([]),
    [wholeLesson, setWholeLesson] = useState(true),
    [title, setTitle] = useState("書寫小達人作業"),
    [editingId, setEditingId] = useState("");
  const [selected, setSelected] = useState<Assignment | null>(null),
    [students, setStudents] = useState<StudentStatus[]>([]),
    [work, setWork] = useState<StudentStatus | null>(null),
    [score, setScore] = useState(80),
    [comment, setComment] = useState(""),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  const lessons = useMemo(
      () =>
        books
          .filter(
            (book) =>
              book.publisher === publisher &&
              book.grade === grade &&
              book.term === term,
          )
          .flatMap((book) => book.lessons),
      [books, publisher, grade, term],
    ),
    lesson = lessons.find((item) => item.id === lessonId),
    selectedClass = classes.find((item) => item.id === classId);
  async function load() {
    const [classData, assignmentData] = await Promise.all([
      quizRequest<{ items: QuizClass[] }>("/classes"),
      gameRequest("/assignments") as Promise<{ items: Assignment[] }>,
    ]);
    setClasses(classData.items);
    setAssignments(assignmentData.items);
    if (!classId && classData.items[0]) setClassId(classData.items[0].id);
  }
  async function run(fn: () => Promise<void>) {
    setBusy(true);
    setMessage("");
    try {
      await fn();
    } catch (error) {
      setMessage((error as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function openStatus(assignment: Assignment) {
    const data = (await gameRequest(
      `/assignments/${assignment.id}/status`,
    )) as { students: StudentStatus[] };
    setSelected(assignment);
    setStudents(data.students);
    setWork(null);
  }
  async function openWork(student: StudentStatus) {
    if (!student.submission) return;
    const detail = (await gameRequest(
      `/submissions/${encodeURIComponent(student.submission.uid)}/${student.submission.id}`,
    )) as { image: string; grade?: { score: number; comment: string } };
    setWork({
      ...student,
      submission: {
        ...student.submission,
        image: detail.image,
        grade: detail.grade,
      },
    });
    setScore(detail.grade?.score ?? 80);
    setComment(detail.grade?.comment ?? "");
  }
  function editAssignment(assignment: Assignment) {
    const [book, lessonTitle] = assignment.lesson.split(" · ");
    const match = book.match(/^(\S+) (\d)年級([上下])$/);
    const nextPublisher = match?.[1] || "南一",
      nextGrade = Number(match?.[2] || 5),
      nextTerm = match?.[3] || "上";
    setEditingId(assignment.id);
    setTitle(assignment.title);
    setClassId(assignment.classId);
    setPublisher(nextPublisher);
    setGrade(nextGrade);
    setTerm(nextTerm);
    const target = books
      .filter(
        (item) =>
          item.publisher === nextPublisher &&
          item.grade === nextGrade &&
          item.term === nextTerm,
      )
      .flatMap((item) => item.lessons)
      .find((item) => item.title === lessonTitle);
    setLessonId(target?.id || "");
    setCharacters(assignment.characters);
    setWholeLesson(
      !!target &&
        target.characters
          .split("")
          .filter((character) => allowed.has(character))
          .every((character) => assignment.characters.includes(character)),
    );
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  useEffect(() => {
    const abort = new AbortController();
    Promise.all([
      fetch("/handwriting-curriculum.json", { signal: abort.signal }),
      fetch("/game-strokes/catalog.json", { signal: abort.signal }),
    ])
      .then(async ([curriculum, strokes]) => {
        setBooks((await curriculum.json()).books);
        setAllowed(
          new Set(
            (await strokes.json()).characters.map(
              (item: { character: string }) => item.character,
            ),
          ),
        );
      })
      .catch((error) => {
        if (!abort.signal.aborted) setMessage(error.message);
      });
    void run(load);
    return () => abort.abort();
  }, []);
  if (work?.submission)
    return (
      <section className="writing-assignment-admin">
        <button className="secondary" onClick={() => setWork(null)}>
          返回全班狀態
        </button>
        <div className="writing-grade-layout">
          <img src={work.submission.image} alt={`${work.name}的書寫作品`} />
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void run(async () => {
                await gameRequest(
                  `/submissions/${encodeURIComponent(work.submission!.uid)}/${work.submission!.id}`,
                  { score, comment },
                );
                await openStatus(selected!);
                setWork(null);
                setMessage(`已完成 ${work.name} 的評分。`);
              });
            }}
          >
            <h2>
              {work.seat} 號 {work.name}
            </h2>
            <label>
              分數
              <input
                type="number"
                min={0}
                max={100}
                value={score}
                onChange={(event) => setScore(Number(event.target.value))}
              />
            </label>
            <label>
              評語
              <textarea
                rows={6}
                maxLength={1000}
                value={comment}
                onChange={(event) => setComment(event.target.value)}
              />
            </label>
            <button className="primary" disabled={busy}>
              儲存分數與評語
            </button>
          </form>
        </div>
        <p role="status">{message}</p>
      </section>
    );
  return (
    <section className="writing-assignment-admin">
      <p className="assignment-notice">
        書寫小達人是個人作業。老師派發課文後，學生各自完成書寫並由系統產生作品截圖；後台以每列五格查看全班繳交與評分狀態。
      </p>
      <h2>{editingId ? "編修個人書寫作業" : "派發個人書寫作業"}</h2>
      <div className="assignment-form">
        <label>
          班級
          <select
            value={classId}
            onChange={(event) => setClassId(event.target.value)}
          >
            {classes.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          作業名稱
          <input
            maxLength={100}
            value={title}
            onChange={(event) => setTitle(event.target.value)}
          />
        </label>
        <label>
          出版社
          <select
            value={publisher}
            onChange={(event) => {
              setPublisher(event.target.value);
              setLessonId("");
              setCharacters([]);
              setWholeLesson(true);
            }}
          >
            {["南一", "康軒", "翰林"].map((value) => (
              <option key={value}>{value}</option>
            ))}
          </select>
        </label>
        <label>
          年級
          <select
            value={grade}
            onChange={(event) => {
              setGrade(Number(event.target.value));
              setLessonId("");
              setCharacters([]);
              setWholeLesson(true);
            }}
          >
            {[1, 2, 3, 4, 5, 6].map((value) => (
              <option key={value} value={value}>
                {value}年級
              </option>
            ))}
          </select>
        </label>
        <label>
          學期
          <select
            value={term}
            onChange={(event) => {
              setTerm(event.target.value);
              setLessonId("");
              setCharacters([]);
              setWholeLesson(true);
            }}
          >
            <option>上</option>
            <option>下</option>
          </select>
        </label>
        <label>
          課文
          <select
            value={lessonId}
            onChange={(event) => {
              const id = event.target.value,
                next = lessons.find((item) => item.id === id);
              setLessonId(id);
              setWholeLesson(true);
              setCharacters(
                next
                  ? [...next.characters]
                      .filter((character) => allowed.has(character))
                  : [],
              );
            }}
          >
            <option value="">請選擇課文</option>
            {lessons.map((item) => (
              <option key={item.id} value={item.id}>
                {item.title}
              </option>
            ))}
          </select>
        </label>
      </div>
      {lesson && (
        <fieldset className="assignment-characters">
          <legend>派發範圍</legend>
          <div className="assignment-scope" role="radiogroup" aria-label="派發範圍">
            <label>
              <input
                type="radio"
                name="writing-scope"
                checked={wholeLesson}
                onChange={() => {
                  setWholeLesson(true);
                  setCharacters(
                    [...lesson.characters].filter((character) => allowed.has(character)),
                  );
                }}
              />
              整課生字（{[...lesson.characters].filter((character) => allowed.has(character)).length} 字）
            </label>
            <label>
              <input
                type="radio"
                name="writing-scope"
                checked={!wholeLesson}
                onChange={() => {
                  setWholeLesson(false);
                  setCharacters(characters.slice(0, 8));
                }}
              />
              自選生字（最多 8 字）
            </label>
          </div>
          {[...lesson.characters]
            .filter((character) => allowed.has(character))
            .map((character) => (
              <label key={character}>
                <input
                  type="checkbox"
                  checked={characters.includes(character)}
                  disabled={
                    wholeLesson ||
                    (!characters.includes(character) && characters.length >= 8)
                  }
                  onChange={(event) =>
                    setCharacters(
                      event.target.checked
                        ? [...characters, character]
                        : characters.filter((item) => item !== character),
                    )
                  }
                />
                {character}
              </label>
            ))}
        </fieldset>
      )}
      <div className="assignment-actions">
        <button
          className="primary"
          disabled={
            busy ||
            !selectedClass ||
            !lesson ||
            !characters.length ||
            !title.trim()
          }
          onClick={() =>
            void run(async () => {
              const students =
                selectedClass!.students?.filter(
                  (student) => student.active && student.email,
                ) || [];
              await gameRequest(
                editingId ? `/assignments/${editingId}` : "/assignments",
                {
                  title,
                  classId: selectedClass!.id,
                  className: selectedClass!.name,
                  lesson: `${publisher} ${grade}年級${term} · ${lesson!.title}`,
                  characters,
                  students,
                },
              );
              await load();
              setMessage(
                editingId
                  ? "個人書寫作業已更新。"
                  : "個人書寫作業已派發，學生登入後即可開始。",
              );
              setEditingId("");
            })
          }
        >
          <Send size={18} />
          {editingId ? "儲存作業修改" : "派發給全班"}
        </button>
        {editingId && (
          <button className="secondary" onClick={() => setEditingId("")}>
            取消編修
          </button>
        )}
      </div>
      <div className="assignment-heading">
        <h2>全班執行狀況</h2>
        <button
          className="secondary"
          disabled={busy}
          onClick={() =>
            void run(async () => {
              await load();
              if (selected) await openStatus(selected);
            })
          }
        >
          <RefreshCw size={18} />
          更新
        </button>
      </div>
      <div className="assignment-list">
        {assignments.map((item) => (
          <article
            key={item.id}
            className={selected?.id === item.id ? "active" : ""}
          >
            <button onClick={() => void run(() => openStatus(item))}>
              <strong>{item.title}</strong>
              <span>
                {item.className} · {item.lesson}
              </span>
            </button>
            <button className="secondary" onClick={() => editAssignment(item)}>
              編修作業
            </button>
          </article>
        ))}
      </div>
      {selected && (
        <>
          <p>
            {selected.className} · 已繳交{" "}
            {students.filter((item) => item.status !== "pending").length}/
            {students.length} · 已評分{" "}
            {students.filter((item) => item.status === "graded").length}
          </p>
          <div className="assignment-status-grid">
            {students.map((student) => (
              <button
                key={student.email}
                className={`assignment-student ${student.status}`}
                disabled={!student.submission}
                onClick={() => void run(() => openWork(student))}
              >
                {student.submission ? (
                  <img
                    src={student.submission.image}
                    alt={`${student.name}作品縮圖`}
                  />
                ) : student.avatar ? (
                  <img src={student.avatar} alt={`${student.name}公仔`} />
                ) : (
                  <span className="assignment-placeholder">
                    <Clock3 />
                  </span>
                )}
                <strong>
                  {student.seat} 號 {student.name}
                </strong>
                <span>
                  {student.status === "graded" ? (
                    <>
                      <CheckCircle2 size={15} />
                      已評分 {student.submission?.grade?.score} 分
                    </>
                  ) : student.status === "submitted" ? (
                    "已繳交 · 待評分"
                  ) : (
                    "未繳交"
                  )}
                </span>
              </button>
            ))}
          </div>
        </>
      )}
      <p role="status">{message}</p>
    </section>
  );
}
