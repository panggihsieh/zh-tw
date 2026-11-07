import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
// 只在伺服器記憶體讀取既有 DPAPI 設定，不複製或輸出金鑰。
let env = { AI_API_KEY: process.env.AI_API_KEY, AI_ENDPOINT: process.env.AI_ENDPOINT, AI_MODEL: process.env.AI_MODEL, AI_PROVIDER: process.env.AI_PROVIDER };
if (!env.AI_API_KEY) {
  try {
    const { unprotectSettings } = await import('../server/secret-store.mjs');
    const envelope = JSON.parse(await readFile(new URL('../.local/structure-api.json', import.meta.url), 'utf8'));
    const data = await unprotectSettings(envelope); const profile = data.profiles[data.selected];
    if (profile?.enabled && profile.apiKey) env = {AI_API_KEY:profile.apiKey, AI_ENDPOINT:profile.endpoint, AI_MODEL:profile.model, AI_PROVIDER:data.selected};
  } catch { console.log('未載入既有金鑰；仍可開啟介面。'); }
}
await import('./build.mjs');
const {default:worker} = await import(pathToFileURL(resolve('dist/server/index.js')));
const port = Number(process.env.PORT || 5186);
http.createServer(async (req,res) => {
  try {
    if (req.headers.host !== `127.0.0.1:${port}` && req.headers.host !== `localhost:${port}`) {res.writeHead(403);res.end();return;}
    const controller = new AbortController(); const chunks=[];let size=0;
    for await(const chunk of req){size+=chunk.length;if(size>16000){res.writeHead(413);res.end();return;}chunks.push(chunk);}
    const request = new Request(`http://${req.headers.host}${req.url}`,{method:req.method,headers:req.headers,body:['GET','HEAD'].includes(req.method)?undefined:Buffer.concat(chunks),signal:controller.signal});
    const response = await worker.fetch(request,env);
    res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));
  } catch {res.writeHead(500);res.end('伺服器暫時無法處理請求。');}
}).listen(port,'127.0.0.1',()=>console.log(`Local: http://127.0.0.1:${port} · AI ${env.AI_API_KEY?'已設定':'尚未設定'}`));
