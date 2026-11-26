import {quizRequest} from './quizApi';
import { useEffect, useState } from 'react';
import type { SentenceLesson } from './sentenceApi';
import { loadReadingCorrections, readingKey, removeReadingCorrection, saveReadingCorrection, saveAutomaticReadingCorrection } from './readingCorrections';
import './readingCorrections.css';

export default function ReadingCorrectionAdmin() {
  const [lessons, setLessons] = useState<SentenceLesson[]>([]);
  const [lessonId, setLessonId] = useState('4e8f9e56339c04e8');
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState<Record<string, string>>({});
  const [words, setWords] = useState<Record<string, string>>({});
  const [savedWords, setSavedWords] = useState<Record<string, string>>({});
  const [unlocked,setUnlocked]=useState<Record<string,boolean>>({});
  const [issues,setIssues]=useState<Record<string,string>>({});
  const [passage,setPassage]=useState(''),[confirmed,setConfirmed]=useState(false);
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
      setUnlocked(values=>({...values,[key]:false}));
      setMessage(`「${character}」${reset ? '已恢復原始設定' : '已儲存修正'}。重新進入開課頁並產生新題目即可套用；既有課堂與成績不變。`);
    } catch (error) { setMessage(error instanceof Error ? error.message : '儲存失敗，請重試。'); }
    finally { setBusy(false); }
  }
  async function autoFill(){
    setBusy(true);setMessage('AI正在依課文比對圈詞、候選注音及原文依據，請稍候…');
    try{
      const result=await quizRequest<{source:string;rows:{character:string;reading?:string;contextWord?:string;status:string;reason?:string}[]}>('/reading-context',{lessonId,...(confirmed?{passage}:{})});
      let count=0,pending=0;
      for(const row of result.rows){const key=readingKey(lessonId,row.character);if(row.status!=='ready'||!row.reading||!row.contextWord){setIssues(v=>({...v,[key]:row.reason||'待確認'}));pending++;continue;}
        const value=await saveAutomaticReadingCorrection({lessonId,character:row.character,reading:row.reading,contextWord:row.contextWord});
        setDrafts(v=>({...v,[key]:value.reading}));setSaved(v=>({...v,[key]:value.reading}));setWords(v=>({...v,[key]:value.contextWord||''}));setSavedWords(v=>({...v,[key]:value.contextWord||''}));setUnlocked(v=>({...v,[key]:false}));
        setIssues(v=>({...v,[key]:!value.contextWord?'已保留教師指定讀音，圈詞請解鎖確認。':''}));count++;
      }
      setMessage(`已處理${count}字並鎖定，${pending}字待確認。來源：${result.source}。保留老師既有設定，AI判讀仍可解鎖核對。`);
    }catch(error){setMessage(error instanceof Error?error.message:'AI帶入失敗；已保存的項目會保留。');}finally{setBusy(false);}
  }
  return <section className="panel"><h2>課文生字讀音修正</h2>
    <p>供生字造詞／一字多詞 AI 造句遊戲使用。依課別指定單字讀音，保留其他課文的多音字讀法。第一聲不加調號。管理者與已啟用教師皆可修改；同課共用，僅套用新題目。課文圈詞可附在新產生的考題，供學生參考，留空則不提示。</p>
    <label>選擇課文<select value={lessonId} disabled={busy} onChange={event => {setLessonId(event.target.value);setPassage('');setConfirmed(false);}}>{lessons.map(row => <option key={row.id} value={row.id}>{row.grade}{row.term} · {row.title}（{row.year}）</option>)}</select></label>
    <p>可使用AI依已匯入的本課全文帶入圈詞與注音，先生成再核對；通過項目自動保存並鎖定，不覆寫老師已儲存的圈詞或不同讀音。AI不確定的字請解鎖確認。</p>
    <details><summary>本課尚未匯入全文時，貼上課文</summary><textarea aria-label="本課全文" maxLength={12000} rows={6} disabled={busy} value={passage} onChange={e=>{setPassage(e.target.value);setConfirmed(false);}}/><label><input type="checkbox" disabled={busy||!passage.trim()} checked={confirmed} onChange={e=>setConfirmed(e.target.checked)}/>已確認是本課完整課文及正確版本</label></details>
    <button type="button" className="primary" disabled={busy||!lesson||!!passage&&!confirmed} onClick={()=>void autoFill()}>AI依課文帶入圈詞與注音</button>
    <p role="status">{message}</p>
    <div className="reading-correction-grid">{lesson?.characters.map(row => {
      const key = readingKey(lessonId, row.character);
      return <article key={key}><h3>{row.character}</h3><p>原始候選：{row.readings.map(value => value.reading).join('／')}</p>
        <label>本課指定注音<input aria-label={`${row.character}修正注音`} disabled={busy||!unlocked[key]} value={drafts[key] ?? ''} placeholder={row.readings[0]?.reading} onChange={event => setDrafts(values => ({ ...values, [key]: event.target.value }))}/></label>
        <label>課文圈詞（學生提示）<input aria-label={`${row.character}課文語詞`} disabled={busy||!unlocked[key]} maxLength={8} value={words[key] ?? ""} placeholder={`例如：${row.character === "藉" ? "藉由" : "包含此字的課文語詞"}`} onChange={event => setWords(values => ({ ...values, [key]: event.target.value }))}/></label>
        <p>{savedWords[key] ? `學生提示：${savedWords[key]}` : "圈詞待補"}{(words[key] || "") !== (savedWords[key] || "") ? " · 語詞尚未儲存" : ""}</p>
        <p>{saved[key] ? `已儲存：${saved[key]}` : '使用原始讀音'}{drafts[key] !== saved[key] && drafts[key] ? ' · 尚未儲存' : ''}</p>
        <p>{issues[key]||(!unlocked[key]?'已鎖定；有問題再解鎖修改。':'修改中，儲存後重新鎖定。')}</p>
        <button type="button" className="secondary" disabled={busy} onClick={()=>{if(unlocked[key]){setDrafts(v=>({...v,[key]:saved[key]||''}));setWords(v=>({...v,[key]:savedWords[key]||''}));}setUnlocked(v=>({...v,[key]:!v[key]}));}}>{unlocked[key]?'取消修改並鎖定':'有問題，解鎖修改'}</button>
        <button className="primary" disabled={busy || !unlocked[key] || !(drafts[key]?.trim() || row.readings[0]?.reading)} onClick={() => void persist(row.character)}>儲存此字</button>
        <button className="secondary" disabled={busy || !unlocked[key] || !saved[key]} onClick={() => void persist(row.character, true)}>恢復原始設定</button>
      </article>;
    })}</div>
  </section>;
}
