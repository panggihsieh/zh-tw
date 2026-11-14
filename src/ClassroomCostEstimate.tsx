import { useEffect, useState } from "react";
import { competitionRequest, type CompetitionRoom } from "./competitionApi";

export default function ClassroomCostEstimate() {
  const [rooms, setRooms] = useState<CompetitionRoom[]>([]);
  const [status, setStatus] = useState("載入課堂…");
  const [pricing, setPricing] = useState(() => ({
    input: localStorage.getItem("classroom-input-usd") ?? "",
    output: localStorage.getItem("classroom-output-usd") ?? "",
  }));

  useEffect(() => {
    competitionRequest<{ items: CompetitionRoom[] }>("/rooms").then(({ items }) => {
      setRooms(items);
      setStatus(items.length ? "" : "目前沒有開課紀錄。");
    }).catch(() => setStatus("無法載入課堂，請重新開啟本頁。"));
  }, []);

  const hasPricing = Object.values(pricing).every(value => value !== "" && Number.isFinite(Number(value)) && Number(value) >= 0);
  return (
    <section className="competition-room">
      <h2>每堂課 AI 費用估算</h2>
      <p>以每位學生完成全部題目估算。AI 造句每題暫估輸入 1,500、輸出 500 tokens。模擬學生、四選一與生字結構答題不計入。</p>
      <div className="competition-form-grid">
        {(["input", "output"] as const).map(kind => (
          <label key={kind}>{kind === "input" ? "輸入" : "輸出"}單價（美元／百萬 tokens）
            <input type="number" min="0" step="any" value={pricing[kind]} onChange={event => {
              const value = event.target.value;
              setPricing(previous => ({ ...previous, [kind]: value }));
              localStorage.setItem(`classroom-${kind}-usd`, value);
            }} />
          </label>
        ))}
      </div>
      <p>請填入所用模型的單價。此處顯示預算估計，實際用量以服務商帳單為準。</p>
      {status && <p role="status">{status}</p>}
      <ul>
        {rooms.map(room => {
          const calls = room.gameType === "sentence-practice" ? room.maxParticipants * room.questionCount : 0;
          const input = calls * 1500;
          const output = calls * 500;
          const dollars = (input * Number(pricing.input) + output * Number(pricing.output)) / 1_000_000;
          return <li key={room.id}><strong>{room.title}（{room.code}）</strong> · 輸入 {input.toLocaleString()} ／ 輸出 {output.toLocaleString()} tokens · {calls === 0 || hasPricing ? `US$ ${dollars.toFixed(4)}` : "待填單價"}</li>;
        })}
      </ul>
    </section>
  );
}
