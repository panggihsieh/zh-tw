import {useEffect,useRef,useState} from 'react';
import {outlinePath,tracePath,type Point} from './writingGame';
import {stopStrokeSpeech,useStrokeSpeech} from './strokeSpeech';
import {Pause,Play,SkipForward,RotateCcw,Grid2X2,Maximize,Minimize} from 'lucide-react';
interface Stroke {outline:any[];track:Point[]}
export default function StrokePlayback({character}:{character:string}){
 const [strokes,setStrokes]=useState<Stroke[]|null>(null),[index,setIndex]=useState(0),[playing,setPlaying]=useState(false),[finished,setFinished]=useState(false),[error,setError]=useState('');
 const voice=useStrokeSpeech(character,strokes,'practice',true);
 const [speed,setSpeed]=useState('中'),[grid,setGrid]=useState(true),[fullscreen,setFullscreen]=useState(false),[cycle,setCycle]=useState(0);
 const stage=useRef<HTMLDivElement>(null),remaining=useRef(1600),generation=useRef(0);
 const duration=speed==='快'?800:speed==='慢'?2400:1600;
 useEffect(()=>{const update=()=>setFullscreen(document.fullscreenElement===stage.current);document.addEventListener('fullscreenchange',update);return()=>document.removeEventListener('fullscreenchange',update);},[]);
 const narrator=useRef(voice.narrate);narrator.current=voice.narrate;
 useEffect(()=>{const abort=new AbortController();setStrokes(null);setIndex(0);setPlaying(false);setFinished(false);setError('');
  void fetch(`/game-strokes/${character.codePointAt(0)!.toString(16)}.json`,{signal:abort.signal}).then(async response=>{if(!response.ok)throw Error('此字尚無可用筆順資料。');const data=await response.json();if(!Array.isArray(data)||!data.length)throw Error('此字尚無可用筆順資料。');if(!abort.signal.aborted)setStrokes(data);}).catch(error=>{if(!abort.signal.aborted)setError(error.message);});
  return()=>{abort.abort();stopStrokeSpeech();};
 },[character]);
 useEffect(()=>{if(!playing||!strokes)return;let active=true;let timer:ReturnType<typeof setTimeout>;
 const started=performance.now(),run=generation.current;
  const animation=new Promise<void>(resolve=>{timer=setTimeout(resolve,remaining.current);});
  void Promise.all([animation,narrator.current(index)]).then(()=>{if(!active)return;active=false;remaining.current=duration;if(index+1===strokes.length){setPlaying(false);setFinished(true);}else setIndex(index+1);});
  return()=>{if(active&&run===generation.current)remaining.current=Math.max(0,remaining.current-(performance.now()-started));active=false;clearTimeout(timer);stopStrokeSpeech();};
 },[playing,index,strokes,voice.enabled,duration,cycle]);
 function pause(){setPlaying(false);stopStrokeSpeech();}
 function replay(){generation.current++;pause();remaining.current=duration;setIndex(0);setFinished(false);setCycle(x=>x+1);setPlaying(true);}
 async function toggleFullscreen(){try{if(document.fullscreenElement===stage.current)await document.exitFullscreen();else await stage.current?.requestFullscreen();}catch{setError('瀏覽器目前無法開啟全螢幕。');}}
 return <div className="stroke-playback" ref={stage}><p>「{character}」逐筆播放 · {strokes?`第 ${index+1}／${strokes.length} 筆`:error||'載入筆順中…'}</p>
  <div className="stroke-speech-controls"><small>{voice.available?'筆畫語音已開啟':voice.status}</small></div>
  <svg viewBox="0 0 2048 2048" className="stroke-playback-pad" aria-label={`筆順播放區 ${character}`}>{grid&&<path d="M1024 0V2048M0 1024H2048M0 0L2048 2048M2048 0L0 2048" stroke="#ccd9bd" strokeDasharray="24 24" fill="none"/>}
   {strokes?.map((stroke,i)=><path key={i} d={outlinePath(stroke.outline)} fill={i<index||finished?'#285d45':'#edf1e8'}/>)}
   {!finished&&strokes?.[index]&&<><path d={outlinePath(strokes[index].outline)} fill="#ead6a4"/><path key={`${index}-${cycle}-${speed}`} className="stroke-motion" style={{animationDuration:`${duration}ms`,animationPlayState:playing?'running':'paused'}} pathLength="1" d={tracePath(strokes[index].track)} fill="none" stroke="#175d9a" strokeWidth="25" strokeLinecap="round"/><circle cx={strokes[index].track[0].x} cy={strokes[index].track[0].y} r="24" fill="#b33124"/></>}
  </svg><p role="status">{finished?'播放完成。':'紅點是起點，藍線示範運筆方向；播放時同步朗讀筆畫念法。'}</p>
  <div className="stroke-playback-toolbar" aria-label="筆順播放控制">
   <label>速度<select aria-label="筆順播放速度" value={speed} onChange={e=>{generation.current++;pause();setSpeed(e.target.value);remaining.current=e.target.value==='快'?800:e.target.value==='慢'?2400:1600;setCycle(x=>x+1);}}>{['快','中','慢'].map(value=><option key={value}>{value}</option>)}</select></label>
   <button type="button" disabled={!strokes} onClick={()=>{if(playing)pause();else if(finished)replay();else setPlaying(true);}}>{playing?<Pause/>:<Play/>}{playing?'暫停':finished?'重新播放':'播放／繼續'}</button>
   <button type="button" disabled={!strokes||finished} onClick={()=>{generation.current++;pause();remaining.current=duration;if(strokes&&index+1<strokes.length){setIndex(index+1);voice.say(index+1,'prompt');}else setFinished(true);}}><SkipForward/>下一筆</button>
   <button type="button" disabled={!strokes} onClick={replay}><RotateCcw/>重播</button>
   <button type="button" aria-pressed={grid} onClick={()=>setGrid(x=>!x)}><Grid2X2/>格線</button>
   <button type="button" onClick={()=>void toggleFullscreen()}>{fullscreen?<Minimize/>:<Maximize/>}{fullscreen?'離開全螢幕':'全螢幕'}</button>
  </div>{error&&strokes&&<p role="alert">{error}</p>}
 </div>;
}
