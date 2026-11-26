import { useEffect, useState } from "react";
import GameReview from "./GameReview";
import CompetitionSentenceReview from './CompetitionSentenceReview';
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

function CompetitionRecords() {
  const [rooms, setRooms] = useState<CompetitionRoom[]>([]);
  const [roomId, setRoomId] = useState("");
  const [items, setItems] = useState<LeaderboardItem[]>([]);
  const [photos, setPhotos] = useState<RankingPhoto[]>([]);
  const [photoStatus, setPhotoStatus] = useState("");
  const room = rooms.find(item => item.id === roomId);
  const [status, setStatus] = useState("載入遊戲紀錄…");

  useEffect(() => {
    let active = true;
    competitionRequest<{ items: CompetitionRoom[] }>("/rooms").then(({ items }) => {
      if (!active) return;
      const completed = items.filter(room => room.status === "closed");
      setRooms(completed);
      setRoomId(completed[0]?.id ?? "");
      setStatus(completed.length ? "" : "目前沒有已結束的競賽。");
    }).catch(error => { if (active) setStatus(error.message); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!roomId) return;
    let active = true;
    setItems([]);
    setPhotos([]);
    setPhotoStatus("載入排名照片…");
    competitionRequest<{ items: RankingPhoto[] }>(`/rooms/${roomId}/photos`).then(({ items }) => {
      if (!active) return;
      setPhotos(items);
      setPhotoStatus(items.length ? "" : "此課堂尚無排名照片。");
    }).catch(error => { if (active) setPhotoStatus(`照片載入失敗：${error.message}`); });
    setStatus("載入學生結果…");
    competitionRequest<{ items: LeaderboardItem[] }>(`/rooms/${roomId}/leaderboard`).then(({ items }) => {
      if (!active) return;
      setItems(items);
      setStatus(items.length ? "" : "這堂課沒有學生紀錄。");
    }).catch(error => { if (active) setStatus(error.message); });
    return () => { active = false; };
  }, [roomId]);

  return (
    <section className="game-review" aria-label="遊戲紀錄">
      <h2>Kahoot 競賽紀錄</h2>
      {!!rooms.length && <label>已結束的課堂
        <select value={roomId} onChange={event => { setItems([]); setPhotos([]); setRoomId(event.target.value); }}>
          {rooms.map(room => <option key={room.id} value={room.id}>{room.className} · {gameLabels[room.gameType]} · {room.title}（{room.code}）</option>)}
        </select>
      </label>}
      {room && <p>課堂日期 {classroomDate(room)} · 測驗名稱 {room.title}</p>}
      {room?.gameType === 'sentence-practice' && <CompetitionSentenceReview key={room.id} roomId={room.id}/>}
      {status && <p role="status">{status}</p>}
      {room && items.length > 0 && <>
        <button type="button" className="secondary" onClick={() => exportRanking(room, items)}>匯出成績 CSV</button>
        <ol>
          {items.map(item => <li key={item.uid}>第 {item.rank} 名 · {item.name} · {item.points} 分 · 答對 {item.correct} 題 · 已答 {item.answered}/{room.questionCount} 題</li>)}
        </ol>
      </>}
      {room && <section aria-label="排名照片">
        <h3>排名照片</h3>
        {photoStatus && <p role="status">{photoStatus}</p>}
        {photos.map(photo => <details key={photo.id}>
          <summary>{new Date(photo.createdAt).toLocaleString("zh-TW", { timeZone: "Asia/Taipei" })} 排名照片</summary>
          <div className="competition-ranking-photo">
            <img src={photo.image} alt={photo.title + "排名照片"} loading="lazy" />
            <a href={photo.image} download={photo.title + "-排名.jpg"}>下載照片</a>
          </div>
        </details>)}
      </section>}
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
