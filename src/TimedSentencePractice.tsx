import { useEffect, useState } from "react";
import SentencePractice from "./SentencePractice";
import { publicPracticeRequest as sentenceRequest } from "./sentenceApi";

export default function TimedSentencePractice({ onBack, lessonTitle }: {
  onBack: () => void;
  lessonTitle?: string;
}) {
  const [code, setCode] = useState("");
  const [expires, setExpires] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!expires) return;
    const timer = window.setTimeout(onBack, Math.max(0, expires - Date.now()));
    return () => window.clearTimeout(timer);
  }, [expires, onBack]);

  if (expires) return <SentencePractice lessonTitle={lessonTitle} onBack={onBack}
    request={(path, body) => sentenceRequest(path, { ...(body as object), code })} />;

  return <form onSubmit={async event => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const access = await sentenceRequest<{ expiresAt: number; now: number }>("/practice/access", { code });
      setExpires(Date.now() + access.expiresAt - access.now);
    } catch (reason) {
      setError((reason as Error).message);
    } finally {
      setBusy(false);
    }
  }}>
    <label>老師提供的開課代碼 <input required pattern="[A-Z2-9]{4}" maxLength={4}
      value={code} onChange={event => setCode(event.target.value.toUpperCase())} /></label>
    <button className="primary" disabled={busy}>進入 AI 造句</button>
    <button className="secondary" type="button" onClick={onBack}>返回遊戲專區</button>
    {error && <p role="alert">{error}</p>}
  </form>;
}
