import { compareSentences } from "./SentencePractice";
import type { SentencePracticeGrade } from "./sentenceApi";
import { structureImage } from "./structureSubtype";
import {MicrophoneMeter} from './MicrophoneTest';
import {useEffect,useRef,useState} from 'react';
import {CheckCircle2,Mic,RefreshCw,Square,Trophy,XCircle} from 'lucide-react';
import {competitionCodeFromInput,competitionStudentRequest as defaultRequest,type CompetitionParticipant,type CompetitionQuestion,type CompetitionRoom,type LeaderboardItem} from './competitionApi';
import './competition.css';
import CompetitionCodeEntry from './CompetitionCodeEntry';
import CompetitionFinalRanking from './CompetitionFinalRanking';
import CompetitionWriting from './CompetitionWriting';
import type { Point } from './writingGame';
import CompetitionWritingSheet from './CompetitionWritingSheet';
import { loadWritingSheet, saveWritingSheet, writingSheetStorageKey, type WorkSheetEntry } from './competitionWritingSheet';

import {configureSentenceRecognition,sentenceSpeechError,type CompetitionRecognition as Recognition} from './competitionSpeech';
type SpeechWindow=Window&{SpeechRecognition?:new()=>Recognition;webkitSpeechRecognition?:new()=>Recognition};
const sentenceScoreCriteria = [
  ["correctness", "用詞正確", 30],
  ["completeness", "句意完整", 20],
  ["fluency", "語句通順", 20],
  ["detail", "內容具體", 20],
  ["mechanics", "文字與標點", 10],
] as const;

type SentenceResult = SentencePracticeGrade & { original: string; polished?: string };

function SentenceScoreDetails({ grade }: { grade: SentenceResult }) {
  return <>
      <p>{grade.total === null ? "待確認" : `${grade.total}／100 分`}</p>
      {grade.total !== null && <ul className="competition-score-charts">
        {sentenceScoreCriteria.map(([key, label, maximum]) => {
          const score = grade.scores[key];
          const percent = Math.round(score / maximum * 100);
          return <li key={key}>
            <span className="competition-score-pie" aria-hidden="true" style={{ background: `conic-gradient(#147747 ${percent}%, #e4ebdc 0)` }} />
            <strong>{label}</strong><span>{score}／{maximum} 分 · {percent}%</span>
          </li>;
        })}
      </ul>}
      <p>{grade.feedback}</p>
      <p className="competition-original-sentence"><strong>原句：</strong>{grade.original}</p>
      <p className="competition-polished-sentence"><strong>AI 建議句：</strong>{grade.polished
        ? compareSentences(grade.original, grade.polished).polishedParts
        : "目前沒有修改建議。"}</p>
  </>;
}

export default function CompetitionPlay({onBack,backLabel="返回遊戲專區",request:competitionRequest=defaultRequest,initialCode:providedCode}:{onBack:()=>void;backLabel?:string;onExpire?:()=>void;request?:typeof defaultRequest;initialCode?:string}){
 const [seat,setSeat]=useState(''),[nickname,setNickname]=useState('');
 const initialCode=providedCode??competitionCodeFromInput(window.location.hash);
 const confirmCode=new URLSearchParams(window.location.hash.split("?")[1]).get("confirm")==="1";
 const [code,setCode]=useState(initialCode),[room,setRoom]=useState<CompetitionRoom|null>(null),[participant,setParticipant]=useState<CompetitionParticipant|null>(null),[question,setQuestion]=useState<CompetitionQuestion|null>(null),[ranking,setRanking]=useState<LeaderboardItem[]>([]),[feedback,setFeedback]=useState<{correct:boolean;points:number;text?:string}|null>(null),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[sentence,setSentence]=useState(''),[listening,setListening]=useState(false),[micActive,setMicActive]=useState(false),[now,setNow]=useState(Date.now());
 // 課堂結束音樂只在老師端播放；學生裝置不自動播放，也不顯示播放控制。
 const recognition=useRef<Recognition|null>(null),speechSession=useRef<ReturnType<typeof configureSentenceRecognition>|null>(null);
 const sentenceInput=useRef<HTMLTextAreaElement>(null);
 const SpeechRecognition=(window as SpeechWindow).SpeechRecognition||(window as SpeechWindow).webkitSpeechRecognition;
 async function run(fn:()=>Promise<void>){setBusy(true);setMessage('');try{await fn();}catch(e){setMessage((e as Error).message);}finally{setBusy(false);}}
 async function find(input=code){const normalized=input.trim().toUpperCase();if(!/^[A-Z2-9]{4}$/.test(normalized))throw Error('請輸入老師提供的四碼開課代碼。');const value=await competitionRequest<{room:CompetitionRoom;participant?:CompetitionParticipant}>(`/code/${normalized}`);setRoom(value.room);setCode(normalized);if(value.room.status==='running'){const resumed=await competitionRequest<{room:CompetitionRoom;participant:CompetitionParticipant;question:CompetitionQuestion|null}>(`/rooms/${value.room.id}/state`,{});setRoom(resumed.room);setParticipant(resumed.participant);setQuestion(resumed.question);setMessage('已返回課堂。');}else {setParticipant(value.participant??null);setMessage(value.room.loginMode==='anonymous'?'請輸入暱稱，再選擇一隻小鳥加入。':'已找到課堂，請選取姓名加入等候室。');}}
 async function join(birdId?:string){if(!room)return;const value=await competitionRequest<{room:CompetitionRoom;participant:CompetitionParticipant;question:CompetitionQuestion|null}>(`/rooms/${room.id}/join`,room.loginMode==='anonymous'?{name:nickname.trim(),birdId}:{seat:Number(seat)});setRoom(value.room);setParticipant(value.participant);setQuestion(value.question);setFeedback(null);setScoreHistory({});setSentenceGrade(null);}
 async function refresh(){if(!room||!participant)return;const value=await competitionRequest<{room:CompetitionRoom;participant:CompetitionParticipant;question:CompetitionQuestion|null}>(`/rooms/${room.id}/state`,{});setRoom(value.room);setParticipant(value.participant);setQuestion(value.question);if(value.participant.finished||value.room.status==='closed')await loadRanking(value.room);}
 async function loadRanking(target=room){if(!target)return;const value=await competitionRequest<{items:LeaderboardItem[]}>(`/rooms/${target.id}/leaderboard`);setRanking(value.items);}
 useEffect(()=>{if(initialCode&&!confirmCode)void run(find);return()=>{speechSession.current?.dispose();recognition.current?.abort();};},[]);
 useEffect(()=>{
   if(!room||!participant)return;
   if(room.status==='closed'){void loadRanking(room).catch(error=>setMessage(error.message));return;}
   if(!room.expiresAt)return;
   const timer=window.setTimeout(()=>void run(refresh),Math.max(0,room.expiresAt-Date.now()));
   return()=>window.clearTimeout(timer);
 },[room?.status,room?.expiresAt,participant?.uid]);
 useEffect(()=>{if(!room||!participant||room.status==='closed')return;const timer=window.setInterval(()=>{setNow(Date.now());void refresh().catch(e=>setMessage(e.message));},3000);return()=>window.clearInterval(timer);},[room?.id,room?.status,participant?.finished]);
 useEffect(()=>{
  if(!room||participant||room.loginMode!=='anonymous'||room.status!=='lobby')return;
  let active=true;
  const timer=window.setInterval(()=>{void competitionRequest<{room:CompetitionRoom;participant?:CompetitionParticipant}>(`/code/${room.code}`).then(value=>{if(active){setRoom(value.room);if(value.participant)setParticipant(value.participant);}}).catch(error=>{if(active)setMessage(error.message);});},3000);
  return()=>{active=false;window.clearInterval(timer);};
 },[room?.id,room?.status,participant?.uid]);
 const [scoreHistory, setScoreHistory] = useState<Record<number, SentenceResult>>({});
 const [sentenceGrade, setSentenceGrade] = useState<SentenceResult | null>(null);
 const [writingSheet,setWritingSheet]=useState<WorkSheetEntry[]>([]);
 const sheetKey=room&&participant?writingSheetStorageKey(room.id,participant.uid):'';
 useEffect(()=>{setWritingSheet(sheetKey?loadWritingSheet(sheetKey):[]);},[sheetKey]);
 function keepWork(entry:WorkSheetEntry){
  if(!sheetKey)return;
  setWritingSheet(previous=>{const next=[...previous.filter(item=>item.number!==entry.number),entry].sort((a,b)=>a.number-b.number);saveWritingSheet(sheetKey,next);return next;});
 }
 async function answer(value:number|string|Point[][]){if(!room)return;const asked=question,number=(participant?.index??0)+1;const body=Array.isArray(value)?{traces:value}:typeof value==='number'?{answer:value}:{sentence:value};const result=await competitionRequest<{correct:boolean;points:number;participant:CompetitionParticipant;question:CompetitionQuestion|null;grade?:SentencePracticeGrade & {polished?:string};correctAnswer?:number}>(`/rooms/${room.id}/answer`,body);setFeedback({correct:result.correct,points:result.points,text:result.grade?`${result.grade.level}：${result.grade.feedback}`:undefined});if(asked?.type==='structure'&&typeof value==='number'&&asked.options)keepWork({kind:'structure',number,character:asked.character||'',choice:asked.options[value]??'',answer:asked.options[result.correctAnswer??value]??'',correct:result.correct});else if(asked?.type==='sentence-practice'&&typeof value==='string')keepWork({kind:'sentence',number,character:asked.character||'',reading:asked.reading,sentence:value,score:typeof result.grade?.total==='number'?result.grade.total:null,level:result.grade?.level});setParticipant(result.participant);setSentence('');if(result.grade){const grade={...result.grade,original:typeof value==="string"?value:""};setScoreHistory(previous=>({...previous,[result.participant.index]:grade}));setSentenceGrade(grade);setQuestion(result.question);return;}window.setTimeout(()=>{setFeedback(null);setQuestion(result.question);if(result.participant.finished)void loadRanking(room);},1600);}
 function listen(){if(!SpeechRecognition||listening||busy)return;setMicActive(true);const instance=new SpeechRecognition();recognition.current=instance;setMessage('正在啟動麥克風，若出現權限提示請按允許。');speechSession.current=configureSentenceRecognition(instance,sentence,{text:setSentence,message:setMessage,end:()=>{setListening(false);setMicActive(false);if(recognition.current===instance)recognition.current=null;}});try{instance.start();setListening(true);}catch(error){speechSession.current?.dispose();recognition.current=null;setListening(false);setMicActive(false);setMessage(sentenceSpeechError((error as Error).name==='NotAllowedError'?'not-allowed':''));}}
 useEffect(()=>{
   speechSession.current?.dispose();
   recognition.current?.abort();
   recognition.current=null;
   speechSession.current=null;
   setListening(false);
   setMicActive(false);
 },[participant?.index,room?.status]);
 function clearSentence(){
   if(listening)speechSession.current?.continueWith('');
   setSentence('');
   sentenceInput.current?.focus();
 }
 function insertPunctuation(mark:string){
   const input=sentenceInput.current;
   if(!input)return;
   const start=input.selectionStart;
   const end=input.selectionEnd;
   if(sentence.length-(end-start)+mark.length>input.maxLength)return;
   const updatedSentence=sentence.slice(0,start)+mark+sentence.slice(end);
   if(listening)speechSession.current?.continueWith(updatedSentence);
   setSentence(updatedSentence);
   requestAnimationFrame(()=>{
     input.focus();
     input.setSelectionRange(start+mark.length,start+mark.length);
   });
 }
 const deadline=room?.status==='closed'?(room.closedAt??room.expiresAt??now):now;
 const remaining=room?.expiresAt?Math.max(0,Math.ceil((room.expiresAt-deadline)/1000)):0;
 return <section className="competition-play">{room&&<button className="secondary" onClick={onBack}>{backLabel}</button>}
  {!room?<CompetitionCodeEntry initialCode={code} busy={busy} onConfirm={value=>void run(()=>find(value))}/>
  :!participant?<section className="competition-lobby"><span>{room.className}</span><h1>{room.title}</h1><div className="competition-lobby-code">{room.code}</div><p>{room.questionCount} 題 · {room.status==='lobby'?'現在加入等候室':'課堂已鎖定加入'}</p>{room.loginMode==='anonymous'?<><label>你的暱稱<input maxLength={40} value={nickname} disabled={busy} onChange={event=>setNickname(event.target.value)} placeholder="請輸入暱稱"/></label><p>選一隻小鳥加入；灰色表示已被選走，每隻小鳥限一人。</p><div className="competition-bird-grid" aria-label="匿名小鳥公仔">{room.anonymousBirds?.map(bird=><button key={bird.id} type="button" title={bird.name} aria-label={`${bird.name}${bird.occupied?'（已選取）':''}`} disabled={busy||!nickname.trim()||room.status!=='lobby'||bird.occupied&&!bird.mine} onClick={()=>void run(()=>join(bird.id))}><img src={`/bird-avatars/${bird.id}.png`} alt={bird.name}/><span>{bird.name}</span></button>)}</div></>:<>{room.nameChoices&&<label>選取自己的姓名<select value={seat} onChange={event=>setSeat(event.target.value)}><option value="">請選擇姓名</option>{room.nameChoices.map(student=><option key={student.seat} value={student.seat}>{student.seat} 號 · {student.name}</option>)}</select></label>}<button className="primary" disabled={busy||room.status!=='lobby'||!!room.nameChoices&&!seat} onClick={()=>void run(()=>join())}>加入等候室</button></>}</section>
  :room.status==='lobby'?<section className="competition-lobby"><h1>已加入等候室</h1>{participant.avatarKind==='anonymous'&&participant.avatar&&<img className="competition-selected-bird" src={participant.avatar} alt={`${participant.name}的小鳥公仔`}/>}<p>{participant.name}，老師開始後會自動顯示第一題。</p><button className="secondary" disabled={busy} onClick={()=>void run(refresh)}><RefreshCw size={18}/>更新狀態</button></section>
  :sentenceGrade ? (
    <section className="competition-stage" aria-label="本題評分細目">
      <h1>本題評分細目</h1>
      <SentenceScoreDetails grade={sentenceGrade} />
      <button className="primary" onClick={() => {
        setSentenceGrade(null);
        setFeedback(null);
        if (participant.finished) void run(() => loadRanking(room));
      }}>{participant.finished || room.status === "closed" ? "查看排名" : "下一題"}</button>
    </section>
  )
  :room.status==='running'&&question&&!participant.finished?<section className={question.type==='sentence-practice'? "competition-stage competition-sentence-stage" : "competition-stage"}><div className="competition-stage-head"><span>第 {participant.index+1} / {room.questionCount} 題</span><strong>{String(Math.floor(remaining/60)).padStart(2,'0')}:{String(remaining%60).padStart(2,'0')} · {participant.points} 分</strong></div><h1>{question.prompt}</h1>{question.type==='writing'?<CompetitionWriting key={`${room.id}-${participant.index}`} character={question.character!} disabled={busy||!!feedback} onSubmit={traces=>{keepWork({kind:'writing',number:participant.index+1,character:question.character!,traces});void run(()=>answer(traces));}}/>:question.type==='sentence-practice'?<div className="competition-sentence-answer"><div className="competition-sentence-top"><div className="competition-target-character">{question.character}</div><div className="competition-sentence-voice">{question.reading&&<p className="competition-sentence-reading">指定讀音 <strong>{question.reading}</strong></p>}<div className="competition-actions"><button className="primary" disabled={!SpeechRecognition||busy||listening} onClick={listen}><Mic size={18}/>{listening?'正在聆聽…':'開始語音輸入'}</button><button className="secondary" disabled={!micActive} onClick={()=>speechSession.current?.stop()}><Square size={18}/>停止</button></div>{!SpeechRecognition&&<p>此瀏覽器不支援語音辨識，請改用 Chrome，或直接輸入句子。</p>}<p role="status" aria-live="polite">{message}</p><MicrophoneMeter active={micActive}/></div></div><label htmlFor="competition-sentence">核對句子後再送出</label><div className="competition-actions" role="group" aria-label="常用標點">{['，','。','、','？','！','：','；','「','」'].map(mark=><button key={mark} type="button" className="secondary" onClick={()=>insertPunctuation(mark)}>{mark}</button>)}<button type="button" className="secondary" disabled={busy||!sentence} onClick={clearSentence}>清除文字</button></div><textarea id="competition-sentence" ref={sentenceInput} readOnly={listening} rows={3} maxLength={300} value={sentence} onChange={e=>setSentence(e.target.value)} placeholder={`請說出包含「${question.character}」的完整句子。`}/><button className="primary" disabled={busy||listening||!sentence.includes(question.character||'')||sentence.length<5} onClick={()=>void run(()=>answer(sentence))}>確認送出並取得 AI 評量</button><p>語音由瀏覽器語音服務轉成文字，不需要登入；確認送出後才使用 AI 評量。</p></div>:<div className="competition-answer-grid">{question.options!.map((option,index)=><button key={index} disabled={busy||!!feedback} onClick={()=>void run(()=>answer(index))}><b>{String.fromCharCode(65+index)}</b><span>{option}</span>{question.type==="structure" && structureImage(option) && <img className="competition-structure-thumbnail" alt="" src={structureImage(option)}/>}</button>)}</div>}{feedback&&<div className={feedback.correct?'competition-feedback correct':'competition-feedback wrong'}>{feedback.correct?<CheckCircle2/>:<XCircle/>}<strong>{feedback.correct?`完成！＋${feedback.points} 分`:'再修改會更好！'}</strong>{feedback.text&&<p>{feedback.text}</p>}</div>}</section>
  :<section className="competition-results"><Trophy size={52}/><h1>競賽排名</h1><p>你完成 {participant.index} 題，共 {participant.points} 分。</p>{Object.keys(scoreHistory).length > 0 && (
    <section aria-label="各題評分細目">
      <h2>各題評分細目</h2>
      {Object.entries(scoreHistory).map(([number, grade]) => (
        <details key={number} open={Number(number) === participant.index}>
          <summary>第 {number} 題 · {grade.total === null ? "待確認" : `${grade.total}／100 分`}</summary>
          <SentenceScoreDetails grade={grade} />
        </details>
      ))}
    </section>
  )}{writingSheet.length>0&&<CompetitionWritingSheet entries={writingSheet} info={{title:room.title,className:room.className,name:participant.name,date:new Date(room.closedAt??Date.now()).toLocaleDateString('zh-TW',{timeZone:'Asia/Taipei'})}}/>}<button className="secondary" disabled={busy} onClick={()=>void run(()=>loadRanking())}><RefreshCw size={18}/>更新排名</button><CompetitionFinalRanking room={room} items={ranking} request={competitionRequest} simulated={competitionRequest!==defaultRequest}/></section>}
  <p role="status">{message}</p>{!room&&<button className="secondary" onClick={onBack}>{backLabel}</button>}</section>;
}
