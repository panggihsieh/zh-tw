import { loadLearningResources, buildCurriculumCollection } from "./curriculumLearning";
import { readVersionRecords } from "./versionRecords";
import {
  lazy,
  Suspense,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
  type CSSProperties,
} from "react";
import {
  ArrowRight,
  BookOpen,
  Bookmark,
  Check,
  ChevronLeft,
  ChevronRight,
  Download,
  ExternalLink,
  FileText,
  Flower2,
  Grid2X2,
  HelpCircle,
  Image,
  Leaf,
  LibraryBig,
  LoaderCircle,
  Play,
  Plus,
  RotateCcw,
  Search,
  Settings2,
  Sparkles,
  Trash2,
  Upload,
  Volume2,
  X,
  CloudUpload,
  Shuffle,
  Palette,
  Trees,
} from "lucide-react";
import type { Card, Collection } from "./model";
import { validatePhrase } from "./model";
import { buildCollection, PHRASES, STROKES, DICTIONARY } from "./data";
import {
  deleteCollection,
  listCollections,
  parseBackup,
  saveCollection,
} from "./storage";
import { download, jsonBlob, pdfBlob, pngBlob } from "./exports";
import { authorize, CLIENT_ID, loadGoogle, uploadCollection } from "./drive";
import StrokePlayer from "./StrokePlayer";
import { structureProfile } from "./structureProfiles";
import SpeechTools, { SpeechContext } from "./SpeechTools";
import TtsSettings from "./TtsSettings";
import BackendApi from "./StructureAiSettings";
import StructureAssignment from "./StructureAssignment";
import BackendStructure from "./StructureHelp";
import OfficialDictionary, { loadDictionary, lookupEntries } from "./OfficialDictionary";
import ReadAlong from "./ReadAlong";
import CharacterStructureAnalysis from "./CharacterStructureAnalysis";
import { useSiteTheme } from "./siteThemes";
import BirdMascot, { BirdMascotIcon } from "./BirdMascot";
import { SITE_VERSION, SITE_UPDATED_AT, SITE_VERSION_NOTE, SITE_VERSION_SHORT_NOTE } from "./siteVersion";
import "./siteThemes.css";
import { useUserRole, useStructureReview, confirmedStructureLabel } from "./structureReview";
import AssemblyParts from "./AssemblyParts";
import {
  randomStartupPhrase,
  refreshOpeningPhrase,
  STARTUP_PHRASE_KEY,
} from "./startupPhrase";
import { phraseSuggestions } from "./phraseSuggestions";
import {
  loadVoicePreference,
  saveVoicePreference,
  preferredVoice,
  type VoicePreference,
} from "./ttsPreferences";
import {
  SpeechController,
  sceneNarration,
  type SpeechState,
  type SpeechProgress,
} from "./speech";

import {
  loadPageSession,
  defaultPageSession,
  savePageSession,
  type PageSession,
} from "./sessionState";

type Page = "learn" | "library" | "resources" | "tts";
const err = (e: unknown) =>
  e instanceof Error ? e.message : "發生問題，請再試一次。";
const CloudCollections = lazy(() => import("./CloudCollections"));
const BackendGate = lazy(() => import("./BackendGate"));
const UserManagement = lazy(() => import("./UserManagement"));
const StudentCharacterFinder = lazy(() => import("./StudentCharacterFinder"));
const CurriculumDatabase = lazy(() => import("./CurriculumDatabase"));
const HandwritingLab = lazy(() => import("./HandwritingLab"));
const SiteThemeLibrary = lazy(() => import("./SiteThemeLibrary"));
const GameZone = lazy(() => import('./GameZone'));
const QuizStudent = lazy(() => import("./QuizStudent"));
const QuizTeacher = lazy(() => import("./QuizTeacher"));
const GameReview = lazy(() => import('./GameReview'));
const WritingAssignmentAdmin = lazy(() => import('./WritingAssignmentAdmin'));
const SentenceCompetitionAdmin = lazy(() => import('./SentenceCompetitionAdmin'));
const CompetitionAdmin = lazy(() => import('./CompetitionAdmin'));
const VersionRecordAdmin = lazy(() => import("./VersionRecordAdmin"));
type BackendSection = "structure-assignment" | "tts" | "api" | "users" | "structure" | "lesson" | "overview" | "review" | "handwriting" | "strokeDatabase" | "curriculum" | "gameReview" | "writingAssignments" | "themes" | "quiz" | "sentences" | "competition" | "versions";
const structureSections = ["structure", "lesson", "overview", "review"] as const;
const backendTitles: Record<BackendSection, string> = {
  "structure-assignment": "生字結構遊戲指派",
  sentences: "一字多詞造句競賽管理",
  competition: "Kahoot 競賽開課管理",
  versions: "提交版本紀錄",
  quiz: "資料庫管理",
  themes: "網站樣式資料庫",
  gameReview: '遊戲作品與評分',
  writingAssignments: '書寫作業管理',
  tts: "TTS 來源與預設音色", api: "AI API 設定", users: "使用者管理", structure: "字形結構說明",
  curriculum: "三家出版社生字資料庫",
  handwriting: "平板手寫檢核測試", strokeDatabase: "筆順資料庫",
  lesson: "每課生字結構筆畫查詢", overview: "五上生字拆合總覽", review: "康軒生字結構修正",
};
export default function ProtectedApp() {
  const [hash,setHash]=useState(window.location.hash);
  useEffect(()=>{const changed=()=>setHash(window.location.hash);window.addEventListener('hashchange',changed);return()=>window.removeEventListener('hashchange',changed)},[]);
  if(new URLSearchParams(window.location.search).get('view')==='quiz') return <Suspense fallback={<p>載入國語錯題本…</p>}><QuizStudent/></Suspense>;
  if(new URLSearchParams(window.location.search).get('view')!=='backend'&&hash.startsWith('#games')) return <Suspense fallback={<p role="status">載入生詞遊戲專區…</p>}><GameZone/></Suspense>;
  if (new URLSearchParams(window.location.search).get("view") !== "backend") return <App />;
  return <Suspense fallback={<p role="status">載入教師登入…</p>}><BackendGate><App /></BackendGate></Suspense>;
}
function Glyph({
  card,
  scene,
  reduced,
  playing,
  speed,
  assemblyEnabled,
}: {
  card: Card;
  scene: number;
  reduced: boolean;
  playing: boolean;
  speed: number;
  assemblyEnabled: boolean;
}) {
  const id = `glyph-${card.id}`;
  const split =
    (scene === 1 || scene === 2) && card.master.components.length > 0;
  const profile = structureProfile(card.master);
  let offset = 0;
  const regions = profile
    ? profile.weights.map((weight) => {
        const size = (weight / profile.weights.reduce((a, b) => a + b)) * 300;
        const region =
          card.master.layout === "vertical"
            ? [0, offset, 300, size]
            : [offset, 0, size, 300];
        offset += size;
        return region;
      })
    : card.master.layout === "vertical"
      ? [
          [0, 0, 300, 195],
          [0, 195, 300, 105],
        ]
      : card.master.layout === "triple"
        ? [
            [0, 0, 100, 300],
            [100, 0, 110, 300],
            [210, 0, 90, 300],
          ]
        : [
            [0, 0, 145, 300],
            [145, 0, 155, 300],
          ];
  const colors = ["#315f50", "#b66b42", "#5a8092"];
  return (
    <svg
      className={`glyph ${reduced ? "reduced" : ""}`}
      viewBox="-45 -45 390 390"
      role="img"
      aria-label={`${card.character}${split ? "字形部件示意" : ""}`}
    >
      <defs>
        {regions.map((r, i) => (
          <clipPath id={`${id}-${i}`} key={i}>
            <rect x={r[0]} y={r[1]} width={r[2]} height={r[3]} />
          </clipPath>
        ))}
      </defs>
      {split &&
        regions.map((r, i) => (
          <rect
            key={`background-${i}`}
            x={r[0]}
            y={r[1]}
            width={r[2]}
            height={r[3]}
            fill={["#e8efde", "#f7eadd", "#e5eef3"][i]}
            fillOpacity="0.7"
          />
        ))}
      <rect
        width="300"
        height="300"
        x="0"
        y="0"
        rx="4"
        fill="none"
        stroke="#bccdb9"
      />
      <path
        d="M150 0V300 M0 150H300 M0 0L300 300 M300 0L0 300"
        stroke="#cbd7c4"
        strokeDasharray="6 7"
        fill="none"
      />
      {split && scene === 2 ? (
        <AssemblyParts
          card={card}
          regions={regions}
          playing={playing}
          speed={speed}
          reduced={reduced || !assemblyEnabled}
        />
      ) : split ? (
        regions.map((_, i) => {
          const vertical = card.master.layout === "vertical";
          const distance =
            (i - (regions.length - 1) / 2) * (regions.length === 3 ? 42 : 60);
          return (
            <g
              key={i}
              className={
                scene === 2 && !reduced ? "decomposing-part" : undefined
              }
              style={
                {
                  "--part-x": `${vertical ? 0 : distance}px`,
                  "--part-y": `${vertical ? distance : 0}px`,
                  animationDuration: `${4 / speed}s`,
                  animationPlayState: playing ? "running" : "paused",
                } as CSSProperties
              }
            >
              <text
                x="150"
                y="242"
                textAnchor="middle"
                fontSize="262"
                fill={colors[i]}
                clipPath={`url(#${id}-${i})`}
              >
                {card.character}
              </text>
            </g>
          );
        })
      ) : (
        <text x="150" y="242" textAnchor="middle" fontSize="262" fill="#315f50">
          {card.character}
        </text>
      )}
    </svg>
  );
}
function Modal({
  title,
  children,
  close,
}: {
  title: string;
  children: ReactNode;
  close: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const el = ref.current;
    el?.showModal();
    return () => el?.close();
  }, []);
  return (
    <dialog
      ref={ref}
      onCancel={(e) => {
        e.preventDefault();
        close();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div className="modal-head">
        <h2>{title}</h2>
        <button className="icon-btn" onClick={close} aria-label="關閉">
          <X size={20} />
        </button>
      </div>
      {children}
      <SpeechTools
        label="朗讀視窗內容"
        read={() => ref.current?.innerText || title}
      />
    </dialog>
  );
}
function App() {
  const siteTheme = useSiteTheme();
  const backendMode = new URLSearchParams(window.location.search).get("view") === "backend";
  const NavigationContainer = backendMode ? "aside" : "header";
  const [backendMenuOpen, setBackendMenuOpen] = useState(false);
  const [backendSection, setBackendSection] = useState<BackendSection>(() => {
    const section = new URLSearchParams(window.location.search).get('section');
    if (section && Object.hasOwn(backendTitles,section)) return section as BackendSection;
    try { const value = sessionStorage.getItem("hanzi-notebook.backend-section.v1"); return value && Object.hasOwn(backendTitles, value) ? value as BackendSection : "tts"; }
    catch { return "tts"; }
  });
  useEffect(() => { if (backendMode) { try { sessionStorage.setItem("hanzi-notebook.backend-section.v1", backendSection); } catch {} } }, [backendMode, backendSection]);
  const [restored] = useState(() => {
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    let previous: string | null = null;
    try {
      previous = localStorage.getItem(STARTUP_PHRASE_KEY);
    } catch {
      /* storage may be unavailable */
    }
    const initialPhrase = randomStartupPhrase(previous);
    try {
      const state = loadPageSession({ getItem: (key) => sessionStorage.getItem(key + (backendMode ? ".backend" : "")) }, reduced, initialPhrase);
      const next = refreshOpeningPhrase(state, previous, initialPhrase);
      return {
        ...next,
        randomOpening: next !== state || state.input === initialPhrase,
      };
    } catch {
      return {
        ...defaultPageSession(reduced, initialPhrase),
        randomOpening: true,
      };
    }
  });
  useEffect(() => {
    try {
      if (restored.randomOpening)
        localStorage.setItem(STARTUP_PHRASE_KEY, restored.phrase);
    } catch {
      /* random defaults still work */
    }
  }, [restored]);

  const [learningTab, setLearningTab] = useState<"saved" | "quiz">("saved");
  const [showVersions, setShowVersions] = useState(false);
  const [page, setPage] = useState<Page>(backendMode ? "tts" : restored.page === "tts" ? "learn" : restored.page);
  const headerRef = useRef<HTMLElement>(null);
  useLayoutEffect(() => {
    const header = headerRef.current;
    if (!header) return;
    const measure = () => document.documentElement.style.setProperty("--app-header-height", `${header.getBoundingClientRect().height}px`);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(header);
    return () => { observer.disconnect(); document.documentElement.style.removeProperty("--app-header-height"); };
  }, []);
  const [studentFinderOpen, setStudentFinderOpen] = useState(false);
  const [input, setInput] = useState(restored.input);
  const [phrase, setPhrase] = useState(restored.phrase);
  const [positions, setPositions] = useState(restored.positions);
  const [validation, setValidation] = useState("");
  const [collection, setCollection] = useState<Collection | null>(
    restored.collection,
  );
  const [cardIndex, setCardIndex] = useState(restored.cardIndex);
  const [scene, setScene] = useState(restored.scene);
  const [playing, setPlaying] = useState(false);
  const [decompositionReplay, setDecompositionReplay] = useState(0);
  const [decompositionOnly, setDecompositionOnly] = useState(false);
  const [speed, setSpeed] = useState(restored.speed);
  const [showReading, setShowReading] = useState(restored.showReading);
  const [captions, setCaptions] = useState(restored.captions);
  const [voice, setVoice] = useState(restored.voice);
  const [reduced, setReduced] = useState(restored.reduced);
  const [simple, setSimple] = useState(restored.simple);
  const [grade, setGrade] = useState(restored.grade);
  const [wordCount, setWordCount] = useState(restored.wordCount);
  const [revealed, setRevealed] = useState<string[]>(restored.revealed);
  const [previewWord, setPreviewWord] = useState<string | null>(null);
  const [dictionaryWords, setDictionaryWords] = useState<string[]>([]);
  useEffect(() => {
    const controller = new AbortController();
    fetch(`${import.meta.env.BASE_URL}dictionaries/moe-suggestions.json`, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error("無法載入語詞建議");
        return response.json();
      })
      .then((words: string[]) => {
        if (!controller.signal.aborted) setDictionaryWords(words);
      })
      .catch(() => { /* Keep built-in suggestions available offline. */ });
    return () => controller.abort();
  }, []);
  const [saved, setSaved] = useState<Collection[]>([]);
  const [collectionsLoaded, setCollectionsLoaded] = useState(false);
  const [search, setSearch] = useState(restored.search);
  const [filter, setFilter] = useState(restored.filter);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [speechState, setSpeechState] = useState<SpeechState>("idle");
  const [ttsPreference, setTtsPreference] = useState<VoicePreference | null>(
    () => {
      try {
        return loadVoicePreference(localStorage);
      } catch {
        return null;
      }
    },
  );
  const [ttsVoices, setTtsVoices] = useState<SpeechSynthesisVoice[]>([]);
  function refreshTtsVoices() {
    setTtsVoices(window.speechSynthesis?.getVoices() || []);
  }
  useEffect(() => {
    const synth = window.speechSynthesis;
    refreshTtsVoices();
    synth?.addEventListener("voiceschanged", refreshTtsVoices);
    return () => synth?.removeEventListener("voiceschanged", refreshTtsVoices);
  }, []);
  const [speechProgress, setSpeechProgress] = useState<SpeechProgress>({
    position: 0,
    total: 0,
    rate: 0.85,
  });
  const speechRef = useRef<SpeechController | null>(null);
  if (!speechRef.current)
    speechRef.current = new SpeechController(
      window.speechSynthesis,
      (text) => new SpeechSynthesisUtterance(text),
      setSpeechState,
      setError,
      setSpeechProgress,
    );
  const speech = speechRef.current;
  useEffect(() => speech.setVoicePreference(ttsPreference), [ttsPreference]);
  function saveTtsDefault(preference: VoicePreference | null) {
    try {
      saveVoicePreference(localStorage, preference);
      speech.stop();
      speech.setVoicePreference(preference);
      setTtsPreference(preference);
      setNotice("已設為這台瀏覽器的前台預設音色。");
    } catch {
      setError("無法保存 TTS 預設，請確認瀏覽器允許本機儲存。原設定仍保留。");
    }
  }
  const [busy, setBusy] = useState("");
  const [modal, setModal] = useState<"settings" | "export" | "drive" | null>(
    restored.modal,
  );
  const [driveReady, setDriveReady] = useState(false);
  const [driveResult, setDriveResult] = useState<Awaited<
    ReturnType<typeof uploadCollection>
  > | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const importRef = useRef<HTMLInputElement>(null);
  const card = collection?.cards[cardIndex];
  const userRole = useUserRole();
  const studentGoogleAccount = !userRole.admin && userRole.user?.providerData.some(
    provider => provider.providerId === "google.com",
  ) ? userRole.user.displayName?.trim() || userRole.user.email : null;
  const structureReview = useStructureReview(card?.master, userRole.admin);
  const reviewedMaster = card && structureReview.confirmed
    ? { ...card.master, structure: confirmedStructureLabel(card.master.structure) }
    : card?.master;
  const scrollPending = useRef(true);
  const scrollPage = useRef(page);
  useEffect(() => {
    const previous = history.scrollRestoration;
    history.scrollRestoration = "manual";
    return () => {
      history.scrollRestoration = previous;
    };
  }, []);
  useLayoutEffect(() => {
    if (scrollPage.current !== page) {
      scrollPage.current = page;
      scrollPending.current = false;
      window.scrollTo({ top: 0, behavior: "auto" });
    } else if (scrollPending.current && collectionsLoaded) {
      scrollPending.current = false;
      window.scrollTo({ top: restored.scrollY, behavior: "auto" });
    }
  }, [page, collectionsLoaded]);
  async function refresh() {
    try {
      setSaved(await listCollections());
    } catch (e) {
      setError(`讀取收藏失敗：${err(e)}`);
    } finally {
      setCollectionsLoaded(true);
    }
  }
  useEffect(() => {
    void refresh();
  }, []);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(""), 5000);
    return () => clearTimeout(timer);
  }, [notice]);
  const previousCard = useRef(`${collection?.id}:${cardIndex}`);
  useEffect(() => {
    setDecompositionOnly(false);
  }, [scene, card?.id]);
  useEffect(() => {
    const key = `${collection?.id}:${cardIndex}`;
    if (previousCard.current === key) return;
    previousCard.current = key;
    setRevealed([]);
    setSimple(false);
  }, [cardIndex, collection?.id]);
  useEffect(() => {
    if (!collection || !card) return;
    setCollection((prev) => {
      if (!prev || prev.cards[cardIndex].visitedScenes.includes(scene))
        return prev;
      return {
        ...prev,
        cards: prev.cards.map((c, i) =>
          i === cardIndex
            ? { ...c, visitedScenes: [...c.visitedScenes, scene] }
            : c,
        ),
      };
    });
  }, [scene, cardIndex, collection?.id]);
  const narration =
    card && collection
      ? sceneNarration(
          card,
          collection.curriculum ? card.character : collection.sourcePhrase,
          scene,
          simple,
          wordCount,
          collection.curriculum ? "" : PHRASES[collection.sourcePhrase]?.explanation,
        )
      : "";
  function say(text: string, automatic = false) {
    if (!automatic) setPlaying(false);
    speech.speak(text, speed === 0.65 ? 0.7 : speed === 1.5 ? 1.1 : 0.85);
  }
  function sayOfficialDefinition(text: string) {
    setPlaying(false);
    speech.speak(text, speed === 0.65 ? 0.7 : speed === 1.5 ? 1.1 : 0.85, undefined, 1000);
  }
  const narrationKey = JSON.stringify([
    scene,
    card?.id,
    voice,
    simple,
    wordCount,
    speed,
    page,
    modal,
    deleteId,
  ]);
  const previousNarration = useRef(narrationKey);
  useEffect(() => {
    const changed = previousNarration.current !== narrationKey;
    previousNarration.current = narrationKey;
    if (changed && voice && page === "learn" && card && !modal && !deleteId)
      say(narration, true);
    return () => speech.stop();
  }, [scene, card?.id, voice, simple, wordCount, speed, page, modal, deleteId]);
  useEffect(() => {
    if (restored.speech) speech.restoreSession(restored.speech);
  }, []);
  const sessionFailureShown = useRef(false);
  useEffect(() => {
    const persist = () => {
      const state: PageSession = {
        version: 1,
        page,
        input,
        phrase,
        positions,
        collection,
        cardIndex,
        scene,
        speed,
        showReading,
        captions,
        voice,
        reduced,
        simple,
        grade,
        wordCount,
        revealed,
        search,
        filter,
        modal: modal === "settings" || modal === "export" ? modal : null,
        scrollY: scrollPending.current ? restored.scrollY : window.scrollY,
        speech: speech.getSession(),
      };
      try {
        savePageSession({ setItem: (key, value) => sessionStorage.setItem(key + (backendMode ? ".backend" : ""), value) }, state);
      } catch {
        if (!sessionFailureShown.current) {
          sessionFailureShown.current = true;
          setError(
            "無法保存頁面狀態，重新整理可能重置；請確認瀏覽器允許本機儲存。",
          );
        }
      }
    };
    persist();
    window.addEventListener("pagehide", persist);
    window.addEventListener("scroll", persist, { passive: true });
    return () => {
      window.removeEventListener("pagehide", persist);
      window.removeEventListener("scroll", persist);
    };
  }, [
    page,
    input,
    phrase,
    positions,
    collection,
    cardIndex,
    scene,
    speed,
    showReading,
    captions,
    voice,
    reduced,
    simple,
    grade,
    wordCount,
    revealed,
    search,
    filter,
    modal,
    speechProgress,
    collectionsLoaded,
  ]);
  function choosePhrase(text: string) {
    const issue = validatePhrase(text);
    setValidation(issue);
    if (issue) return;
    setPhrase(text.trim());
    setInput(text.trim());
    setPositions(Array.from(text.trim()).map((_, i) => i));
  }
  function start() {
    if (!positions.length) {
      setValidation("至少選一個想學的字。");
      return;
    }
    if (!collection?.curriculum) {
      const issue = validatePhrase(phrase);
      if (issue) {
        setValidation(issue);
        return;
      }
    }
    setCollection(buildCollection(phrase, positions));
    setCardIndex(0);
    setScene(0);
    setPlaying(false);
    setPage("learn");
    setDriveResult(null);
    setValidation("");
  }
  function openCollection(c: Collection) {
    setCollection(structuredClone(c));
    setInput(c.sourcePhrase);
    setPhrase(c.sourcePhrase);
    setPositions(c.cards.map((card) => card.position));
    setCardIndex(0);
    setScene(0);
    setPlaying(false);
    setPage("learn");
    setDriveResult(null);
  }
  async function save(c = collection) {
    if (!c) return;
    try {
      await saveCollection(c);
      await refresh();
      setNotice("已收藏到這台裝置的生字本。");
    } catch (e) {
      setError(`收藏失敗：${err(e)}，你仍可下載 JSON 備份。`);
    }
  }
  async function exportFile(type: "json" | "pdf" | "png") {
    if (!collection || !card) return;
    setBusy("正在準備下載…");
    setError("");
    try {
      const stamp = new Date().toISOString().replace(/[:.]/g, "-");
      if (type === "json")
        download(
          jsonBlob(collection),
          `${collection.sourcePhrase}_${stamp}.json`,
        );
      if (type === "png")
        download(
          await pngBlob(card, collection.sourcePhrase),
          `${card.character}_${stamp}.png`,
        );
      if (type === "pdf")
        download(
          await pdfBlob(collection),
          `${collection.sourcePhrase}_${stamp}.pdf`,
        );
      setNotice("檔案已產生，請查看瀏覽器下載項目。");
    } catch (e) {
      setError(err(e));
    } finally {
      setBusy("");
    }
  }
  async function importFile(file: File) {
    try {
      if (file.size > 5 * 1024 * 1024)
        throw new Error("請匯入 5 MB 以下的 JSON 備份。");
      const imported = parseBackup(await file.text());
      imported.id = crypto.randomUUID();
      await saveCollection(imported);
      await refresh();
      setNotice("備份已匯入，另存為一份收藏。");
    } catch (e) {
      setError(`匯入失敗：${err(e)}`);
    }
  }
  async function openDrive() {
    setModal("drive");
    setError("");
    if (CLIENT_ID) {
      try {
        await loadGoogle();
        setDriveReady(true);
      } catch (e) {
        setError(err(e));
      }
    }
  }
  async function sendDrive() {
    if (!collection) return;
    setBusy("等待 Google 授權…");
    setError("");
    try {
      const token = await authorize();
      await saveCollection(collection);
      await refresh();
      const result = await uploadCollection(token, collection, setBusy);
      setDriveResult(result);
      setNotice("Google Drive 上傳完成。");
    } catch (e) {
      setError(err(e));
    } finally {
      setBusy("");
    }
  }
  const learned = saved.filter((c) => c.reviewState === "learned").length;
  function openBackendSection(section: BackendSection) {
    setBackendSection(section); setBackendMenuOpen(false); setPage("tts"); setPlaying(false); speech.stop();
    window.scrollTo({ top: 0, behavior: "auto" });
  }
  const visibleSaved = saved.filter(
    (c) =>
      (c.sourcePhrase.includes(search) ||
        c.cards.some((c) => c.character.includes(search))) &&
      (filter === "all" || c.reviewState === filter),
  );
  return (
    <SpeechContext.Provider
      value={{
        state: speechState,
        text: speech.getSession()?.text || "",
        voiceLabel: ttsPreference
          ? `${ttsPreference.name}${preferredVoice(ttsVoices, ttsPreference) ? "" : "（目前不可用，暫用自動）"}`
          : "自動選擇（優先臺灣中文）",
        progress: speechProgress,
        seek: (position: number) => {
          setPlaying(false);
          speech.seek(position);
        },
        replay: () => {
          setPlaying(false);
          speech.replay();
        },
        say,
        stop: () => {
          speech.stop();
          setPlaying(false);
        },
        pause: () => speech.pause(),
        resume: () => speech.resume(),
      }}
    >
      <div data-backend-section={backendMode ? backendSection : undefined} className={backendMode ? `app-shell top-navigation-layout backend-shell${backendMenuOpen ? " backend-menu-open" : ""}` : "app-shell top-navigation-layout"}>
        <div className="main-wrap">
          {backendMode && <header className="backend-workspace-bar" ref={headerRef}>
            <button className="backend-menu-toggle secondary" aria-expanded={backendMenuOpen} aria-controls="backend-navigation" onClick={() => setBackendMenuOpen(!backendMenuOpen)}>{backendMenuOpen ? "收合選單" : "功能選單"}</button>
            <div><span>教師工作區</span><strong>{backendTitles[backendSection]}</strong></div>
            <div className="backend-account-actions"><span className="backend-account-label">管理者</span>
              <button className="teacher-session-button" onClick={async () => { speech.stop(); setPlaying(false); const { cloudLogout } = await import("./cloudSync"); await cloudLogout(); window.location.assign("/"); }}>登出</button>
              <a className="backend-student-link" href="/">前往學生網站 <ArrowRight size={18} /></a>
            </div>
          </header>}
          <NavigationContainer ref={backendMode ? undefined : headerRef} id={backendMode ? "backend-navigation" : undefined} className="topbar">
            <div className="header-primary">
              {backendMode && <div className="backend-menu-heading">教師後台</div>}

          <nav className="app-top-nav" aria-label={backendMode ? "後台功能" : "學生功能"}>
            {backendMode && ([
              { title: "資料庫", items: [
                { section: "quiz", label: "資料庫管理" },
                { section: "curriculum", label: "三家出版社生字資料庫", icon: LibraryBig },
              ] },
              { title: "字形、筆順與字辭典查詢", items: [
                { section: "structure", label: "字形結構", icon: Grid2X2, active: structureSections.some(section => section === backendSection) },
                { section: "handwriting", label: "手寫檢核與筆順", icon: Grid2X2, active: backendSection === "handwriting" || backendSection === "strokeDatabase" },
              ] },
              { title: "遊戲派送與競賽", items: [
                { section: "structure-assignment", label: "生字結構遊戲指派" },
                { section: "writingAssignments", label: "書寫作業管理" },
                { section: "competition", label: "Kahoot 競賽開課" },
                { section: "gameReview", label: "遊戲作品與評分" },
              ] },
              { title: "全站管理與設定", items: [
                { section: "users", label: "使用者管理", icon: Settings2 },
                { section: "api", label: "API 設定", icon: Settings2 },
                { section: "tts", label: "TTS 設定後台", icon: Settings2 },
                { section: "themes", label: "網站樣式資料庫", icon: Palette },
                { section: "versions", label: "提交版本紀錄", icon: FileText },
              ] },
            ] as { title: string; items: { section: BackendSection; label: string; icon?: typeof Grid2X2; active?: boolean }[] }[]).map(({ title, items }) => {
              const buttons = items.map(({ section, label, icon: Icon, active = section === backendSection }) => (
                <button type="button" key={section} className={active ? "nav-item active" : "nav-item"}
                  aria-current={active ? "page" : undefined} onClick={() => openBackendSection(section)}>
                  {Icon && <Icon size={20} />}{label}
                </button>
              ));
              return title === "全站管理與設定" ? (
                <details className="backend-nav-group" key={title}>
                  <summary>{title}</summary>
                  <div className="backend-nav-settings">{buttons}</div>
                </details>
              ) : (
                <div className="backend-nav-group" role="group" aria-label={title} key={title}>
                  {title !== "資料庫" && <h2>{title}</h2>}
                  {buttons}
                </div>
              );
            })}
            {!backendMode && (<>
            <button
              className={page === "learn" ? "nav-item active" : "nav-item"}
              onClick={() => setPage("learn")}
            >
              <BirdMascotIcon />
              生字動畫教室
            </button>
            <a className="nav-item" href="#games"><Grid2X2 size={20}/>遊戲專區</a>
            <button
              className={page === "library" ? "nav-item active" : "nav-item"}
              onClick={() => {
                setPage("library");
                setPlaying(false);
                void refresh();
              }}
            >
              <LibraryBig size={20} />
              我的學習本<span className="nav-count">{saved.length}</span>
            </button>
            <button
              className={page === "resources" ? "nav-item active" : "nav-item"}
              onClick={() => {
                setPage("resources");
                setPlaying(false);
              }}
            >
              <BookOpen size={20} />
              教育部字辭典
            </button>
            <button type="button" className="nav-item student-version-button" onClick={() => setShowVersions(true)}>
              v{SITE_VERSION} · {SITE_VERSION_SHORT_NOTE} · <time dateTime={SITE_UPDATED_AT.replaceAll("/", "-")}>{SITE_UPDATED_AT}</time>
            </button>
            </>)}
          </nav>
              {!backendMode && <div className="header-user-role">
                <span role="status">{!userRole.ready ? "確認登入中…" : userRole.admin ? "教師 · 管理者已登入" : userRole.user ? "學生 · 已登入" : "學生 · 未登入"}</span>
                <a className="teacher-session-button" href="/?view=backend">{userRole.admin ? "教師後台" : "教師登入（後台）"}</a>
              </div>}
            </div>
            {backendMode && <div className="header-secondary"><div className="topbar-actions">
              <button
                className="quiet"
                aria-label="學習設定"
                onClick={() => setModal("settings")}
              >
                <Settings2 size={17} />
                <span>學習設定</span>
              </button>
            </div></div>}
          </NavigationContainer>
          <main id="app-page-content">
            {!backendMode && (page !== "learn" || collection) && <div className="student-page-tools topbar-actions" aria-label="朗讀與學習設定">
              <SpeechTools
                label="朗讀本頁"
                showVoice={false}
                expanded
                read={() =>
                  document.querySelector("main")?.innerText ||
                  "目前沒有可朗讀的內容。"
                }
              />
              <button
                className="quiet"
                aria-label="學習設定"
                onClick={() => setModal("settings")}
              >
                <Settings2 size={17} />
                <span>學習設定</span>
              </button>
            </div>}
            {backendMode && <p className="site-version" aria-label="網站版本資訊">v{SITE_VERSION}｜{SITE_VERSION_NOTE}｜<time dateTime={SITE_UPDATED_AT.replaceAll("/", "-")}>{SITE_UPDATED_AT}</time></p>}
            {error && (
              <div className="alert error" role="alert">
                <span>{error}</span>
                <button onClick={() => setError("")} aria-label="關閉錯誤訊息">
                  <X size={17} />
                </button>
              </div>
            )}
            {notice && (
              <div className="toast" role="status">
                <Check size={18} />
                {notice}
              </div>
            )}
            {page === "learn" && (
              <>
                {!backendMode && !collection && <section className="adventure-welcome" aria-label="生字探索旅程">
                  <div className="adventure-stops" aria-label="學習路線"><span><BookOpen/>認識生字</span><span><Trees/>拆字探索</span><span><Sparkles/>收藏成果</span></div>
                  <div className="adventure-copy"><span className="adventure-kicker">看動畫 · 學生字 · 累積你的生字收藏</span><h2>一起出發，探索生字的世界！</h2><p>選一課、認識一個字，讓每次發現都成為自己的收藏。</p><a className="adventure-start" href="#curriculum-entry"><Play size={20}/>開始學習</a></div>
                  <BirdMascot />
                </section>}
                {collection && <button type="button" aria-expanded={studentFinderOpen} className={studentFinderOpen ? "secondary" : "secondary reopen-student-finder"} onClick={() => setStudentFinderOpen(!studentFinderOpen)}>{studentFinderOpen ? "收合找字" : "重新念字／選課"}</button>}
                {(!collection || studentFinderOpen) && <Suspense fallback={<p>載入念生字與課本找字…</p>}><StudentCharacterFinder onListen={() => speech.stop()} onLearn={async (chars,context) => {
                  const value=buildCurriculumCollection(chars,context,await loadLearningResources());
                  setStudentFinderOpen(false);setCollection(value);setInput(value.sourcePhrase);setPhrase(value.sourcePhrase);setPositions(chars.map((_,i)=>i));
                  setCardIndex(0);setScene(0);setPage("learn");setPlaying(false);setRevealed([]);speech.stop();
                }}/></Suspense>}
                <div
                  className={`learning-layout ${collection ? "has-session" : ""}`}
                >
                  <section className="input-panel">
                    <div className="section-kicker">
                      01 <span>輸入語詞</span>
                      <button
                        type="button"
                        className="random-phrase-button"
                        onClick={() =>
                          choosePhrase(randomStartupPhrase(input.trim()))
                        }
                      >
                        <Shuffle size={17} aria-hidden="true" />
                        隨機換詞
                      </button>
                    </div>
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        choosePhrase(input);
                      }}
                    >
                      <label htmlFor="phrase">想學習的語詞</label>
                      <div className="input-row">
                        <input
                          id="phrase"
                          value={input}
                          onChange={(e) => setInput(e.target.value)}
                          maxLength={16}
                          placeholder="例如：感謝"
                          autoComplete="off"
                        />
                        {input && (
                          <button
                            type="button"
                            className="clear-input"
                            aria-label="清除語詞"
                            onClick={() => {
                              setInput("");
                              setPhrase("");
                              setPositions([]);
                              setValidation("");
                              document.getElementById("phrase")?.focus();
                            }}
                          >
                            <X size={15} />
                          </button>
                        )}
                        <button
                          type="submit"
                          className="icon-submit"
                          aria-label="確認語詞"
                        >
                          <ArrowRight size={20} />
                        </button>
                      </div>
                      <span className="field-note">
                        建議 2–8 字，保留你輸入的原字形。
                      </span>
                    </form>
                    <div className="suggestions">
                      試試看
                      {phraseSuggestions(
                        input,
                        saved.map((c) => c.sourcePhrase),
                        4,
                        dictionaryWords,
                      ).map((p) => (
                        <button
                          onClick={() => choosePhrase(p)}
                          key={p}
                          title={
                            PHRASES[p]
                              ? "已收錄語境教材"
                              : "建議語詞；語境教材待核對"
                          }
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                    <span className="field-note">
                      建議會隨輸入更新，部分語詞的教材仍待補充。
                    </span>
                    {saved.length > 0 && (
                      <div className="suggestions recent-phrases">
                        最近收藏
                        {[...new Set(saved.map((c) => c.sourcePhrase))]
                          .slice(0, 3)
                          .map((p) => (
                            <button
                              key={p}
                              aria-label={`最近語詞 ${p}`}
                              onClick={() => choosePhrase(p)}
                            >
                              {p}
                            </button>
                          ))}
                      </div>
                    )}
                    <div className="panel-divider" />
                    <div className="section-kicker">
                      02 <span>選出還不熟悉的字</span>
                    </div>
                    <p className="small-copy">這些字，我想再認識一下。</p>
                    <div className="character-select">
                      {Array.from(phrase).map((c, i) => (
                        <button
                          key={i}
                          aria-label={`選取第 ${i + 1} 個字 ${c}`}
                          aria-pressed={positions.includes(i)}
                          className={
                            positions.includes(i)
                              ? "char-option selected"
                              : "char-option"
                          }
                          onClick={() => {
                            setPositions((prev) =>
                              prev.includes(i)
                                ? prev.filter((p) => p !== i)
                                : [...prev, i].sort((a, b) => a - b),
                            );
                            setValidation("");
                          }}
                        >
                          <span className="char-check">
                            {positions.includes(i) && <Check size={13} />}
                          </span>
                          <strong>{c}</strong>
                          <span>
                            {positions.includes(i)
                              ? "這個字我不會"
                              : "我已經認識"}
                          </span>
                        </button>
                      ))}
                    </div>
                    {validation && (
                      <p className="validation" role="alert">
                        {validation}
                      </p>
                    )}
                    {phrase && !PHRASES[phrase] && (
                      <p className="data-note">
                        這個語詞尚未收錄語境教材。可以建立字卡，讀音與字義需再核對；字形不會自動轉換。
                      </p>
                    )}
                    <button
                      className="primary start-button"
                      onClick={start}
                      disabled={!positions.length}
                    >
                      開始逐字學習 <ArrowRight size={18} />
                    </button>
                    <span className="selection-count">
                      已選 {positions.length} 個字 · 每個字都有自己的學習卡
                    </span>
                    <div className="tip">
                      <Flower2 size={21} />
                      <p>
                        不用一次全部學會，
                        <br />
                        今天多認識一個字就很棒。
                      </p>
                    </div>
                  </section>
                  {!collection ? (
                    <section className="welcome-panel">
                      <div className="welcome-top">
                        <span className="pill">
                          <Sparkles size={14} />
                          今天的第一個小發現
                        </span>
                        <span>LEARN · COLLECT · GROW</span>
                      </div>
                      <div className="welcome-art">
                        <div className="sample-char">
                          <span className="tiny-label">咸 ＋ 心</span>
                          <strong>感</strong>
                          <span>ㄍㄢˇ</span>
                        </div>
                        <div className="floating-note note-one">
                          <Leaf size={17} />
                          把感受，放在心上
                        </div>
                        <div className="floating-note note-two">
                          感謝 <span>·</span> 感動 <span>·</span> 感覺
                        </div>
                        <div className="art-orbit" />
                        <div className="art-spark">✦</div>
                      </div>
                      <div className="welcome-caption">
                        <span className="handwritten">
                          原來，字可以這樣認識。
                        </span>
                        <h2>
                          讓每個陌生的字，
                          <br />
                          成為熟悉的朋友。
                        </h2>
                        <p>六個小步驟，陪你從字形走到字義。</p>
                      </div>
                      <div className="journey-preview">
                        {["看字形", "拆部件", "讀字義", "學造詞"].map(
                          (s, i) => (
                            <span key={s}>
                              <i>0{i + 1}</i>
                              {s}
                              {i < 3 && <ChevronRight size={14} />}
                            </span>
                          ),
                        )}
                      </div>
                      <div className="welcome-foot">
                        <BookOpen size={17} /> 本機收藏 · 隨時複習 ·
                        支援圖片與學習本下載
                      </div>
                    </section>
                  ) : (
                    card && (
                      <section className="classroom" aria-label="單字動畫教室">
                        <div className="classroom-head">
                          <div>
                            <span className="overline">{collection.curriculum ? `${collection.curriculum.publisher} ${collection.curriculum.grade}${collection.curriculum.term} · ${collection.curriculum.title}` : "正在學習的語詞"}</span>
                            <strong>{collection.sourcePhrase}</strong>
                            <span className="card-counter">
                              第 {cardIndex + 1} / {collection.cards.length}{" "}
                              張字卡
                            </span>
                          </div>
                          <div className="card-arrows">
                            <button
                              className="icon-btn"
                              disabled={cardIndex === 0}
                              aria-label="上一個字"
                              onClick={() => {
                                setCardIndex(cardIndex - 1);
                                setScene(0);
                                setPlaying(false);
                              }}
                            >
                              <ChevronLeft size={19} />
                            </button>
                            <button
                              className="icon-btn"
                              disabled={
                                cardIndex === collection.cards.length - 1
                              }
                              aria-label="下一個字"
                              onClick={() => {
                                setCardIndex(cardIndex + 1);
                                setScene(0);
                                setPlaying(false);
                              }}
                            >
                              <ChevronRight size={19} />
                            </button>
                          </div>
                        </div>
                        <div className="scene-speech">
                          <SpeechTools
                            label="朗讀本幕"
                            read={() => narration}
                          />
                          <label className="auto-speech">
                            <input
                              type="checkbox"
                              checked={voice}
                              onChange={(e) => setVoice(e.target.checked)}
                            />
                            切換分鏡時自動朗讀
                          </label>
                          <label className="tts-rate">
                            朗讀速度
                            <select
                              aria-label="朗讀速度"
                              value={speed}
                              onChange={(e) => setSpeed(Number(e.target.value))}
                            >
                              <option value={0.65}>慢</option>
                              <option value={1}>中</option>
                              <option value={1.5}>快</option>
                            </select>
                          </label>
                        </div>
                        <div
                          className="scene-tabs"
                          role="tablist"
                          aria-label="六幕學習"
                        >
                          {collection.scenes.map((s, i) => (
                            <button
                              key={s}
                              role="tab"
                              aria-selected={scene === i}
                              aria-controls="scene-content"
                              id={`scene-tab-${i}`}
                              className={
                                scene === i
                                  ? "current"
                                  : card.visitedScenes.includes(i)
                                    ? "visited"
                                    : ""
                              }
                              onClick={() => {
                                setScene(i);
                                setPlaying(false);
                              }}
                            >
                              <span>
                                {card.visitedScenes.includes(i) &&
                                scene !== i ? (
                                  <Check size={12} />
                                ) : (
                                  i + 1
                                )}
                              </span>
                              <b>{s}</b>
                            </button>
                          ))}
                        </div>
                        <div
                          id="scene-content"
                          role="tabpanel"
                          aria-labelledby={`scene-tab-${scene}`}
                          className={`scene-content scene-${scene}`}
                        >
                          {scene < 3 && (
                            <div className="glyph-side">
                              <div className="glyph-card">
                              <Glyph
                                key={`${card.id}-${decompositionReplay}`}
                                card={card}
                                scene={scene}
                                reduced={reduced}
                                playing={playing}
                                speed={speed}
                                assemblyEnabled={decompositionOnly}
                              />
                              <button
                                className="glyph-definition-button"
                                aria-label="朗讀官方詞義"
                                title="朗讀官方詞義"
                                onClick={async () => {
                                  const phrase = collection.curriculum ? card.character : collection.sourcePhrase;
                                  try {
                                    const entries = lookupEntries(await loadDictionary(), phrase);
                                    if (!entries.length) {
                                      setError("此版本未找到官方詞義，請使用右側官方網站查詢。");
                                      return;
                                    }
                                    sayOfficialDefinition(`${phrase}。${entries.map((entry) => entry[13]).join("。")}`);
                                  } catch {
                                    setError("官方詞庫暫時無法載入，請稍後重試。");
                                  }
                                }}
                              ><Volume2 size={20} /></button>
                              </div>
                              {showReading && (
                                <span className="reading">{card.reading}</span>
                              )}
                            </div>
                          )}
                          {scene === 3 && (
                            <StrokePlayer
                              key={card.id}
                              character={card.character}
                            />
                          )}
                          <div
                            className="scene-copy"
                            hidden={scene === 3}
                            key={`${card.id}-${scene}`}
                            style={{ animation: reduced ? "none" : undefined }}
                          >
                            <span className="overline">
                              第 {scene + 1} 幕 / {collection.scenes[scene]}
                            </span>
                            {scene === 0 && (
                              <>
                                <h2>
                                  你好，<em>{card.character}</em>。
                                </h2>
                                <p>
                                  {collection.curriculum ? `這是本批第 ${card.position + 1} 個生字。` : `這是「${collection.sourcePhrase}」裡，第 ${card.position + 1} 個字。`}
                                </p>
                                <div className="definition">
                                  <span>先認識這個語詞</span>
                                  <p>
                                    <ReadAlong
                                      text={
                                        (collection.curriculum ? "下方依目前生字提供教育部字典完整釋義，多音、多義請由老師配合課文核對。" : PHRASES[collection.sourcePhrase]?.explanation) ||
                                        "下方提供教育部詞語注音與釋義，可搭配官方查詢一起學習。"
                                      }
                                    />
                                  </p>
                                </div>
                                <OfficialDictionary
                                  phrase={collection.curriculum ? card.character : collection.sourcePhrase}
                                  speak={sayOfficialDefinition}
                                />
                                <span className="mini-status">
                                  {collection.curriculum ? "教育部字典資料 · 課文語境待教師核對" : card.source
                                    ? "語境教材 · 白話待教師審定"
                                    : "語境讀音與字義待核對"}
                                </span>
                              </>
                            )}
                            {scene === 1 && (
                              <>
                                <div className="structure-review-heading">
                                  {userRole.admin && !structureReview.confirmed && card.master.verificationStatus !== "unavailable" &&
                                    <button className="secondary" disabled={structureReview.loading || structureReview.saving} onClick={() => void structureReview.confirm()}>
                                      <Check size={18} />{structureReview.saving ? "儲存中…" : "確認結構"}
                                    </button>}
                                </div>
                                {structureReview.error && <p role="alert">{structureReview.error}</p>}
                                <CharacterStructureAnalysis master={reviewedMaster!} />
                                <p className="data-note">
                                  {structureReview.confirmed ? "此版本字形結構已由管理者確認；比例仍為教學示意。" : "字形結構為教學示意，待教師審定。"}
                                </p>
                              </>
                            )}
                            {scene === 2 && (
                              <>
                                <h2>拆開看，再合起來。</h2>
                                <button
                                  className="assembly-toggle"
                                  type="button"
                                  role="switch"
                                  aria-label="拆合動畫"
                                  aria-checked={decompositionOnly}
                                  disabled={
                                    reduced || !card.master.components.length
                                  }
                                  onClick={() => {
                                    const enabled = !decompositionOnly;
                                    if (enabled)
                                      setDecompositionReplay(
                                        (value) => value + 1,
                                      );
                                    setDecompositionOnly(enabled);
                                    setPlaying(enabled);
                                  }}
                                >
                                  <span
                                    className="assembly-toggle-track"
                                    aria-hidden="true"
                                  >
                                    <span />
                                  </span>
                                  <span>拆合動畫</span>
                                  <b>{decompositionOnly ? "ON" : "OFF"}</b>
                                </button>
                                {reduced && (
                                  <p className="data-note">
                                    目前啟用「減少動態效果」，可在學習設定關閉後播放拆合動畫。
                                  </p>
                                )}
                                <div className="component-tags">
                                  {card.master.components.map((c, i) => (
                                    <span key={i}>{c}</span>
                                  ))}
                                </div>
                                <p>
                                  {card.master.components.length
                                    ? "部件先分開，再依位置合起，最後對照完整字形。"
                                    : "這個字尚無可用的拆解教材。"}
                                </p>
                                <p className="data-note">
                                  部件採字型縮放與位置示意，合成後以完整字形對照；不代表精確輪廓、字源或筆順。開啟後循環停留本幕。
                                </p>
                              </>
                            )}
                            {scene === 4 && (
                              <>
                                <div className="meaning-title">
                                  <span className="meaning-character">
                                    {card.character}
                                  </span>
                                  <div>
                                    <h2>
                                      {collection.curriculum ? `「${card.character}」的字典釋義` : `在「${collection.sourcePhrase}」裡的意思`}
                                    </h2>
                                    {showReading && (
                                      <span className="reading">
                                        {card.reading}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <blockquote>
                                  <ReadAlong
                                    text={simple && !collection.curriculum ? card.simple : card.meaning}
                                  />
                                </blockquote>
                                {!collection.curriculum && <div className="meaning-actions">
                                  <button
                                    className={
                                      simple
                                        ? "secondary selected"
                                        : "secondary"
                                    }
                                    onClick={() => setSimple(!simple)}
                                  >
                                    <Sparkles size={16} />
                                    {simple ? "回到原來說法" : "講簡單一點"}
                                  </button>
                                  <label>
                                    閱讀程度
                                    <select
                                      value={grade}
                                      onChange={(e) => {
                                        setGrade(e.target.value);
                                        setSimple(
                                          e.target.value === "低一年級",
                                        );
                                      }}
                                    >
                                      <option>四年級</option>
                                      <option>五年級</option>
                                      <option>六年級</option>
                                      <option>低一年級</option>
                                    </select>
                                  </label>
                                </div>}
                                <p className="data-note">
                                  {collection.curriculum ? "字典原文，請配合課文確認讀音與用法。" : grade === "五年級" || grade === "六年級"
                                    ? "五、六年級目前共用同一份白話教材。"
                                    : "白話解釋為本專案編寫，待教師審定。"}
                                </p>
                                <button
                                  className="read-button"
                                  onClick={() =>
                                    say(simple ? card.simple : card.meaning)
                                  }
                                >
                                  <Volume2 size={17} />
                                  讀給我聽
                                </button>
                                <OfficialDictionary
                                  phrase={collection.curriculum ? card.character : collection.sourcePhrase}
                                  speak={sayOfficialDefinition}
                                />
                              </>
                            )}
                            {scene === 5 && (
                              <>
                                <div className="vocab-heading">
                                  <div>
                                    <h2>一個字，好多種用法。</h2>
                                    <p>翻開詞卡，看看它在句子裡的樣子。</p>
                                  </div>
                                  <label>
                                    顯示
                                    <select
                                      aria-label="造詞數量"
                                      value={wordCount}
                                      onChange={(e) =>
                                        setWordCount(Number(e.target.value))
                                      }
                                    >
                                      <option value={3}>常用 3 組</option>
                                      <option value={6}>常用＋延伸 6 組</option>
                                    </select>
                                  </label>
                                </div>
                                <div className="vocab-grid">
                                  {card.vocabulary
                                    .slice(0, wordCount)
                                    .map((v) => (
                                      <article
                                        className="vocab-card"
                                        key={v.word}
                                      >
                                        <span className="word-sense">
                                          {v.sense}
                                        </span>
                                        <button
                                          className="word-flip"
                                          title={`${v.meaning}\n例句：${v.example}`}
                                          onMouseEnter={() => setPreviewWord(v.word)}
                                          onMouseLeave={() => setPreviewWord(null)}
                                          onFocus={() => setPreviewWord(v.word)}
                                          onBlur={() => setPreviewWord(null)}
                                          aria-expanded={revealed.includes(
                                            v.word,
                                          ) || previewWord === v.word}
                                          onClick={() =>
                                            setRevealed((prev) =>
                                              prev.includes(v.word)
                                                ? prev.filter(
                                                    (x) => x !== v.word,
                                                  )
                                                : [...prev, v.word],
                                            )
                                          }
                                        >
                                          <strong>{v.word}</strong>
                                          {showReading && (
                                            <span>{v.reading}</span>
                                          )}
                                          <small title={`${v.meaning}\n例句：${v.example}`}>
                                            {revealed.includes(v.word)
                                              ? "收起解釋"
                                              : "翻開看解釋 ↗"}
                                          </small>
                                        </button>
                                        {(revealed.includes(v.word) || previewWord === v.word) && (
                                          <div className="word-detail">
                                            <p>
                                              <ReadAlong text={v.meaning} />
                                            </p>
                                            <span>
                                              <ReadAlong text={v.example} />
                                            </span>
                                          </div>
                                        )}
                                        <div className="word-actions">
                                          <button
                                            onClick={() =>
                                              say(`${v.word}。${v.example}`)
                                            }
                                            aria-label={`朗讀${v.word}`}
                                          >
                                            <Volume2 size={16} />
                                          </button>
                                          <button
                                            aria-label={`記住${v.word}`}
                                            aria-pressed={card.rememberedWords.includes(
                                              v.word,
                                            )}
                                            onClick={() =>
                                              setCollection(
                                                (prev) =>
                                                  prev && {
                                                    ...prev,
                                                    cards: prev.cards.map(
                                                      (c, i) =>
                                                        i === cardIndex
                                                          ? {
                                                              ...c,
                                                              rememberedWords:
                                                                c.rememberedWords.includes(
                                                                  v.word,
                                                                )
                                                                  ? c.rememberedWords.filter(
                                                                      (w) =>
                                                                        w !==
                                                                        v.word,
                                                                    )
                                                                  : [
                                                                      ...c.rememberedWords,
                                                                      v.word,
                                                                    ],
                                                            }
                                                          : c,
                                                    ),
                                                  },
                                              )
                                            }
                                          >
                                            {card.rememberedWords.includes(
                                              v.word,
                                            ) ? (
                                              <Check size={15} />
                                            ) : (
                                              <Plus size={15} />
                                            )}
                                            想記住
                                          </button>
                                        </div>
                                      </article>
                                    ))}
                                </div>
                                {!card.vocabulary.length && (
                                  <p className="empty-inline">
                                    目前無已核對的造詞資料，請和老師一起查字典。
                                  </p>
                                )}
                                {card.vocabulary.length < wordCount && (
                                  <p className="data-note">
                                    目前收錄 {card.vocabulary.length}{" "}
                                    組，不補上未收錄的詞語。
                                  </p>
                                )}
                                <p className="data-note">
                                  {collection.curriculum ? "詞義及注音為教育部官方詞目原文；須另核對課文中的讀音與用法，未生成例句。" : "詞義、注音及例句為編寫教材，待教師審定。不同義項以標籤區分。"}
                                </p>
                              </>
                            )}
                          </div>
                        </div>
                        {captions && (
                          <div className="scene-caption">
                            <span>本幕重點</span>
                            {scene === 0
                              ? collection.curriculum ? `認識本課生字「${card.character}」。` : `在「${collection.sourcePhrase}」中認識「${card.character}」。`
                              : scene === 1
                                ? `結構示意：${reviewedMaster!.structure}`
                                : scene === 2
                                  ? "部件幫助觀察字形，不能用來推論字源。"
                                  : scene === 3
                                    ? "在官方播放器按「播放」看動畫，按「下一畫」逐筆看；學完再點選下一階段。"
                                    : scene === 4
                                      ? simple
                                        ? card.simple
                                        : card.meaning
                                      : "把同一個字，放回不同語詞裡認識。"}
                          </div>
                        )}
                        <div className="classroom-footer">
                          <span>
                            <span className="status-dot" />
                            教材部分收錄 · 待教師審定
                          </span>
                          <a
                            href={card.source?.url || DICTIONARY.url}
                            target="_blank"
                            rel="noreferrer"
                          >
                            查看查核參考 <ExternalLink size={13} />
                          </a>
                        </div>
                      </section>
                    )
                  )}
                </div>
                {collection && (
                  <section className="session-summary">
                    <div className="summary-title">
                      <span className="eyebrow">這一次的小小收穫</span>
                      <h2>「{collection.sourcePhrase}」的學習卡</h2>
                    </div>
                    <div className="summary-cards">
                      {collection.cards.map((c, i) => (
                        <button
                          key={c.id}
                          className={
                            i === cardIndex
                              ? "summary-card current"
                              : "summary-card"
                          }
                          onClick={() => {
                            setCardIndex(i);
                            setScene(0);
                            setPlaying(false);
                          }}
                        >
                          <strong>{c.character}</strong>
                          <span>
                            {c.visitedScenes.length}/6 幕已看過
                            <small>
                              {c.visitedScenes.length === 6
                                ? "已看完，記得再複習"
                                : "慢慢來，一步一步學"}
                            </small>
                          </span>
                          {c.visitedScenes.length === 6 && <Check size={19} />}
                        </button>
                      ))}
                    </div>
                    <div className="summary-actions">
                      <button
                        className="secondary"
                        onClick={() => {
                          setCardIndex(0);
                          setScene(0);
                          setPlaying(false);
                        }}
                      >
                        <Play size={17} />
                        從第一字開始複習
                      </button>
                      <button className="primary" onClick={() => save()}>
                        <Bookmark size={17} />
                        收藏到我的生字本
                      </button>
                      <button
                        className="secondary"
                        onClick={() => setModal("export")}
                      >
                        <Download size={17} />
                        下載學習卡／學習本
                      </button>
                      <button className="quiet" onClick={openDrive}>
                        <CloudUpload size={18} />
                        <span>Google Drive{studentGoogleAccount && <><br /><small dir="auto">{studentGoogleAccount}</small></>}</span>
                      </button>
                    </div>
                  </section>
                )}
                {!collection && (
                  <div className="bottom-guide">
                    <span>
                      <i>01</i>輸入與選字
                    </span>
                    <ArrowRight size={16} />
                    <span>
                      <i>02</i>六幕慢慢學
                    </span>
                    <ArrowRight size={16} />
                    <span>
                      <i>03</i>收藏每個小進步
                    </span>
                  </div>
                )}
              </>
            )}
            {page === "library" && !backendMode && (
              <div className="competition-actions" role="group" aria-label="我的學習本分頁">
                <button type="button" className={learningTab === "saved" ? "primary" : "secondary"}
                  aria-pressed={learningTab === "saved"} onClick={() => setLearningTab("saved")}>生字收藏本</button>
                <button type="button" className={learningTab === "quiz" ? "primary" : "secondary"}
                  aria-pressed={learningTab === "quiz"} onClick={() => setLearningTab("quiz")}>國語錯題本</button>
              </div>
            )}
            {page === "library" && learningTab === "quiz" && !backendMode && (
              <Suspense fallback={<p>載入國語錯題本…</p>}><QuizStudent embedded /></Suspense>
            )}
            {page === "library" && (backendMode || learningTab === "saved") && (
              <>
                <div className="page-heading">
                  <div>
                    <div className="eyebrow">
                      <Bookmark size={15} /> 把小小進步，收藏起來
                    </div>
                    <h1>我的生字收藏本</h1>
                    <p>同一個字、不同的語詞，每一次發現都值得留下。</p>
                  </div>
                  <button
                    className="secondary"
                    onClick={() => importRef.current?.click()}
                  >
                    <Upload size={17} />
                    匯入 JSON 備份
                  </button>
                  <input
                    type="file"
                    accept=".json,application/json"
                    hidden
                    ref={importRef}
                    onChange={(e) => {
                      if (e.target.files?.[0])
                        void importFile(e.target.files[0]);
                      e.target.value = "";
                    }}
                  />
                </div>
                <Suspense fallback={<p role="status">載入雲端收藏功能…</p>}>
                  <CloudCollections onRefresh={refresh} />
                </Suspense>
                <div className="library-stats">
                  <span>
                    <b>{saved.length}</b>份語詞收藏
                  </span>
                  <span>
                    <b>{saved.reduce((n, c) => n + c.cards.length, 0)}</b>
                    張獨立字卡
                  </span>
                  <span>
                    <b>{learned}</b>份已經學會
                  </span>
                </div>
                <div className="library-toolbar">
                  <div className="search-input">
                    <Search size={18} />
                    <input
                      aria-label="搜尋收藏"
                      placeholder="搜尋字或語詞…"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                  </div>
                  <select
                    aria-label="篩選複習狀態"
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                  >
                    <option value="all">全部收藏</option>
                    <option value="practice">再練習</option>
                    <option value="learned">我會了</option>
                  </select>
                </div>
                {!visibleSaved.length ? (
                  <div className="empty-state">
                    <LibraryBig size={45} />
                    <h2>
                      {saved.length
                        ? "沒有符合的收藏"
                        : "你的生字本，等著第一個朋友。"}
                    </h2>
                    <p>
                      {saved.length
                        ? "試試其他關鍵字或複習狀態。"
                        : "選一個想學的語詞，學完後就能收藏在這裡。"}
                    </p>
                    <button
                      className="primary"
                      onClick={() => {
                        if (saved.length) {
                          setSearch("");
                          setFilter("all");
                        } else setPage("learn");
                      }}
                    >
                      {saved.length ? "清除篩選" : "開始認識生字"}
                      <ArrowRight size={17} />
                    </button>
                  </div>
                ) : (
                  <div className="collection-grid">
                    {visibleSaved.map((c) => (
                      <article className="collection-card" key={c.id}>
                        <div className="collection-meta">
                          <span>
                            {new Date(c.createdAt).toLocaleDateString("zh-TW")}
                          </span>
                          <button
                            className="icon-btn"
                            aria-label={`刪除收藏${c.sourcePhrase}`}
                            onClick={() => setDeleteId(c.id)}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                        <div className="collected-chars">
                          {c.cards.map((card) => (
                            <span key={card.id}>{card.character}</span>
                          ))}
                        </div>
                        <h2>{c.sourcePhrase}</h2>
                        <p>{c.cards.length} 張字卡 · 保留學習當下的內容</p>
                        <div className="collection-bottom">
                          <button
                            className="secondary"
                            onClick={() => openCollection(c)}
                          >
                            重新學習
                            <ArrowRight size={16} />
                          </button>
                          <button
                            className={
                              c.reviewState === "learned"
                                ? "review learned"
                                : "review"
                            }
                            onClick={async () => {
                              try {
                                await saveCollection({
                                  ...c,
                                  reviewState:
                                    c.reviewState === "learned"
                                      ? "practice"
                                      : "learned",
                                });
                                await refresh();
                              } catch (e) {
                                setError(err(e));
                              }
                            }}
                          >
                            {c.reviewState === "learned" ? (
                              <Check size={15} />
                            ) : (
                              <RotateCcw size={15} />
                            )}{" "}
                            {c.reviewState === "learned" ? "我會了" : "再練習"}
                          </button>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
                <p className="backup-note">
                  <HelpCircle size={16} />
                  收藏保存在目前瀏覽器。清除瀏覽資料前，請下載 JSON 備份。
                </p>
              </>
            )}
            {page === "resources" && (
              <>
                <div className="page-heading">
                  <div>
                    <div className="eyebrow">
                      <BookOpen size={15} /> 和可靠的資料一起學
                    </div>
                    <h1>教育部字辭典</h1>
                    <p>讀音、字義與筆順，遇到疑問就回到原始資料查一查。</p>
                  </div>
                </div>
                <div className="resource-grid">
                  {[
                    STROKES,
                    DICTIONARY,
                    {
                      title: "教育部《重編國語辭典修訂本》",
                      url: "https://dict.revised.moe.edu.tw/",
                    },
                    {
                      title: "CNS11643 全字庫",
                      url: "https://www.cns11643.gov.tw/",
                    },
                  ].map((s, i) => (
                    <a
                      className="resource-card"
                      href={s.url}
                      target="_blank"
                      rel="noreferrer"
                      key={s.url}
                    >
                      <span className="resource-number">0{i + 1}</span>
                      <BookOpen size={28} />
                      <h2>{s.title}</h2>
                      <p>
                        {
                          [
                            "對照臺灣標準字體與筆順，確認每一筆的寫法。",
                            "查詢常用字詞、注音與適合一般學習的釋義。",
                            "查詢更多義項及用法，古義需要與老師一起辨讀。",
                            "查詢字形與編碼資料，作為字形核對參考。",
                          ][i]
                        }
                      </p>
                      <span>
                        開啟網站
                        <ExternalLink size={16} />
                      </span>
                    </a>
                  ))}
                </div>
                <div className="source-statement">
                  <h2>關於教材與資料</h2>
                  <p>
                    此版本提供少量語境教材。白話解說、例句及結構示意為本專案編寫，待教師審定，不能當作已核對的完整字典。參考連結不代表取得來源網站素材的重製授權。
                  </p>
                  <p>
                    筆順使用教育部正式嵌入播放器，可連續播放或按「下一畫」逐筆顯示。需連線使用，僅供非商業學習；官方素材不納入本機匯出或影片。
                  </p>
                </div>
              </>
            )}
            {backendMode && page === "learn" && collection?.curriculum && <div className="curriculum-preview-return"><button className="secondary" onClick={() => openBackendSection("curriculum")}>返回三家出版社生字資料庫</button><p>課本生字測試預覽 · 所選各字分別查字典，不將字串當成語詞解釋。結構及課文語境待教師核對。</p></div>}
            {page === "tts" && (
              <>
              {(!backendMode || backendSection === "tts") &&
              <TtsSettings
                includeTools={!backendMode}
                voices={ttsVoices}
                saved={ttsPreference}
                supported={"speechSynthesis" in window}
                refresh={refreshTtsVoices}
                save={saveTtsDefault}
                preview={(text, preference) => {
                  setError("");
                  setPlaying(false);
                  speech.speak(
                    text,
                    speed === 0.65 ? 0.7 : speed === 1.5 ? 1.1 : 0.85,
                    preference,
                  );
                }}
              />}
              {backendMode && backendSection !== "tts" && <>
                <div className="page-heading"><div><p className="eyebrow">教師工作區</p><h1>{backendTitles[backendSection]}</h1></div></div>
                <div className="backend-panel"><Suspense fallback={<p role="status">載入設定內容…</p>}>
                  {backendSection === "api" && <BackendApi />}
                  {backendSection === 'quiz' && <QuizTeacher/>}
                  {backendSection === 'gameReview' && <GameReview teacher/>}
                  {backendSection === 'writingAssignments' && <WritingAssignmentAdmin/>}
                  {backendSection === "users" && <UserManagement />}
                  {backendSection === "sentences" && <SentenceCompetitionAdmin />}
                  {backendSection === "competition" && <CompetitionAdmin key="original" />}
                  {backendSection === "versions" && <VersionRecordAdmin />}
                  {backendSection === "themes" && <SiteThemeLibrary active={siteTheme} />}
                  {structureSections.some(section => section === backendSection) && (
                    <div className="competition-actions" role="group" aria-label="字形結構分頁">
                      {structureSections.map(section => (
                        <button key={section} type="button" aria-pressed={backendSection === section}
                          className={backendSection === section ? "primary" : "secondary"}
                          onClick={() => openBackendSection(section)}>
                          {backendTitles[section]}
                        </button>
                      ))}
                    </div>
                  )}
                  {backendSection === "structure" && <BackendStructure />}
                  {backendSection === "structure-assignment" && <StructureAssignment />}
                  {backendSection === "curriculum" && <CurriculumDatabase onLearn={async (chars,context) => {
                    const resources=await loadLearningResources();
                    const value=buildCurriculumCollection(chars,context,resources);
                    setCollection(value);setInput(value.sourcePhrase);setPhrase(value.sourcePhrase);setPositions(chars.map((_,i)=>i));
                    setCardIndex(0);setScene(0);setPage("learn");setPlaying(false);setRevealed([]);speech.stop();
                  }} />}
                  {(backendSection === "handwriting" || backendSection === "strokeDatabase") && (
                    <>
                      <div className="competition-actions" role="group" aria-label="手寫檢核與筆順分頁">
                        {(["handwriting", "strokeDatabase"] as const).map(section => (
                          <button key={section} type="button" aria-pressed={backendSection === section}
                            className={backendSection === section ? "primary" : "secondary"}
                            onClick={() => openBackendSection(section)}>
                            {backendTitles[section]}
                          </button>
                        ))}
                      </div>
                      <HandwritingLab mode={backendSection === "handwriting" ? "test" : "database"} onPractice={() => openBackendSection("handwriting")} />
                    </>
                  )}
                  {(["lesson", "overview", "review"] as string[]).includes(backendSection) && (
                    <iframe
                      key={backendSection}
                      className="backend-tool-frame"
                      title={backendTitles[backendSection]}
                      src={backendSection === "lesson" ? "/structure-review/editor.html?mode=lesson" : backendSection === "overview" ? "/structure-review/five-upper.html" : "/structure-review/editor.html"}
                    />
                  )}
                </Suspense></div>
              </>}
              </>
            )}
            <footer className="page-footer">
              <span>
                <Leaf size={14} /> 每天一點點，字詞都會記得。
              </span>
              <span>生字動畫收藏本 · 本機學習版</span>
            </footer>
          </main>
        </div>
        {showVersions && <Modal title="版本紀錄" close={() => setShowVersions(false)}>
          <p className="student-version-summary"><strong>v{SITE_VERSION}</strong> · {SITE_UPDATED_AT}<br />{SITE_VERSION_NOTE}</p>
          <ul className="student-version-summary">
            {readVersionRecords(localStorage).filter(record => record.version !== SITE_VERSION).map(record => (
              <li key={record.id}><strong>v{record.version}</strong> · {record.date}<br />{record.summary}</li>
            ))}
          </ul>
        </Modal>}
        {modal === "settings" && (
          <Modal title="學習偏好" close={() => setModal(null)}>
            <p className="modal-description">讓教室變成適合自己的樣子。</p>
            {backendMode && <button
              className="secondary full"
              onClick={() => {
                setModal(null);
                setPage("tts");
                setPlaying(false);
              }}
            >
              管理 TTS 來源與預設音色
              <ArrowRight size={16} />
            </button>}
            {[
              { label: "顯示注音", checked: showReading, set: setShowReading },
              { label: "顯示重點字幕", checked: captions, set: setCaptions },
              { label: "切換分鏡時自動朗讀", checked: voice, set: setVoice },
              { label: "減少動態效果", checked: reduced, set: setReduced },
            ].map((item) => (
              <label className="setting-row" key={item.label}>
                {item.label}
                <input
                  type="checkbox"
                  role="switch"
                  checked={item.checked}
                  onChange={(e) => item.set(e.target.checked)}
                />
              </label>
            ))}
            <p className="data-note">
              朗讀使用裝置提供的中文語音，聲音品質依瀏覽器與系統設定而異。
            </p>
            <button className="primary full" onClick={() => setModal(null)}>
              完成
            </button>
          </Modal>
        )}
        {modal === "export" && collection && (
          <Modal
            title={`下載「${collection.sourcePhrase}」的學習成果`}
            close={() => {
              if (!busy) setModal(null);
            }}
          >
            <p className="modal-description">
              每個字獨立留存，也能合成一本學習本。
            </p>
            <div className="export-options">
              <button disabled={!!busy} onClick={() => exportFile("png")}>
                <Image size={25} />
                <span>
                  <b>「{card?.character}」學習卡</b>
                  <small>PNG 圖片 · 目前這一個字</small>
                </span>
                <Download size={18} />
              </button>
              <button disabled={!!busy} onClick={() => exportFile("pdf")}>
                <FileText size={25} />
                <span>
                  <b>整組語詞學習本</b>
                  <small>PDF · 每字一頁，含造詞與來源</small>
                </span>
                <Download size={18} />
              </button>
              <button disabled={!!busy} onClick={() => exportFile("json")}>
                <BookOpen size={25} />
                <span>
                  <b>完整學習資料備份</b>
                  <small>JSON · 保留語境、分鏡與複習進度</small>
                </span>
                <Download size={18} />
              </button>
            </div>
            {busy && (
              <p role="status" className="busy">
                <LoaderCircle className="spin" size={18} />
                {busy}
              </p>
            )}
            <p className="data-note">
              本版尚無已核對且可重製的筆順素材，暫不提供影片下載。
            </p>
          </Modal>
        )}
        {modal === "drive" && (
          <Modal
            title="收藏到 Google Drive"
            close={() => {
              if (!busy) setModal(null);
            }}
          >
            {CLIENT_ID ? (
              <>
                <p className="modal-description">
                  經你同意後，在自己的 Drive
                  建立「生字動畫收藏本」專用資料夾，上傳 JSON、PDF 與逐字
                  PNG。本機收藏會先保留。
                </p>
                {driveResult ? (
                  <div className="drive-success">
                    <Check size={30} />
                    <h3>上傳完成</h3>
                    <a href={driveResult.url} target="_blank" rel="noreferrer">
                      開啟專用資料夾
                      <ExternalLink size={16} />
                    </a>
                    <ul>
                      {driveResult.files.map((f) => (
                        <li key={f.id}>
                          <a href={f.url} target="_blank" rel="noreferrer">
                            {f.name}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <button
                    className="primary full"
                    disabled={!driveReady || !!busy}
                    onClick={sendDrive}
                  >
                    {busy ? (
                      <LoaderCircle size={18} className="spin" />
                    ) : (
                      <CloudUpload size={18} />
                    )}{" "}
                    {busy || "Google 授權並上傳"}
                  </button>
                )}
              </>
            ) : (
              <>
                <div className="drive-setup">
                  <CloudUpload size={36} />
                  <h3>Google 雲端收藏尚未設定</h3>
                  <p>
                    這個本機版本還沒有 Google OAuth 用戶端
                    ID，因此不能登入或上傳。前端收藏與下載都可以照常使用。
                  </p>
                </div>
                <button
                  className="primary full"
                  onClick={() => setModal("export")}
                >
                  <Download size={17} />
                  先下載到這台裝置
                </button>
              </>
            )}
          </Modal>
        )}
        {deleteId && (
          <Modal title="刪除這份收藏？" close={() => setDeleteId(null)}>
            <p>刪除後無法復原，已下載的備份不受影響。</p>
            <div className="modal-actions">
              <button className="secondary" onClick={() => setDeleteId(null)}>
                保留收藏
              </button>
              <button
                className="danger"
                onClick={async () => {
                  try {
                    await deleteCollection(deleteId);
                    await refresh();
                    setDeleteId(null);
                    setNotice("已刪除收藏。");
                  } catch (e) {
                    setError(err(e));
                  }
                }}
              >
                確定刪除
              </button>
            </div>
          </Modal>
        )}
      </div>
    </SpeechContext.Provider>
  );
}
