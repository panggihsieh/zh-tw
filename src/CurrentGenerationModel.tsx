import { useEffect, useState } from 'react';

interface ModelSettings { provider:string; model:string; hasApiKey:boolean; providers?:Record<string,{name:string}> }
export default function CurrentGenerationModel(){
 const [settings,setSettings]=useState<ModelSettings|null>(null),[error,setError]=useState(''),[loading,setLoading]=useState(true);
 async function load(){
  setLoading(true);setError('');setSettings(null);
  try{
   const {cloudServices}=await import('./cloudSync');
   const user=cloudServices().auth.currentUser;
   if(!user)throw Error('請先登入教師帳號');
   const response=await fetch('/api/structure/settings',{headers:{Authorization:`Bearer ${await user.getIdToken()}`},cache:'no-store',signal:AbortSignal.timeout(15000)});
   const value=await response.json();
   if(!response.ok)throw Error(value.error||'無法讀取模型設定');
   if(typeof value.provider!=='string'||typeof value.model!=='string')throw Error('模型設定格式不符');
   setSettings(value);
  }catch(error){setError((error as Error).message);}finally{setLoading(false);}
 }
 useEffect(()=>{void load();},[]);
 return <div className="competition-current-model">
  <p role="status">目前出題 AI 模型：{loading?'讀取中…':error?`無法確認（${error}）`:settings?.model?`${settings.providers?.[settings.provider]?.name||settings.provider} · ${settings.model}${settings.provider!=='ollama'&&!settings.hasApiKey?'（尚未設定金鑰）':''}`:'尚未設定'}</p>
  <button type="button" className="secondary" disabled={loading} onClick={()=>void load()}>重新讀取模型</button>
 </div>;
}
