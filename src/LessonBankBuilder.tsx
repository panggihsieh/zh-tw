import {useEffect,useRef,useState} from 'react';
import blueprint from '../server/quiz-blueprint.json';
import {quizRequest} from './quizApi';
interface Bank {id:string;lessonKey:string;title:string;createdAt:string;paperIds:string[];total:number;complete:boolean;lastError:string;rows:{category:string;count:number;actual:number}[]}
export default function LessonBankBuilder({request=quizRequest,onOpen}:{request?:typeof quizRequest;onOpen:(id:string)=>void}) {
  const [banks,setBanks]=useState<Bank[]>([]),[lessonKey,setLessonKey]=useState(blueprint.lessons[0].key),[book,setBook]=useState(''),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[loaded,setLoaded]=useState(false);
  const [passage,setPassage]=useState(''),[sourceLabel,setSourceLabel]=useState(''),[confirmed,setConfirmed]=useState(false),[difficulty,setDifficulty]=useState('中');
  const stop=useRef(false);
  const sorted=[...banks].sort((a,b)=>b.createdAt.localeCompare(a.createdAt));
  const latest=(key:string)=>sorted.find(b=>b.lessonKey===key);
  const current=latest(lessonKey);
  const books=[...new Set(blueprint.lessons.map(l=>`${l.grade}${l.term}（${l.year}）`))];
  const lessons=blueprint.lessons.filter(l=>!book||`${l.grade}${l.term}（${l.year}）`===book);
  const actual=blueprint.lessons.reduce((n,l)=>n+(latest(l.key)?.total||0),0);
  async function refresh(){const data=await request<{items:Bank[]}>('/lesson-banks');setBanks(data.items);setLoaded(true);}
  useEffect(()=>{void refresh().catch(e=>setMessage(e.message));return()=>{stop.current=true;};},[]);
  function update(bank:Bank){setBanks(rows=>[...rows.filter(b=>b.id!==bank.id),bank]);}
  async function create(){setBusy(true);setMessage('建立課文版本…');try{const bank=await request<Bank>('/lesson-banks',{lessonKey,passage,sourceLabel,sourceConfirmed:confirmed,difficulty});update(bank);setMessage('已建立新版本；尚未呼叫AI，也未產生題目。');}catch(e){setMessage((e as Error).message);}finally{setBusy(false);}}
  async function generate(all:boolean){if(!current)return;stop.current=false;setBusy(true);let bank=current;try{
    for(let i=0;i<11&&!bank.complete;i++){
      setMessage(`正在製作 ${bank.total+1}–${Math.min(bank.total+5,55)} 題；完成 ${bank.total}/55 題。`);
      const next=await request<Bank>(`/lesson-banks/${bank.id}/next`,{});if(next.total<=bank.total&&!next.complete)throw Error('進度未增加，已停止，請重新整理後核對。');bank=next;update(bank);
      if(!all||stop.current)break;
    }
    setMessage(bank.complete?'本課55題已建立待審草稿，請逐批檢視；尚未派送學生。':`已保存 ${bank.total}/55 題，可稍後接續。`);
  }catch(e){setMessage(`本批停止：${(e as Error).message}。先前完成批次保留。`);await refresh().catch(()=>{});}finally{setBusy(false);}}
  return <section aria-label="每課55題重編">
    <h2>南一五六年級・每課55題重編</h2>
    <p>字音字形10 · 字詞應用15 · 文意理解15 · 標點5 · 修辭5 · 成語5；同義改寫不另計。</p>
    <p role="status">{message}</p>
    <p>{loaded?`新版實際保存 ${actual}/2475 題，完成 ${blueprint.lessons.filter(l=>latest(l.key)?.complete).length}/45 課。`:'正在讀取重編進度…'} 舊題與已發布試卷保留。</p>
    <fieldset disabled={busy}><legend>選課與課文來源</legend>
      <div className="quiz-grid"><label>重編冊次<select value={book} onChange={e=>setBook(e.target.value)}><option value="">全部四冊</option>{books.map(b=><option key={b}>{b}</option>)}</select></label>
      <label>重編課次<select value={lessonKey} onChange={e=>{setLessonKey(e.target.value);setPassage('');setSourceLabel('');setConfirmed(false);}}>{blueprint.lessons.map(l=><option key={l.key} value={l.key}>{l.grade}{l.term} {l.title}（{l.year}）</option>)}</select></label></div>
      <details><summary>提供全文，建立本課新版本</summary>
        <p>評量卷、生字表及課名不能代替全文；請核對學年度與冊次。新版本不覆寫舊題。</p>
        <label>課文來源或檔名<input maxLength={300} value={sourceLabel} onChange={e=>setSourceLabel(e.target.value)}/></label>
        <label>重編課文全文<textarea rows={10} maxLength={12000} value={passage} onChange={e=>{setPassage(e.target.value);setConfirmed(false);}}/></label>
        <label>重編難度<select value={difficulty} onChange={e=>setDifficulty(e.target.value)}><option value="易">低</option><option value="中">中</option><option value="難">高</option></select></label>
        <label className="quiz-check"><input type="checkbox" checked={confirmed} onChange={e=>setConfirmed(e.target.checked)}/>已確認這是所選版本的完整課文，且可用於出題</label>
        <button type="button" className="secondary" disabled={!loaded||!confirmed||passage.trim().length<20||!sourceLabel.trim()} onClick={()=>void create()}>建立本課新版本</button>
      </details>
    </fieldset>
    {current?<>
      <h3>{current.title} · {current.total}/55 題</h3>
      <p>每批5題，正常2次模型呼叫，疑點最多另修正及複查各1次。完成整課共11批，最多44次呼叫，可能計費；失敗即停，關閉頁面不會啟動後續批次。</p>
      {current.lastError&&<p role="alert">上一批未完成：{current.lastError}</p>}
      <div className="quiz-actions"><button className="secondary" disabled={busy||current.complete} onClick={()=>void generate(false)}>產生下一批5題</button><button className="primary" disabled={busy||current.complete} onClick={()=>void generate(true)}>接續完成本課55題</button>{busy&&<button className="secondary" onClick={()=>{stop.current=true;setMessage('目前批次完成後停止並保留進度。');}}>本批完成後停止</button>}</div>
      <div className="quiz-paper-list">{current.paperIds.map((id,i)=><button className="secondary" disabled={busy} key={id} onClick={()=>onOpen(id)}>檢視第{i+1}批草稿</button>)}</div>
    </>:<p>本課尚未取得已確認全文；重編題數為0。請提供課文來源後建立版本。</p>}
    <h3>各課配額與缺額</h3>
    <button className="secondary" disabled={busy} onClick={()=>{void refresh().catch(e=>setMessage(e.message));}}>重新讀取進度</button>
    <div className="quiz-bank-progress"><table><thead><tr><th>課次</th>{blueprint.plan.map(r=><th key={r.category}>{r.category}</th>)}<th>合計</th><th>狀態</th></tr></thead><tbody>{lessons.map(l=>{const bank=latest(l.key);return <tr key={l.key}><th scope="row"><button className="secondary" disabled={busy} onClick={()=>setLessonKey(l.key)}>{l.grade}{l.term} {l.title}</button></th>{blueprint.plan.map(row=><td key={row.category}>{loaded?(bank?.rows.find(r=>r.category===row.category)?.actual||0):'—'}/{row.count}</td>)}<td>{loaded?(bank?.total||0):'—'}/55</td><td>{!loaded?'未讀取':bank?.complete?'55題待教師審核':bank?'製作中／可接續':'待課文全文'}</td></tr>;})}</tbody></table></div>
  </section>;
}
