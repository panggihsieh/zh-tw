import { useEffect, useState } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { BookOpen, PenLine, Gamepad2, FolderCheck } from "lucide-react";
import {
  cloudConfigured,
  cloudServices,
  cloudLogin,
  cloudLogout,
  finishCloudRedirect,
} from "./cloudSync";
import CurriculumDatabase from "./CurriculumDatabase";
import WritingPractice from "./WritingPractice";
import GameReview from "./GameReview";
import SentenceCompetition from "./SentenceCompetition";
import type { LessonContext } from "./curriculumLearning";
import { useSiteTheme } from "./siteThemes";
import "./games.css";
// New vocabulary games share this course/account entry; only playable games are listed.
const games = [
  {
    id: "writing",
    title: "書寫小達人",
    description: "按筆順寫生字，留下自己的字跡，再把作品交給老師。",
    icon: PenLine,
  },
];
export default function GameZone() {
  useSiteTheme();
  const [allowed,setAllowed]=useState<Set<string>|null>(null);
  const [sourceError,setSourceError]=useState('');
  useEffect(()=>{const abort=new AbortController();fetch('/game-strokes/catalog.json',{signal:abort.signal}).then(r=>{if(!r.ok)throw Error('筆順目錄載入失敗');return r.json()}).then(v=>setAllowed(new Set(v.characters.map((c:{character:string})=>c.character)))).catch(e=>{if(!abort.signal.aborted)setSourceError(e.message)});return()=>abort.abort()},[]);
  const [user, setUser] = useState<User | null>(null),
    [ready, setReady] = useState(false),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [view, setView] = useState<"hub" | "choose" | "writing" | "works" | "sentences">(window.location.hash==='#games/sentence'?'sentences':'hub'),
    [course, setCourse] = useState<{
      characters: string[];
      context: LessonContext;
    } | null>(null);
  useEffect(() => {
    if (!cloudConfigured) {
      setReady(true);
      return;
    }
    void finishCloudRedirect().catch((e) => setMessage(e.message));
    return onAuthStateChanged(cloudServices().auth, (u) => {
      setUser(u);
      setReady(true);
      setCourse(null);
      setView(window.location.hash==='#games/sentence'?'sentences':'hub');
    });
  }, []);
  useEffect(()=>{const changed=()=>setView(window.location.hash==='#games/sentence'?'sentences':'hub');window.addEventListener('hashchange',changed);return()=>window.removeEventListener('hashchange',changed);},[]);
  async function login(redirect = false) {
    setBusy(true);
    setMessage("");
    try {
      await cloudLogin(redirect);
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="game-zone">
      <header className="game-header">
        <a href="/" className="game-brand">
          <BookOpen />
          生字動畫收藏本
        </a>
        <a href="#games">生詞遊戲專區</a>
        <div className="game-account">
          {user ? (
            <>
              <span>{user.displayName || user.email}</span>
              <button
                className="secondary"
                onClick={() =>
                  void cloudLogout().catch((e) => setMessage(e.message))
                }
              >
                登出
              </button>
            </>
          ) : (
            <span>登入後選課練習</span>
          )}
        </div>
      </header>
      <main className="game-main">
        {!ready ? (
          <p role="status">確認登入狀態…</p>
        ) : !user ? (
          <section className="game-login">
            <Gamepad2 size={48} />
            <p className="eyebrow">每天一點，生字更熟練</p>
            <h1>生詞遊戲專區</h1>
            <p>選擇正在學的課文，練習生字，收藏自己的進步。</p>
            <button
              className="primary"
              disabled={!cloudConfigured || busy}
              onClick={() => void login()}
            >
              使用 Google 登入
            </button>
            <button
              className="secondary"
              disabled={!cloudConfigured || busy}
              onClick={() => void login(true)}
            >
              改用整頁登入
            </button>
            {!cloudConfigured && <p>尚未設定 Google 登入。</p>}
          </section>
        ) : view === "sentences" ? <SentenceCompetition key={user.uid} user={user} onBack={()=>{window.location.hash='games';setView('hub');}}/> : view === "writing" && course ? (
          <WritingPractice
            key={`${user.uid}/${JSON.stringify(course)}`}
            user={user}
            characters={course.characters}
            lesson={`${course.context.publisher} ${course.context.grade}年級${course.context.term} · ${course.context.title}`}
            onBack={() => setView("hub")}
          />
        ) : (
          <>
            <div className="game-row game-intro">
              <div>
                <p className="eyebrow">練生字，也玩出好習慣</p>
                <h1>生詞遊戲專區</h1>
                <p>同一課生字，用不同方式練習。</p>
              </div>
              <button
                className="secondary"
                onClick={() => setView(view === "works" ? "hub" : "works")}
              >
                <FolderCheck size={18} />
                {view === "works" ? "返回遊戲" : "我的作品與評語"}
              </button>
            </div>
            {view === "works" ? (
              <GameReview key={user.uid} />
            ) : (
              <>
                <section className="game-course">
                  <div className="game-row">
                    <div>
                      <span className="eyebrow">目前課文</span>
                      <h2>
                        {course
                          ? `${course.context.publisher} ${course.context.grade}${course.context.term} · ${course.context.title}`
                          : "先選一課，開始今天的練習"}
                      </h2>
                      {course && <p>{course.characters.join("　")}</p>}
                    </div>
                    <button
                      className="secondary"
                      onClick={() =>
                        setView(view === "choose" ? "hub" : "choose")
                      }
                    >
                      {view === "choose"
                        ? "收合選課"
                        : course
                          ? "更換課文"
                          : "選擇課文"}
                    </button>
                  </div>
                  {view === "choose" && (
                      allowed ? <CurriculumDatabase
                      student
                      onLearn={async (characters, context) => {
                        setCourse({ characters, context });
                        setView("hub");
                      }}
                      actionLabel="使用這批生字"
                        allowedCharacters={allowed}
                      /> : <p role="status">{sourceError||'載入可練習筆順目錄…'}</p>
                  )}
                </section>
                <div className="game-catalog">
                  <article className="game-tile"><div className="game-icon"><Gamepad2 size={34}/></div><span className="game-pill">南一高年級 × 說話造句</span><h2>一字多詞造句競賽</h2><p>參加老師派送的限時競賽，看字音、想詞語、說一句話，完成後查看評分與老師評語。</p><button className="primary" onClick={()=>{window.location.hash='games/sentence';setView('sentences');}}>進入造句競賽 →</button></article>
                  {games.map((g) => (
                    <article key={g.id} className="game-tile">
                      <div className="game-icon">
                        <g.icon size={34} />
                      </div>
                      <span className="game-pill">筆順 × 書寫</span>
                      <h2>{g.title}</h2>
                      <p>{g.description}</p>
                      <button
                        className="primary"
                        onClick={() => setView(course ? "writing" : "choose")}
                      >
                        {course ? "開始練習 →" : "先選課文 →"}
                      </button>
                    </article>
                  ))}
                </div>
                <p className="game-future">
                  未來新增的生詞遊戲會集中在這裡，沿用所選課文。
                </p>
              </>
            )}
          </>
        )}
        {message && <p role="alert">{message}</p>}
      </main>
      <footer className="game-footer">
        <a href="/">返回生字動畫教室</a>
        <span>原始字跡 · 筆順練習 · 老師評閱</span>
      </footer>
    </div>
  );
}
