import { useEffect, useRef, useState } from "react";
import "./birdMascot.css";

const source = `${import.meta.env.BASE_URL}mascot/green-bird.png`;
export function BirdMascotIcon() {
  return <span className="bird-mascot-icon" aria-hidden="true">
    <span className="bird-mascot-logo-motion">
      <img className="bird-logo-part bird-logo-body" src={source} alt="" width={48} height={48}/>
      <img className="bird-logo-part bird-logo-left-wing" src={source} alt="" width={48} height={48}/>
      <img className="bird-logo-part bird-logo-right-wing" src={source} alt="" width={48} height={48}/>
    </span>
  </span>;
}
export default function BirdMascot() {
  const [greeting, setGreeting] = useState(false);
  const [replay, setReplay] = useState(0);
  const timeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timeout.current), []);
  return <div className="bird-mascot-guide">
    <button className="bird-mascot-button" aria-label="和小畫眉打招呼，播放小鳥動畫" onClick={() => {
      clearTimeout(timeout.current);
      setGreeting(true);
      setReplay(value => value + 1);
      timeout.current = setTimeout(() => setGreeting(false), 4000);
    }}>
      <img key={replay} className={`bird-mascot-character${replay ? " greeting" : ""}`} src={source} alt="揹著字卡小書包、張開翅膀的綠色小畫眉" width={160} height={176}/>
    </button>
    <span className="bird-mascot-greeting" aria-live="polite">{greeting ? "一起認識新生字吧！" : "點我打招呼"}</span>
  </div>;
}
