import { useEffect, useState, type ReactNode } from "react";

export default function TimedActivity({ minutes, onBack, onExpire, children }: {
  minutes: number;
  onBack: () => void;
  onExpire: () => void;
  children: ReactNode;
}) {
  const [deadline, setDeadline] = useState<number | null>(null);
  const [now, setNow] = useState(0);
  useEffect(() => {
    if (deadline === null || now >= deadline) return;
    const timer = window.setTimeout(() => setNow(Date.now()), Math.min(1000, deadline - now));
    return () => window.clearTimeout(timer);
  }, [deadline, now]);

  useEffect(() => {
    if (deadline !== null && now >= deadline) onExpire();
  }, [deadline, now, onExpire]);

  if (deadline === null) return (
    <section>
      <p>本次限時 {minutes} 分鐘，按下開始後倒數。請在時間內完成並送出作業。</p>
      <button className="primary" onClick={() => {
        const start = Date.now();
        setNow(start);
        setDeadline(start + minutes * 60_000);
      }}>開始計時</button>
      <button className="secondary" onClick={onBack}>返回遊戲專區</button>
    </section>
  );

  const seconds = Math.max(0, Math.ceil((deadline - now) / 1000));
  if (!seconds) return (
    <section>
      <p role="status">時間到，本次練習已結束。</p>
      <button className="secondary" onClick={onBack}>返回遊戲專區</button>
    </section>
  );
  return (
    <>
      <p role="timer">剩餘時間 {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, "0")}</p>
      {children}
    </>
  );
}
