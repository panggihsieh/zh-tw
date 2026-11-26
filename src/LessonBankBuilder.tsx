import QuizAuthoringTip from './QuizAuthoringTip';
import {useEffect,useRef,useState} from 'react';
import {FileText,SlidersHorizontal,Database} from 'lucide-react';
import blueprint from '../server/quiz-blueprint.json';
import {quizRequest} from './quizApi';
import {importQuizSource,runQuizWorkflow,downloadQuizBank,type LessonBank,type QuizSource,type QuizSourceSummary,type QuizWorkflowParameters} from './quizWorkflow';
export default function LessonBankBuilder({request=quizRequest,onOpen}:{request?:typeof quizRequest;onOpen:(id:string)=>void}) {
  const [banks,setBanks]=useState<LessonBank[]>([]),[sources,setSources]=useState<QuizSourceSummary[]>([]),[source,setSource]=useState<QuizSource|null>(null);
  const [lessonKey,setLessonKey]=useState(blueprint.lessons[0].key),[selectedBank,setSelectedBank]=useState(''),[bookFilter,setBookFilter]=useState(''),[step,setStep]=useState(0);
  const [fileSourceUrl,setFileSourceUrl]=useState('');
  const [sourceMode,setSourceMode]=useState<'library'|'file'|'link'|'text'>('library'),[link,setLink]=useState(''),[passage,setPassage]=useState(''),[sourceLabel,setSourceLabel]=useState(''),[confirmed,setConfirmed]=useState(false);
  const [categories,setCategories]=useState(blueprint.plan.map(r=>r.category)),[difficulty,setDifficulty]=useState('中'),[outputTitle,setOutputTitle]=useState(''),[outputFormat,setOutputFormat]=useState<'cloud'|'cloud-json'>('cloud');
  const [busy,setBusy]=useState(false),[message,setMessage]=useState(''),[loaded,setLoaded]=useState(false);
  const stop=useRef(false);
  const sorted=[...banks].sort((a,b)=>b.createdAt.localeCompare(a.createdAt));
  const latest=(key:string)=>sorted.find(b=>b.lessonKey===key);
  const current=banks.find(b=>b.id===selectedBank&&b.lessonKey===lessonKey)||latest(lessonKey);
  const lesson=blueprint.lessons.find(l=>l.key===lessonKey)!;
  const sourceLesson=source?.lessons.find(l=>l.lessonKey===lessonKey);
  const selectedPassage=sourceMode==='text'?passage:sourceLesson?.passage||'';
  const ready=loaded&&confirmed&&selectedPassage.trim().length>=20&&(sourceMode!=='text'||!!sourceLabel.trim());
  const books=[...new Set(blueprint.lessons.map(l=>`${l.grade}${l.term}（${l.year}）`))];
  const lessons=blueprint.lessons.filter(l=>!bookFilter||`${l.grade}${l.term}（${l.year}）`===bookFilter);
  const actual=blueprint.lessons.reduce((n,l)=>n+(latest(l.key)?.total||0),0);
  const selectedTarget=blueprint.plan.filter(r=>categories.includes(r.category)).reduce((n,r)=>n+r.count,0);
  async function refresh(){const [b,s]=await Promise.all([request<{items:LessonBank[]}>('/lesson-banks'),request<{items:QuizSourceSummary[]}>('/quiz-sources')]);setBanks(b.items);setSources(s.items);setLoaded(true);}
  useEffect(()=>{void refresh().catch(e=>setMessage(e.message));return()=>{stop.current=true;};},[]);
  function changeLesson(key:string){setLessonKey(key);setSelectedBank('');setConfirmed(false);setOutputTitle('');setPassage('');}
  function update(bank:LessonBank){setBanks(rows=>[...rows.filter(b=>b.id!==bank.id),bank]);setSelectedBank(bank.id);}
  async function action(fn:()=>Promise<void>){setBusy(true);try{await fn();}catch(e){setMessage((e as Error).message);}finally{setBusy(false);}}
  function acceptSource(doc:QuizSource){setSource(doc);setConfirmed(false);setSources(rows=>[...rows.filter(s=>s.id!==doc.id),doc]);if(!doc.lessons.some(l=>l.lessonKey===lessonKey))changeLesson(doc.lessons[0].lessonKey);setMessage(`已讀取 ${doc.filename}：${doc.lessonCount} 課。請核對課文預覽；尚未呼叫AI。`);}
  async function loadSource(id:string){if(id)await action(async()=>acceptSource(await request<QuizSource>(`/quiz-sources/${id}`)));else{setSource(null);setConfirmed(false);}}
  async function resolveLink(){await action(async()=>{const data=await request<{items:QuizSourceSummary[]}>('/quiz-sources/resolve',{url:link});const preferred=data.items.find(s=>s.grade===lesson.grade&&s.term===lesson.term&&s.year===lesson.year)||data.items[0];setSources(rows=>[...rows.filter(s=>!data.items.some(x=>x.id===s.id)),...data.items]);acceptSource(await request<QuizSource>(`/quiz-sources/${preferred.id}`));});}
  async function create(){await action(async()=>{const parameters:QuizWorkflowParameters={lessonKey,...(sourceMode==='text'?{passage,sourceLabel}:{sourceId:source!.id}),sourceConfirmed:confirmed,difficulty,categories,outputTitle,outputFormat};const bank=await request<LessonBank>('/lesson-banks',parameters);update(bank);setStep(2);setMessage('題庫設定已保存，尚未呼叫AI；可先產生5題確認。');});}
  async function generate(all:boolean){if(!current)return;stop.current=false;await action(async()=>{setMessage('AI正在生成並檢查本批題目…');try{const bank=await runQuizWorkflow({bank:current,categories,all,request,shouldStop:()=>stop.current,onProgress:b=>{update(b);setMessage(`已保存 ${b.total}/55 題；本批通過格式與AI檢查，待教師審核。`);}});if(bank.outputFormat==='cloud-json'&&(bank.complete||bank.selectionComplete))await downloadQuizBank(bank,request);setMessage(bank.complete?'本課55題已保存，待教師審核。':bank.selectionComplete?`所選類型已完成，本課累計 ${bank.total}/55 題。`:`已保存 ${bank.total}/55 題，下次可接續。`);}catch(e){await refresh().catch(()=>{});throw Error(`本批停止：${(e as Error).message}；先前完成批次保留。`);}});}
  const cards=[{title:'教材來源',detail:sourceMode==='text'?(sourceLabel||'檔案、連結或貼上課文'):(source?.filename||`${sources.length} 份已匯入教材`),icon:FileText},{title:'命題設定',detail:`${categories.length} 類 · ${selectedTarget} 題 · ${difficulty==='易'?'低':difficulty==='難'?'高':'中'}難度`,icon:SlidersHorizontal},{title:'輸出題庫',detail:current?`${current.total}/55 題 · 教師待審`:'雲端題庫 · JSON備份',icon:Database}];
  return <section aria-label="試題製作模組">
    <h2>試題製作工作台</h2><QuizAuthoringTip/><p>南一五、六年級 · 每課55題固定配額 · 原創四選一母題</p>
    <div className="quiz-workflow-cards" role="group" aria-label="試題製作步驟">{cards.map((card,i)=><button key={card.title} type="button" className="quiz-workflow-card" aria-pressed={step===i} onClick={()=>setStep(i)}><card.icon size={24}/><span><strong>{i+1}. {card.title}</strong><small>{card.detail}</small></span></button>)}</div>
    <p role="status" aria-live="polite">{message}</p>
    {step===0&&<fieldset disabled={busy}><legend>1. 教材來源</legend>
      <div className="quiz-grid"><label>教材冊次<select value={`${lesson.grade}${lesson.term}（${lesson.year}）`} onChange={e=>changeLesson(blueprint.lessons.find(l=>`${l.grade}${l.term}（${l.year}）`===e.target.value)!.key)}>{books.map(b=><option key={b}>{b}</option>)}</select></label><label>教材課次<select value={lessonKey} onChange={e=>changeLesson(e.target.value)}>{blueprint.lessons.filter(l=>l.grade===lesson.grade&&l.term===lesson.term&&l.year===lesson.year).map(l=><option key={l.key} value={l.key}>{l.title}</option>)}</select></label></div>
      <label>來源輸入方式<select value={sourceMode} onChange={e=>{setSourceMode(e.target.value as typeof sourceMode);setConfirmed(false);}}><option value="library">已匯入教材庫</option><option value="file">上傳檔案</option><option value="link">Google Drive連結</option><option value="text">貼上課文</option></select></label>
      {sourceMode==='file'&&<><label>檔案原始Drive連結（選填）<input type="url" value={fileSourceUrl} onChange={e=>setFileSourceUrl(e.target.value)}/></label><label>課文檔案（DOC、PDF、TXT、MD；最多5MB）<input type="file" accept=".doc,.pdf,.txt,.md" onChange={e=>{const f=e.target.files?.[0];if(f)void action(async()=>acceptSource(await importQuizSource(f,lessonKey,request,fileSourceUrl)));e.target.value='';}}/></label><p>支援整冊Word依課次拆分；文字型PDF最多60頁，掃描PDF須先完成OCR。</p></>}
      {sourceMode==='link'&&<><label>教材檔案或資料夾連結<input type="url" value={link} onChange={e=>setLink(e.target.value)} placeholder="https://drive.google.com/drive/folders/…"/></label><button type="button" className="secondary" disabled={!link.trim()} onClick={()=>void resolveLink()}>讀取已匯入連結</button><p>連結會比對本站已匯入教材；尚未匯入的檔案請先使用「上傳檔案」。</p></>}
      {sourceMode!=='text'&&<label>教材檔案<select value={source?.id||''} onChange={e=>void loadSource(e.target.value)}><option value="">選擇已匯入教材</option>{sources.map(s=><option key={s.id} value={s.id}>{s.grade}{s.term} {s.filename} · {s.lessonCount}課（{s.year}）</option>)}</select></label>}
      {sourceMode==='text'&&<label>課文來源或檔名<input maxLength={300} value={sourceLabel} onChange={e=>{setSourceLabel(e.target.value);setConfirmed(false);}}/></label>}
      <label>{sourceMode==='text'?'課文全文':'所選課文預覽'}<textarea rows={10} maxLength={12000} readOnly={sourceMode!=='text'} value={selectedPassage} onChange={e=>{setPassage(e.target.value);setConfirmed(false);}}/></label>
      {source&&sourceMode!=='text'&&!sourceLesson&&<p role="alert">所選教材不含這一課，請切換教材或課次。</p>}
      <label className="quiz-check"><input type="checkbox" checked={confirmed} disabled={selectedPassage.length<20} onChange={e=>setConfirmed(e.target.checked)}/>已核對課次、版本與完整課文，確認可用於出題</label>
      <button type="button" className="primary" disabled={!ready} onClick={()=>setStep(1)}>下一步：命題設定</button>
    </fieldset>}
    {step===1&&<fieldset disabled={busy}><legend>2. 命題設定</legend><p>{lesson.grade}{lesson.term} {lesson.title}（{lesson.year}）</p><p>固定配額10／15／15／5／5／5。同義題幹不另計；可先選部分類型製作，再接續其他類型。</p>
      <div className="quiz-type-options">{blueprint.plan.map(row=><label key={row.category} className="quiz-check"><input type="checkbox" checked={categories.includes(row.category)} onChange={e=>setCategories(e.target.checked?[...categories,row.category]:categories.filter(c=>c!==row.category))}/><span>{row.category}<small>{row.count} 題</small></span></label>)}</div>
      <div className="quiz-grid"><label>新題庫難度<select value={difficulty} onChange={e=>setDifficulty(e.target.value)}><option value="易">低</option><option value="中">中</option><option value="難">高</option></select></label><label>輸出方式<select value={outputFormat} onChange={e=>setOutputFormat(e.target.value as typeof outputFormat)}><option value="cloud">雲端教師待審題庫</option><option value="cloud-json">雲端待審題庫＋JSON備份</option></select></label></div>
      <label>新題庫名稱（選填）<input value={outputTitle} maxLength={100} placeholder={`${lesson.grade}${lesson.term} ${lesson.title}・55題重編`} onChange={e=>setOutputTitle(e.target.value)}/></label>
      <p>本次選取 {categories.length} 類、{selectedTarget} 題。每批5題，正常生成及AI檢查2次呼叫，疑點最多修正複查各1次；整課最多44次呼叫，可能計費。</p>
      <button className="primary" type="button" disabled={!ready||!categories.length} onClick={()=>void create()}>儲存設定並建立題庫草稿</button>{!ready&&<p>請先在「教材來源」核對全文。</p>}
      {current&&<button className="secondary" type="button" onClick={()=>setStep(2)}>接續現有題庫</button>}
    </fieldset>}
    {step===2&&<section aria-label="題庫輸出"><h3>3. 輸出題庫</h3>{current?<>
      <h4>{current.title}</h4><p>本課保存 {current.total}/55 題；{current.complete?'配額齊備，待教師審核':'可分批接續'}。既有草稿沿用建立時的難度與課文；本次使用「命題設定」勾選的類型。</p>
      {current.lastError&&<p role="alert">上一批未完成：{current.lastError}</p>}
      <div className="quiz-actions"><button className="secondary" disabled={busy||current.complete||!categories.length} onClick={()=>void generate(false)}>產生下一批5題</button><button className="primary" disabled={busy||current.complete||!categories.length} onClick={()=>void generate(true)}>製作所選全部題型</button>{busy&&<button className="secondary" onClick={()=>{stop.current=true;setMessage('本批完成後停止，成功題目會保存。');}}>本批完成後停止</button>}<button className="secondary" disabled={busy||!current.total} onClick={()=>void action(async()=>{await downloadQuizBank(current,request);setMessage('已匯出題庫JSON；題目仍待教師審核。');})}>下載題庫JSON</button></div>
      <div className="quiz-paper-list">{current.paperIds.map((id,i)=><button className="secondary" disabled={busy} key={id} onClick={()=>onOpen(id)}>第{i+1}批 · 檢視與審核</button>)}</div>
      <p>題目保存於教師待審題庫，不會直接派送學生。關閉頁面不啟動後續批次。</p>
    </>:<p>尚無本課新版題庫。請先完成教材來源與命題設定。</p>}</section>}
    <details className="quiz-workflow-inventory"><summary>各課配額與缺額 · {loaded?`${actual}/2475 題`:'讀取中'}</summary>
      <p>配額齊備 {blueprint.lessons.filter(l=>latest(l.key)?.complete).length}/45 課；保存數不等於教師已審核。舊題庫與已發布試卷保留。</p>
      <div className="quiz-actions"><label>進度冊次<select value={bookFilter} onChange={e=>setBookFilter(e.target.value)}><option value="">全部四冊</option>{books.map(b=><option key={b}>{b}</option>)}</select></label><button className="secondary" disabled={busy} onClick={()=>void action(refresh)}>重新讀取進度</button></div>
      <div className="quiz-bank-progress"><table><thead><tr><th>課次</th>{blueprint.plan.map(r=><th key={r.category}>{r.category}</th>)}<th>合計</th><th>狀態</th></tr></thead><tbody>{lessons.map(l=>{const bank=latest(l.key),hasSource=sources.some(s=>s.grade===l.grade&&s.term===l.term&&s.year===l.year&&!s.missing.includes(l.title));return <tr key={l.key}><th scope="row"><button className="secondary" disabled={busy} onClick={()=>{changeLesson(l.key);setStep(bank?2:0);}}>{l.grade}{l.term} {l.title}</button></th>{blueprint.plan.map(row=><td key={row.category}>{loaded?(bank?.rows.find(r=>r.category===row.category)?.actual||0):'—'}/{row.count}</td>)}<td>{loaded?(bank?.total||0):'—'}/55</td><td>{!loaded?'未讀取':bank?.complete?'齊備／待教師審核':bank?'可接續':hasSource?'教材已匯入':'待課文全文'}</td></tr>;})}</tbody></table></div>
    </details>
  </section>;
}
