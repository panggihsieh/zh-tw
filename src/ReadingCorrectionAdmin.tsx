import { useEffect, useState } from 'react';
import type { SentenceLesson } from './sentenceApi';
import { loadReadingCorrections, readingKey, removeReadingCorrection, saveReadingCorrection } from './readingCorrections';
import './readingCorrections.css';

export default function ReadingCorrectionAdmin() {
  const [lessons, setLessons] = useState<SentenceLesson[]>([]);
  const [lessonId, setLessonId] = useState('4e8f9e56339c04e8');
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState<Record<string, string>>({});
  const [words, setWords] = useState<Record<string, string>>({});
  const [savedWords, setSavedWords] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false), [message, setMessage] = useState('');
  useEffect(() => { let active = true;
    Promise.all([fetch(`${import.meta.env.BASE_URL}sentence-bank.json`).then(response => {
      if (!response.ok) throw Error('課文生字庫載入失敗'); return response.json();
    }), loadReadingCorrections()]).then(([bank, corrections]) => {
      if (!active) return;
      setLessons(bank.lessons);
      const values = Object.fromEntries(corrections.map(value => [readingKey(value.lessonId, value.character), value.reading]));
      setDrafts(values); setSaved(values);
      const context = Object.fromEntries(corrections.map(value => [readingKey(value.lessonId, value.character), value.contextWord || ""]));
      setWords(context); setSavedWords(context);
    }).catch(error => { if (active) setMessage(error.message); });
    return () => { active = false; };
  }, []);
  const lesson = lessons.find(row => row.id === lessonId);
  async function persist(character: string, reset = false) {
    const key = readingKey(lessonId, character), reading = (drafts[key] || lesson?.characters.find(row => row.character === character)?.readings[0]?.reading || '').trim();
    setBusy(true); setMessage('');
    try {
      if (reset) await removeReadingCorrection(lessonId, character);
      else await saveReadingCorrection({ lessonId, character, reading, contextWord: (words[key] || "").trim() });
      setSavedWords(values => ({ ...values, [key]: reset ? "" : (words[key] || "").trim() }));
      if (reset) setWords(values => ({ ...values, [key]: "" }));
      setSaved(values => { const next = { ...values }; if (reset) delete next[key]; else next[key] = reading; return next; });
      if (reset) setDrafts(values => { const next = { ...values }; delete next[key]; return next; });
      setMessage(`「${character}」${reset ? '已恢復原始設定' : '已儲存修正'}。重新進入開課頁並產生新題目即可套用；既有課堂與成績不變。`);
    } catch (error) { setMessage(error instanceof Error ? error.message : '儲存失敗，請重試。'); }
    finally { setBusy(false); }
  }
  return <section className="panel"><h2>課文生字讀音修正</h2>
    <p>供生字造詞／一字多詞 AI 造句遊戲使用。依課別指定單字讀音，保留其他課文的多音字讀法。第一聲不加調號。管理者與已啟用教師皆可修改；同課共用，僅套用新題目。課文語詞會直接顯示在學生螢幕，留空則不提示。</p>
    <label>選擇課文<select value={lessonId} disabled={busy} onChange={event => setLessonId(event.target.value)}>{lessons.map(row => <option key={row.id} value={row.id}>{row.grade}{row.term} · {row.title}（{row.year}）</option>)}</select></label>
    <p role="status">{message}</p>
    <div className="reading-correction-grid">{lesson?.characters.map(row => {
      const key = readingKey(lessonId, row.character);
      return <article key={key}><h3>{row.character}</h3><p>原始候選：{row.readings.map(value => value.reading).join('／')}</p>
        <label>本課指定注音<input aria-label={`${row.character}修正注音`} disabled={busy} value={drafts[key] ?? ''} placeholder={row.readings[0]?.reading} onChange={event => setDrafts(values => ({ ...values, [key]: event.target.value }))}/></label>
        <label>課文語詞（學生提示）<input aria-label={`${row.character}課文語詞`} disabled={busy} maxLength={8} value={words[key] ?? ""} placeholder={`例如：${row.character === "藉" ? "藉由" : "包含此字的課文語詞"}`} onChange={event => setWords(values => ({ ...values, [key]: event.target.value }))}/></label>
        <p>{savedWords[key] ? `學生提示：${savedWords[key]}` : "未設定語詞提示"}{(words[key] || "") !== (savedWords[key] || "") ? " · 語詞尚未儲存" : ""}</p>
        <p>{saved[key] ? `已儲存：${saved[key]}` : '使用原始讀音'}{drafts[key] !== saved[key] && drafts[key] ? ' · 尚未儲存' : ''}</p>
        <button className="primary" disabled={busy || !(drafts[key]?.trim() || row.readings[0]?.reading)} onClick={() => void persist(row.character)}>儲存此字</button>
        <button className="secondary" disabled={busy || !saved[key]} onClick={() => void persist(row.character, true)}>恢復原始設定</button>
      </article>;
    })}</div>
  </section>;
}
