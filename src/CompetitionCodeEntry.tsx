import { useState } from 'react';
import { competitionCodeFromInput } from './competitionApi';
import './competition.css';

export default function CompetitionCodeEntry({onConfirm,busy=false,initialCode=''}:{onConfirm:(code:string)=>void;busy?:boolean;initialCode?:string}) {
 const [code,setCode]=useState(initialCode);
 return <form className="competition-join competition-code-entry" onSubmit={event=>{event.preventDefault();if(code.length===4&&!busy)onConfirm(code);}}>
  <h1>輸入開課代碼</h1>
  <p>免登入，輸入老師提供的四碼代碼，再選自己的姓名加入。</p>
  <input aria-label="四碼開課代碼" autoFocus autoComplete="off" maxLength={4} value={code} onChange={event=>setCode(competitionCodeFromInput(event.target.value))} onPaste={event=>{event.preventDefault();setCode(competitionCodeFromInput(event.clipboardData.getData('text')));}} placeholder="A7K2"/>
  <button type="submit" className="primary" disabled={busy||code.length!==4}>確認代碼</button>
  <p className="competition-code-help">全形、半形、大小寫及空格都可辨識，輸錯可直接重試。也可貼上加入連結，或掃描老師的 QR Code。</p>
 </form>;
}
