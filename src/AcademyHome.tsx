import { ArrowRight, Search, Settings2 } from "lucide-react";
import { useState, type ReactNode } from "react";
import BirdMascot from "./BirdMascot";

export function AcademyArt({ kind }: { kind: string }) {
  return <span className={`academy-art art-${kind}`} aria-hidden="true" />;
}
export function StudentAcademyHome({ onLearn, onPractice, tools }: { onLearn: () => void; onPractice: (scene: 1 | 3) => void; tools?: ReactNode }) {
  return <section className="academy-home" aria-label="生字探索旅程">
    <div className="academy-intro"><div><p className="academy-eyebrow">看動畫 · 學生字 · 收藏每一次發現</p><h1>一起出發，探索生字的世界！</h1><p>選一課、認識一個字，讓每次發現都成為自己的收藏。</p></div><BirdMascot /></div>
    <div className="academy-course-entry"><span>從課本出發，找到今天的生字</span><button onClick={onLearn}>選擇出版社與課程 <ArrowRight size={18}/></button></div>
    <nav className="student-academy-grid" aria-label="學習字卡">
      <button className="academy-card card-learn" onClick={onLearn}><h2>認識生字</h2><AcademyArt kind="book"/><span className="card-calligraphy">學</span><span className="academy-card-action">開始學習 <ArrowRight size={18}/></span></button>
      <button className="academy-card card-structure" onClick={() => onPractice(1)}><h2>拆字探索</h2><AcademyArt kind="puzzle"/><span className="academy-card-caption">字形結構・部件拆解・字義用法</span></button>
      <button className="academy-card card-writing" onClick={() => onPractice(3)}><h2>筆順練習</h2><AcademyArt kind="brush"/><span className="academy-card-caption">課程內的個人筆順練習</span></button>
      <a className="academy-card card-games" href="#games"><h2>遊戲專區</h2><AcademyArt kind="trophy"/><span className="academy-card-caption">加入老師的課堂挑戰</span></a>
    </nav>
    {tools && <details className="academy-home-tools"><summary>朗讀與學習設定</summary>{tools}</details>}
    <p className="academy-home-note">生字動畫、拆字探索與筆順練習，皆在生字動畫教室依課程學習，免登入即可使用。課堂競賽請使用老師提供的開課代碼。</p>
  </section>;
}
const backendCards = [
  { id: "quiz", title: "資料庫管理", note: "生字・課本・出版社", art: "book", className: "card-database", keywords: "資料庫 生字 題庫 quiz" },
  { id: "competition", title: "Kahoot 競賽開課", note: "建立課程・課堂派送", art: "trophy", className: "card-competition", keywords: "Kahoot 遊戲 競賽 開課" },
  { id: "gameReview", title: "課堂紀錄", note: "回顧學習與課堂成果", art: "clipboard", className: "card-records", keywords: "課堂 成績 紀錄" },
  { id: "structure", title: "字形結構", note: "部件拆解・教學資源", art: "puzzle", className: "card-radicals", keywords: "字形 結構 拆字 部件" },
  { id: "handwriting", title: "手寫檢核與筆順", note: "寫一寫，核對每一畫", art: "brush", className: "card-handwriting", keywords: "手寫 筆順 筆畫" },
  { id: "tts", title: "語音與朗讀", note: "試聽與設定預設音色", art: "mic", className: "card-voice", keywords: "語音 朗讀 TTS 音色" },
];
const extraTools = [
  ["strokeSpeech", "筆畫語音核對與發布"], ["curriculum", "三家出版社生字資料庫"], ["strokeDatabase", "筆順資料庫"],
  ["structure-assignment", "結構作業"], ["writingAssignments", "書寫作業"], ["sentences", "造句競賽"],
  ["lesson", "課文結構編輯"], ["overview", "生字結構總覽"], ["review", "結構核對"],
  ["users", "帳號權限"], ["themes", "網站樣式"], ["api", "API 設定"], ["versions", "版本紀錄"], ["security", "安全事件紀錄"],
];
export function TeacherAcademyHome({ onOpen, labels }: { onOpen: (id: string) => void; labels: Partial<Record<string, string>> }) {
  const [search, setSearch] = useState("");
  const query = search.trim().toLocaleLowerCase();
  const cards = backendCards.filter(card => `${labels[card.id] || card.title} ${card.keywords}`.toLocaleLowerCase().includes(query));
  const tools = extraTools.filter(([id,title]) => `${labels[id] || title}`.toLocaleLowerCase().includes(query));
  return <section className="academy-home teacher-academy-home" aria-label="教師功能字卡">
    <div className="academy-intro"><BirdMascot/><div><p className="academy-eyebrow">教師後台 · 教學準備從這裡開始</p><h1>今天，想準備哪一堂課？</h1></div><label className="academy-function-search"><Search size={20}/><input value={search} onChange={event => setSearch(event.target.value)} placeholder="搜尋後台功能" aria-label="搜尋後台功能"/>{search && <button onClick={() => setSearch("")} aria-label="清除功能搜尋">×</button>}</label></div>
    {!cards.length && !tools.length && <p role="status" className="academy-no-results">找不到「{search}」相關功能，試試「課堂」、「筆順」或「語音」。</p>}
    <div className={`teacher-academy-grid${query ? " is-searching" : ""}`}>
      {cards.map(card => <button key={card.id} className={`academy-card ${card.className}`} onClick={() => onOpen(card.id)}><h2>{labels[card.id] || (card.id === "competition" ? <><span>Kahoot</span><span>競賽開課</span></> : card.title)}</h2><AcademyArt kind={card.art}/><span className="academy-card-caption">{card.note}</span><ArrowRight className="academy-card-arrow" size={18}/></button>)}
      {!query && <div className="academy-settings-card"><h2><Settings2 size={26}/>全站管理與設定</h2><div>{[["users","帳號權限"],["themes","網站樣式"],["api","API 設定"]].map(([id,title]) => <button key={id} onClick={() => onOpen(id)}>{labels[id] || title}<ArrowRight size={14}/></button>)}</div></div>}
    </div>
    <section className="academy-tool-directory" aria-label="所有後台功能"><h2>{query ? "其他搜尋結果" : "更多教學與管理工具"}</h2><div>{tools.map(([id,title]) => <button key={id} onClick={() => onOpen(id)}>{labels[id] || title}<ArrowRight size={15}/></button>)}</div></section>
  </section>;
}
