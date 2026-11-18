import {useEffect,useRef,useState} from 'react';
import {outlinePath,tracePath,type Point} from './writingGame';
import {stopStrokeSpeech,useStrokeSpeech} from './strokeSpeech';
interface Stroke {outline:any[];track:Point[]}
export default function StrokePlayback({character}:{character:string}){
 const [strokes,setStrokes]=useState<Stroke[]|null>(null),[index,setIndex]=useState(0),[playing,setPlaying]=useState(false),[finished,setFinished]=useState(false),[error,setError]=useState('');
 const voice=useStrokeSpeech(character,strokes,'practice');
 const narrator=useRef(voice.narrate);narrator.current=voice.narrate;
 useEffect(()=>{const abort=new AbortController();setStrokes(null);setIndex(0);setPlaying(false);setFinished(false);setError('');
  void fetch(`/game-strokes/${character.codePointAt(0)!.toString(16)}.json`,{signal:abort.signal}).then(async response=>{if(!response.ok)throw Error('此字尚無可用筆順資料。');const data=await response.json();if(!Array.isArray(data)||!data.length)throw Error('此字尚無可用筆順資料。');if(!abort.signal.aborted)setStrokes(data);}).catch(error=>{if(!abort.signal.aborted)setError(error.message);});
  return()=>{abort.abort();stopStrokeSpeech();};
 },[character]);
 useEffect(()=>{if(!playing||!strokes)return;let active=true;let timer:ReturnType<typeof setTimeout>;
  const animation=new Promise<void>(resolve=>{timer=setTimeout(resolve,1600);});
  void Promise.all([animation,narrator.current(index)]).then(()=>{if(!active)return;if(index+1===strokes.length){setPlaying(false);setFinished(true);}else setIndex(index+1);});
  return()=>{active=false;clearTimeout(timer);stopStrokeSpeech();};
 },[playing,index,strokes,voice.enabled]);
 function pause(){setPlaying(false);stopStrokeSpeech();}
 return <div className="stroke-playback"><p>「{character}」逐筆播放 · {strokes?`第 ${index+1}／${strokes.length} 筆`:error||'載入筆順中…'}</p>
  <div className="stroke-speech-controls"><button type="button" className="secondary" disabled={!voice.available} onClick={()=>voice.toggle(index)}>{voice.enabled?'關閉':'開啟'}筆畫語音</button><small>{voice.status}</small></div>
  <svg viewBox="0 0 2048 2048" className="stroke-playback-pad" aria-label={`筆順播放區 ${character}`}><path d="M1024 0V2048M0 1024H2048M0 0L2048 2048M2048 0L0 2048" stroke="#ccd9bd" strokeDasharray="24 24" fill="none"/>
   {strokes?.map((stroke,i)=><path key={i} d={outlinePath(stroke.outline)} fill={i<index||finished?'#285d45':'#edf1e8'}/>)}
   {!finished&&strokes?.[index]&&<><path d={outlinePath(strokes[index].outline)} fill="#ead6a4"/><path key={`${index}-${playing}-${voice.enabled}`} className={playing?'stroke-motion':''} pathLength="1" d={tracePath(strokes[index].track)} fill="none" stroke="#175d9a" strokeWidth="25" strokeLinecap="round"/><circle cx={strokes[index].track[0].x} cy={strokes[index].track[0].y} r="24" fill="#b33124"/></>}
  </svg><p role="status">{finished?'播放完成。':'紅點是起點，藍線示範運筆方向；可先開啟語音，再開始播放。'}</p>
  <div className="competition-actions"><button type="button" className="primary" disabled={!strokes} onClick={()=>{if(playing){pause();return;}if(finished){setIndex(0);setFinished(false);}setPlaying(true);}}>{playing?'暫停':finished?'重新播放':'開始播放'}</button><button type="button" className="secondary" disabled={!strokes||playing||finished} onClick={()=>{if(!strokes)return;if(index+1<strokes.length){setIndex(index+1);voice.say(index+1,'prompt');}else setFinished(true);}}>下一筆</button><button type="button" className="secondary" disabled={!strokes} onClick={()=>{pause();setIndex(0);setFinished(false);}}>重設</button></div>
 </div>;
}
