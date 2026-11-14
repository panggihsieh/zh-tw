import { useState } from 'react';
import SentencePractice from './SentencePractice';
import lesson from './lessonSevenPilot.json';
import {previewRequest} from './kahootPreview';
import {sentenceRequest} from './sentenceApi';
import './competition.css';

const testRows = lesson.rows.filter(item => ["際", "璃", "磁"].includes(item.character));
export default function KahootPractice() {
  const [selected, setSelected] = useState(testRows[0].character);
  const [live, setLive] = useState(false);
  const [loginError, setLoginError] = useState("");
  const row = testRows.find(item => item.character === selected)!;
  return <main className="competition-admin kahoot-practice" style={{maxWidth: 960, margin: '24px auto', padding: '0 16px'}}>
    <a href="#">返回首頁</a>
    <h1>一字多詞 Kahoot Ver.2</h1>
    <p>南一 · 五年級上學期 · {lesson.title}</p>
    <fieldset className="practice-character-picker">
      <legend>點選練習生字</legend>
      {testRows.map(item => (
        <button type="button" key={item.character} aria-pressed={selected === item.character}
          className={selected === item.character ? 'primary' : 'secondary'}
          onClick={() => setSelected(item.character)}>{item.character}</button>
      ))}
    </fieldset>
    <p>{live ? "正式 API 評量" : "模擬評量"} · 讀音 {row.reading || '待核對'}</p>
    <button type="button" className="secondary" onClick={async () => {
      setLoginError("");
      if (live) { setLive(false); return; }
      try {
        const {cloudLogin, cloudServices} = await import('./cloudSync');
        if (!cloudServices().auth.currentUser) await cloudLogin();
        setLive(true);
      } catch (error) {
        setLoginError(error instanceof Error ? error.message : "Google 登入失敗。");
      }
    }}>{live ? "切回模擬評量" : "登入 Google 並使用正式 API"}</button>
    {loginError && <p role="alert">{loginError}</p>}
    <SentencePractice fixedCharacter lessonTitle={lesson.title} simulated={!live} request={live ? sentenceRequest : previewRequest} key={selected} initialCard={{phrase:selected, character:selected}} onBack={()=>{location.hash='';}} />
  </main>;
}
