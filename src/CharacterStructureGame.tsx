import { simpleStructure } from './StructureAssignment';
import { useEffect, useState } from 'react';
import { RotateCcw, Shapes } from 'lucide-react';
import './characterStructureGame.css';

const questions = [
  { character: '街', structure: '左中右', parts: ['彳', '圭', '亍'], explanation: '三個部件由左到右排列。' },
  { character: '意', structure: '上中下', parts: ['立', '日', '心'], explanation: '三個部件由上到下排列。' },
  { character: '近', structure: '半包圍', parts: ['辶', '斤'], explanation: '走之從左下包住斤。' },
  { character: '山', structure: '獨體', parts: ['山'], explanation: '山在本題作為一個整體辨識。' },
  { character: '森', structure: '品字形', parts: ['木', '木', '木'], explanation: '上方一個木，下方兩個木。' },
  { character: '林', structure: '左右', parts: ['木', '木'], explanation: '兩個「木」左右並排，合成「林」。' },
  { character: '明', structure: '左右', parts: ['日', '月'], explanation: '「日」在左，「月」在右。' },
  { character: '休', structure: '左右', parts: ['亻', '木'], explanation: '左邊是人字旁「亻」，右邊是「木」。' },
  { character: '駛', structure: '左右', parts: ['馬', '史'], explanation: '左邊是「馬」，右邊是「史」。' },
  { character: '蕾', structure: '上下', parts: ['艹', '雷'], explanation: '草字頭「艹」在上，「雷」在下。' },
  { character: '斧', structure: '上下', parts: ['父', '斤'], explanation: '「父」在上，「斤」在下。' },
  { character: '思', structure: '上下', parts: ['田', '心'], explanation: '「田」在上，「心」在下。' },
  { character: '苗', structure: '上下', parts: ['艹', '田'], explanation: '草字頭「艹」在上，「田」在下。' },
  { character: '回', structure: '全包圍', parts: ['囗', '口'], explanation: '外框「囗」從四周包住裡面的「口」。' },
  { character: '困', structure: '全包圍', parts: ['囗', '木'], explanation: '外框「囗」從四周包住裡面的「木」。' },
  { character: '因', structure: '全包圍', parts: ['囗', '大'], explanation: '外框「囗」從四周包住裡面的「大」。' },
  { character: '固', structure: '全包圍', parts: ['囗', '古'], explanation: '外框「囗」從四周包住裡面的「古」。' },
];
const choices = ['左右', '上下', '左中右', '上中下', '全包圍', '半包圍', '獨體', '品字形'];
function newRound() {
  const items = [...questions];
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items.filter((item, index) => items.findIndex(other => other.structure === item.structure) === index);
}
export default function CharacterStructureGame({ onBack }: { onBack: () => void }) {
  const [round, setRound] = useState(newRound);
  const assignment = location.hash.split('/')[2];
  const [loading, setLoading] = useState(Boolean(assignment));
  const [error, setError] = useState("");
  useEffect(() => {
    if (!assignment) return;
    let active = true;
    void fetch(import.meta.env.BASE_URL + "structure-review/ids-catalog.json")
      .then(response => { if (!response.ok) throw Error(); return response.json(); })
      .then((ids: Record<string,string>) => {
        const items = [...new Set(decodeURIComponent(assignment))].slice(0,8).flatMap(character => {
          const parsed = simpleStructure(ids[character]);
          return parsed ? [{ character, ...parsed, explanation: "部件拆解依字形資料，供練習參考。" }] : [];
        });
        if (!items.length) throw Error();
        if (active) setRound(items);
      })
      .catch(() => { if (active) setError("這份練習沒有可用題目。"); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [assignment]);
  const [answers, setAnswers] = useState<string[]>([]);
  const [index, setIndex] = useState(0);
  const done = index === round.length;
  const current = round[index];
  const chosen = answers[index];
  const score = answers.filter((answer, i) => answer === round[i].structure).length;
  function restart() { if (!assignment) setRound(newRound()); setAnswers([]); setIndex(0); }
  return <section className="structure-game">
    <button className="secondary" onClick={onBack}>返回遊戲專區</button>
    <h1><Shapes aria-hidden="true" /> 生字結構遊戲</h1>
    <p>看一看，這個字的部件是怎麼排在一起的？</p>
    <p>{assignment ? "老師選定的生字 · 左右、上下與全包圍" : "自由練習每回合涵蓋八大結構。"}</p>
    {loading ? <p role="status">載入題目中…</p> : error ? <p role="alert">{error}</p> : done ? <>
      <h2>完成了！答對 {score}／{round.length} 題</h2>
      <p>再看看這一回合的字，認識部件的位置。</p>
      <ul>{round.map((q, i) => <li key={q.character}>{q.character}：{q.structure}結構 · {answers[i] === q.structure ? '答對了' : `你選了${answers[i]}`}。{q.explanation}</li>)}</ul>
      <button className="primary" onClick={restart}><RotateCcw size={18} /> 再玩一次</button>
    </> : <>
      <p>第 {index + 1}／{round.length} 題 · 目前答對 {score} 題</p>
      <div className="structure-game-character" aria-label={`題目：${current.character}`}>{current.character}</div>
      <fieldset disabled={chosen !== undefined}><legend>選出這個字的結構</legend>
        <div className="structure-game-choices">{choices.map(choice => <button key={choice} className={chosen === choice ? 'primary' : 'secondary'} onClick={() => setAnswers([...answers, choice])}>{choice}結構</button>)}</div>
      </fieldset>
      {chosen !== undefined && <div className="structure-game-feedback" role="status">
        <h2>{chosen === current.structure ? '答對了！' : '再認識一次！'}這是{current.structure}結構。</h2>
        <div className={`structure-game-parts ${current.structure === '上下' ? 'vertical' : ''}`} aria-label="部件拆解">{current.parts.join(current.structure.endsWith('包圍') ? ' 包住 ' : ' ＋ ')}</div>
        <p>{current.explanation}</p><p>這裡說明部件位置；部件大小以完整字形為準。</p>
        <button className="primary" onClick={() => setIndex(index + 1)}>{index === round.length - 1 ? '查看成績' : '下一題'}</button>
      </div>}
    </>}
  </section>;
}
