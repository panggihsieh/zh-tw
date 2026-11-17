import {useEffect,useRef,useState} from 'react';
import {Mic,Square} from 'lucide-react';
import type {CompetitionRecognition} from './competitionSpeech';
import './microphone.css';

export function microphoneError(name:string) {
 return name==='NotAllowedError'?'麥克風權限未允許，請在網址列的網站設定開啟麥克風。':name==='NotFoundError'?'找不到麥克風，請確認已連接收音裝置。':name==='NotReadableError'?'無法讀取麥克風，請確認沒有被其他程式占用。':'無法啟動麥克風，請確認裝置及瀏覽器設定。';
}

/** Audio is analysed locally only; the stream is never recorded or uploaded. */
export function MicrophoneMeter({active}:{active:boolean}) {
 const canvas=useRef<HTMLCanvasElement>(null);
 const [status,setStatus]=useState('尚未啟動麥克風'),[level,setLevel]=useState(0);
 useEffect(()=>{
  if(!active){setStatus('麥克風已停止');setLevel(0);const c=canvas.current;c?.getContext('2d')?.clearRect(0,0,c.width,c.height);return;}
  let disposed=false,stream:MediaStream|undefined,context:AudioContext|undefined,frame=0;
  setStatus('等待麥克風權限，請按允許');
  void(async()=>{
   try{
    if(!navigator.mediaDevices?.getUserMedia){setStatus('此瀏覽器無法收音，請使用 HTTPS 網址及支援的瀏覽器。');return;}
    stream=await navigator.mediaDevices.getUserMedia({audio:true});
    if(disposed){stream.getTracks().forEach(track=>track.stop());return;}
    context=new AudioContext();await context.resume();
    if(disposed){void context.close();return;}
    const analyser=context.createAnalyser();analyser.fftSize=1024;
    context.createMediaStreamSource(stream).connect(analyser);
    const samples=new Uint8Array(analyser.fftSize),frequencies=new Uint8Array(analyser.frequencyBinCount);
    let last=0;
    function draw(time:number){
     if(disposed)return;
     analyser.getByteTimeDomainData(samples);analyser.getByteFrequencyData(frequencies);
     const rms=Math.sqrt(samples.reduce((sum,value)=>sum+((value-128)/128)**2,0)/samples.length);
     if(time-last>200){const percent=Math.min(100,Math.round(rms*400));setLevel(percent);setStatus(percent>2?'麥克風已收到聲音':'麥克風已開啟，請說話；目前聲音很小');last=time;}
     const c=canvas.current,g=c?.getContext('2d');
     if(c&&g){g.clearRect(0,0,c.width,c.height);const count=32,maxBin=Math.min(frequencies.length,Math.floor(4000/(context!.sampleRate/2)*frequencies.length));for(let i=0;i<count;i++){const from=Math.floor(i*maxBin/count),to=Math.max(from+1,Math.floor((i+1)*maxBin/count));let total=0;for(let b=from;b<to;b++)total+=frequencies[b];const height=Math.max(2,total/(to-from)/255*c.height);g.fillStyle='#168259';g.fillRect(i*c.width/count,c.height-height,c.width/count-3,height);}}
     frame=requestAnimationFrame(draw);
    }
    frame=requestAnimationFrame(draw);
   }catch(error){if(!disposed)setStatus(microphoneError((error as Error).name));stream?.getTracks().forEach(track=>track.stop());if(context&&context.state!=='closed')void context.close();}
  })();
  return()=>{disposed=true;cancelAnimationFrame(frame);stream?.getTracks().forEach(track=>track.stop());if(context&&context.state!=='closed')void context.close();};
 },[active]);
 return <div className="microphone-meter"><canvas ref={canvas} width={480} height={80} role="img" aria-label="即時麥克風頻譜，橫軸為低頻到高頻"/><div className="microphone-scale"><span>低頻 0 Hz</span><span>高頻 4,000 Hz</span></div><label>音量 <meter min={0} max={100} value={level}/><span>{level}%</span></label><p role="status">{status}</p></div>;
}

export default function MicrophoneTest({initiallyOpen=false}:{initiallyOpen?:boolean}){
 const [active,setActive]=useState(false),[message,setMessage]=useState(''),[text,setText]=useState(''),[listening,setListening]=useState(false);
 const recognition=useRef<CompetitionRecognition|null>(null),cancel=useRef<(()=>void)|null>(null);
 function stop(){cancel.current?.();recognition.current?.abort();recognition.current=null;setListening(false);setActive(false);}
 useEffect(()=>stop,[]);
 useEffect(()=>{if(!active)return;const timer=setTimeout(stop,60000);return()=>clearTimeout(timer);},[active]);
 function recognize(){
  const browser=window as Window&{SpeechRecognition?:new()=>CompetitionRecognition;webkitSpeechRecognition?:new()=>CompetitionRecognition};
  const Constructor=browser.SpeechRecognition||browser.webkitSpeechRecognition;
  if(!Constructor){setMessage('此瀏覽器不支援語音辨識。音量圖仍可測試麥克風；語音輸入請改用 Chrome。');return;}
  const r=new Constructor();
  recognition.current=r;
  let completed="", finalText="", retry: ReturnType<typeof setTimeout> | undefined;
  setText("");
  r.lang="zh-TW";
  r.continuous=true;
  r.interimResults=true;
  const cancelSession=()=>{
    clearTimeout(retry);
    r.onend=r.onerror=r.onresult=r.onstart=null;
  };
  cancel.current=cancelSession;
  function start(){
    if(recognition.current!==r)return;
    try{r.start();setListening(true);}
    catch{finish("無法啟動辨識服務，請重試。");}
  }
  function finish(message:string){
    cancelSession();
    recognition.current=null;
    setListening(false);
    setMessage(message);
  }
  r.onstart=()=>setMessage("正在聆聽，可以停頓後繼續說。");
  r.onresult=event=>{
    const results=Array.from(event.results);
    const transcript=results.map(result=>result[0]?.transcript||"").join("");
    finalText=results.filter(result=>result.isFinal).map(result=>result[0]?.transcript||"").join("");
    setText([completed,transcript].filter(Boolean).join(" "));
  };
  r.onerror=event=>{
    if(event.error!=="no-speech")finish("語音辨識中斷，請確認麥克風權限與網路後重試。");
  };
  r.onend=()=>{
    completed=[completed,finalText].filter(Boolean).join(" ");
    finalText="";
    setText(completed);
    retry=setTimeout(start,250);
  };
  start();
 }
 return <details open={initiallyOpen} className="microphone-test" onToggle={event=>{if(!event.currentTarget.open)stop();}}><summary><Mic size={18}/>麥克風測試</summary><p>先看頻譜是否跳動，再測試語音轉文字。有收音卻沒有文字時，請檢查瀏覽器語音服務與網路。</p><div className="microphone-actions"><button className="secondary" disabled={active} onClick={()=>{setActive(true);setMessage('');}}><Mic size={16}/>開始收音測試</button><button className="secondary" disabled={!active||listening} onClick={recognize}><Mic size={16}/>測試語音轉文字</button><button className="secondary" disabled={!active} onClick={stop}><Square size={16}/>停止測試</button></div><MicrophoneMeter active={active}/><p role="status">{message}</p><label className="microphone-transcript">語音轉文字結果<textarea readOnly rows={4} value={text} placeholder={listening?'正在辨識，請說出一句話…':'按下「測試語音轉文字」，辨識出的文字會顯示在這裡。'}/></label><small>頻譜只在本機分析，不錄音、不上傳；語音轉文字使用瀏覽器語音服務。收音測試最多 60 秒，收合即停止。</small></details>;
}
