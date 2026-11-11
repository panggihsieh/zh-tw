import { useEffect, useState } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { cloudServices, cloudLogin, finishCloudRedirect } from "./cloudSync";
import {
  quizRequest,
  type QuizPaper,
  type QuizAttempt,
  type QuizRow,
} from "./quizApi";
import "./quiz.css";
export default function QuizStudent() {
  const [user, setUser] = useState<User | null>(null),
    [ready, setReady] = useState(false),
    [papers, setPapers] = useState<QuizPaper[]>([]),
    [wrong, setWrong] = useState<QuizRow[]>([]),
    [attempt, setAttempt] = useState<QuizAttempt | null>(null),
    [answers, setAnswers] = useState<number[]>([]),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [tab, setTab] = useState("wrong");
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
  useEffect(() => {
    void finishCloudRedirect().catch((e) => setMessage(e.message));
    return onAuthStateChanged(cloudServices().auth, (u) => {
      setUser(u);
      setReady(true);
      setAttempt(null);
      setWrong([]);
      setPapers([]);
    });
  }, []);
  const [practiceMode, setPracticeMode] = useState("original");
  const key = `hanzi.quiz-attempt.${user?.uid}`;
  async function load() {
    const [p, w] = await Promise.all([
      quizRequest<{ items: QuizPaper[] }>("/papers"),
      quizRequest<{ items: QuizRow[] }>("/wrong-book"),
    ]);
    if (cloudServices().auth.currentUser?.uid !== user?.uid) return;
    setPapers(p.items);
    setWrong(w.items);
    setMessage("");
  }
  useEffect(() => {
    if (user)
      void run(async () => {
        await load();
        if (cloudServices().auth.currentUser?.uid !== user?.uid) return;
        const saved = sessionStorage.getItem(key);
        if (saved) {
          try {
            const s = JSON.parse(saved),
              a = await quizRequest<QuizAttempt>(`/attempts/${s.id}`);
            if (
              new URLSearchParams(location.search).get("paper") &&
              new URLSearchParams(location.search).get("paper") !== a.quizId
            )
              return;
            setAttempt(a);
            setAnswers(
              Array.isArray(s.answers) &&
                s.answers.length === a.questions.length
                ? s.answers
                : a.questions.map(() => -1),
            );
          } catch {
            sessionStorage.removeItem(key);
          }
        }
      });
  }, [user?.uid]);
  function remember(a: QuizAttempt, values: number[]) {
    sessionStorage.setItem(key, JSON.stringify({ id: a.id, answers: values }));
  }
  async function start(quizId: string, practice = false, ids?: string[]) {
    const a = await quizRequest<QuizAttempt>("/attempts", {
      quizId,
      practice,
      questionMode: practiceMode,
      ids,
    });
    if (cloudServices().auth.currentUser?.uid !== user?.uid) return;
    setAttempt(a);
    const values = a.questions.map(() => -1);
    setAnswers(values);
    remember(a, values);
    setMessage("");
  }
  const linked = new URLSearchParams(location.search).get("paper");
  return (
    <main className="quiz-workspace student-quiz">
      <a href="/">← 返回生字動畫教室</a>
      <h1>我的國語錯題本</h1>
      <p>做錯的題目會留下來，看看解析，再練一次。</p>
      {!ready ? (
        <p>確認登入狀態…</p>
      ) : !user ? (
        <>
          <p>登入後保存自己的作答與錯題紀錄。</p>
          <button
            className="primary"
            disabled={busy}
            onClick={() =>
              void run(async () => {
                await cloudLogin();
                setMessage("");
              })
            }
          >
            Google 登入
          </button>
          <button
            className="secondary"
            disabled={busy}
            onClick={() =>
              void run(async () => {
                await cloudLogin(true);
              })
            }
          >
            改用重新導向登入
          </button>
        </>
      ) : (
        <>
          <p>{user.displayName || user.email}</p>
          <div className="quiz-actions">
            <button
              className="secondary"
              onClick={() => {
                setTab("wrong");
                setAttempt(null);
                sessionStorage.removeItem(key);
              }}
            >
              我的錯題（{wrong.filter((q) => !q.latestCorrect).length}題待複習）
            </button>
            <button
              className="secondary"
              onClick={() => {
                setTab("papers");
                setAttempt(null);
                sessionStorage.removeItem(key);
              }}
            >
              國語測驗
            </button>
            <button
              className="secondary"
              disabled={busy}
              onClick={() => void run(load)}
            >
              重新整理
            </button>
          </div>
          {attempt ? (
            <section aria-label="國語作答">
              <h2>
                {attempt.title}{" "}
                {attempt.mode === "practice" ? "・錯題複習" : ""}
              </h2>
              <p>本次題目版本已固定，重新整理可接著作答。</p>
              <details>
                <summary>
                  {attempt.passage ? "閱讀課文" : "題卷來源說明"}
                </summary>
                <p className="quiz-passage">
                  {attempt.passage ||
                    "本題來自教用評量卷，未附完整課文，請配合課本閱讀。"}
                </p>
              </details>
              {attempt.result ? (
                <>
                  <h3>本次 {attempt.result.score} 分</h3>
                  <label>
                    再練出題方式
                    <select
                      value={practiceMode}
                      onChange={(e) => setPracticeMode(e.target.value)}
                    >
                      <option value="original">原題再考</option>
                      <option value="rephrase">
                        AI 同義改寫題（已審版本）
                      </option>
                    </select>
                  </label>
                  <p>
                    答錯 {attempt.result.rows.filter((r) => !r.correct).length}{" "}
                    題；每次作答都保留紀錄。
                  </p>
                  {attempt.result.rows.map((r, i) => (
                    <article className="quiz-question" key={r.id}>
                      <h3>
                        {i + 1}. {r.correct ? "答對" : "再練一下"}
                      </h3>
                      <p>{r.stem}</p>
                      <p>
                        你選：{r.options[r.choice]}　正解：{r.options[r.answer]}
                      </p>
                      <p>{r.explanation}</p>
                      <blockquote>{r.evidence}</blockquote>
                    </article>
                  ))}
                  <button
                    className="primary"
                    disabled={busy}
                    onClick={() => void run(() => start(attempt.quizId, true))}
                  >
                    再練這份卷的錯題
                  </button>
                </>
              ) : (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    void run(async () => {
                      const a = await quizRequest<QuizAttempt>(
                        `/attempts/${attempt.id}/submit`,
                        { answers },
                      );
                      if (cloudServices().auth.currentUser?.uid !== user?.uid)
                        return;
                      setAttempt(a);
                      remember(a, answers);
                      await load();
                      setMessage("已交卷，錯題已更新。");
                    });
                  }}
                >
                  {attempt.questions.map((q, i) => (
                    <fieldset
                      className="quiz-question"
                      key={q.id}
                      disabled={busy}
                    >
                      <legend>
                        {i + 1}. {q.stem}
                      </legend>
                      {q.options.map((o, j) => (
                        <label className="quiz-choice" key={j}>
                          <input
                            type="radio"
                            name={q.id}
                            required
                            checked={answers[i] === j}
                            onChange={() => {
                              const v = answers.map((x, k) =>
                                k === i ? j : x,
                              );
                              setAnswers(v);
                              remember(attempt, v);
                            }}
                          />
                          {String.fromCharCode(65 + j)}. {o}
                        </label>
                      ))}
                    </fieldset>
                  ))}
                  <button
                    className="primary"
                    disabled={busy || answers.some((v) => v < 0)}
                  >
                    交卷並查看錯題
                  </button>
                </form>
              )}
            </section>
          ) : tab === "papers" ? (
            <>
              <h2>老師發布的測驗</h2>
              {!papers.length && <p>目前沒有已發布的國語測驗。</p>}
              {papers.map((p) => (
                <article className="quiz-question" key={p.id}>
                  <h3>
                    {p.title}
                    {linked === p.id ? "・老師分享的試卷" : ""}
                  </h3>
                    {p.dueAt&&<p>作答期限：{new Date(p.dueAt).toLocaleString('zh-TW',{timeZone:'Asia/Taipei'})}</p>}
                  <p>
                    {p.className} · {p.lesson} · {p.count}題 ·{" "}
                    {p.questionMode === "original" ? "原題" : "AI 同義改寫題"}
                  </p>
                  <button
                    className="primary"
                    disabled={busy}
                    onClick={() => void run(() => start(p.id))}
                  >
                    開始作答
                  </button>
                </article>
              ))}
            </>
          ) : (
            <>
              <h2>錯題複習</h2>
              <label>
                複習出題方式
                <select
                  value={practiceMode}
                  onChange={(e) => setPracticeMode(e.target.value)}
                >
                  <option value="original">原題再考</option>
                  <option value="rephrase">AI 同義改寫題（已審版本）</option>
                </select>
              </label>
              {!wrong.length && (
                <p>目前沒有錯題，先到「國語測驗」完成一份練習。</p>
              )}
              {linked && (
                <button className="primary" onClick={() => setTab("papers")}>
                  前往老師分享的測驗
                </button>
              )}
              {wrong.map((r) => (
                <article className="quiz-question" key={r.id}>
                  <h3>
                    {r.latestCorrect ? "最近已答對" : "待複習"} · 累計答錯{" "}
                    {r.wrongCount} 次
                  </h3>
                  <p>{r.stem}</p>
                  <p>
                    最近選擇：{r.options[r.choice]}　正解：{r.options[r.answer]}
                  </p>
                  <details>
                    <summary>看解析與課文依據</summary>
                    <p>{r.explanation}</p>
                    <blockquote>{r.evidence}</blockquote>
                  </details>
                  <button
                    className="primary"
                    disabled={busy}
                    onClick={() =>
                      void run(() => start(r.quizId!, true, [r.id]))
                    }
                  >
                    只複習這題
                  </button>
                </article>
              ))}
            </>
          )}
        </>
      )}
      <p role="status">{message}</p>
    </main>
  );
}
