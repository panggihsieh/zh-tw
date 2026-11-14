import {useEffect,useMemo,useState} from 'react';
import {Copy,Play,Plus,RefreshCw,Send,Square,Trash2,Trophy,Users} from 'lucide-react';
import {QRCodeSVG} from 'qrcode.react';
import {quizRequest} from './quizApi';
import type {QuizClass} from './ClassRoster';
import {sentenceRequest,type SentenceLesson} from './sentenceApi';
import {competitionJoinUrl,competitionRequest,type CompetitionParticipant,type CompetitionQuestion,type CompetitionRoom,type LeaderboardItem} from './competitionApi';
import './competition.css';
import SentencePractice from './SentencePractice';

async function previewRequest<T>(path: string, body?: unknown): Promise<T> {
 const sentence = body as { transcript?: string; sentence?: string };
 if (path === '/practice/correct') return { suggestion: sentence.transcript ?? '' } as T;
 return { grade: {
  level: '模擬評量', total:85, scores: { correctness:30, completeness:20, fluency:15, detail:15, mechanics:5 },
  feedback: '這是測試回饋，可用來確認送出後的畫面。',
  polished: (sentence.sentence ?? '').trim().replace(/([^。！？!?])$/u, '$1。'),
 } } as T;
}

const emptyQuestion=():CompetitionQuestion=>({prompt:'',options:['','','',''],answer:0,seconds:30});
function Avatar({item}:{item:Pick<CompetitionParticipant,'avatar'|'avatarKind'|'name'>}){
 if(item.avatarKind==='custom'&&item.avatar)return <img className="competition-avatar" src={item.avatar} alt={`${item.name}的公仔`}/>;
 if(item.avatarKind==='anonymous')return <span className="competition-avatar anonymous" aria-label="匿名公仔">?</span>;
 return <img className="competition-avatar" src={`${import.meta.env.BASE_URL}mascot/green-bird.png`} alt="系統預設小畫眉公仔"/>;
}
export default function CompetitionAdmin(){
 const [selectedRooms,setSelectedRooms]=useState<string[]>([]);
 const [useRealAi,setUseRealAi]=useState(false);
 const [previewCard,setPreviewCard]=useState<{phrase:string;character:string}|null>(null);
 const [classes,setClasses]=useState<QuizClass[]>([]),[classId,setClassId]=useState(''),[title,setTitle]=useState('一字多詞 Kahoot 練習'),[questions,setQuestions]=useState<CompetitionQuestion[]>([]),[rooms,setRooms]=useState<CompetitionRoom[]>([]),[people,setPeople]=useState<Record<string,LeaderboardItem[]>>({}),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
 const [lessons,setLessons]=useState<SentenceLesson[]>([]),[lessonIds,setLessonIds]=useState<string[]>([]),[grade,setGrade]=useState(5),[term,setTerm]=useState('上'),[gameType,setGameType]=useState<'sentence-practice'|'quiz'>('sentence-practice'),[loginMode,setLoginMode]=useState<'roster'|'anonymous'>('roster'),[duration,setDuration]=useState(10),[maxParticipants,setMaxParticipants]=useState(30),[testRoom,setTestRoom]=useState(false),[now,setNow]=useState(Date.now());
 async function run(fn:()=>Promise<void>){setBusy(true);setMessage('');try{await fn();}catch(e){setMessage((e as Error).message);}finally{setBusy(false);}}
 async function roomState(room:CompetitionRoom){const path=room.status==='lobby'?'lobby':'leaderboard';const value=await competitionRequest<{items:LeaderboardItem[]}>(`/rooms/${room.id}/${path}`);setPeople(v=>({...v,[room.id]:value.items}));}
 async function load(){const [roomData,classData]=await Promise.all([competitionRequest<{items:CompetitionRoom[]}>('/rooms'),quizRequest<{items:QuizClass[]}>('/classes')]);setRooms(roomData.items);setClasses(classData.items);if(!classId&&classData.items[0])setClassId(classData.items[0].id);await Promise.all(roomData.items.slice(0,8).map(room=>roomState(room).catch(()=>undefined)));}
 useEffect(()=>{const controller=new AbortController();fetch(`${import.meta.env.BASE_URL}sentence-bank.json`,{signal:controller.signal}).then(r=>{if(!r.ok)throw Error('課文生字庫載入失敗');return r.json();}).then(v=>setLessons(v.lessons)).catch(e=>{if(!controller.signal.aborted)setMessage(e.message)});void run(load);return()=>controller.abort();},[]);
 useEffect(()=>{const timer=window.setInterval(()=>{setNow(Date.now());void load().catch(()=>undefined);},3000);return()=>window.clearInterval(timer);},[]);
 const selectedClass=classes.find(c=>c.id===classId),students=selectedClass?.students?.filter(s=>s.active&&s.email)||[],roster=students.map(s=>s.email),candidates=useMemo(()=>[...new Map(lessons.filter(l=>lessonIds.includes(l.id)).flatMap(l=>l.characters).map(c=>[c.character,c])).values()],[lessons,lessonIds]);
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
 function makeCards(){setQuestions(candidates.map(c=>({type:'sentence-practice',prompt:`先想一個含「${c.character}」的語詞，再造一個完整句子`,phrase:c.character,character:c.character,reading:c.readings[0]?.reading||'',seconds:90})));setMessage(`已依勾選課文自動產生 ${candidates.length} 張生字字卡，請預覽後開課。`);}
 if(previewCard) return <section className="competition-admin">
  <p>學生語音測試</p>
  <SentencePractice initialCard={previewCard} correctionOption={<label className="secondary competition-real-ai"><input type="checkbox" checked={useRealAi} onChange={event=>setUseRealAi(event.target.checked)}/><span>使用真實 AI 校正與評量（按下校正或評量時使用 API 額度）</span></label>} simulated={!useRealAi} request={useRealAi ? sentenceRequest : previewRequest} onBack={()=>{setUseRealAi(false);setPreviewCard(null);}}/>
 </section>;
 return <section className="competition-admin">
  <p className="competition-notice">依 Kahoot 開課流程，在同一畫面完成生字來源、課堂設定、公仔等候、倒數排行與結束結果。語音在學生裝置轉文字，只有確認送出時呼叫一次 AI；本場費用上限由題數與參與人數控制。</p>
  <div className="competition-section-heading"><div><span>STEP 1</span><h2>選擇班級與遊戲內容</h2></div></div>
  <div className="competition-form-grid"><label>班級<select value={classId} disabled={busy} onChange={e=>setClassId(e.target.value)}><option value="">請先建立班級名冊</option>{classes.map(c=><option key={c.id} value={c.id}>{c.name}（{c.students?.filter(s=>s.active&&s.email).length??c.roster.length} 人）</option>)}</select></label><label>遊戲<select value={gameType} onChange={e=>{setGameType(e.target.value as typeof gameType);setQuestions(e.target.value==='quiz'?[emptyQuestion()]:[]);}}><option value="sentence-practice">一字多詞 AI 造句</option><option value="quiz">四選一選擇題</option></select></label><label>競賽名稱<input maxLength={100} value={title} onChange={e=>setTitle(e.target.value)}/></label><label>加入方式<select value={loginMode} onChange={e=>setLoginMode(e.target.value as typeof loginMode)}><option value="roster">班級名冊</option><option value="anonymous">Google 登入後匿名顯示</option></select></label><label>課堂時間（分鐘）<input type="number" min={1} max={120} value={duration} onChange={e=>setDuration(Number(e.target.value))}/></label><label>最多參與人數<input type="number" min={1} max={100} value={maxParticipants} onChange={e=>setMaxParticipants(Number(e.target.value))}/></label></div>
  {gameType==='sentence-practice'?<>
   <div className="competition-section-heading"><div><span>STEP 2</span><h2>勾選課文生字，自動製作字卡</h2></div><strong>{questions.length} 題</strong></div>
   <div className="sentence-toolbar"><label>年級<select value={grade} onChange={e=>{setGrade(Number(e.target.value));setLessonIds([]);setQuestions([]);}}><option value={5}>五年級</option><option value={6}>六年級</option></select></label><label>學期<select value={term} onChange={e=>{setTerm(e.target.value);setLessonIds([]);setQuestions([]);}}><option>上</option><option>下</option></select></label></div>
   <fieldset className="competition-lesson-picker"><legend>課文（可複選）</legend>{lessons.filter(l=>l.grade===grade&&l.term===term).map(l=><label key={l.id}><input type="checkbox" checked={lessonIds.includes(l.id)} onChange={e=>{setLessonIds(e.target.checked?[...lessonIds,l.id]:lessonIds.filter(id=>id!==l.id));setQuestions([]);}}/>{l.title}<small>{l.characters.length} 字</small></label>)}</fieldset>
   <button className="secondary" disabled={busy||!candidates.length} onClick={makeCards}><Plus size={18}/>依勾選課文自動生成題目</button>
   {!!questions.length&&<><p className="competition-budget">本場最多呼叫 AI <strong>{questions.length*maxParticipants}</strong> 次（{questions.length} 題 × {maxParticipants} 人）；模擬學生不呼叫 AI。</p><div className="competition-card-preview">{questions.map((q,index)=><article key={`${q.character}-${index}`}><button type="button" aria-label={`移除${q.character}`} onClick={()=>setQuestions(rows=>rows.filter((_,i)=>i!==index))}><Trash2 size={16}/></button><strong>{q.character}</strong><span>{q.reading||'讀音待核對'}</span><p>{q.prompt}</p></article>)}</div></>}
  </>:<>
   <div className="competition-section-heading"><div><span>STEP 2</span><h2>輸入選擇題</h2></div><strong>{questions.length} 題</strong></div>
   <div className="competition-question-list">{questions.map((q,index)=><article className="competition-question-editor" key={index}><div className="competition-question-title"><strong>第 {index+1} 題</strong><button type="button" className="secondary" disabled={questions.length===1} onClick={()=>setQuestions(rows=>rows.filter((_,i)=>i!==index))}><Trash2 size={16}/>移除</button></div><label>題目<input maxLength={500} value={q.prompt} onChange={e=>patchQuestion(index,{prompt:e.target.value})}/></label><div className="competition-options">{q.options!.map((option,optionIndex)=><label key={optionIndex} className={q.answer===optionIndex?'is-answer':''}><input type="radio" name={`answer-${index}`} checked={q.answer===optionIndex} onChange={()=>patchQuestion(index,{answer:optionIndex})}/><span>{String.fromCharCode(65+optionIndex)}</span><input aria-label={`第 ${index+1} 題選項 ${optionIndex+1}`} value={option} onChange={e=>patchQuestion(index,{options:q.options!.map((v,i)=>i===optionIndex?e.target.value:v)})}/></label>)}</div></article>)}</div><button className="secondary" disabled={questions.length>=100} onClick={()=>setQuestions(rows=>[...rows,emptyQuestion()])}><Plus size={18}/>新增題目</button>
  </>}
  <div className="competition-actions"><button className="primary" disabled={busy||!selectedClass||loginMode==='roster'&&!roster.length||!title.trim()||!questions.length||duration<1||duration>120||maxParticipants<1||maxParticipants>100||gameType==='quiz'&&questions.some(q=>!q.prompt.trim()||q.options?.some(o=>!o.trim()))} onClick={()=>void run(async()=>{await competitionRequest('/rooms',{title,classId:selectedClass!.id,className:selectedClass!.name,students,roster,questions,gameType,loginMode,duration:duration*60,maxParticipants,testRoom});setQuestions(gameType==='quiz'?[emptyQuestion()]:[]);await load();setMessage('課堂大廳已建立，請先確認學生與公仔，再開始課程。');})}><Send size={18}/>建立開課大廳</button><label className="primary competition-test-toggle"><input type="checkbox" checked={testRoom} onChange={e=>setTestRoom(e.target.checked)}/><span>虛擬課堂測試用（非正式）</span></label></div>
  <div className="competition-section-heading"><div><span>STEP 3</span><h2>公仔等候、倒數排行與結束</h2></div><button className="secondary" disabled={busy} onClick={()=>void run(load)}><RefreshCw size={18}/>更新</button></div>
  <div className="competition-actions">
    <button className="secondary" disabled={busy||!completedRoomIds.length} onClick={()=>setSelectedRooms(allCompletedSelected?[]:completedRoomIds)}>
      {allCompletedSelected?'取消全選':'全選已結束課堂'}
    </button>
    <button className="secondary" disabled={busy||!removableIds.length} onClick={()=>void run(removeSelectedRooms)}><Trash2 size={18}/>移除選取課堂（{removableIds.length}）</button>
  </div>
  <div className="competition-room-list">{rooms.map(room=>{const url=competitionJoinUrl(room.code),items=people[room.id]||[],deadline=room.status==='closed'?(room.closedAt??room.expiresAt??now):now,remaining=room.expiresAt?Math.max(0,Math.ceil((room.expiresAt-deadline)/1000)):room.duration;return <article className="competition-room" key={room.id}><div className="competition-room-main"><div><span className={`competition-status ${room.status}`}>{room.status==='lobby'?'等待加入':room.status==='running'?'競賽中':'已結束'}</span>{room.testRoom&&<span className="competition-test-badge">獨立測試</span>}<h3>{room.title}</h3>{room.status==='closed'&&<label><input type="checkbox" aria-label={`選取課堂：${room.title}`} checked={selectedRooms.includes(room.id)} disabled={busy} onChange={event=>{const checked=event.target.checked;setSelectedRooms(ids=>checked?[...ids,room.id]:ids.filter(id=>id!==room.id));}}/> 選取移除</label>}<p>{room.className} · {room.questionCount} 題 · {room.gameType==='sentence-practice'?'一字多詞 AI 造句':'四選一'}</p><div className="competition-room-code"><span>開課代碼</span><strong>{room.code}</strong><button className="secondary" onClick={()=>void navigator.clipboard.writeText(url)}><Copy size={17}/>複製連結</button></div></div>{room.status==='lobby'&&<div className="competition-qr"><QRCodeSVG value={url} size={150}/><span>{items.length} 位學生已加入</span></div>}</div>
   {room.status==='lobby'&&<div className="competition-attendees">{items.map(item=><div key={item.uid}><Avatar item={item}/><span>{item.seat?`${item.seat}號 `:''}{item.name}</span></div>)}{!items.length&&<p>尚無學生加入。</p>}</div>}
   {room.status!=='lobby'&&<section className="competition-rank-board"><div className="competition-countdown"><span>課堂倒數</span><strong>{String(Math.floor(remaining/60)).padStart(2,'0')}:{String(remaining%60).padStart(2,'0')}</strong></div><div className="competition-podium">{items.slice(0,5).map(item=><div key={item.uid}><b>{item.rank}</b><Avatar item={item}/><strong>{item.name}</strong><span>{item.points} 分 · {item.answered}/{room.questionCount}</span></div>)}</div>{items.length>5&&<p>其他學生：{items.slice(5).map(item=>`${item.name} ${item.answered}/${room.questionCount}`).join('、')}</p>}</section>}
   <div className="competition-actions"><button className="primary" disabled={busy||room.status!=='lobby'} onClick={()=>void run(async()=>{await competitionRequest(`/rooms/${room.id}/start`,{});await load();})}><Play size={18}/>開始課程並鎖定加入</button>{room.testRoom&&<button className="secondary" disabled={busy||room.status==='closed'} onClick={()=>void run(async()=>{const value=await competitionRequest<{items:LeaderboardItem[]}>(`/rooms/${room.id}/simulate`,{});setPeople(v=>({...v,[room.id]:value.items}));setMessage(room.status==='lobby'?'已加入5位隔離模擬學生。':'模擬學生已完成一輪練習。');})}><Users size={18}/>模擬學生練習</button>}<button className="secondary" disabled={busy||room.status==='closed'} onClick={()=>void run(async()=>{await competitionRequest(`/rooms/${room.id}/close`,{});await load();})}><Square size={18}/>結束並保留排行</button><button className="secondary" disabled={busy} onClick={()=>void run(()=>roomState(room))}><Trophy size={18}/>更新排名</button></div>
   {room.testRoom && room.gameType==='sentence-practice' && (() => {
    const card=room.questions?.find(question=>question.character);
    const character=card?.character;
    return character && <div className="competition-actions"><button className="secondary" onClick={()=>setPreviewCard({phrase:card?.phrase||character,character})}>開啟學生語音測試</button></div>;
   })()}
  </article>})}</div><p role="status">{message}</p>
 </section>;
}
