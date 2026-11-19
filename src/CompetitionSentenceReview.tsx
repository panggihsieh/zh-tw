import {useEffect,useState} from 'react';
import {competitionRequest} from './competitionApi';
interface Answer {questionIndex:number;name:string;seat:number|null;sentence:string;points:number;qualityScore:number|null;feedback:string;issueReason:string;scores:Record<string,number>;timedOut:boolean}
interface Group {character:string;count:number;pending:Answer[];highest:Answer[];lowest:Answer[];missingHistory:number;unanswered:number}
const labels:Record<string,string>={correctness:'用字正確',completeness:'句意完整',fluency:'語句通順',detail:'內容細節',mechanics:'標點格式'};
const maximum:Record<string,number>={correctness:30,completeness:20,fluency:20,detail:20,mechanics:10};
export default function CompetitionSentenceReview({roomId,request=competitionRequest}:{roomId:string;request?:typeof competitionRequest}){
 const [groups,setGroups]=useState<Group[]|null>(null),[error,setError]=useState(''),[reload,setReload]=useState(0);
 useEffect(()=>{let active=true;setGroups(null);setError('');void request<{groups:Group[]}>(`/rooms/${roomId}/sentence-review`).then(v=>{if(active)setGroups(v.groups);}).catch(e=>{if(active)setError(e.message);});return()=>{active=false;};},[roomId,request,reload]);
 function answer(a:Answer,index:number){return <li key={`${a.questionIndex}-${a.seat}-${index}`}>
  <p><strong>{a.seat?`${a.seat} 號 `:''}{a.name}</strong> · 第 {a.questionIndex+1} 題 · 造句 {a.qualityScore??'待確認'}／100 分 · 競賽 {a.points} 分</p>
  <blockquote>{a.sentence}</blockquote>
  <p className="sentence-review-reason">評分原因（當次 AI 評語）：{a.feedback}{a.issueReason&&`；${a.issueReason}`}</p>
  <p className="sentence-review-reason">{Object.entries(a.scores).map(([key,value])=>`${labels[key]||key} ${value}/${maximum[key]}`).join('、')}</p>
  {a.timedOut&&<p className="sentence-review-reason">本題逾時，競賽得分為 0；造句品質分仍保留。</p>}
 </li>;}
 return <section className="competition-sentence-review"><h2>逐字造句高低分分析</h2>
  <p>依各字的造句品質分比較，同分者全部列出。未作答不列為最低分；評語供教師覆核。</p>
  {error&&<p role="alert">{error}</p>}<button type="button" className="secondary" onClick={()=>setReload(v=>v+1)}>重新載入分析</button>
  {!groups&&!error&&<p role="status">正在載入造句紀錄…</p>}
  {groups?.map(g=><article key={g.character}><h3>「{g.character}」 · {g.count} 筆造句</h3>
   {g.highest.length>0?<><h4>最高分{g.highest.length>1?'（同分）':''}</h4><ul>{g.highest.map(answer)}</ul>
    <h4>最低分{g.lowest.length>1?'（同分）':''}{g.highest[0]?.qualityScore===g.lowest[0]?.qualityScore?' · 本字有效造句皆同分':''}</h4><ul>{g.lowest.map(answer)}</ul></>:<p>尚無可比較的已評分造句。</p>}
   {g.pending.length>0&&<><h4>AI 評分待確認（未列入高低分）</h4><ul>{g.pending.map(answer)}</ul></>}
   {g.missingHistory>0&&<p>有 {g.missingHistory} 筆已答題目未保存逐題紀錄，無法還原造句及理由。</p>}
   {g.unanswered>0&&<p>未作答：{g.unanswered} 題次。</p>}
  </article>)}
 </section>;
}
