import {useEffect,useState} from 'react';
import {competitionRequest} from './competitionApi';
const originals=new Map<string,Promise<string|null>>();
export default function OriginalCompetitionAvatar({src,alt}:{src:string;alt:string}){
 const [value,setValue]=useState(src),[pending,setPending]=useState(true),[error,setError]=useState(''),[retry,setRetry]=useState(0);
 useEffect(()=>{let live=true;setValue(src);setPending(true);setError('');
  void (async()=>{
   const {cloudServices}=await import('./cloudSync');
   if(!src.startsWith('data:')||!cloudServices().auth.currentUser)return src;
   let request=originals.get(src);
   if(!request){request=(async()=>{const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(src));const id=Array.from(new Uint8Array(bytes),b=>b.toString(16).padStart(2,'0')).join('');return (await competitionRequest<{avatar:string|null}>('/avatar-originals/'+id)).avatar;})();if(originals.size>=50)originals.delete(originals.keys().next().value!);originals.set(src,request);}
   return await request||src;
  })().then(next=>{if(live)setValue(next);}).catch(()=>{originals.delete(src);if(live)setError('原圖載入失敗');}).finally(()=>{if(live)setPending(false);});
  return()=>{live=false;};
 },[src,retry]);
 return <><img className="competition-avatar" src={value} alt={alt} onError={()=>{originals.delete(src);setError('公仔圖片載入失敗');}} data-avatar-pending={pending?'true':undefined} data-avatar-error={error?'true':undefined}/>{error&&<button type="button" className="secondary" onClick={()=>setRetry(v=>v+1)}>{error}，重試</button>}</>;
}
