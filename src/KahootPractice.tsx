import { useState } from 'react';
import SentencePractice from './SentencePractice';
import lesson from './lessonSevenPilot.json';
import {previewRequest} from './kahootPreview';
import {sentenceRequest} from './sentenceApi';
import './competition.css';

const testRows = lesson.rows.filter(item => ["際", "璃", "磁"].includes(item.character));
const spokenExamples: Record<string, string> = {
  際: "我們參加了國際交流活動。",
  璃: "陽光透過玻璃窗照進教室。",
  磁: "我用磁鐵把照片貼在冰箱上。",
};

export default function KahootPractice() {
  const [selected, setSelected] = useState(testRows[0].character);
  const [live, setLive] = useState(false);
  const [testInput, setTestInput] = useState({ sentence: "", revision: 0 });
  const [loginError, setLoginError] = useState("");
  const row = testRows.find(item => item.character === selected)!;
  return <main className="competition-admin" style={{maxWidth: 960, margin: '24px auto', padding: '0 16px'}}>
    <a href="#">返回首頁</a>
    <h1>一字多詞 Kahoot Ver.2</h1>
    <p>南一 · 五年級上學期 · {lesson.title}</p>
    <fieldset className="practice-character-picker">
      <legend>點選練習生字</legend>
      {testRows.map(item => (
        <button type="button" key={item.character} aria-pressed={selected === item.character}
          className={selected === item.character ? 'primary' : 'secondary'}
          onClick={() => {
            if (selected === item.character) return;
            setSelected(item.character);
            setTestInput({ sentence: "", revision: 0 });
          }}>{item.character}</button>
      ))}
    </fieldset>
    <p>{live ? "正式 API 評量" : "模擬評量"} · 讀音 {row.reading || '待核對'}</p>
    <button type="button" className="secondary" disabled={!window.speechSynthesis} onClick={() => {
      const speech = new SpeechSynthesisUtterance(spokenExamples[selected]);
      speech.lang = "zh-TW";
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(speech);
    }}>TTS 朗讀測試句</button>
    <button type="button" className="secondary" onClick={() => setTestInput(previous => ({
      sentence: spokenExamples[selected],
      revision: previous.revision + 1,
    }))}>帶入 TTS 測試句</button>
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
    <SentencePractice fixedCharacter simulated={!live} request={live ? sentenceRequest : previewRequest} key={`${selected}-${testInput.revision}`} initialCard={{phrase:selected, character:selected, sentence:testInput.sentence}} onBack={()=>{location.hash='';}} />
  </main>;
}
