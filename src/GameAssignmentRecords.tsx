import { useEffect, useState } from "react";
import GameReview from "./GameReview";
import { competitionRequest, type CompetitionRoom, type LeaderboardItem } from "./competitionApi";

function CompetitionRecords() {
  const [rooms, setRooms] = useState<CompetitionRoom[]>([]);
  const [roomId, setRoomId] = useState("");
  const [items, setItems] = useState<LeaderboardItem[]>([]);
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
        <select value={roomId} onChange={event => setRoomId(event.target.value)}>
          {rooms.map(room => <option key={room.id} value={room.id}>{room.className} · {room.title}（{room.code}）</option>)}
        </select>
      </label>}
      {status && <p role="status">{status}</p>}
      {!!items.length && <ol>
        {items.map(item => <li key={item.uid}>{item.name} · {item.points} 分 · 已答 {item.answered} 題</li>)}
      </ol>}
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
