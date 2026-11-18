import TimedActivity from "./TimedActivity";
import { gameRequest } from "./gameApi";
import { useEffect, useState } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { BookOpen, Gamepad2, FolderCheck } from "lucide-react";
import {
  cloudConfigured,
  cloudServices,
  cloudLogin,
  cloudLogout,
  finishCloudRedirect,
} from "./cloudSync";
import WritingPractice from "./WritingPractice";
import GameReview from "./GameReview";
import SentenceCompetition from "./SentenceCompetition";
import SentencePractice from "./TimedSentencePractice";
import CharacterStructureGame from "./CharacterStructureGame";
import CompetitionPlay from "./CompetitionPlay";
import CompetitionCodeEntry from "./CompetitionCodeEntry";
import type { LessonContext } from "./curriculumLearning";
import { SITE_VERSION, SITE_UPDATED_AT, SITE_VERSION_NOTE } from "./siteVersion";
import {submitGame,writingAssignments,type WritingAssignment} from './gameApi';
import "./games.css";
function gameView(): 'hub' | 'practice' | 'sentences' | 'structure' | 'competition' | 'strokes' | 'assignments' {
  if (window.location.hash === "#games/assignments") return "assignments";
  if(window.location.hash==="#games/strokes")return "strokes";
  return window.location.hash.startsWith('#games/competition') ? 'competition' : window.location.hash === '#games/sentence-practice' ? 'practice' : window.location.hash === '#games/sentence' ? 'sentences' : /^#games\/structure(?:\/|$)/.test(window.location.hash) ? 'structure' : 'hub';
}
export default function GameZone() {
  const [user, setUser] = useState<User | null>(null),
    [ready, setReady] = useState(false),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
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
      if(u)void gameRequest("/structure-assignments").then(value=>setStructureTasks(value.items)).catch(()=>{});
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
  const [expiredNotice, setExpiredNotice] = useState(false);
  function expireActivity() {
    setExpiredNotice(true);
    returnToHub();
  }

  function returnToHub() {
    window.location.hash = "games";
    setView("hub");
  }

  return (
    <div className="game-zone">
      {view!=="hub"&&view!=="competition"&&<header className="game-header">
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
            <span>Kahoot 免登入，以課程代碼加入</span>
          )}
        </div>
      </header>}
      <main className="game-main">
        {view==="hub"&&<CompetitionCodeEntry onConfirm={code=>{window.location.hash=`games/competition?code=${code}`;setView("competition");}}/>}
        {view === "hub" && expiredNotice && <p role="status">時間到，活動已結束。<button className="secondary" onClick={() => setExpiredNotice(false)}>關閉提示</button></p>}
        {view === "strokes" ? (
          <TimedActivity key="strokes" minutes={5} onBack={returnToHub} onExpire={expireActivity}>
            <WritingPractice user={null} characters={["永", "字", "學"]} lesson="筆順自由練習" onBack={returnToHub} />
          </TimedActivity>
        ) : view === "structure" ? (
          <TimedActivity key="structure" minutes={5} onBack={returnToHub} onExpire={expireActivity}>
            <CharacterStructureGame onBack={returnToHub} />
          </TimedActivity>
        ) : !ready ? (
          <p role="status">確認登入狀態…</p>
        ) : !user && view !== "hub" && view !== "choose" && view !== "practice" && view !== "competition" ? (
          <section className="game-login">
            <Gamepad2 size={48} />
            <p className="eyebrow">每天一點，生字更熟練</p>
            <h1>{view==='sentences'?'語詞 AI 造句競賽':'遊戲專區'}</h1>
            <p>課堂活動請先登入。</p>
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
        ) : view === "competition" ? <CompetitionPlay onBack={returnToHub} onExpire={expireActivity} /> : view === "practice" ? (
          <TimedActivity key="practice" minutes={10} onBack={returnToHub} onExpire={expireActivity}>
            <SentencePractice lessonTitle={course?.context.title} onBack={returnToHub} />
          </TimedActivity>
        ) : view === "sentences" && user ? <SentenceCompetition key={user.uid} user={user} onBack={returnToHub} onExpire={expireActivity} /> : view === "writing" && course && user ? (
          <TimedActivity key={`writing/${user.uid}/${JSON.stringify(course)}`} minutes={20} onBack={returnToHub} onExpire={expireActivity}>
          <WritingPractice
            user={user}
            characters={course.characters}
            lesson={`${course.context.publisher} ${course.context.grade}年級${course.context.term} · ${course.context.title}`}
            onBack={() => setView("hub")}
            submit={work=>submitGame({...work,...(course.assignmentId?{assignmentId:course.assignmentId}:{})})}
          />
          </TimedActivity>
        ) : (
          <>
            <div className="game-row game-intro">
              <div>
                <p className="eyebrow">老師開課 · 全班一起參與</p>
                <h1>遊戲專區</h1>
                <p>輸入老師提供的開課代碼，依老師安排加入活動。</p>
              </div>
              {user && <button
                className="secondary"
                onClick={() => setView(view === "works" ? "hub" : "works")}
              >
                <FolderCheck size={18} />
                {view === "works" ? "返回遊戲" : "我的作品與評語"}
              </button>}
            </div>
            {view === "works" && user ? (
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
