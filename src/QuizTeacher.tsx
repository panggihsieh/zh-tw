import CurriculumSql from "./CurriculumSql";
import { useEffect, useState } from "react";
import {
  QUIZ_CATEGORIES,
  quizRequest,
  type QuizPaper,
  type QuizQuestion,
  type QuizStat,
} from "./quizApi";
import "./quiz.css";
import PublisherSync from "./PublisherSync";
import type { QuizClass } from "./ClassRoster";
import {reviewPaperId} from './publisherSelection';
import {readQuizPassage} from './quizPassage';
interface Book {
  publisher: string;
  grade: number;
  term: string;
  year: string;
  lessons: { title: string; characters: string; source: string }[];
}
export default function QuizTeacher({request=quizRequest,showPublisher=true}:{request?:typeof quizRequest;showPublisher?:boolean}={}) {
  const quizRequest=request;
  const [classes,setClasses]=useState<QuizClass[]>([]);
  const [paperSearch,setPaperSearch]=useState(''),[categoryFilter,setCategoryFilter]=useState(''),[difficultyFilter,setDifficultyFilter]=useState(''),[reviewFilter,setReviewFilter]=useState('');
  const [reviewId] = useState(()=>reviewPaperId(window.location.search));
  const [papers, setPapers] = useState<QuizPaper[]>([]),
    [paper, setPaper] = useState<QuizPaper | null>(null),
    [stats, setStats] = useState<QuizStat[]>([]),
    [selected, setSelected] = useState<string[]>([]),
    [mode, setMode] = useState<"original" | "rephrase">("original"),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [tab, setTab] = useState("sql"),
    [books, setBooks] = useState<Book[]>([]),
    [bookIndex, setBookIndex] = useState(0),
    [lessonIndex, setLessonIndex] = useState(0);
  const [bankIds, setBankIds] = useState<string[]>([]);
  const [rosterText, setRosterText] = useState("");
  const [questionRows, setQuestionRows] = useState(() => QUIZ_CATEGORIES.slice(0, 4).map(category => ({
    category, difficulty: "中", count: 2,
  })));
  const questionPlan = questionRows.filter(row => row.count > 0);
  const questionCount = questionPlan.reduce((total, row) => total + row.count, 0);
  const [form, setForm] = useState({
    title: "",
    className: "",
    grade: 5,
    lesson: "",
    passage: "",
    questionMode: "original",
    dueAt:'',shuffleOptions:false,
  });
  async function run(fn: () => Promise<void>) {
    setBusy(true);
    setMessage("處理中…");
    try {
      await fn();
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function load() {
    const v = await quizRequest<{ items: QuizPaper[] }>("/papers");
    setPapers(v.items);
    setMessage("");
  }
  useEffect(() => {
    void run(reviewId ? ()=>open(reviewId) : load);
    void quizRequest<{items:typeof classes}>('/classes').then(v=>setClasses(v.items)).catch(e=>setMessage(e.message));
    fetch("/handwriting-curriculum.json")
      .then((r) => {
        if (!r.ok) throw Error();
        return r.json();
      })
      .then((d) => setBooks(d.books.filter((b:Book)=>b.publisher==='南一'&&[5,6].includes(b.grade))))
      .catch(() => setMessage("課次清單載入失敗，仍可手動填寫課名。"));
  }, []);
  function changeQuestion(index: number, patch: Partial<QuizQuestion>) {
    if (!paper) return;
    setPaper({
      ...paper,
      questions: paper.questions.map((q, i) =>
        i === index ? { ...q, ...patch, reviewed: patch.reviewed === true } : q,
      ),
    });
  }
  async function open(id: string) {
    const q = await quizRequest<QuizPaper>(`/papers/${id}`);
    setPaper(q);
    setBankIds(q.questions.map((q) => q.id));
    setTab("bank");
    setStats([]);
    setSelected([]);
    setMessage("");
  }
  async function loadStats() {
    if (!paper) return;
    const v = await quizRequest<{ items: QuizStat[] }>(
      `/papers/${paper.id}/stats`,
    );
    setStats(v.items.sort((a, b) => b.rate - a.rate));
    setSelected(v.items.filter((r) => r.wrong > 0).map((r) => r.id));
    setTab("stats");
    setMessage("統計以每位學生最近一次測驗為準；自行複習不混入全班成績。");
  }
  async function reuse(action: "remedial" | "reuse") {
    if (!paper) return;
    const q = await quizRequest<QuizPaper>(`/papers/${paper.id}/${action}`, {
      ids: action === "remedial" ? selected : bankIds,
      questionMode: mode,
    });
    setPaper(q);
    setBankIds(q.questions.map((q) => q.id));
    setStats([]);
    setTab("bank");
    await load();
    setMessage("已建立再測草稿，請核對後發布。");
  }
  const book = books[bookIndex],
    lesson = book?.lessons[lessonIndex];
  return (
    <section className="quiz-workspace" aria-label="國語母題與錯題管理">
      <h1>{reviewId?'母題草稿檢視與查核':'國語母題與錯題複習'}</h1>
      {reviewId ? <p><a href="/?view=backend&section=quiz">返回母題管理</a> · 對照原卷，逐題核對後儲存草稿。</p> : showPublisher && <details><summary>三家出版社教材更新與題卷匯入</summary><PublisherSync/></details>}
      {!reviewId && <div className="quiz-actions">
        <button className="secondary" onClick={() => setTab("bank")}>
          母題題庫與組卷
        </button>
        <button
          className="secondary"
          onClick={() => {
            setPaper(null);
            setTab("generate");
          }}
        >
          上傳課文・AI 四類出題
        </button>
        <button
          className="secondary"
          disabled={busy}
          onClick={() => void run(load)}
        >
          重新整理題庫
        </button>
      <button className="secondary" aria-pressed={tab === "sql"} onClick={() => setTab("sql")}>AI 教材關聯查詢</button>
      </div>}
      {tab === "sql" && <CurriculumSql />}
      {tab !== "sql" && <p role="status">{message}</p>}
      {tab === "generate" && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void run(async () => {
              const q = await quizRequest<QuizPaper>("/generate", {
                ...form,
                count: questionCount,
                categories: questionPlan.map(row => row.category),
                difficulty: questionPlan[0]?.difficulty,
                questionPlan,
                roster: rosterText.split(/[\s,;，；]+/).filter(Boolean),
              });
              setPaper(q);
              setBankIds(q.questions.map((q) => q.id));
              setTab("bank");
              await load();
              setMessage("AI 母題與同義改寫已入草稿；請逐題審核。");
            });
          }}
        >
          <h2>1. 選課與上傳課文</h2>
          <p>
            限定國小國語，課次清單只有生字表；請貼上可使用的完整課文，作為出題依據。
          </p>
          <div className="quiz-grid">
            <label>
              課本
              <select
                value={bookIndex}
                onChange={(e) => {
                  setBookIndex(+e.target.value);
                  setLessonIndex(0);
                }}
              >
                {books.map((b, i) => (
                  <option value={i} key={i}>
                    {b.publisher} {b.grade}
                    {b.term}（{b.year}）
                  </option>
                ))}
              </select>
            </label>
            <label>
              課次
              <select
                value={lessonIndex}
                onChange={(e) => setLessonIndex(+e.target.value)}
              >
                {book?.lessons.map((l, i) => (
                  <option value={i} key={l.source}>
                    {l.title}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label>選擇已儲存班級<select defaultValue="" onChange={e=>{const c=classes.find(c=>c.id===e.target.value);if(c){setForm({...form,className:c.name});setRosterText(c.roster.join('\n'));}}}><option value="">手動輸入班級與名單</option>{classes.map(c=><option key={c.id} value={c.id}>{c.name}（{c.roster.length}人）</option>)}</select></label>
          <button
            type="button"
            className="secondary"
            disabled={!lesson}
            onClick={() =>
              setForm({
                ...form,
                grade: book.grade,
                lesson: `${book.publisher} ${book.grade}${book.term} ${lesson.title}`,
                title: `${lesson.title}・國語練習`,
              })
            }
          >
            帶入所選課名
          </button>
          <div className="quiz-grid">
            <label>
              試卷名稱
              <input
                required
                maxLength={120}
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </label>
            <label>
              班級名稱
              <input
                required
                maxLength={80}
                value={form.className}
                onChange={(e) =>
                  setForm({ ...form, className: e.target.value })
                }
              />
            </label>
            <label>
              課名
              <input
                required
                maxLength={180}
                value={form.lesson}
                onChange={(e) => setForm({ ...form, lesson: e.target.value })}
              />
            </label>
            <label>
              年級
              <select
                value={form.grade}
                onChange={(e) => setForm({ ...form, grade: +e.target.value })}
              >
                {[1, 2, 3, 4, 5, 6].map((g) => (
                  <option key={g} value={g}>
                    {g}年級
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label>
            班級學生 Google 帳號清單（每行一個，最多100人）
            <textarea
              required
              value={rosterText}
              onChange={(e) => setRosterText(e.target.value)}
            />
          </label>
          <label>
            課文內容
            <textarea
              required
              maxLength={12000}
              rows={12}
              value={form.passage}
              onChange={(e) => setForm({ ...form, passage: e.target.value })}
            />
          </label>
          <label>上傳課文（TXT、MD、文字型PDF；最多10MB、30頁）<input type="file" accept=".txt,.md,.pdf" disabled={busy} onChange={e=>{const file=e.target.files?.[0];if(file)void run(async()=>{const passage=await readQuizPassage(file);setForm(prev=>({...prev,passage}));setMessage(`已讀取 ${file.name}，請確認下方課文，再按AI出題；尚未傳送AI。`);});e.target.value='';}}/></label>
          <p>檔案在本機取出文字；掃描PDF請先轉成文字。出題前請核對段落、標點與讀取順序。</p>
          <button type="button" className="secondary" disabled={busy||!form.className.trim()||!rosterText.trim()} onClick={()=>void run(async()=>{await quizRequest('/classes',{name:form.className,roster:rosterText.split(/[\s,;，；]+/).filter(Boolean)});const v=await quizRequest<{items:typeof classes}>('/classes');setClasses(v.items);setMessage('班級名單已儲存，下次可直接選用。');})}>儲存班級名單供下次使用</button>
          <fieldset className="quiz-question-plan" disabled={busy}>
            <legend>出題設定</legend>
            <table>
              <thead><tr><th scope="col">類型</th><th scope="col">難度</th><th scope="col">題數</th></tr></thead>
              <tbody>{questionRows.map((row, index) => {
                const update = (patch: Partial<typeof row>) => setQuestionRows(rows =>
                  rows.map((item, i) => i === index ? { ...item, ...patch } : item));
                return <tr key={row.category}>
                  <th scope="row">{row.category}</th>
                  <td><select aria-label={row.category + "難度"} value={row.difficulty} disabled={!row.count}
                    onChange={e => update({ difficulty: e.target.value })}>
                    <option value="易">低</option><option value="中">中</option><option value="難">高</option>
                  </select></td>
                  <td><select aria-label={row.category + "題數"} value={row.count}
                    onChange={e => update({ count: Number(e.target.value) })}>
                    {Array.from({ length: 11 }, (_, n) => <option key={n} value={n}>{n === 0 ? "0（不出題）" : n}</option>)}
                  </select></td>
                </tr>;
              })}</tbody>
            </table>
            <p aria-live="polite">合計 {questionCount} 題（限 1–10 題）</p>
          </fieldset>
          <p>課文理解包含擷取訊息、推論、統整與評鑑反思，參考閱讀素養方向。成語、修辭與改錯須有課文依據；題材不足時會提示，不能憑空補寫。</p>
          <p>
            使用 API
            設定中已儲存的文字模型。按下後會傳送這份課文與設定，執行出題及 AI
            檢查兩次呼叫，可能計費；失敗不自動重試。
          </p>
          <button
            className="primary"
            disabled={busy || questionCount < 1 || questionCount > 10}
          >
            {busy ? "AI 處理中…" : "AI 產生母題＋2個同義改寫"}
          </button>
        </form>
      )}
      {tab !== "generate" && tab !== "sql" && (
        <>
          {!reviewId&&<><h2>母題題庫與已發布試卷</h2>
          {!papers.length && <p>尚無母題，請先用 AI 建立母題。</p>}
          <label>依課別、班級或試卷名稱篩選<input value={paperSearch} onChange={e=>setPaperSearch(e.target.value)}/></label>
          <div className="quiz-paper-list">
            {papers.filter(q=>`${q.title} ${q.className} ${q.lesson}`.includes(paperSearch)).map((q) => (
              <button
                className="secondary"
                key={q.id}
                disabled={busy}
                onClick={() => void run(() => open(q.id))}
              >
                {q.title} · {q.className} · {q.count}題 ·{" "}
                {q.status === "published" ? "已發布" : "待審草稿"}
              </button>
            ))}
          </div></>}
          {paper && (
            <>
              <h2>{paper.title}</h2>
              {paper.source && (
                <p>
                  來源：{paper.source.publisher} {paper.source.year}{" "}
                  教用題卷（非課文全文）；原題與答案保留，AI
                  僅補同義題幹與解析，待教師審核。
                  <a href={paper.source.url} target="_blank" rel="noreferrer">
                    開啟官方原卷 ↗
                  </a>
                </p>
              )}
              <p>
                {paper.className} · {paper.lesson} ·{" "}
                {paper.questionMode === "original"
                  ? "原題再考"
                  : "AI 同義改寫題"}{" "}
                · 母題識別碼保留供前後比較
              </p>
              {paper.status === "draft" && !paper.parentId && (
                <div className="quiz-grid">
                  <label>
                    指派班級名稱
                    <input
                      maxLength={80}
                      value={paper.className}
                      disabled={busy}
                      onChange={(e) =>
                        setPaper({ ...paper, className: e.target.value })
                      }
                    />
                  </label>
                  <label>
                    指派學生 Google Email（每行一位）
                    <textarea
                      value={paper.roster.join("\n")}
                      disabled={busy}
                      onChange={(e) =>
                        setPaper({
                          ...paper,
                          roster: e.target.value.split("\n"),
                        })
                      }
                      onBlur={() =>
                        setPaper({
                          ...paper,
                          roster: paper.roster
                            .map((x) => x.trim())
                            .filter(Boolean),
                        })
                      }
                    />
                    <small>
                      出版社草稿預設僅供管理者檢查。發布前可改為實際班級學生。
                    </small>
                  </label>
                </div>
              )}
              {paper.status==='draft'&&<div className="quiz-grid"><label>作答截止時間（選填，台灣時間）<input type="datetime-local" value={paper.dueAt?new Date(Date.parse(paper.dueAt)+8*3600000).toISOString().slice(0,16):''} onChange={e=>setPaper({...paper,dueAt:e.target.value?new Date(e.target.value+'+08:00').toISOString():''})}/></label><label className="quiz-check"><input type="checkbox" checked={paper.shuffleOptions===true} onChange={e=>setPaper({...paper,shuffleOptions:e.target.checked})}/>每位學生打亂選項順序</label></div>}
              {paper.status === "published" ? (
                <>
                  <div className="quiz-actions">
                    <button
                      className="primary"
                      disabled={busy}
                      onClick={() => void run(loadStats)}
                    >
                      查看全班錯題統計
                    </button>
                    <a
                      href={`/?view=quiz&paper=${paper.id}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      學生作答連結 ↗
                    </a>
                  </div>
                  <label>
                    再出題方式
                    <select
                      value={mode}
                      onChange={(e) => setMode(e.target.value as typeof mode)}
                    >
                      <option value="original">原題再考</option>
                      <option value="rephrase">
                        AI 同義改寫題（已審版本）
                      </option>
                    </select>
                  </label>
                  <button
                    className="secondary"
                    disabled={busy}
                    onClick={() => {
                      if (bankIds.length) void run(() => reuse("reuse"));
                      else setMessage("請先勾選母題");
                    }}
                  >
                    勾選母題再出一次
                  </button>
                </>
              ) : (
                <>
                  <label>
                    出題方式
                    <select
                      value={paper.questionMode}
                      onChange={(e) =>
                        setPaper({
                          ...paper,
                          questionMode: e.target
                            .value as QuizPaper["questionMode"],
                        })
                      }
                    >
                      <option value="original">原題再考</option>
                      <option value="rephrase">
                        AI 同義改寫題（只微調用字）
                      </option>
                    </select>
                  </label>
                  <p>
                    逐題確認唯一答案、解析、課文依據與所有改寫意思相同，再勾選審核。
                  </p>
                </>
              )}
              {tab === "stats" && (
                <>
                  <h3>四類能力表現（最近一次作答）</h3>{QUIZ_CATEGORIES.filter(c=>paper.questions.some(q=>q.category===c)).map(c=>{const rows=stats.filter(r=>paper.questions.find(q=>q.id===r.id)?.category===c);const total=rows.reduce((n,r)=>n+r.total,0),wrong=rows.reduce((n,r)=>n+r.wrong,0);return <p key={c}>{c}：{total?Math.round((total-wrong)/total*100)+'% 答對':'尚無作答'}（{total}次題目作答）</p>;})}
                  <h3>全班錯題集中再測</h3>
                  <p>
                    錯誤率：答錯人數 ÷
                    已交卷人數。未交卷不計入；同一學生重考以最近一次為準。首次與最近一次僅比較本題實際作答者。
                  </p>
                  <div className="quiz-stats">
                    {stats.map((r) => (
                      <article key={r.id}>
                        <label className="quiz-check">
                          <input
                            type="checkbox"
                            disabled={!r.wrong}
                            checked={selected.includes(r.id)}
                            onChange={(e) =>
                              setSelected(
                                e.target.checked
                                  ? [...selected, r.id]
                                  : selected.filter((x) => x !== r.id),
                              )
                            }
                          />
                          <strong>
                            第
                            {paper.questions.findIndex((q) => q.id === r.id) +
                              1}
                            題 · 錯誤率 {r.rate}%（{r.wrong}/{r.total}
                            人）
                          </strong>
                        </label>
                        <p>{r.stem}</p>
                        {paper.questions
                          .filter((q) => q.id === r.id)
                          .map((q) => (
                            <details key={q.id}>
                              <summary>題目選項與解析</summary>
                              {q.options.map((o, i) => (
                                <p key={i}>
                                  {String.fromCharCode(65 + i)}. {o}
                                  {i === q.answer ? "（正解）" : ""}
                                </p>
                              ))}
                              <p>{q.explanation}</p>
                              <blockquote>{q.evidence}</blockquote>
                            </details>
                          ))}
                        <p>
                          最近選答分布：
                          {r.choices
                            .map(
                              (n, j) => `${String.fromCharCode(65 + j)} ${n}人`,
                            )
                            .join("／")}
                          （含正確選項）
                        </p>
                        <p>
                          首次答錯 {r.firstWrong}人 → 最近答錯 {r.wrong}
                          人；已改善 {r.improved}人
                        </p>
                        <details>
                          <summary>仍答錯的學生</summary>
                          <p>{r.names.join("、") || "目前無人答錯"}</p>
                        </details>
                      </article>
                    ))}
                  </div>
                  <button
                    className="primary"
                    disabled={busy || !selected.length}
                    onClick={() => void run(() => reuse("remedial"))}
                  >
                    將勾選錯題集中再出卷（{selected.length}題）
                  </button>
                </>
              )}
              {tab!=='stats'&&<div className="quiz-grid"><label>題型<select value={categoryFilter} onChange={e=>setCategoryFilter(e.target.value)}><option value="">全部</option>{QUIZ_CATEGORIES.map(c=><option key={c}>{c}</option>)}</select></label><label>難度<select value={difficultyFilter} onChange={e=>setDifficultyFilter(e.target.value)}><option value="">全部</option>{['易','中','難'].map(c=><option key={c}>{c}</option>)}</select></label><label>審核狀態<select value={reviewFilter} onChange={e=>setReviewFilter(e.target.value)}><option value="">全部</option><option value="pending">待審</option><option value="reviewed">已核可</option></select></label></div>}
              {tab !== "stats" &&
                paper.questions.map((q, i) => (!categoryFilter||q.category===categoryFilter)&&(!difficultyFilter||q.difficulty===difficultyFilter)&&(!reviewFilter||(reviewFilter==='reviewed')===q.reviewed)&&(
                  <article className="quiz-question" key={q.id}>
                    {paper.status==='draft'&&!paper.parentId&&<label className="quiz-check"><input type="checkbox" checked={bankIds.includes(q.id)} onChange={e=>setBankIds(e.target.checked?[...bankIds,q.id]:bankIds.filter(id=>id!==q.id))}/>納入這份試卷</label>}
                    {paper.status === "published" && (
                      <label className="quiz-check">
                        <input
                          type="checkbox"
                          checked={bankIds.includes(q.id)}
                          onChange={(e) =>
                            setBankIds(
                              e.target.checked
                                ? [...bankIds, q.id]
                                : bankIds.filter((id) => id !== q.id),
                            )
                          }
                        />
                        加入下一份試卷
                      </label>
                    )}
                    <h3>
                      母題 {i + 1} · {q.category} · {q.difficulty}
                    </h3>
                    <fieldset
                      disabled={
                        busy || paper.status === "published" || !!paper.parentId
                      }
                    >
                      <label>題型<select value={q.category} onChange={e=>changeQuestion(i,{category:e.target.value})}>{QUIZ_CATEGORIES.map(c=><option key={c}>{c}</option>)}</select></label><label>難度<select value={q.difficulty} onChange={e=>changeQuestion(i,{difficulty:e.target.value})}>{['易','中','難'].map(c=><option key={c}>{c}</option>)}</select></label>
                      {q.category==='課文理解（閱讀素養）'&&<label>閱讀歷程<select value={q.readingSkill||''} onChange={e=>changeQuestion(i,{readingSkill:e.target.value})}><option value="">請核對</option>{['擷取訊息','推論','統整','評鑑反思'].map(c=><option key={c}>{c}</option>)}</select></label>}
                      <label>
                        原題題幹
                        <textarea
                          value={q.stem}
                          onChange={(e) =>
                            changeQuestion(i, { stem: e.target.value })
                          }
                        />
                      </label>
                      {q.variants.map((v, j) => (
                        <label key={j}>
                          AI 同義改寫 {j + 1}
                          <textarea
                            value={v}
                            onChange={(e) =>
                              changeQuestion(i, {
                                variants: q.variants.map((x, k) =>
                                  j === k ? e.target.value : x,
                                ),
                              })
                            }
                          />
                        </label>
                      ))}
                      {q.options.map((v, j) => (
                        <label key={j}>
                          選項 {String.fromCharCode(65 + j)}
                          <input
                            value={v}
                            onChange={(e) =>
                              changeQuestion(i, {
                                options: q.options.map((x, k) =>
                                  j === k ? e.target.value : x,
                                ),
                              })
                            }
                          />
                        </label>
                      ))}
                      <label>
                        正確答案
                        <select
                          value={q.answer}
                          onChange={(e) =>
                            changeQuestion(i, { answer: +e.target.value })
                          }
                        >
                          {q.options.map((_, j) => (
                            <option value={j} key={j}>
                              {String.fromCharCode(65 + j)}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label>
                        解析
                        <textarea
                          value={q.explanation}
                          onChange={(e) =>
                            changeQuestion(i, { explanation: e.target.value })
                          }
                        />
                      </label>
                      <label>
                        {paper.sourceKind === "assessment"
                          ? "教用題卷依據（非課文全文）"
                          : "課文逐字依據"}
                        <textarea
                          value={q.evidence}
                          onChange={(e) =>
                            changeQuestion(i, { evidence: e.target.value })
                          }
                        />
                      </label>
                    </fieldset>
                    <label className="quiz-check">
                      <input
                        type="checkbox"
                        disabled={paper.status === "published" || busy}
                        checked={q.reviewed}
                        onChange={(e) =>
                          changeQuestion(i, { reviewed: e.target.checked })
                        }
                      />
                      已核對母題與全部改寫、選項、答案、解析及依據
                    </label>
                  </article>
                ))}
              {paper.status === "draft" && (
                <div className="quiz-actions">
                  <button
                    className="secondary"
                    disabled={busy}
                    onClick={() =>
                      void run(async () => {
                        setPaper(
                          await quizRequest(`/papers/${paper.id}/save`, paper),
                        );
                        await load();
                        setMessage("草稿已儲存。");
                      })
                    }
                  >
                    儲存全部母題草稿
                  </button>
                  <button
                    className="primary"
                    disabled={busy || !bankIds.length || !paper.questions.filter(q=>bankIds.includes(q.id)).every((q) => q.reviewed)}
                    onClick={() =>
                      void run(async () => {
                        setPaper(
                          await quizRequest(
                            `/papers/${paper.id}/publish`,
                            {...paper,questions:paper.questions.filter(q=>paper.parentId||bankIds.includes(q.id))},
                          ),
                        );
                        await load();
                        setMessage("已發布，學生可登入作答並收集錯題。");
                      })
                    }
                  >
                    審核完成並派送班級
                  </button>
                </div>
              )}
            </>
          )}
        </>
      )}
    </section>
  );
}
