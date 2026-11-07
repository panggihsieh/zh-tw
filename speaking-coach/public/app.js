const $ = id => document.getElementById(id);
const KEY = 'say-again-reviews-v1';
const topics = {
  cafe: {name:'AT THE CAFÉ',zh:'咖啡店點餐',pairs:[['我想要一杯熱拿鐵，不加糖。','I would like a hot latte without sugar.'],['這杯咖啡可以換成燕麥奶嗎？','Could I have oat milk in this coffee?'],['我想外帶一杯冰茶。','I would like an iced tea to go.']],en:'You are ordering a drink. What would you like?',cn:'你正在咖啡店點餐。你想點什麼？',moreEn:'Explain your preferences and ask about one alternative.',moreZh:'說明你的偏好，並詢問一種替代選擇。'},
  travel: {name:'ON THE ROAD',zh:'旅遊與問路',pairs:[['請問，車站要怎麼走？','Excuse me, how do I get to the station?'],['走路到這間旅館要多久？','How long does it take to walk to this hotel?'],['我想買一張明天去臺北的車票。','I would like to buy a ticket to Taipei for tomorrow.']],en:'You are visiting a new city. Ask someone for directions.',cn:'你來到陌生的城市，請向路人問路。',moreEn:'Include your destination and ask about transport options.',moreZh:'說明你的目的地，並詢問可以搭乘的交通工具。'},
  daily: {name:'EVERYDAY MOMENTS',zh:'日常與興趣',pairs:[['我通常週末和朋友一起做飯。','I usually cook with my friends on weekends.'],['昨天我在公園散步。','I took a walk in the park yesterday.'],['我想學習一項新的運動。','I would like to learn a new sport.']],en:'Tell a friend what you enjoy doing in your free time.',cn:'請和朋友聊聊，你空閒時喜歡做什麼。',moreEn:'Explain why you enjoy it and describe a recent experience.',moreZh:'說明你喜歡的原因，並分享最近的一次經驗。'},
  work: {name:'LET’S MAKE A PLAN',zh:'工作與約定',pairs:[['我們可以把會議改到明天下午嗎？','Could we move the meeting to tomorrow afternoon?'],['我會在星期五之前完成這份報告。','I will finish this report by Friday.'],['謝謝你的幫忙，我學到了很多。','Thank you for your help. I learned a lot.']],en:'Make an appointment with a colleague. Suggest a time.',cn:'請和同事約一個時間，討論目前的工作。',moreEn:'Explain the purpose and offer another time if needed.',moreZh:'說明約定的目的，並提供另一個可行的時間。'},
  hiking: {name:'OUT IN THE MOUNTAINS',zh:'戶外與爬山',pairs:[['我明天早上要和朋友去爬山。','I am going hiking with my friends tomorrow morning.'],['出發前，我們需要確認天氣。','We need to check the weather before we leave.'],['這條步道很漂亮，但有點陡。','This trail is beautiful, but it is a little steep.']],en:'Tell a friend about your plans for a hike.',cn:'請和朋友分享你下一次爬山的計畫。',moreEn:'Describe the route, preparation, and why you chose it.',moreZh:'介紹路線、行前準備，以及選擇這條路線的原因。'},
};
let index=0, currentPrompt='', feedback=null, submission=null, retryTarget='', savedId=null, active=false, busy=false, recognition=null, captureText='', recordingGeneration=0;
let reviews=[];
function notify(message=''){ $('notice').textContent=message; }
function validRecord(r){return r && typeof r.id==='string' && typeof r.original==='string' && typeof r.corrected==='string' && typeof r.natural==='string' && typeof r.explanation==='string' && ['en','zh-TW'].includes(r.language) && ['beginner','intermediate'].includes(r.level) && topics[r.scenario] && ['conversation','translation','free'].includes(r.mode) && typeof r.prompt==='string' && Array.isArray(r.issues) && Number.isFinite(Date.parse(r.createdAt));}
try {const stored=JSON.parse(localStorage.getItem(KEY)||'[]'); if(!Array.isArray(stored))throw Error();reviews=stored.filter(validRecord).slice(0,300);}catch{$('storage-notice').textContent='無法讀取舊紀錄，這次仍可練習；原有資料未被覆寫。';}
function storeReviews(next){try{localStorage.setItem(KEY,JSON.stringify(next));reviews=next;updateCount();return true;}catch{$('save-status').textContent='瀏覽器無法儲存，請先匯出紀錄，或檢查儲存空間。';$('storage-notice').textContent='無法更新儲存空間，紀錄尚未變更。';return false;}}
function updateCount(){$('review-count').textContent=reviews.length;}
function stopRecording(){recordingGeneration++;if(recognition){recognition.onresult=null;recognition.onend=null;recognition.onerror=null;try{recognition.abort();}catch{}recognition=null;}active=false;$('record').classList.remove('listening');$('record').textContent='● 開始口說';$('record-status').textContent='說完後，先確認辨識文字。';updateSubmit();}
function stopSpeech(){window.speechSynthesis?.cancel();$('stop-speaking').hidden=true;}
function updateSubmit(){$('submit').disabled=busy||active||!$('answer').value.trim();$('char-count').textContent=`${$('answer').value.length} / 2000`;}
function resetResult(){feedback=null;submission=null;retryTarget='';savedId=null;$('feedback-section').hidden=true;$('retry-label').hidden=true;$('save-status').textContent='';stopSpeech();}
function choosePrompt(clear=true){
  stopRecording(); resetResult();if(clear)$('answer').value='';
  const topic=topics[$('scenario').value], lang=$('language').value, mode=$('mode').value, mid=$('level').value==='intermediate';
  $('language-badge').textContent=`${lang==='en'?'ENGLISH':'繁體中文'} · ${mid?'中階':'初階'}`;
  $('scenario-label').textContent=mode==='free'?'IN YOUR OWN WORDS':topic.name;
  const pair=topic.pairs[index%topic.pairs.length];
  if(mode==='translation') {currentPrompt=pair[lang==='en'?0:1];$('prompt-hint').textContent=lang==='en'?'把這個意思用英文說出來，不必逐字翻譯。':'把這個意思用繁體中文說出來，不必逐字翻譯。';}
  else if(mode==='free'){currentPrompt=lang==='en'?'What would you like to say today?':'今天，你想說些什麼？';$('prompt-hint').textContent=mid?'試著用兩到四句話，完整表達一個想法。':'從一到兩句簡單的話開始。';}
  else{currentPrompt=(lang==='en'?topic.en:topic.cn)+(mid?' '+(lang==='en'?topic.moreEn:topic.moreZh):'');$('prompt-hint').textContent=lang==='en'?`情境：${topic.zh}。用自己的話回答就好。`:'不用一次完美，先把自己的意思說出來。';}
  $('next').disabled=mode==='free';$('scenario').disabled=mode==='free';$('prompt').textContent=currentPrompt;notify();updateSubmit();
}
function element(tag,text,cls){const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(cls)e.className=cls;return e;}
function renderFeedback(v){
  const root=$('feedback-content');root.replaceChildren();
  const grid=element('div',undefined,'sentence-grid');
  for(const [label,value] of [['修正後的句子',v.corrected],['也可以這樣自然地說',v.natural]]){const box=element('div',undefined,'sentence');box.append(element('small',label),element('p',value));grid.append(box);}
  root.append(grid,element('p',v.explanation,'explanation'));
  if(!v.meaningPreserved)root.append(element('p','這個修正版可能與你的原意有差異，請確認後再練習。','meaning-note'));
  for(const issue of v.issues){const row=element('div',undefined,'issue');const content=element('div');const line=element('p');line.append(element('del',issue.original),' → ',element('strong',issue.correction));content.append(line,element('p',issue.reason));row.append(element('span',issue.category,'issue-category'),content);root.append(row);}
  if(!v.issues.length)root.append(element('p','這次沒有發現需要修正的文法或用詞，可以繼續練習不同說法。','explanation'));
  $('task-status').textContent={achieved:'✓ 已完成表達','needs-practice':'再練一下','off-topic':'請確認題目意思'}[v.taskStatus];
  $('feedback-section').hidden=false;$('save').disabled=false;$('save-status').textContent='';
}
async function send(){
  if(busy||active||!$('answer').value.trim())return;
  busy=true;stopSpeech();notify('正在理解你的句子…');$('submit').textContent='正在修正…';updateSubmit();setSettingsDisabled(true);
  const input={text:$('answer').value,language:$('language').value,level:$('level').value,mode:$('mode').value,prompt:currentPrompt,retryTarget};
  try{
    const response=await fetch('/api/feedback',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(input),signal:AbortSignal.timeout(55000)});
    const data=await response.json();if(!response.ok)throw Error(data.error||'暫時無法修正，請再試一次。');
    feedback=data.feedback;submission={...input,scenario:$('scenario').value};savedId=null;renderFeedback(feedback);notify('回饋完成。先理解修改原因，再試著說一次。');$('feedback-section').scrollIntoView({behavior:'smooth',block:'start'});
  }catch(error){notify(error.name==='TimeoutError'?'等待回覆逾時。你的句子仍保留，請再試一次。':error.message==='Failed to fetch'?'連線失敗，請檢查網路後再試。':error.message);}
  finally{busy=false;$('submit').textContent='修正我的句子 ↗';setSettingsDisabled(false);updateSubmit();}
}
function setSettingsDisabled(disabled){for(const id of ['language','level','mode','scenario','next','record','answer'])$(id).disabled=disabled; if(!disabled){$('scenario').disabled=$('mode').value==='free';$('next').disabled=$('mode').value==='free';$('record').disabled=!SpeechRecognition;}}
function speak(text,language){
  stopRecording();stopSpeech();if(!window.speechSynthesis){notify('此瀏覽器不支援示範朗讀，仍可閱讀句子練習。');return;}
  const utterance=new SpeechSynthesisUtterance(text);utterance.lang=language==='en'?'en-US':'zh-TW';utterance.rate=.85;
  const voices=window.speechSynthesis.getVoices();const voice=voices.find(v=>v.lang===utterance.lang)||voices.find(v=>v.lang.startsWith(language==='en'?'en':'zh'));if(voice)utterance.voice=voice;
  utterance.onend=()=>{$('stop-speaking').hidden=true;};utterance.onerror=()=>{$('stop-speaking').hidden=true;notify('朗讀未完成，請確認裝置音色後重試。');};window.speechSynthesis.speak(utterance);$('stop-speaking').hidden=false;
}
const SpeechRecognition=window.SpeechRecognition||window.webkitSpeechRecognition;
function record(){
  if(active){recognition?.stop();return;}
  if(!SpeechRecognition){notify('此瀏覽器不支援語音辨識，請使用 Chrome／Edge 或直接輸入。');return;}
  stopSpeech();feedback=null;submission=null;savedId=null;$('feedback-section').hidden=true;const generation=++recordingGeneration;recognition=new SpeechRecognition();recognition.lang=$('language').value==='en'?'en-US':'zh-TW';recognition.interimResults=true;recognition.continuous=false;captureText=$('answer').value.trim();
  recognition.onresult=event=>{if(generation!==recordingGeneration)return;const text=Array.from(event.results).map(r=>r[0].transcript).join(' ');$('answer').value=(captureText?(captureText+' '):'')+text;$('answer').value=$('answer').value.slice(0,2000);updateSubmit();};
  recognition.onerror=event=>{if(generation!==recordingGeneration)return;notify(({ 'not-allowed':'麥克風權限未開啟，請在網址列允許麥克風，或直接輸入。','audio-capture':'找不到麥克風，請連接裝置或直接輸入。','no-speech':'沒有辨識到聲音，請再說一次。','network':'語音辨識連線失敗，請檢查網路或改用輸入。','language-not-supported':'此裝置不支援所選語言，請改用輸入。' })[event.error]||'語音辨識中斷，已有文字仍保留。');};
  recognition.onend=()=>{if(generation!==recordingGeneration)return;active=false;recognition=null;$('record').classList.remove('listening');$('record').textContent='● 開始口說';$('record-status').textContent='請確認辨識文字，必要時可直接編輯。';updateSubmit();};
  try{recognition.start();active=true;$('record').classList.add('listening');$('record').textContent='■ 結束口說';$('record-status').textContent='正在聆聽…';notify('語音可能由瀏覽器的線上辨識服務處理；不儲存錄音。');updateSubmit();}catch{notify('無法啟動麥克風，請稍後重試或直接輸入。');stopRecording();}
}
function showTab(review){if(busy){notify('請等待這次回饋完成後再切換。');return;}stopRecording();stopSpeech();$('practice-view').hidden=review;$('review-view').hidden=!review;for(const [id,selected] of [['practice-tab',!review],['review-tab',review]]){$(id).classList.toggle('active',selected);if(selected)$(id).setAttribute('aria-current','page');else $(id).removeAttribute('aria-current');}if(review)renderReviews();window.scrollTo({top:0,behavior:'smooth'});}
function renderReviews(){
  const root=$('reviews');root.replaceChildren();if(!reviews.length){root.append(element('div','還沒有複習紀錄。完成一次練習後，按「加入弱點複習」留下想再練的句子。','empty'));return;}
  for(const r of reviews){const item=element('article',undefined,'review-item');item.append(element('span',`${r.language==='en'?'ENGLISH':'繁體中文'} · ${topics[r.scenario].zh} · ${new Date(r.createdAt).toLocaleDateString('zh-TW')}`,'review-meta'),element('p',`原句：${r.original}`,'review-original'),element('h2',r.corrected),element('p',r.explanation));const listen=element('button','▶ 聽示範','text-button');listen.onclick=()=>speak(r.corrected,r.language);const again=element('button','換情境再練 ↗','text-button');again.onclick=()=>{showTab(false);$('language').value=r.language;$('level').value=r.level;$('mode').value='conversation';const keys=Object.keys(topics);$('scenario').value=keys[(keys.indexOf(r.scenario)+1)%keys.length];index++;choosePrompt();notify(`上次的重點：${r.issues.map(i=>i.category).join('、')||'自然表達'}。試著運用在新情境。`);$('answer').focus();};const remove=element('button','移除','text-button');remove.onclick=()=>{if(storeReviews(reviews.filter(x=>x.id!==r.id)))renderReviews();};item.append(listen,again,remove);root.append(item);}
}
$('practice-tab').onclick=()=>showTab(false);$('review-tab').onclick=()=>showTab(true);
for(const id of ['language','level','mode','scenario'])$(id).onchange=()=>{index=0;choosePrompt();};
$('next').onclick=()=>{index++;if($('mode').value==='conversation'){const keys=Object.keys(topics);$('scenario').value=keys[(keys.indexOf($('scenario').value)+1)%keys.length];}choosePrompt();};
$('answer').oninput=()=>{if(feedback){feedback=null;submission=null;savedId=null;$('feedback-section').hidden=true;}updateSubmit();};
$('record').onclick=record;$('stop-speaking').onclick=stopSpeech;$('submit').onclick=send;
$('listen').onclick=()=>{if(feedback&&submission)speak(feedback.corrected,submission.language);};$('listen-natural').onclick=()=>{if(feedback&&submission)speak(feedback.natural,submission.language);};
$('retry').onclick=()=>{if(!feedback)return;retryTarget=feedback.corrected;feedback=null;submission=null;savedId=null;$('answer').value='';$('feedback-section').hidden=true;$('retry-label').hidden=false;notify('用剛才的意思再說一次，也可以用不同但正確的表達。');stopSpeech();updateSubmit();$('answer').focus();$('answer').scrollIntoView({behavior:'smooth',block:'center'});};
$('save').onclick=()=>{if(!feedback||!submission||savedId)return;const r={id:crypto.randomUUID(),createdAt:new Date().toISOString(),...submission,original:submission.text,...feedback};if(storeReviews([r,...reviews].slice(0,300))){savedId=r.id;$('save').disabled=true;$('save-status').textContent='已加入弱點複習，保存在這個瀏覽器。';}};
$('clear').onclick=()=>{if(!reviews.length)return;if(window.confirm('確定清空此瀏覽器的所有複習紀錄？建議先匯出備份。')&&storeReviews([]))renderReviews();};
$('export').onclick=()=>{const blob=new Blob([JSON.stringify({version:1,exportedAt:new Date().toISOString(),reviews},null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=element('a');a.href=url;a.download=`say-again-${new Date().toLocaleDateString('en-CA')}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),5000);};
window.addEventListener('pagehide',()=>{stopRecording();stopSpeech();});
updateCount();choosePrompt();if(!SpeechRecognition){$('record').disabled=true;$('record-status').textContent='此瀏覽器不支援口說辨識，可以直接輸入。';}
fetch('/api/status').then(r=>r.json()).then(data=>{$('service-status').textContent=data.configured?`● AI 已就緒 · ${data.provider||'AI'} / ${data.model||''}`:'○ AI 尚未設定，請聯絡管理者。';}).catch(()=>{$('service-status').textContent='○ 無法確認 AI 服務，請檢查連線。';});
