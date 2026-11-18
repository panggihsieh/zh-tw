import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {authenticateAdmin} from './admin-auth.mjs';

const bad = message => {throw Object.assign(Error(message), {status:400});};
export const strokeFingerprint = strokes => createHash('sha256').update(JSON.stringify(strokes)).digest('hex');
export function validateStrokeSpeech(value, strokes) {
  if (value?.fingerprint !== strokeFingerprint(strokes)) bad('筆順資料已變更，請重新載入後核對。');
  if (typeof value.confirmed !== 'boolean' || !Array.isArray(value.strokes) || value.strokes.length !== strokes.length) bad('筆畫數量或確認狀態不符。');
  const names = value.strokes.map(row => {
    if (!row || !['name','spoken'].every(key => typeof row[key] === 'string' && (!value.confirmed || row[key].trim().length > 0) && row[key].length <= 30)) bad('發布時每一筆都需要名稱與朗讀文字（最多30字）。');
    if (row.mnemonic !== undefined && (typeof row.mnemonic !== 'string' || row.mnemonic.length > 30)) bad('口訣最多30字。');
    return {name:row.name.trim(), spoken:row.spoken.trim(), ...(row.mnemonic !== undefined ? {mnemonic:row.mnemonic.trim()} : {})};
  });
  return {fingerprint:value.fingerprint, strokes:names, confirmed:value.confirmed};
}
export function createStrokeSpeechHandler({store, origins, authenticate=authenticateAdmin, loadStrokes=async character => JSON.parse(await readFile(new URL(`../public/game-strokes/${character.codePointAt(0).toString(16)}.json`, import.meta.url),'utf8'))}) {
  return async (req,res) => {
    const send = (status,value) => {res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(value));};
    try {
      const url = new URL(req.url,'http://localhost');
      const character = url.pathname.slice('/api/structure/stroke-speech/'.length);
      if (!/^[0-9a-f]{4,6}$/.test(character)) return send(400,{error:'請選擇單一生字。'});
      const code = parseInt(character,16);
      if (code > 0x10ffff || !/^\p{Script=Han}$/u.test(String.fromCodePoint(code))) return send(400,{error:'請選擇單一生字。'});
      const key = `stroke-speech/${character}.json`;
      let previous;
      if (!['GET','POST'].includes(req.method)) return send(405,{error:'不支援此操作。'});
      if (req.method==='POST' || url.searchParams.has('admin')) {
        if ((req.method==='POST' && !origins.includes(req.headers.origin)) || req.headers['x-notebook-request']!=='stroke-speech') return send(403,{error:'不允許的來源。'});
        try {await authenticate(req);} catch {return send(401,{error:'請以管理者帳號登入。'});}
      }
      try {previous = await store.get(key);} catch(error) {if(error.status!==404 && error.response?.status!==404) throw error;}
      if (req.method==='GET') return send(200,{item:previous && (previous.value.confirmed || url.searchParams.has('admin')) ? previous.value : null});
      let body='';
      for await (const chunk of req) {body+=chunk;if(Buffer.byteLength(body)>16000)return send(413,{error:'資料過大。'});}
      let source;
      try {source=await loadStrokes(String.fromCodePoint(code));} catch(error) {if(error.code==='ENOENT')return send(400,{error:'此字沒有可用筆順。'});throw error;}
      const value={...validateStrokeSpeech(JSON.parse(body),source), updatedAt:new Date().toISOString()};
      if(previous)await store.update(key,value,previous.generation);else await store.create(key,value);
      return send(200,{item:value});
    } catch(error) {
      const status=error instanceof SyntaxError?400:[400,409,412].includes(error.status)?error.status:503;
      return send(status,{error:status===400?(error instanceof SyntaxError?'資料格式不符。':error.message):status===412?'資料已被更新，請重新載入。':'筆畫語音服務暫時無法使用。'});
    }
  };
}
