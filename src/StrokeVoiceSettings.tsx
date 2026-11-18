import {useEffect,useState} from 'react';
import {isChineseVoice,loadVoicePreference,saveVoicePreference,voiceKey,voicePreference} from './ttsPreferences';
export default function StrokeVoiceSettings(){
 const [voices,setVoices]=useState<SpeechSynthesisVoice[]>([]),[selected,setSelected]=useState(()=>{const preference=loadVoicePreference(localStorage);return preference?voiceKey(preference):'';});
 useEffect(()=>{if(!('speechSynthesis' in window))return;const refresh=()=>setVoices(window.speechSynthesis.getVoices().filter(isChineseVoice));refresh();window.speechSynthesis.addEventListener('voiceschanged',refresh);return()=>window.speechSynthesis.removeEventListener('voiceschanged',refresh);},[]);
 return <div className="stroke-voice-settings"><label>試聽聲線<select value={selected} onChange={event=>{const key=event.target.value;const voice=voices.find(item=>voiceKey(item)===key);saveVoicePreference(localStorage,voice?voicePreference(voice):null);setSelected(key);}}><option value="">自動選擇（優先臺灣中文）</option>{selected&&!voices.some(voice=>voiceKey(voice)===selected)&&<option value={selected}>先前聲線目前不可用（試聽將自動選擇）</option>}{voices.map(voice=><option key={voiceKey(voice)} value={voiceKey(voice)}>{voice.name} · {voice.lang}</option>)}</select></label><p>切換後再按各筆畫的「試聽」。聲線沿用本裝置 TTS 偏好，不同裝置可用的聲線不同；此設定不會指定學生裝置的聲音。</p>{!voices.length&&<p>目前未取得中文聲線，請確認裝置已安裝中文語音。</p>}</div>;
}
