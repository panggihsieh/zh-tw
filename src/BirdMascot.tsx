import { useEffect, useRef, useState } from "react";
import "./birdMascot.css";

export const owlImage = `${import.meta.env.BASE_URL}mascot/owl.png`;
export const owlAnimation = `${import.meta.env.BASE_URL}mascot/owl-peekaboo.gif`;
export function BirdMascotIcon() {
  return <picture className="bird-mascot-icon" aria-hidden="true">
    <source media="(prefers-reduced-motion: reduce)" srcSet={owlImage}/>
    <img src={owlAnimation} alt="" width={32} height={32}/>
  </picture>;
}
export default function BirdMascot() {
  const [greeting, setGreeting] = useState(false);
  const [replay, setReplay] = useState(0);
  const timeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timeout.current), []);
  return <div className="bird-mascot-guide">
    <button className="bird-mascot-button" aria-label="和小貓頭鷹打招呼" onClick={() => {
      clearTimeout(timeout.current);
      setGreeting(true);
      setReplay(value => value + 1);
      timeout.current = setTimeout(() => setGreeting(false), 4000);
    }}>
      <img key={replay} className={`bird-mascot-character${replay ? " greeting" : ""}`} src={owlImage} alt="小貓頭鷹" width={1536} height={1024}/>
    </button>
    <span className="bird-mascot-greeting" aria-live="polite">{greeting ? "一起認識新生字吧！" : "點我打招呼"}</span>
  </div>;
}
