import { gameRequest } from "./gameApi";
import { useEffect, useState } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { BookOpen, PenLine, Gamepad2, FolderCheck, Shapes, Trophy, Sparkles } from "lucide-react";
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
import SentencePractice from "./TimedSentencePractice";
import CharacterStructureGame from "./CharacterStructureGame";
import CompetitionPlay from "./CompetitionPlay";
import type { LessonContext } from "./curriculumLearning";
import { competitionRequest } from "./competitionApi";
import { useSiteTheme } from "./siteThemes";
import { SITE_VERSION, SITE_UPDATED_AT, SITE_VERSION_NOTE } from "./siteVersion";
import {submitGame,writingAssignments,type WritingAssignment} from './gameApi';
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
function gameView(): 'hub' | 'practice' | 'sentences' | 'structure' | 'competition' | 'strokes' {
  if(window.location.hash==="#games/strokes")return "strokes";
  return window.location.hash.startsWith('#games/competition') ? 'competition' : window.location.hash === '#games/sentence-practice' ? 'practice' : window.location.hash === '#games/sentence' ? 'sentences' : /^#games\/structure(?:\/|$)/.test(window.location.hash) ? 'structure' : 'hub';
}
export default function GameZone() {
  useSiteTheme();
  const [allowed,setAllowed]=useState<Set<string>|null>(null);
  const [sourceError,setSourceError]=useState('');
  useEffect(()=>{const abort=new AbortController();fetch('/game-strokes/catalog.json',{signal:abort.signal}).then(r=>{if(!r.ok)throw Error('筆順目錄載入失敗');return r.json()}).then(v=>setAllowed(new Set(v.characters.map((c:{character:string})=>c.character)))).catch(e=>{if(!abort.signal.aborted)setSourceError(e.message)});return()=>abort.abort()},[]);
  const [user, setUser] = useState<User | null>(null),
    [ready, setReady] = useState(false),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [competitionAvailable,setCompetitionAvailable]=useState(false),
    [structureTasks,setStructureTasks]=useState<WritingAssignment[]>([]),
    [assignments,setAssignments]=useState<WritingAssignment[]>([]),
    [view, setView] = useState<ReturnType<typeof gameView> | "choose" | "writing" | "works">(gameView),
    [course, setCourse] = useState<{
      characters: string[];
      context: LessonContext;
      assignmentId?: string;
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
      setView(gameView());
      setStructureTasks([]);
      setCompetitionAvailable(false);
      if(u)void gameRequest("/structure-assignments").then(value=>setStructureTasks(value.items)).catch(()=>{});
      if(u)void competitionRequest<{available:boolean}>("/available").then(value=>setCompetitionAvailable(value.available)).catch(()=>{});
      if(u)void writingAssignments().then(value=>setAssignments(value.items.filter(item=>!item.submitted))).catch(error=>setMessage(error.message));else setAssignments([]);
    });
  }, []);
  useEffect(()=>{const changed=()=>setView(gameView());window.addEventListener('hashchange',changed);return()=>window.removeEventListener('hashchange',changed);},[]);
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
  function startWritingAssignment(assignment:WritingAssignment){
    const [publisherPart,title]=assignment.lesson.split(' · '),match=publisherPart.match(/^(\S+) (\d)年級([上下])$/);
    setCourse({characters:assignment.characters,context:{publisher:match?.[1]||'',grade:Number(match?.[2]||0),term:match?.[3]||'',title:title||assignment.lesson} as LessonContext,assignmentId:assignment.id});
    setView('writing');
  }
  return (
    <div className="game-zone">
      <header className="game-header">
        <a href="/" className="game-brand">
          <BookOpen />
          生字動畫收藏本
          <span className="game-version">v{SITE_VERSION} {SITE_VERSION_NOTE} · 最後修正 {SITE_UPDATED_AT}</span>
        </a>
        <a href="#games">遊戲專區</a>
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
        {view === "strokes" ? (
          <WritingPractice user={null} characters={["永","字","學"]} lesson="筆順自由練習"
            onBack={()=>{window.location.hash="games";setView("hub");}}/>
        ) : view === "structure" ? (
          <CharacterStructureGame onBack={()=>{window.location.hash='games';setView('hub');}}/>
        ) : !ready ? (
          <p role="status">確認登入狀態…</p>
        ) : !user ? (
          <section className="game-login">
            <Gamepad2 size={48} />
            <p className="eyebrow">每天一點，生字更熟練</p>
            <h1>{view==='competition'?'課堂 Kahoot 競賽':view==='practice'?'一字多詞 AI 造句':view==='sentences'?'語詞 AI 造句競賽':'遊戲專區'}</h1>
            <p>{view==='practice'?'登入後輸入老師提供的限時開課代碼。':'生字結構可直接練習，課堂活動請先登入。'}</p>
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
            <a className="secondary" href="#games/structure">免登入玩生字結構</a>
            <a className="secondary" href="#games/strokes">免登入練習筆順</a>
          </section>
        ) : view === "competition" ? <CompetitionPlay onBack={()=>{window.location.hash='games';setView('hub');}}/> : view === "practice" ? <SentencePractice lessonTitle={course?.context.title} onBack={()=>{window.location.hash='games';setView('hub');}}/> : view === "sentences" ? <SentenceCompetition key={user.uid} user={user} onBack={()=>{window.location.hash='games';setView('hub');}}/> : view === "writing" && course ? (
          <WritingPractice
            key={`${user.uid}/${JSON.stringify(course)}`}
            user={user}
            characters={course.characters}
            lesson={`${course.context.publisher} ${course.context.grade}年級${course.context.term} · ${course.context.title}`}
            onBack={() => setView("hub")}
            submit={work=>submitGame({...work,...(course.assignmentId?{assignmentId:course.assignmentId}:{})})}
          />
        ) : (
          <>
            <div className="game-row game-intro">
              <div>
                <p className="eyebrow">練生字，也玩出好習慣</p>
                <h1>遊戲專區</h1>
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
                {!!structureTasks.length && <section className="game-assignments">
                  <h2>老師指派的生字結構練習</h2>
                  {structureTasks.map(task => <article key={task.id}>
                    <div><strong>{task.lesson}</strong><p>{task.characters.join("、")}</p></div>
                    <a className="primary" href={"#games/structure/" + encodeURIComponent(task.characters.join(""))}>開始練習</a>
                  </article>)}
                </section>}
                {!!assignments.length&&<section className="game-assignments"><div><span className="eyebrow">老師指派 · 個人作業</span><h2>待完成的書寫作業</h2></div>{assignments.map(assignment=><article key={assignment.id}><div><strong>{assignment.title}</strong><p>{assignment.className} · {assignment.lesson}</p><span>{assignment.characters.join('　')}</span></div><button className="primary" onClick={()=>startWritingAssignment(assignment)}>開始書寫 →</button></article>)}</section>}
                <section className="game-course">
                  <div className="game-row">
                    <div>
                      <span className="eyebrow">個人自由練習</span>
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
                  <article className="game-tile"><div className="game-icon"><Trophy size={34}/></div><span className="game-pill">四碼開課 × 即時排名</span><h2>課堂 Kahoot 競賽（全班）</h2><p>輸入老師提供的四碼代碼，參加四選一、生字結構或 AI 語音造句競賽，並查看即時排名。</p><button className="primary" disabled={!competitionAvailable} onClick={()=>{window.location.hash='games/competition';setView('competition');}}>{competitionAvailable?'輸入開課代碼 →':'目前沒有開課'}</button></article>
                  {games.map((g) => (
                    <article key={g.id} className="game-tile">
                      <div className="game-icon"><g.icon size={34} /></div>
                      <span className="game-pill">全班派發 × 個人書寫</span>
                      <h2>{g.title}（全班）</h2>
                      <p>{g.description}</p>
                      <button className="primary" disabled={!assignments.length} onClick={() => assignments[0]&&startWritingAssignment(assignments[0])}>
                        {assignments.length ? "開始個人作業 →" : "目前沒有待完成作業"}
                      </button>
                    </article>
                  ))}
                  <article className="game-tile"><div className="game-icon"><Sparkles size={34}/></div><span className="game-pill">自由練習 × AI 等第</span><h2>一字多詞 AI 造句（個人）</h2><p>輸入語詞、選一個字，用即時語音說句子，再做同音語意校正與流暢美感評量。</p><button className="primary" onClick={()=>{window.location.hash='games/sentence-practice';setView('practice');}}>開始自由造句 →</button></article>
                  <article className="game-tile"><div className="game-icon"><Shapes size={34}/></div><span className="game-pill">看字 × 認識部件</span><h2>生字結構遊戲（個人）</h2><p>看生字，選出左右、上下或全包圍結構，答題後認識部件。可自由練習，也可開啟老師提供的課文生字練習連結。</p><button className="primary" onClick={()=>{window.location.hash='games/structure';setView('structure');}}>進入結構遊戲 →</button></article>
                </div>
                <p className="game-future">
                  老師指派的書寫內容會顯示在個人作業；自行選課文則屬自由練習，不會列入班級作業進度。
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
