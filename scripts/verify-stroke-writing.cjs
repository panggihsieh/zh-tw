// Browser integration check with local reviewed fixtures and intercepted TTS.
// Run with Electron: electron scripts/verify-stroke-writing.cjs
const {app,BrowserWindow}=require('electron');
const fs=require('node:fs/promises');
const path=require('node:path');
const os=require('node:os');
const {spawn}=require('node:child_process');
const assert=require('node:assert/strict');
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const candidateMode=process.argv.includes('--candidates');
const competitionMode=process.argv.includes('--competition');
const liveMode=process.argv.includes('--live');
const customCharacters=process.argv.find(value=>value.startsWith('--characters='))?.slice('--characters='.length);
const characters=customCharacters?[...customCharacters]:candidateMode?['埡','粄','哏']:['壼','鉅','擤','瞞','臊','跤','寓','蜒','寞','邋','遢','回','年'];
const root=process.cwd(), folder=path.join(root,'.local','writing-browser-check');
app.setPath('userData',path.join(os.tmpdir(),'zh-tw-stroke-browser-'+process.pid));
app.disableHardwareAcceleration();
app.on('window-all-closed',()=>{});
app.whenReady().then(async()=>{
 await fs.mkdir(folder,{recursive:true});
 const fixtures=new Map();
 const geometry=new Map();
 if(candidateMode){
  const {createHash}=require('node:crypto');
  for(const row of JSON.parse(await fs.readFile('reports/missing-stroke-source-review.json','utf8')).rows){
   const strokes=JSON.parse(await fs.readFile(`public/game-strokes/${row.character.codePointAt(0).toString(16)}.json`,'utf8'));
   geometry.set(row.character.codePointAt(0).toString(16),strokes);
   fixtures.set(row.character,{...row,fingerprint:createHash('sha256').update(JSON.stringify(strokes)).digest('hex')});
  }
 }
 for(const file of (await fs.readdir('reports')).filter(name=>/^nani-.*-stroke-review\.json$/.test(name))){
  for(const row of JSON.parse(await fs.readFile(path.join('reports',file),'utf8')).rows){
   if(characters.includes(row.character))fixtures.set(row.character,row);
  }
 }
 assert.equal(fixtures.size,characters.length);
 const harness=`<!doctype html><html><head><style>.competition-writing-pad{display:block;width:600px;height:600px;touch-action:none}</style></head><body><div id="root"></div><script type="module">
 import React from 'react';
 import {createRoot} from 'react-dom/client';
 import CompetitionWriting from '/src/CompetitionWriting.tsx';
 window.spoken=[];
 window.pointerLog=[];
 for(const type of ['pointerdown','pointermove','pointerup'])document.addEventListener(type,event=>{if(event.target.closest?.('svg'))window.pointerLog.push({type,x:event.clientX,y:event.clientY});},true);
 Object.defineProperty(window,'speechSynthesis',{value:{cancel(){},getVoices(){return []},speak(value){window.spoken.push(value.text);queueMicrotask(()=>value.onend?.());}}});
 window.SpeechSynthesisUtterance=class {constructor(text){this.text=text}};
 const root=createRoot(document.getElementById('root'));
 window.choose=character=>{window.spoken=[];root.render(React.createElement(CompetitionWriting,{key:character,character,mode:${competitionMode?"'competition'":"'practice'"},disabled:false,onSubmit(){}}));};
 window.choose('回');
 </script></body></html>`;
 const helper=path.join(folder,'server.mjs');
 await fs.writeFile(path.join(folder,'fixtures.json'),JSON.stringify([...fixtures]));
 await fs.writeFile(path.join(folder,'geometry.json'),JSON.stringify([...geometry]));
 await fs.writeFile(path.join(folder,'harness.html'),harness);
 await fs.writeFile(helper,`import fs from 'node:fs';import {createServer} from 'vite';import react from '@vitejs/plugin-react';
 const fixtures=new Map(JSON.parse(fs.readFileSync(${JSON.stringify(path.join(folder,'fixtures.json'))})));const geometry=new Map(JSON.parse(fs.readFileSync(${JSON.stringify(path.join(folder,'geometry.json'))})));const harness=fs.readFileSync(${JSON.stringify(path.join(folder,'harness.html'))},'utf8');
 const server=await createServer({configFile:false,root:${JSON.stringify(root)},cacheDir:${JSON.stringify(path.join(folder,'vite-cache'))},optimizeDeps:{noDiscovery:true,include:['react','react-dom/client','firebase/app','firebase/auth']},plugins:[react(),{
  name:'local-stroke-fixtures',configureServer(server){server.middlewares.use(async(req,res,next)=>{
   if(req.url==='/writing-check'){res.setHeader('Content-Type','text/html');res.end(await server.transformIndexHtml('/writing-check',harness));return;}
   if(${liveMode}&&(req.url.startsWith('/game-strokes/')||req.url.startsWith('/api/structure/stroke-speech/'))){try{const upstream=await fetch('https://zh-tw.web.app'+req.url,{signal:AbortSignal.timeout(20000)});res.statusCode=upstream.status;res.setHeader('Content-Type','application/json');res.end(await upstream.text());}catch(error){res.statusCode=502;res.end(JSON.stringify({error:error.message}));}return;}
   if(req.url.startsWith('/game-strokes/')){const code=req.url.slice('/game-strokes/'.length).replace('.json','');if(geometry.has(code)){res.setHeader('Content-Type','application/json');res.end(JSON.stringify(geometry.get(code)));return;}}
   const match=req.url.match(new RegExp('^/api/structure/stroke-speech/([0-9a-f]+)$'));
   if(match){const row=fixtures.get(String.fromCodePoint(parseInt(match[1],16)));res.setHeader('Content-Type','application/json');res.end(JSON.stringify({item:row?{fingerprint:row.fingerprint,confirmed:true,strokes:row.strokes}:null}));return;}
   next();
  });}
 }],server:{host:'127.0.0.1',port:15235,strictPort:true},logLevel:'error'});await server.listen();console.log('READY');`);
 const child=spawn(process.env.STROKE_NODE||'node',[helper],{cwd:root,windowsHide:true,stdio:['ignore','pipe','pipe'],env:{...process.env,ELECTRON_RUN_AS_NODE:undefined}});
 child.stderr.on('data',chunk=>console.error(chunk.toString()));
 await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('Fixture server did not start')),30000);child.once('exit',code=>{clearTimeout(timer);reject(Error('Fixture server exit '+code));});child.stdout.on('data',chunk=>{if(chunk.toString().includes('READY')){clearTimeout(timer);resolve();}});});
 console.log('Local fixture server ready');
 const window=new BrowserWindow({show:true,width:1200,height:1100,webPreferences:{backgroundThrottling:false}});
 console.log('Browser window created');
 const js=code=>window.webContents.executeJavaScript(code);
 window.webContents.on('console-message',event=>console.log('Browser:',event.message));
 window.webContents.on('did-fail-load',(_event,code,description)=>console.error('Page load failed',code,description));
 async function until(code){for(let i=0;i<150;i++){if(await js(code))return;await pause(100);}throw Error('Timed out: '+code);}
 const results=[];
 try{
  await window.loadURL('http://127.0.0.1:15235/writing-check');
  console.log('Browser harness loaded');
  await until('typeof window.choose==="function"');
  window.focus();
  for(const character of characters){
   console.log('Checking',character);
   await js(`window.choose(${JSON.stringify(character)});true`);
   await until(`!!document.querySelector('svg[aria-label="書寫區 ${character}"]') && (document.body.innerText.includes('筆畫語音已開啟') || [...document.querySelectorAll('button')].some(b=>b.textContent==='關閉筆畫語音'&&!b.disabled))`);
   assert.equal(await js('window.spoken.length'),0,'Loading a character must not speak before writing');
   const strokes=geometry.get(character.codePointAt(0).toString(16))||JSON.parse(await fs.readFile(`public/game-strokes/${character.codePointAt(0).toString(16)}.json`,'utf8'));
   for(let index=0;index<strokes.length;index++){
    const points=strokes[index].track;
    // Real Chromium pointer input drives React handlers and pointer capture.
    const box=await js(`(()=>{const r=document.querySelector('svg[aria-label="書寫區 ${character}"]').getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height}})()`);
    const input=points.map(p=>({x:Math.round(box.x+p.x/2048*box.width),y:Math.round(box.y+p.y/2048*box.height)}));
    await js('window.pointerLog=[];true');
    window.webContents.sendInputEvent({type:'mouseMove',...input[0]});
    window.webContents.sendInputEvent({type:'mouseDown',button:'left',clickCount:1,...input[0]});
    await pause(20);
    for(const point of input.slice(1)){window.webContents.sendInputEvent({type:'mouseMove',...point});await until(`window.pointerLog.some(p=>p.type==='pointermove'&&Math.abs(p.x-${point.x})<1&&Math.abs(p.y-${point.y})<1)`);}
    window.webContents.sendInputEvent({type:'mouseUp',button:'left',clickCount:1,...input.at(-1)});
    try{await until(`document.querySelector('.competition-writing>p').textContent.includes('已完成 ${index+1}／')`);}
    catch(error){await fs.writeFile(path.join(folder,'failure.json'),JSON.stringify({character,stroke:index+1,box,input,pointerLog:await js('window.pointerLog'),status:await js('document.body.innerText'),spoken:await js('window.spoken')},null,2));await fs.writeFile(path.join(folder,'failure.png'),(await window.webContents.capturePage()).toPNG());throw error;}
    assert.equal(await js('window.spoken.at(-1)'),fixtures.get(character).strokes[index].mnemonic?.trim()||fixtures.get(character).strokes[index].spoken);
    assert.equal(await js('window.spoken.length'),index+1);
   }
   assert.ok(await js(`document.querySelector('[role="status"]').textContent.includes('書寫完成')`));
   results.push({character,strokeCount:strokes.length,accepted:strokes.length,speechCalls:await js('window.spoken.length'),status:'passed'});
  }
  await fs.writeFile(liveMode?'reports/live-api-browser-writing-check.json':customCharacters?'reports/custom-characters-browser-writing-check.json':candidateMode?'reports/candidate-characters-browser-writing-check.json':'reports/pending-characters-browser-writing-check.json',JSON.stringify({scope:liveMode?'Chromium實際React元件及滑鼠書寫，讀取正式站API和筆順檔，攔截TTS驗證每筆文字，非裝置音色試聽。':'Chromium實際React元件、滑鼠事件及書寫判定；語音以本機核對資料及攔截TTS呼叫驗證，不代表正式發布或裝置發音試聽。',results},null,2)+'\n');
  console.log(JSON.stringify({passed:results.length,results}));
 }finally{window.destroy();child.kill();app.quit();}
}).catch(error=>{console.error(error);app.exit(1)});
