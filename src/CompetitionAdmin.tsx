import { correctedLessons } from './readingCorrections';
import OriginalCompetitionAvatar from './OriginalCompetitionAvatar';
import {useEffect,useMemo,useRef,useState,type CSSProperties,type ReactNode} from 'react';
import {Maximize,Minimize,Download,Play,Plus,RefreshCw,Send,Square,Trash2,Trophy,Upload,Users} from 'lucide-react';
import {QRCodeSVG} from 'qrcode.react';
import {quizRequest, type QuizPaper} from './quizApi';
import { readQuizPassage } from './quizPassage';
import type {QuizClass} from './ClassRoster';
import {sentenceRequest,type SentenceLesson} from './sentenceApi';
import {competitionJoinUrl,competitionRequest,type CompetitionParticipant,type CompetitionQuestion,type CompetitionRoom,type LeaderboardItem} from './competitionApi';
import './competition.css';
import lessonSeven from './lessonSevenPilot.json';
import SentencePractice from './SentencePractice';
import {parseQuestionCsv,questionCsvExample} from './competitionQuestionCsv';

import {previewRequest} from './kahootPreview';
import { endSoundEnabled, endSoundVolume, playClosedCompetitionSound, playCompetitionEndSound, setEndSoundEnabled, setEndSoundVolume, primeCompetitionEndSound } from "./competitionEndSound";
import CompetitionFinalRanking from './CompetitionFinalRanking';
import { useCompetitionEndSound } from './competitionEndSound';
import { structureQuestion, teachingStructure, type StructureQuestion, type Stroke } from './structureSubtype';
import { loadStructureOverrides, type StructureOverride } from './structureOverrides';
import StructureOverrideEditor from './StructureOverrideEditor';
import SentenceRubricEditor, { loadSavedRubricSettings, rubricFromDraft, rubricProblem } from './SentenceRubricEditor';
import SentenceRubricList from './SentenceRubricList';
import { DEFAULT_RUBRIC, RUBRIC_ITEMS, parseLessonWords } from '../server/sentence-rubric.mjs';
import { useUserRole } from './structureReview';
/** 結構題推算細分比例用的筆順資料（同一次出題共用快取）。 */
const strokeCache=new Map<string,Promise<Stroke[]|null>>();
function loadGameStrokes(character:string){if(!strokeCache.has(character))strokeCache.set(character,fetch(`/game-strokes/${character.codePointAt(0)!.toString(16)}.json`).then(response=>response.ok?response.json():null).catch(()=>null));return strokeCache.get(character)!;}

const emptyQuestion=():CompetitionQuestion=>({prompt:'',options:['','','',''],answer:0,seconds:30});
const gameTitles = {
  "sentence-practice": "一字多詞 AI 造句",
  structure: "生字結構遊戲",
  writing: "書寫生字遊戲",
  quiz: "自訂 Kahoot 四選一遊戲",
};
function CompetitionRoomPanel({room,initiallyOpen,children}:{room:CompetitionRoom;initiallyOpen:boolean;children:ReactNode}){
 if(room.status!=='closed')return <article className="competition-room">{children}</article>;
 return <details className="competition-room competition-completed-room" open={initiallyOpen||undefined}>
  <summary><span className="competition-status closed">已結束</span><strong>{room.title}</strong><span>{room.className} · {room.questionCount} 題</span><span className="competition-completed-hint">展開／收合課堂結果</span></summary>
  {children}
 </details>;
}
function Avatar({item}:{item:Pick<CompetitionParticipant,'avatar'|'avatarKind'|'name'>}){
 if((item.avatarKind==='custom'||item.avatarKind==='anonymous')&&item.avatar)return <OriginalCompetitionAvatar src={item.avatar} alt={`${item.name}的公仔`}/>;
 if(item.avatarKind==='anonymous')return <span className="competition-avatar anonymous" aria-label="匿名公仔">?</span>;
 return <img className="competition-avatar" src={`${import.meta.env.BASE_URL}mascot/green-bird.png`} alt="系統預設小畫眉公仔"/>;
}
const podiumColumns = [4, 3, 5, 2, 6, 1, 7];
function podiumLayout(count:number){
 const columns=Math.max(1,count%2?count:count+1),center=Math.ceil(columns/2);
 return {columns,positions:Array.from({length:count},(_,index)=>center+(index%2?-(index+1)/2:index/2))};
}

export default function CompetitionAdmin({pilot=false}:{pilot?:boolean}={}){
 const [selectedRooms,setSelectedRooms]=useState<string[]>([]);
 const [importNotice,setImportNotice]=useState('');
 const [useRealAi,setUseRealAi]=useState(false);
 const [showContextWords,setShowContextWords]=useState(true);
 const [previewCard,setPreviewCard]=useState<{phrase:string;character:string}|null>(null);
 const [article, setArticle] = useState("");
 const [classes,setClasses]=useState<QuizClass[]>([]),[classId,setClassId]=useState(''),[title,setTitle]=useState(gameTitles["sentence-practice"]),[questions,setQuestions]=useState<CompetitionQuestion[]>(()=>pilot?lessonSeven.rows.filter(row=>["際","璃","磁"].includes(row.character)).map(row=>({type:"sentence-practice",prompt:"用「"+row.character+"」組詞，再造句",phrase:row.character,character:row.character,reading:row.reading,seconds:90})):[]),[rooms,setRooms]=useState<CompetitionRoom[]>([]),[people,setPeople]=useState<Record<string,LeaderboardItem[]>>({}),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
 const [soundEnabled,setSoundEnabled]=useState(endSoundEnabled);
 const [soundVolume,setSoundVolume]=useState(endSoundVolume);
 const observedOpenRooms=useRef(new Set<string>());
 useCompetitionEndSound(rooms);
 const [lessons,setLessons]=useState<SentenceLesson[]>([]),[structureIds,setStructureIds]=useState<Record<string,string>>({}),[lessonIds,setLessonIds]=useState<string[]>(pilot?[lessonSeven.id]:[]),[grade,setGrade]=useState(5),[term,setTerm]=useState('上'),[gameType,setGameType]=useState<'sentence-practice'|'quiz'|'structure'|'writing'>('sentence-practice'),[duration,setDuration]=useState(10),[maxParticipants,setMaxParticipants]=useState(30),[testRoom,setTestRoom]=useState(pilot),[now,setNow]=useState(Date.now());
 // 一字多詞造句的評分項目（開課時送出），以及開始課程前的確認視窗。
 const [savedRubric]=useState(loadSavedRubricSettings);
 const [rubricDraft,setRubricDraft]=useState(savedRubric.draft),[rubricLocked,setRubricLocked]=useState(true),[lessonWordsText,setLessonWordsText]=useState(savedRubric.lessonWords),[startConfirm,setStartConfirm]=useState<CompetitionRoom|null>(null);
 const startDialog=useRef<HTMLDialogElement>(null);
 useEffect(()=>{if(startConfirm)startDialog.current?.showModal();else startDialog.current?.close();},[startConfirm]);
 function startRoom(room:CompetitionRoom){void primeCompetitionEndSound();void run(async()=>{await competitionRequest(`/rooms/${room.id}/start`,{});await load();});}
 // 管理者修正的生字結構：出題時優先採用。
 const role=useUserRole();
 const [overrides,setOverrides]=useState<Record<string,StructureOverride>>({}),[editingStructure,setEditingStructure]=useState<string|null>(null);
 useEffect(()=>{if(gameType!=='structure')return;let active=true;loadStructureOverrides().then(value=>{if(active)setOverrides(value);}).catch(()=>{if(active)setMessage('結構修正資料暫時無法載入，題目先採自動判斷。');});return()=>{active=false;};},[gameType]);
 async function applyStructureOverride(character:string,value:StructureOverride|null){
  const next={...overrides};if(value)next[character]=value;else delete next[character];setOverrides(next);setEditingStructure(null);
  const question=await structureQuestion(character,structureIds,loadGameStrokes,value??undefined);
  setQuestions(rows=>question?rows.map(row=>row.character===character&&row.type==='structure'?question:row):rows.filter(row=>!(row.character===character&&row.type==='structure')));
  setMessage(value?.exclude?`已設定「${character}」不出結構題，並從本次題目移除。`:value?`已修正「${character}」為${value.subtype||value.structure+'（八大類題）'}，本題已更新。`:`「${character}」已恢復自動判斷，本題已更新。`);
 }
 async function run(fn:()=>Promise<void>){setBusy(true);setMessage('');try{await fn();}catch(e){setMessage((e as Error).message);}finally{setBusy(false);}}
 async function roomState(room:CompetitionRoom){const path=room.status==='lobby'?'lobby':'leaderboard';const value=await competitionRequest<{items:LeaderboardItem[]}>(`/rooms/${room.id}/${path}`);setPeople(v=>({...v,[room.id]:value.items}));}
 async function load(){const [roomData,classData]=await Promise.all([competitionRequest<{items:CompetitionRoom[]}>('/rooms'),quizRequest<{items:QuizClass[]}>('/classes')]);for(const room of roomData.items)if(room.status!=='closed')observedOpenRooms.current.add(room.id);setRooms(roomData.items.map(room => room.title === "一字多詞 Kahoot 練習" ? { ...room, title: gameTitles[room.gameType] } : room));setClasses(classData.items);setClassId(current=>current||classData.items[0]?.id||'');await Promise.all(roomData.items.slice(0,8).map(room=>roomState(room).catch(()=>undefined)));}
 useEffect(()=>{const controller=new AbortController();Promise.all([fetch(`${import.meta.env.BASE_URL}sentence-bank.json`,{signal:controller.signal}),fetch(`${import.meta.env.BASE_URL}structure-review/ids-catalog.json`,{signal:controller.signal})]).then(async([lessonsResponse,structureResponse])=>{if(!lessonsResponse.ok||!structureResponse.ok)throw Error('課文生字庫載入失敗');const [lessonData,structureData]=await Promise.all([lessonsResponse.json(),structureResponse.json()]);setLessons(await correctedLessons(lessonData.lessons));setStructureIds(structureData);}).catch(e=>{if(!controller.signal.aborted)setMessage(e.message)});void run(load);return()=>controller.abort();},[]);
 useEffect(()=>{const timer=window.setInterval(()=>{setNow(Date.now());void load().catch(()=>undefined);},3000);return()=>window.clearInterval(timer);},[]);
 const anonymous=classId==='__anonymous__';
 const selectedClass=classes.find(c=>c.id===classId),students=selectedClass?.students?.filter(s=>s.active&&s.email)||[],roster=students.map(s=>s.email),candidates=useMemo(()=>[...new Map(lessons.filter(l=>lessonIds.includes(l.id)).flatMap(l=>l.characters).map(c=>[c.character,c])).values()],[lessons,lessonIds]);
 const [characterSelection,setSelectedCharacters]=useState<string[] | null>(null);
 // 課文語詞建議：取所選課文生字在字典中的例詞（2–4 字且含該字），老師再刪改。
 const suggestedLessonWords=useMemo(()=>[...new Set(candidates.flatMap(c=>c.readings.flatMap(r=>[...r.definition.matchAll(/\[例\]([^\n]*)/g)].flatMap(m=>m[1].split(/[、，。；\s]+/)).filter(word=>/^\p{Script=Han}{2,4}$/u.test(word)&&word.includes(c.character)))))].slice(0,120),[candidates]);
 const availableCharacters=candidates.filter(({character})=>gameType!=='structure'||teachingStructure(character,structureIds));
 const selectedCharacters=availableCharacters.map(row=>row.character).filter(character=>characterSelection===null||characterSelection.includes(character));
 const [manualDuration, setManualDuration] = useState(false);
 const estimatedMinutes = Math.max(1, Math.min(120, Math.ceil(questions.reduce((seconds, question) => seconds + question.seconds, 0) / 60)));
 const classroomMinutes = pilot && !manualDuration ? estimatedMinutes : duration;
 const completedRoomIds=rooms.filter(room=>room.status==='closed').map(room=>room.id);
 const removableIds=completedRoomIds.filter(id=>selectedRooms.includes(id));
 const allCompletedSelected=completedRoomIds.length>0&&removableIds.length===completedRoomIds.length;
 async function removeSelectedRooms(){
  if(!window.confirm(`移除選取的 ${removableIds.length} 堂課？成績紀錄會保留。`))return;
  const results=await Promise.allSettled(removableIds.map(id=>competitionRequest(`/rooms/${id}/archive`,{})));
  const removed=removableIds.filter((_,index)=>results[index].status==='fulfilled');
  setSelectedRooms(ids=>ids.filter(id=>!removed.includes(id)));
  setRooms(items=>items.filter(room=>!removed.includes(room.id)));
  await load();
  const failed=results.length-removed.length;
  setMessage(failed?`已移除 ${removed.length} 堂課，${failed} 堂未能移除，請重試。`:`已移除 ${removed.length} 堂課。`);
 }
 function patchQuestion(index:number,patch:Partial<CompetitionQuestion>){setQuestions(rows=>rows.map((row,i)=>i===index?{...row,...patch}:row));}
 function downloadQuestionExample(){const url=URL.createObjectURL(new Blob([questionCsvExample],{type:'text/csv;charset=utf-8'})),link=document.createElement('a');link.href=url;link.download='四選一題庫範例.csv';link.click();URL.revokeObjectURL(url);}
 async function importQuestions(file?:File){
  if(!file)return;setImportNotice('');
  try{if(file.size>1024*1024)throw Error('題庫檔案不可超過 1 MB。');const imported=parseQuestionCsv(await file.text());setQuestions(imported);setImportNotice(`已匯入 ${imported.length} 題，請確認內容後再建立開課大廳。`);}
  catch(error){setImportNotice((error as Error).message);}
 }
 function makeCards(){const rows=pilot?(lessonIds.length===1&&lessonIds[0]===lessonSeven.id?candidates.filter(row=>["際","璃","磁"].includes(row.character)):candidates.slice(0,3)):candidates.filter(row=>selectedCharacters.includes(row.character));if(gameType==='writing'){setQuestions(rows.map(c=>({type:'writing',character:c.character,prompt:`依筆順書寫「${c.character}」`,seconds:120})));setMessage(`已產生 ${rows.length} 題書寫題，請確認後開課。`);return;}if(gameType==='structure'){void run(async()=>{const cards=(await Promise.all(rows.map(c=>structureQuestion(c.character,structureIds,loadGameStrokes,overrides[c.character])))).filter((card):card is StructureQuestion=>card!==null);const detailed=cards.filter(card=>card.options.length===4).length;setQuestions(cards);setMessage(`已產生 ${cards.length} 題生字結構題（${detailed} 題細分結構四選一、${cards.length-detailed} 題八大類），請確認後開課。`);});return;}setQuestions(rows.map(c=>({type:'sentence-practice',prompt:`先想一個含「${c.character}」的語詞，再造一個完整句子`,phrase:showContextWords?(c.contextWord||c.character):c.character,character:c.character,reading:c.readings[0]?.reading||'',seconds:90})));setMessage(`已產生 ${rows.length} 張生字字卡，請預覽後開課。`);}
 if(previewCard) return <section className="competition-admin">
  <p>學生語音測試</p>
  <SentencePractice fixedCharacter={pilot} lessonTitle={pilot ? lessonSeven.title : undefined} initialCard={previewCard} correctionOption={<label className="secondary competition-real-ai"><input type="checkbox" checked={useRealAi} onChange={event=>setUseRealAi(event.target.checked)}/><span>使用真實 AI 校正與評量（按下校正或評量時使用 API 額度）</span></label>} simulated={!useRealAi} request={useRealAi ? sentenceRequest : previewRequest} onBack={()=>{setUseRealAi(false);setPreviewCard(null);}}/>
 </section>;
 return <section className="competition-admin">
  <details>
   <summary>課堂結束音效</summary>
   <div className="competition-actions">
    <label><input type="checkbox" checked={soundEnabled} onChange={event=>{const enabled=event.target.checked;setSoundEnabled(enabled);setEndSoundEnabled(enabled);}}/> 啟用結束音效</label>
    <label>音效音量 <input type="range" min={0} max={100} value={soundVolume} onChange={event=>{const volume=event.target.valueAsNumber;setSoundVolume(volume);setEndSoundVolume(volume);}}/> {soundVolume}%</label>
    <button className="secondary" type="button" disabled={!soundEnabled||soundVolume===0} onClick={()=>void playCompetitionEndSound().catch(()=>setMessage('無法播放結束音效，請再試一次。'))}>試聽結束音效</button>
   </div>
   <p>開關和音量會儲存在此瀏覽器。</p>
  </details>
  {!pilot && <button className="secondary" disabled={busy||!roster.length||!Number.isInteger(classroomMinutes)||classroomMinutes<1||classroomMinutes>120}
    onClick={()=>void run(async()=>{
      const {sentenceRequest}=await import("./sentenceApi");
      const session=await sentenceRequest<{code:string;expiresAt:number}>("/practice/open",{minutes:classroomMinutes,roster});
      setMessage(`個人 AI 造句代碼 ${session.code}，開放至 ${new Date(session.expiresAt).toLocaleString("zh-TW",{timeZone:"Asia/Taipei"})}。`);
    })}>依下方班級與時間開放個人 AI 造句</button>}
  <p className="competition-notice">依 Kahoot 開課流程，在同一畫面完成生字來源、課堂設定、公仔等候、倒數排行與結束結果。語音在學生裝置轉文字，只有確認送出時呼叫一次 AI；本場費用上限由題數與參與人數控制。</p>
  <div className="competition-section-heading"><div><span>STEP 1</span><h2>選擇班級與遊戲內容</h2></div></div>
  <div className="competition-form-grid"><label>班級<select value={classId} disabled={busy} onChange={e=>{setClassId(e.target.value);if(e.target.value==='__anonymous__')setMaxParticipants(value=>Math.min(value,30));}}><option value="">請選擇班級或匿名參加</option><option value="__anonymous__">匿名參加（小鳥公仔）</option>{classes.map(c=><option key={c.id} value={c.id}>{c.name}（{c.students?.filter(s=>s.active&&s.email).length??c.roster.length} 人）</option>)}</select></label><label>遊戲<select value={gameType} onChange={e=>{const nextType=e.target.value as typeof gameType;setGameType(nextType);setTitle(gameTitles[nextType]);setSelectedCharacters(null);setQuestions(e.target.value==='quiz'?[emptyQuestion()]:[]);}}>{Object.entries(gameTitles).map(([type, label]) => <option key={type} value={type}>{label}</option>)}</select></label><label>競賽名稱<input maxLength={100} value={title} onChange={e=>setTitle(e.target.value)}/></label><div><strong>學生加入方式</strong><p>{anonymous?'免登入：開課代碼＋暱稱＋小鳥公仔':'免登入：開課代碼＋名冊姓名'}</p><small>不需要 Google 或 SchoolIAM 帳號；開始後鎖定加入，逾時停止作答。</small></div><label>課堂時間（分鐘）<input type="number" min={1} max={120} value={classroomMinutes} onChange={e=>{setDuration(Number(e.target.value));setManualDuration(true);}}/></label><label>最多參與人數<input type="number" min={1} max={anonymous?30:100} value={maxParticipants} onChange={e=>setMaxParticipants(Number(e.target.value))}/></label></div>
  {pilot && <p>依目前 {questions.length} 題估算：{estimatedMinutes} 分鐘。{manualDuration && <button type="button" className="secondary" onClick={()=>setManualDuration(false)}>恢復自動估算</button>}</p>}
  {gameType!=='quiz'?<>
   <div className="competition-section-heading"><div><span>STEP 2</span><h2>勾選課文生字，自動製作字卡</h2></div><strong>{questions.length} 題</strong></div>
   {lessonIds.length===1&&lessonIds[0]===lessonSeven.id&&<details className="competition-pilot-data">
    <summary>查看輸入資料表 · {lessonSeven.title} · {lessonSeven.rows.length} 字</summary>
    <table><thead><tr><th>生字</th><th>讀音</th><th>字典釋義</th><th>來源</th></tr></thead>
    <tbody>{lessonSeven.rows.map(row=><tr key={row.character}><td>{row.character}</td><td>{row.reading}</td><td>{row.definition}</td><td>{row.source ? <a href={row.source} target="_blank" rel="noreferrer">字典條目</a> : "待補"}</td></tr>)}</tbody></table>
   </details>}
      <div className="sentence-toolbar"><label>年級<select value={grade} onChange={e=>{setGrade(Number(e.target.value));setLessonIds([]);setSelectedCharacters(null);setQuestions([]);}}><option value={5}>五年級</option><option value={6}>六年級</option></select></label><label>學期<select value={term} onChange={e=>{setTerm(e.target.value);setLessonIds([]);setSelectedCharacters(null);setQuestions([]);}}><option>上</option><option>下</option></select></label></div>
   <fieldset className="competition-lesson-picker"><legend>課文（可複選）</legend>{lessons.filter(l=>l.grade===grade&&l.term===term).map(l=><label key={l.id}><input type="checkbox" checked={lessonIds.includes(l.id)} onChange={e=>{setLessonIds(e.target.checked?[...lessonIds,l.id]:lessonIds.filter(id=>id!==l.id));setSelectedCharacters(null);setQuestions([]);}}/>{l.title}<small>{l.characters.length} 字</small></label>)}</fieldset>
   {!pilot && candidates.length > 0 && <fieldset className="competition-lesson-picker">
     <legend>挑選出題生字（可複選）</legend>
     <div className="competition-character-actions">
       <button type="button" className="secondary" disabled={busy||!availableCharacters.length||selectedCharacters.length===availableCharacters.length} onClick={()=>{setSelectedCharacters(null);setQuestions([]);}}>全選</button>
       <button type="button" className="secondary" disabled={busy||!selectedCharacters.length} onClick={()=>{setSelectedCharacters([]);setQuestions([]);}}>全部取消</button>
       <span role="status">已選 {selectedCharacters.length}／{availableCharacters.length} 字</span>
     </div>
     {availableCharacters.map(({character}) => <label key={character}>
       <input type="checkbox" checked={selectedCharacters.includes(character)} onChange={event=>{
         const checked=event.target.checked;
         setSelectedCharacters(checked?[...selectedCharacters,character]:selectedCharacters.filter(char=>char!==character));
         setQuestions([]);
       }}/>{character}
     </label>)}
   </fieldset>}
   {gameType==='sentence-practice'&&<label><input type="checkbox" checked={showContextWords} onChange={e=>{setShowContextWords(e.target.checked);setQuestions([]);}}/>顯示課文圈詞參考（未設定的生字待補；變更後請重新產生題目）</label>}
   {!pilot && <button className="secondary" disabled={busy||!candidates.some(row=>selectedCharacters.includes(row.character))} onClick={makeCards}><Plus size={18}/>依勾選生字生成{gameType==='structure'?'結構題':gameType==='writing'?'書寫題':'題目'}</button>}
   {!!questions.length&&<>{gameType==='sentence-practice'&&<p className="competition-budget">本場最多呼叫 AI <strong>{questions.length*maxParticipants}</strong> 次（{questions.length} 題 × {maxParticipants} 人）；模擬學生不呼叫 AI。</p>}<div className="competition-card-preview">{questions.map((q,index)=><article key={`${q.character}-${index}`}><button type="button" aria-label={`移除${q.character}`} onClick={()=>setQuestions(rows=>rows.filter((_,i)=>i!==index))}><Trash2 size={16}/></button><strong>{q.character}</strong><span>{q.type==='structure'?q.options?.[q.answer??-1]:q.type==='writing'?`書寫限時 ${q.seconds} 秒`:q.reading||'讀音待核對'}</span><p>{q.prompt}</p>{q.type==='sentence-practice'&&q.phrase&&q.phrase!==q.character&&<p>課文圈詞參考：<strong>{q.phrase}</strong></p>}{q.type==='sentence-practice'&&showContextWords&&(!q.phrase||q.phrase===q.character)&&<p>課文圈詞待補</p>}{q.type==='structure'&&overrides[q.character??'']&&<small className="structure-override-badge">已人工修正</small>}{q.type==='structure'&&role.admin&&editingStructure!==q.character&&<button type="button" className="secondary competition-preview-action" onClick={()=>setEditingStructure(q.character??null)}>修正結構</button>}{q.type==='structure'&&role.admin&&editingStructure===q.character&&<StructureOverrideEditor character={q.character!} current={overrides[q.character!]} guess={q.options?.[q.answer??-1]} onDone={value=>{if(value===undefined)setEditingStructure(null);else void run(()=>applyStructureOverride(q.character!,value));}}/>}{q.type==='sentence-practice'&&<button type="button" className="secondary competition-preview-action" onClick={()=>setPreviewCard({phrase:q.phrase??q.character??"",character:q.character??""})}>試作「{q.character}」</button>}</article>)}</div></>}{gameType==='structure'&&role.admin&&Object.keys(overrides).length>0&&<details className="structure-override-list"><summary>已人工修正的生字結構（{Object.keys(overrides).length} 字）</summary><ul>{Object.values(overrides).sort((a,b)=>a.character.localeCompare(b.character,'zh-Hant')).map(item=><li key={item.character}><strong>{item.character}</strong><span>{item.exclude?'不出結構題':item.subtype||`${item.structure}（八大類題）`}</span>{editingStructure===`list:${item.character}`?<StructureOverrideEditor character={item.character} current={item} onDone={value=>{if(value===undefined)setEditingStructure(null);else void run(()=>applyStructureOverride(item.character,value));}}/>:<button type="button" className="secondary" onClick={()=>setEditingStructure(`list:${item.character}`)}>修改</button>}</li>)}</ul></details>}
  </>:<>
   <div className="competition-section-heading"><div><span>STEP 2</span><h2>自訂 Kahoot 四選一遊戲題目</h2></div><strong>{questions.length} 題</strong></div>
   <details>
    <summary>上傳文章・AI 產生 12 題</summary>
    <p>文章將送至已設定的 AI 模型。涉及數量、比例或時間的題目，選項應寫出明確數字與適用單位，請開課前核對。</p>
    <label>上傳文章（TXT、MD、文字型 PDF）
      <input type="file" accept=".txt,.md,.pdf" disabled={busy} onChange={event => {
        const file = event.currentTarget.files?.[0];
        event.currentTarget.value = "";
        if (file) void run(async () => setArticle(await readQuizPassage(file)));
      }} />
    </label>
    <label>文章內容<textarea rows={8} maxLength={12000} value={article} disabled={busy} onChange={event => setArticle(event.target.value)} /></label>
    <button type="button" className="secondary" disabled={busy || !selectedClass || !roster.length || !article.trim() || article.length > 12000} onClick={() => void run(async () => {
      if (questions.some(question => question.prompt.trim()) && !window.confirm("用生成的 12 題取代目前題目？")) return;
      const drafts = [];
      for (const category of ["課文理解（閱讀素養）", "文意理解"]) {
        const paper = await quizRequest<QuizPaper>("/generate", {
          title: "Kahoot 文章閱讀草稿", className: selectedClass!.name,
          grade, lesson: "文章閱讀。量化問題的四個選項必須使用明確阿拉伯數字及適用單位，正解須能由文章核對。",
          passage: article.trim(), questionMode: "original", roster,
          count: 6, categories: [category], difficulty: "中",
        });
        drafts.push(...paper.questions);
      }
      if (drafts.length !== 12 || new Set(drafts.map(question => question.stem.replace(/[\s\p{P}]/gu, ""))).size !== 12) {
        throw Error("AI 未產出 12 道不同題目，請重新產生。");
      }
      if (drafts.some(question => /多少|幾(?:個|次|人|年|月|天|小時|分鐘|公尺|元|倍|％|%)/u.test(question.stem) &&
        !/[0-9０-９]/u.test(question.options[question.answer] ?? ""))) {
        throw Error("AI 出題含有未給出明確數字答案的量化題，請重新產生。");
      }
      setQuestions(drafts.map(question => ({
        prompt: question.stem, options: question.options, answer: question.answer, seconds: 30,
      })));
      setMessage("已帶入 12 題，請核對題目、答案與數字單位，再建立開課大廳。");
    })}>AI 產生 12 題</button>
    {!roster.length && <p>請先選擇有學生名冊的班級。</p>}
   </details>
   <div className="competition-question-import"><button type="button" className="secondary" onClick={downloadQuestionExample}><Download size={18}/>下載題庫範例</button><label className="secondary competition-upload"><Upload size={18}/><span>上傳 CSV 題庫</span><input type="file" accept=".csv,text/csv" onChange={event=>{void importQuestions(event.target.files?.[0]);event.currentTarget.value='';}}/></label><span>下載範例後可用 Excel 編輯，再以相同欄位上傳；一次最多 100 題。</span></div>
   {importNotice&&<p className="competition-import-notice" role="status">{importNotice}</p>}
   <div className="competition-question-list">{questions.map((q,index)=><article className="competition-question-editor" key={index}><div className="competition-question-title"><strong>第 {index+1} 題</strong><button type="button" className="secondary" disabled={questions.length===1} onClick={()=>setQuestions(rows=>rows.filter((_,i)=>i!==index))}><Trash2 size={16}/>移除</button></div><label>題目<input maxLength={500} value={q.prompt} onChange={e=>patchQuestion(index,{prompt:e.target.value})}/></label><div className="competition-options">{q.options!.map((option,optionIndex)=><label key={optionIndex} className={q.answer===optionIndex?'is-answer':''}><input type="radio" name={`answer-${index}`} checked={q.answer===optionIndex} onChange={()=>patchQuestion(index,{answer:optionIndex})}/><span>{String.fromCharCode(65+optionIndex)}</span><input aria-label={`第 ${index+1} 題選項 ${optionIndex+1}`} value={option} onChange={e=>patchQuestion(index,{options:q.options!.map((v,i)=>i===optionIndex?e.target.value:v)})}/></label>)}</div></article>)}</div><button className="secondary" disabled={questions.length>=100} onClick={()=>setQuestions(rows=>[...rows,emptyQuestion()])}><Plus size={18}/>新增題目</button>
  </>}
  {gameType==='sentence-practice'&&<SentenceRubricEditor draft={rubricDraft} onChange={setRubricDraft} disabled={busy} locked={rubricLocked} onLockedChange={setRubricLocked} lessonWords={lessonWordsText} onLessonWordsChange={setLessonWordsText} suggestedWords={suggestedLessonWords}/>}
  <div className="competition-actions">{pilot && <label className="primary competition-test-toggle"><input type="checkbox" checked={testRoom} onChange={e=>setTestRoom(e.target.checked)}/><span>虛擬課堂測試用（非正式）</span></label>}{pilot && gameType === "sentence-practice" && <button className="secondary" disabled={busy||!candidates.length} onClick={makeCards}><Plus size={18}/>依勾選課文自動生成題目</button>}<button className="primary" disabled={busy||(!anonymous&&(!selectedClass||!roster.length))||!title.trim()||!questions.length||classroomMinutes<1||classroomMinutes>120||maxParticipants<1||maxParticipants>(anonymous?30:100)||gameType==='quiz'&&questions.some(q=>!q.prompt.trim()||q.options?.some(o=>!o.trim()))||gameType==='sentence-practice'&&(!!rubricProblem(rubricDraft,lessonWordsText)||!rubricLocked)} onClick={()=>void run(async()=>{await competitionRequest('/rooms',{...(gameType==='sentence-practice'?{rubric:rubricFromDraft(rubricDraft),...(rubricDraft.lesson.enabled?{lessonWords:parseLessonWords(lessonWordsText)}:{})}:{}),title,lessonTitles:gameType==='quiz'?[]:lessons.filter(lesson=>lessonIds.includes(lesson.id)).map(lesson=>lesson.title),classId:anonymous?'':selectedClass!.id,className:anonymous?'匿名參加':selectedClass!.name,students:anonymous?[]:students,roster:anonymous?[]:roster,questions,gameType,loginMode:anonymous?'anonymous':'roster',duration:classroomMinutes*60,maxParticipants,testRoom});setQuestions(gameType==='quiz'?[emptyQuestion()]:[]);await load();setMessage('課堂大廳已建立，請先確認學生與公仔，再開始課程。');})}><Send size={18}/>建立開課大廳</button></div>
  <div className="competition-section-heading"><div><span>STEP 3</span><h2>公仔等候、倒數排行與結束</h2></div><button className="secondary" disabled={busy} onClick={()=>void run(load)}><RefreshCw size={18}/>更新</button></div>
  <div className="competition-actions">
    <button className="secondary" disabled={busy||!completedRoomIds.length} onClick={()=>setSelectedRooms(allCompletedSelected?[]:completedRoomIds)}>
      {allCompletedSelected?'取消全選':'全選已結束課堂'}
    </button>
    <button className="secondary" disabled={busy||!removableIds.length} onClick={()=>void run(removeSelectedRooms)}><Trash2 size={18}/>移除選取課堂（{removableIds.length}）</button>
  </div>
  <dialog ref={startDialog} className="sentence-start-dialog" aria-labelledby="sentence-start-title" onCancel={()=>setStartConfirm(null)}>
   {startConfirm&&<><h2 id="sentence-start-title">開始「{startConfirm.title}」前，請確認造句評分規則</h2>
    <SentenceRubricList rubric={startConfirm.rubric??DEFAULT_RUBRIC.map(item=>{const base=RUBRIC_ITEMS.find(entry=>entry.key===item.key)!;return {key:base.key,label:base.label,kind:base.kind,points:item.points};})} title={startConfirm.rubric?'本場評分規則':'本場評分規則（原本固定五項）'}/>
    <p>開始後學生作答即依這些規則由 AI 評分，課堂進行中無法修改。</p>
    <div className="competition-actions"><button type="button" className="primary" autoFocus onClick={()=>{const room=startConfirm;setStartConfirm(null);startRoom(room);}}><Play size={18}/>確認規則並開始課程</button><button type="button" className="secondary" onClick={()=>setStartConfirm(null)}>取消</button></div></>}
  </dialog>
  <div className="competition-room-list">{rooms.map(room=>{const url=competitionJoinUrl(room.code),items=people[room.id]||[],deadline=room.status==='closed'?(room.closedAt??room.expiresAt??now):now,remaining=room.expiresAt?Math.max(0,Math.ceil((room.expiresAt-deadline)/1000)):room.duration,podium=podiumLayout(Math.min(items.length,podiumColumns.length)),remainingPercent=Math.min(100,Math.max(0,Math.ceil(remaining/Math.max(1,room.duration)*100)));return <CompetitionRoomPanel room={room} initiallyOpen={observedOpenRooms.current.has(room.id)} key={room.id}>{room.status==='lobby'&&<div className="competition-lobby-toolbar"><button type="button" className="secondary" onClick={async event=>{
 const panel=event.currentTarget.closest('article');
 try{if(document.fullscreenElement===panel)await document.exitFullscreen();else if(panel?.requestFullscreen)await panel.requestFullscreen();else setMessage('此瀏覽器不支援全螢幕。');}catch{setMessage('無法切換全螢幕。');}
}}><span className="competition-lobby-enter"><Maximize size={18}/>全螢幕</span><span className="competition-lobby-exit"><Minimize size={18}/>離開全螢幕</span></button></div>}<div className="competition-room-main"><div><span className={`competition-status ${room.status}`}>{room.status==='lobby'?'等待加入':room.status==='running'?'競賽中':'已結束'}</span>{room.testRoom&&<span className="competition-test-badge">獨立測試</span>}<h3>{room.title}</h3>{room.status==='closed'&&<label><input type="checkbox" aria-label={`選取課堂：${room.title}`} checked={selectedRooms.includes(room.id)} disabled={busy} onChange={event=>{const checked=event.target.checked;setSelectedRooms(ids=>checked?[...ids,room.id]:ids.filter(id=>id!==room.id));}}/> 選取移除</label>}<p>{room.className} · {room.questionCount} 題 · {room.gameType==='sentence-practice'?'一字多詞 AI 造句':room.gameType==='structure'?'生字結構遊戲':room.gameType==='writing'?'書寫生字遊戲':'自訂 Kahoot 四選一遊戲'}</p>{room.status==='lobby'&&<div className="competition-room-code"><span>開課代碼</span><strong>{room.code}</strong></div>}</div>{room.status==='lobby'&&<div className="competition-qr"><QRCodeSVG value={url} size={280} marginSize={4}/><span>{items.length} 位學生已加入</span></div>}</div>
   {room.status==='lobby'&&<div className="competition-attendees">{items.map(item=><div key={item.uid}><Avatar item={item}/><span>{item.seat?`${item.seat}號 `:''}{item.name}</span></div>)}{!items.length&&<p>尚無學生加入。</p>}</div>}
   {room.status==='closed'&&<CompetitionFinalRanking room={room} items={items} allowExport soundControls autoSave={!room.testRoom&&observedOpenRooms.current.has(room.id)}/>}
   {room.status==='running'&&<section className="competition-rank-board"><header className="competition-rank-heading"><h3>{room.title}</h3><p>{room.lessonTitles?.length?room.lessonTitles.join('、'):'課文未記錄'} · {room.questionCount} 題 · {room.className||'匿名競賽'}</p></header><div className="competition-rank-toolbar">
    <button type="button" className="secondary" onClick={async event=>{
     const board=event.currentTarget.closest('section');
     try {
      if(document.fullscreenElement===board)await document.exitFullscreen();
      else if(board?.requestFullscreen)await board.requestFullscreen();
      else setMessage('此瀏覽器不支援全螢幕。');
     } catch {setMessage('無法切換全螢幕。');}
    }}><span className="competition-enter-fullscreen">排行全螢幕</span><span className="competition-exit-fullscreen">離開全螢幕</span></button>
    <div className="competition-countdown competition-countdown-ring" role="progressbar" aria-label="課堂剩餘時間百分比" aria-valuemin={0} aria-valuemax={100} aria-valuenow={remainingPercent} aria-valuetext={`剩餘 ${remainingPercent}%，${Math.floor(remaining/60)} 分 ${remaining%60} 秒`}><svg viewBox="0 0 120 120" aria-hidden="true"><circle cx="60" cy="60" r="52" fill="none" stroke="#ffffff33" strokeWidth="8"/><circle cx="60" cy="60" r="52" fill="none" stroke="#ffd76a" strokeWidth="8" pathLength="100" strokeDasharray={`${remainingPercent} 100`} transform="rotate(-90 60 60)"/></svg><div><span>剩餘時間</span><strong>{remainingPercent}%</strong><small>{String(Math.floor(remaining/60)).padStart(2,'0')}:{String(remaining%60).padStart(2,'0')}</small></div></div>
    </div><div className="competition-podium competition-centered-podium" style={{gridTemplateColumns:Array.from({length:podium.columns},(_,index)=>index===Math.floor(podium.columns/2)?'1.3fr':'1fr').join(' '),'--podium-columns':podium.columns} as CSSProperties}>
     {items.slice(0,podiumColumns.length).map((item,index)=><div key={item.uid} style={{gridColumn:podium.positions[index],paddingBottom:`calc(${Math.min(items.length,7)-1-index} * var(--podium-step))`}}><b>{item.rank}</b><Avatar item={item}/><strong className="competition-rank-name">{item.name}</strong><strong className="competition-rank-score">{item.points} 分</strong><span>{item.answered}/{room.questionCount} 題</span></div>)}
    </div>
    {items.length>podiumColumns.length&&<p className="competition-other-ranks">其他學生：{items.slice(podiumColumns.length).map(item=>`${item.name} ${item.answered}/${room.questionCount}`).join('、')}</p>}
   </section>}
   <div className="competition-actions">{room.status==='lobby'&&<a className="secondary" href={url+"&confirm=1"} target="_blank" rel="noopener noreferrer"><Users size={18}/>開啟學生加入頁（新分頁）</a>}<button className="primary" disabled={busy||room.status!=='lobby'} onClick={()=>{if(room.gameType==='sentence-practice'){void primeCompetitionEndSound();setStartConfirm(room);}else startRoom(room);}}><Play size={18}/>開始課程並鎖定加入</button>{room.testRoom&&<button className="secondary" disabled={busy||room.status==='closed'} onClick={()=>void run(async()=>{const value=await competitionRequest<{items:LeaderboardItem[]}>(`/rooms/${room.id}/simulate`,{});setPeople(v=>({...v,[room.id]:value.items}));setMessage(room.status==='lobby'?'已加入5位隔離模擬學生。':'模擬學生已完成一輪練習。');})}><Users size={18}/>模擬學生練習</button>}<button className="secondary" disabled={busy||room.status==='closed'} onClick={()=>void run(async()=>{await competitionRequest(`/rooms/${room.id}/close`,{});setSoundEnabled(true);await playClosedCompetitionSound(room.id).catch(()=>setMessage("課堂已結束；瀏覽器阻擋音效，請按試聽結束音效。"));await load();})}><Square size={18}/>結束並保留排行</button><button className="secondary" disabled={busy} onClick={()=>void run(()=>roomState(room))}><Trophy size={18}/>更新排名</button></div>
   {room.testRoom && room.gameType==='sentence-practice' && (() => {
    const card=room.questions?.find(question=>question.character);
    const character=card?.character;
    return character && <div className="competition-actions"><button className="secondary competition-preview-action" onClick={()=>setPreviewCard({phrase:card?.phrase||character,character})}>開啟學生語音測試</button></div>;
   })()}
  </CompetitionRoomPanel>})}</div><p role="status">{message}</p>
 </section>;
}
