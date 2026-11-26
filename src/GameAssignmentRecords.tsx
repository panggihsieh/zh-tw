import CompetitionSentenceReview from './CompetitionSentenceReview';
import './classroomRecords.css';
import { useEffect, useState } from "react";
import GameReview from "./GameReview";
import { competitionRequest, type CompetitionRoom, type LeaderboardItem } from "./competitionApi";

const gameLabels = {
  'sentence-practice': '一字多詞 AI 造句',
  structure: '生字結構遊戲',
  writing: '書寫生字遊戲',
  quiz: '四選一競賽',
};

interface RankingPhoto {
  id: string;
  image: string;
  title: string;
  createdAt: number;
}

function classroomDate(room: CompetitionRoom) {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Taipei" }).format(
    new Date(room.startedAt ?? room.closedAt ?? room.createdAt),
  );
}

function exportRanking(room: CompetitionRoom, items: LeaderboardItem[]) {
  const rows = [
    ["來源專案", "課堂識別碼", "課堂日期", "測驗名稱", "班級", "活動", "名次", "座號", "姓名", "分數", "答對題數", "已答題數", "總題數"],
    ...items.map(item => ["zh-tw", room.id, classroomDate(room), room.title, room.className, gameLabels[room.gameType], item.rank, item.seat, item.name, item.points, item.correct, item.answered, room.questionCount]),
  ];
  const csv = rows.map(row => row.map(value => {
    const text = String(value ?? "");
    const protectedText = typeof value === "string" && /^[\s]*[=+@-]|^[\t\r\n]/.test(text) ? "'" + text : text;
    return '"' + protectedText.replaceAll('"', '""') + '"';
  }).join(",")).join("\r\n");
  const url = URL.createObjectURL(new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = room.title + "-成績.csv";
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function CompetitionRecords({ request = competitionRequest }: { request?: typeof competitionRequest }) {
  const [rooms, setRooms] = useState<CompetitionRoom[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<Partial<Record<CompetitionRoom["gameType"], string>>>({});
  const [gameType, setGameType] = useState<CompetitionRoom["gameType"]>("structure");
  const [reload, setReload] = useState(0);
  const [listStatus, setListStatus] = useState("載入課堂清單…");
  const filteredRooms = rooms.filter(room => room.gameType === gameType);
  const roomId = filteredRooms.find(room => room.id === selectedRoom[gameType])?.id ?? filteredRooms[0]?.id ?? "";
  const [items, setItems] = useState<LeaderboardItem[]>([]);
  const [photos, setPhotos] = useState<RankingPhoto[]>([]);
  const [photoStatus, setPhotoStatus] = useState("");
  const room = rooms.find(item => item.id === roomId);
  const [status, setStatus] = useState("");

  useEffect(() => {
    let active = true;
    setListStatus("載入課堂清單…");
    request<{ items: CompetitionRoom[] }>("/rooms").then(({ items }) => {
      if (!active) return;
      const completed = items.filter(room => room.status === "closed");
      setRooms(completed);
      setGameType(previous => completed.some(room => room.gameType === previous) ? previous : completed[0]?.gameType ?? previous);
      setListStatus("");
    }).catch(error => { if (active) setListStatus(`課堂清單載入失敗：${error.message}`); });
    return () => { active = false; };
  }, [request, reload]);

  useEffect(() => {
    if (!roomId) { setItems([]); setPhotos([]); setStatus(""); setPhotoStatus(""); return; }
    let active = true;
    setItems([]);
    setPhotos([]);
    setPhotoStatus("載入排名照片…");
    request<{ items: RankingPhoto[] }>(`/rooms/${roomId}/photos`).then(({ items }) => {
      if (!active) return;
      setPhotos(items);
      setPhotoStatus(items.length ? "" : "此課堂尚無排名照片。");
    }).catch(error => { if (active) setPhotoStatus(`照片載入失敗：${error.message}`); });
    setStatus("載入學生結果…");
    request<{ items: LeaderboardItem[] }>(`/rooms/${roomId}/leaderboard`).then(({ items }) => {
      if (!active) return;
      setItems(items);
      setStatus(items.length ? "" : "這堂課沒有學生紀錄。");
    }).catch(error => { if (active) setStatus(error.message); });
    return () => { active = false; };
  }, [roomId, request]);

  return (
    <section className="game-review" aria-label="遊戲紀錄">
      <h2>Kahoot 競賽紀錄</h2>
      <div className="classroom-game-tabs" role="group" aria-label="依遊戲類型查看紀錄">
        {(['structure', 'writing', 'sentence-practice', 'quiz'] as const).map(type => <button key={type} type="button" aria-pressed={gameType === type} className={gameType === type ? 'primary' : 'secondary'} onClick={() => { if (gameType === type) return; setItems([]); setPhotos([]); setStatus(''); setPhotoStatus(''); setGameType(type); }}>
          {{structure:'字體結構',writing:'筆順書寫','sentence-practice':'生字造詞',quiz:'四選一競賽'}[type]}<span>{rooms.filter(room => room.gameType === type).length} 堂</span>
        </button>)}
      </div>
      {listStatus && <p role="status">{listStatus}</p>}
      <button type="button" className="secondary" onClick={() => setReload(value => value + 1)}>重新載入課堂</button>
      {!listStatus && !filteredRooms.length && <p role="status">此遊戲類型目前沒有已結束的課堂。</p>}
      {!!filteredRooms.length && <label className="classroom-room-picker">已結束的課堂
        <select value={roomId} onChange={event => { setItems([]); setPhotos([]); setSelectedRoom(previous => ({ ...previous, [gameType]: event.target.value })); }}>
          {filteredRooms.map(room => <option key={room.id} value={room.id}>{room.className} · {gameLabels[room.gameType]} · {room.title}（{room.code}）</option>)}
        </select>
      </label>}
      {room && <p>課堂日期 {classroomDate(room)} · 測驗名稱 {room.title}</p>}
      {room?.gameType === 'sentence-practice' && <CompetitionSentenceReview key={room.id} roomId={room.id} request={request}/>}
      {room && <section aria-label="排名照片">
        <h3>排名成果・照片集中觀看</h3>
        {photoStatus && <p role="status">{photoStatus}</p>}
        {photos.map(photo => <details key={photo.id} open={photo === photos[0]}>
          <summary>{new Date(photo.createdAt).toLocaleString("zh-TW", { timeZone: "Asia/Taipei" })} 排名照片</summary>
          <div className="competition-ranking-photo">
            <img src={photo.image} alt={photo.title + "排名照片"} loading="lazy" />
            <a href={photo.image} download={photo.title + "-排名.jpg"}>下載照片</a>
          </div>
        </details>)}
      </section>}
      {status && <p role="status">{status}</p>}
      {room && items.length > 0 && <>
        <button type="button" className="secondary" onClick={() => exportRanking(room, items)}>匯出成績 CSV</button>
        <ol>
          {items.map(item => <li key={item.uid}>第 {item.rank} 名 · {item.name} · {item.points} 分 · 答對 {item.correct} 題 · 已答 {item.answered}/{room.questionCount} 題</li>)}
        </ol>
      </>}
    </section>
  );
}

export default function GameAssignmentRecords() {
  const [tab, setTab] = useState<"game" | "writing">("game");
  return (
    <>
      <div className="competition-actions" role="group" aria-label="遊戲作業紀錄分頁">
        <button type="button" aria-pressed={tab === "game"} className={tab === "game" ? "primary" : "secondary"} onClick={() => setTab("game")}>遊戲紀錄</button>
        <button type="button" aria-pressed={tab === "writing"} className={tab === "writing" ? "primary" : "secondary"} onClick={() => setTab("writing")}>書寫作業紀錄</button>
      </div>
      {tab === "game" ? <CompetitionRecords /> : <GameReview teacher />}
    </>
  );
}
