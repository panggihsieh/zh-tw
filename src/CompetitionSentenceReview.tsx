import { useEffect, useState } from 'react';
import { competitionRequest } from './competitionApi';
import { scorePercent, suggestionTextParts, type SentenceStatisticQuestion } from './competitionSentenceStatistics';
import './competitionSentenceStatistics.css';

interface SummaryAnswer { name: string; seat: number | null; qualityScore: number | null; feedback: string }
interface Group { character: string; count: number; highest: SummaryAnswer[]; lowest: SummaryAnswer[]; missingHistory: number; unanswered: number }

function WordText({ text, word }: { text: string; word: string }) {
  if (!word || !text.includes(word)) return <>{text}</>;
  return <>{text.split(word).map((part, index) => <span key={index}>{index > 0 && <strong className="sentence-stat-red">{word}</strong>}{part}</span>)}</>;
}

export function SentenceStatisticsTable({ question }: { question: SentenceStatisticQuestion }) {
  return <div className="sentence-stat-scroll" role="region" aria-label={`第 ${question.questionIndex + 1} 題學生作答表`} tabIndex={0}>
    <table className="sentence-stat-table"><caption>第 {question.questionIndex + 1} 題「{question.character}」 · {question.reading} · {question.rows.length} 位學生</caption>
      <thead><tr><th scope="col">學生／狀態</th><th scope="col">學生原回答（語詞紅字）</th><th scope="col">各項評分與百分比</th><th scope="col">總分</th><th scope="col">當次 AI 評語</th><th scope="col">AI 建議造詞／造句（新增文字紅字）</th></tr></thead>
      <tbody>{question.rows.map(row => {
        const total = (row.items || []).reduce((sum, item) => sum + item.points, 0);
        const answered = row.status === 'graded' || row.status === 'pending';
        const state = { graded: '已評分', pending: 'AI 評分待確認', unanswered: '未作答', 'missing-history': '舊紀錄未保存回答' }[row.status];
        return <tr key={row.id}><th scope="row">{row.seat ? `${row.seat} 號 ` : ''}{row.name}<small>{state}</small></th>
          <td>{answered ? <><p className="sentence-stat-answer"><WordText text={row.sentence || ''} word={row.word || question.character}/></p>{!row.word && <small>未確認或未保存完整語詞，僅標示指定字。</small>}</> : '—'}</td>
          <td>{answered ? <ul className="sentence-stat-items">{row.items?.map(item => <li key={item.key}><strong>{item.label}</strong><small>配分占 {scorePercent(item.points, total)}</small><span>{item.score ?? '—'}／{item.points} 分</span><small>得分率 {item.score == null ? '—' : scorePercent(item.score, item.points)}</small>{item.evidence && <small>依據：{item.evidence}</small>}</li>)}</ul> : '—'}</td>
          <td>{answered ? <><strong>造句品質：{row.status === 'pending' ? '待確認' : `${row.qualityScore ?? '—'}／100`}</strong><p>競賽得分：{row.points ?? '—'}{row.competitionMaximum != null && `／${row.competitionMaximum}`}</p>{row.timedOut && <small>逾時：競賽得分為 0，品質分保留。</small>}{row.targetOk === false && <small>指定字詞使用未通過，整題品質分為 0。</small>}</> : '—'}</td>
          <td>{answered ? <>{row.feedback || '未保存評語'}{row.issueReason && <p className="sentence-stat-red">{row.issueReason}</p>}</> : '—'}</td>
          <td>{answered && row.polished ? <>{row.suggestedWord && <p>建議語詞：<WordText text={row.suggestedWord} word={row.suggestedWord !== row.word ? row.suggestedWord : ''}/></p>}<p className="sentence-stat-answer">{suggestionTextParts(row.sentence || '', row.polished).map((part, index) => <span key={index} className={part.added ? 'sentence-stat-red' : undefined}>{part.text}</span>)}</p>{row.polished === row.sentence && <small>AI 建議保留原句。</small>}</> : answered ? '此筆紀錄未保存 AI 建議句，未重新呼叫 AI。' : '—'}</td>
        </tr>;
      })}</tbody>
    </table>
    {!question.rows.length && <p>沒有符合條件的學生紀錄。</p>}
  </div>;
}

export default function CompetitionSentenceReview({ roomId, request = competitionRequest }: { roomId: string; request?: typeof competitionRequest }) {
  const [report, setReport] = useState<{ groups: Group[]; questions?: SentenceStatisticQuestion[] } | null>(null);
  const [error, setError] = useState(''), [reload, setReload] = useState(0), [selected, setSelected] = useState('all'), [student, setStudent] = useState('');
  useEffect(() => {
    let active = true; setReport(null); setError(''); setSelected('all'); setStudent('');
    void request<{ groups: Group[]; questions: SentenceStatisticQuestion[] }>(`/rooms/${roomId}/sentence-review`).then(value => { if (active) { setReport(value); setSelected(value.questions?.length ? String(value.questions[0].questionIndex) : 'all'); } }).catch(error => { if (active) setError(error.message); });
    return () => { active = false; };
  }, [roomId, request, reload]);
  return <section className="competition-sentence-review"><h2>生字造詞／造句逐題統計</h2>
    <p>每題逐一列出學生原回答、當次配分與得分率，以及已保存的 AI 建議。紅字表示原回答的目標語詞，或建議句新增／替換的文字；評語供教師覆核。</p>
    <p>新開造詞競賽每題滿分 1000 分（品質分 × 10）；歷史紀錄保留當次計分。配分占比＝該項滿分／全部配分；得分率＝該項得分／該項滿分。未作答及缺漏紀錄不視為零分。</p>
    {error && <p role="alert">{error}</p>}<button type="button" className="secondary" onClick={() => setReload(value => value + 1)}>重新載入分析</button>
    {!report && !error && <p role="status">正在載入造句紀錄…</p>}
    {report?.questions && <><div className="sentence-stat-filters"><label>題目<select value={selected} onChange={event => setSelected(event.target.value)}><option value="all">全部題目</option>{report.questions.map(question => <option key={question.questionIndex} value={String(question.questionIndex)}>第 {question.questionIndex + 1} 題「{question.character}」</option>)}</select></label><label>搜尋學生<input value={student} onChange={event => setStudent(event.target.value)} placeholder="姓名或座號"/></label></div>
      {report.questions.filter(question => selected === 'all' || selected === String(question.questionIndex)).map(question => <SentenceStatisticsTable key={question.questionIndex} question={{ ...question, rows: question.rows.filter(row => !student.trim() || row.name.includes(student.trim()) || String(row.seat ?? '') === student.trim()) }}/>)}</>}
    {report && !report.questions && <p role="status">伺服器尚未提供全員逐題資料，請更新後端後重新載入。</p>}
    {report && <details><summary>逐字最高／最低分摘要</summary>{report.groups.map(group => <article key={group.character}><h3>「{group.character}」 · {group.count} 筆回答</h3><p>最高分：{group.highest.map(row => `${row.name} ${row.qualityScore} 分`).join('、') || '尚無已確認評分'}</p><p>最低分：{group.lowest.map(row => `${row.name} ${row.qualityScore} 分`).join('、') || '尚無已確認評分'}</p>{group.missingHistory > 0 && <p>缺少逐題舊紀錄：{group.missingHistory} 筆</p>}<p>未作答：{group.unanswered} 題次</p></article>)}</details>}
  </section>;
}
