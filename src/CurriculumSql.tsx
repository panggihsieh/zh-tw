import { useState } from "react";
import initSqlJs from "sql.js";
import wasm from "sql.js/dist/sql-wasm.wasm?url";
import database from "./lessonSeven.sqlite?url";
import { quizRequest } from "./quizApi";
import { compileCurriculumQuery, normalizeCurriculumPlan, type CurriculumEntity, type CurriculumQueryPlan } from "./curriculumQuery";

const examples = {
  生字: "SELECT l.title, c.glyph, c.reading, c.definition, c.source FROM lesson_characters c JOIN lessons l ON l.id = c.lesson_id ORDER BY c.position LIMIT 200",
  課文: "SELECT l.title, v.revision, p.position, p.text, v.source_url FROM passages p JOIN text_versions v ON v.id = p.text_version_id JOIN lessons l ON l.id = v.lesson_id ORDER BY l.id, v.revision, p.position LIMIT 200",
  語詞: "SELECT l.title, w.text, lw.meaning, lw.source FROM lesson_words lw JOIN lessons l ON l.id = lw.lesson_id JOIN words w ON w.id = lw.word_id LIMIT 200",
  修辭: "SELECT * FROM rhetoric LIMIT 200",
  文意: "SELECT * FROM interpretations LIMIT 200",
  形聲字永久資料: "SELECT glyph, semantic_component, phonetic_component, status, source_url, first_recorded_at FROM character_etymologies ORDER BY glyph LIMIT 200",
  形聲字查核進度: "SELECT status, COUNT(*) AS total FROM character_etymologies GROUP BY status",
  來源: "SELECT kind, title, url FROM sources ORDER BY kind, title LIMIT 200",
  生字影響範圍: "SELECT * FROM character_impact ORDER BY glyph, publisher, year LIMIT 200",
  語詞影響範圍: "SELECT * FROM word_impact ORDER BY text, publisher, year LIMIT 200",
  資料表: "SELECT name, sql FROM sqlite_schema WHERE type IN ('table', 'view') ORDER BY type, name LIMIT 200",
};
type Result = import("sql.js").QueryExecResult;
const labels: Record<CurriculumEntity, string> = { lesson: "課別", character: "生字", word: "語詞", source: "來源" };

export default function CurriculumSql() {
  const [sql, setSql] = useState(examples.生字), [result, setResult] = useState<Result>(), [status, setStatus] = useState(""), [busy, setBusy] = useState(false), [question, setQuestion] = useState(""), [plan, setPlan] = useState<CurriculumQueryPlan>({ entity: "character" });
  async function execute(query: string, params: Array<string | number> = []) {
    setBusy(true); setResult(undefined); setStatus("");
    try {
      const [engine, response] = await Promise.all([initSqlJs({ locateFile: () => wasm }), fetch(database)]);
      if (!response.ok) throw Error("教材資料庫載入失敗。");
      const db = new engine.Database(new Uint8Array(await response.arrayBuffer()));
      try {
        db.run("PRAGMA query_only = ON");
        const statement = db.prepare(query);
        try {
          if (params.length) statement.bind(params);
          const columns = statement.getColumnNames(), values = [];
          while (values.length < 200 && statement.step()) values.push(statement.get());
          setResult({ columns, values }); setStatus(values.length === 200 ? "顯示前 200 筆" : `查到 ${values.length} 筆`);
        } finally { statement.free(); }
      } finally { db.close(); }
    } catch (error) { setStatus(error instanceof Error ? error.message : "查詢失敗。"); }
    finally { setBusy(false); }
  }
  async function runPlan(nextPlan = plan) {
    const normalized = normalizeCurriculumPlan(nextPlan), compiled = compileCurriculumQuery(normalized);
    setPlan(normalized); setSql(compiled.sql); await execute(compiled.sql, compiled.params);
  }
  async function askAi() {
    if (!question.trim()) return setStatus("請先輸入要查詢的教材問題。");
    setBusy(true); setStatus("AI 正在整理安全查詢條件…");
    try {
      const next = normalizeCurriculumPlan(await quizRequest<CurriculumQueryPlan>("/database-query-plan", { question: question.trim() }));
      setPlan(next); await runPlan(next);
      setStatus((current) => `${next.explanation ? `${next.explanation}；` : ""}${current}`);
    } catch (error) { setStatus(error instanceof Error ? error.message : "AI 查詢規劃失敗。"); setBusy(false); }
  }
  function runRawSql() {
    const trimmed = sql.trim();
    if (!/^SELECT\b/i.test(trimmed) || trimmed.includes(";") || /--|\/\*|\b(?:ATTACH|DETACH|PRAGMA|INSERT|UPDATE|DELETE|DROP|ALTER|CREATE|REPLACE|VACUUM)\b/i.test(trimmed)) {
      setStatus("進階查詢只允許單一 SELECT，不接受註解、分號或資料庫修改指令。"); return;
    }
    void execute(trimmed);
  }
  return <section className="curriculum-query">
    <h2>AI 教材關聯查詢</h2>
    <p>關聯路徑：出版社版本 → 課別 → 生字／語詞 → 課文位置 → 修辭／文意 → 官方來源。AI 只產生白名單查詢條件，實際查詢由參數化 SQL 執行，不允許模型寫入資料庫。</p>
    <div className="quiz-grid"><label>自然語言查詢<input value={question} maxLength={500} placeholder="例如：查南一 115 學年度五上第七課的生字與官方來源" onChange={(event) => setQuestion(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") void askAi(); }} /></label><button type="button" className="primary" disabled={busy || !question.trim()} onClick={() => void askAi()}>AI 產生條件並查詢</button></div>
    <fieldset><legend>安全關聯條件</legend><div className="quiz-grid">
      <label>查詢類型<select value={plan.entity} onChange={(event) => setPlan({ ...plan, entity: event.target.value as CurriculumEntity })}>{Object.entries(labels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      <label>出版社<input value={plan.publisher || ""} onChange={(event) => setPlan({ ...plan, publisher: event.target.value })} placeholder="南一／康軒／翰林" /></label>
      <label>學年度<input value={plan.year || ""} onChange={(event) => setPlan({ ...plan, year: event.target.value })} placeholder="115_1" /></label>
      <label>年級<input type="number" min={1} max={6} value={plan.grade || ""} onChange={(event) => setPlan({ ...plan, grade: event.target.value ? Number(event.target.value) : undefined })} /></label>
      <label>學期<select value={plan.term || ""} onChange={(event) => setPlan({ ...plan, term: event.target.value ? event.target.value as "上" | "下" : undefined })}><option value="">全部</option><option>上</option><option>下</option></select></label>
      <label>課別<input value={plan.lessonTitle || ""} onChange={(event) => setPlan({ ...plan, lessonTitle: event.target.value })} placeholder="第七課" /></label>
      <label>關鍵字<input value={plan.keyword || ""} onChange={(event) => setPlan({ ...plan, keyword: event.target.value })} placeholder="生字、讀音、詞義或來源" /></label>
    </div><button type="button" className="secondary" disabled={busy} onClick={() => void runPlan()}>執行關聯查詢</button></fieldset>
    <details><summary>進階唯讀 SQL</summary><p>僅供管理者查核；最多顯示 200 筆。</p><div className="quiz-actions">{Object.entries(examples).map(([label, query]) => <button type="button" className="secondary" key={label} onClick={() => setSql(query)}>{label}</button>)}</div><label>唯讀 SQL<textarea rows={5} value={sql} onChange={(event) => setSql(event.target.value)} /></label><button type="button" className="secondary" disabled={busy} onClick={runRawSql}>執行 SQL</button></details>
    <p role="status">{status}</p>
    {result && <div style={{ overflowX: "auto" }}><table><thead><tr>{result.columns.map((column, index) => <th key={index}>{column}</th>)}</tr></thead><tbody>{result.values.map((row, index) => <tr key={index}>{row.map((value, cell) => <td key={cell}>{String(value ?? "")}</td>)}</tr>)}</tbody></table></div>}
  </section>;
}
