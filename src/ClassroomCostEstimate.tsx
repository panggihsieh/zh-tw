import { useEffect, useState } from "react";
import { competitionRequest, type CompetitionRoom } from "./competitionApi";

export default function ClassroomCostEstimate({ provider, model }: { provider?: string; model?: string }) {
  const [rooms, setRooms] = useState<CompetitionRoom[]>([]);
  const [status, setStatus] = useState("載入課堂…");
  const flash = model && ["deepseek-flash", "deepseek-v4-flash", "deepseek-v4-flash-vision-exp"].includes(model);
  const rates = provider === "deepseek"
    ? flash ? [0.15, 0.6] : model === "deepseek-v4-pro" ? [0.66, 1.98] : null
    : null;

  useEffect(() => {
    competitionRequest<{ items: CompetitionRoom[] }>("/rooms").then(({ items }) => {
      setRooms(items);
      setStatus(items.length ? "" : "目前沒有開課紀錄。");
    }).catch(() => setStatus("無法載入課堂，請重新開啟本頁。"));
  }, []);

  return (
    <section className="competition-room">
      <h2>每堂課 AI 費用估算</h2>
      <p>以每位學生完成全部題目估算。AI 造句每題暫估輸入 1,500、輸出 500 tokens。模擬學生、四選一與生字結構答題不計入。</p>
      {rates ? <p>{model} · 每百萬 tokens（未命中快取）輸入 US$ {rates[0]}–{rates[0] * 2}，輸出 US$ {rates[1]}–{rates[1] * 2}。依實際呼叫時段計費，估算涵蓋離峰與尖峰。價格查核日：2026/11/15。 <a href="https://api-docs.deepseek.com/quick_start/pricing/" target="_blank" rel="noreferrer">官方價格與計費時段</a></p>
        : <p>{model ? `${model} 尚無已核對的單價，先顯示 tokens。` : "等待載入已儲存的 AI 模型。"}</p>}
      {status && <p role="status">{status}</p>}
      <ul>
        {rooms.map(room => {
          const calls = room.gameType === "sentence-practice" ? room.maxParticipants * room.questionCount : 0;
          const input = calls * 1500;
          const output = calls * 500;
          const dollars = rates ? (input * rates[0] + output * rates[1]) / 1_000_000 : null;
          return <li key={room.id}><strong>{room.title}（{room.code}）</strong> · 輸入 {input.toLocaleString()} ／ 輸出 {output.toLocaleString()} tokens · {calls === 0 ? "US$ 0" : dollars === null ? "單價未確認" : `US$ ${dollars.toFixed(4)}–${(dollars * 2).toFixed(4)}`}</li>;
        })}
      </ul>
    </section>
  );
}
