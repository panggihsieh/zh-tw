import test from 'node:test';
import assert from 'node:assert/strict';
import {validPunctuationOption} from './quiz-api.mjs';
import {once} from 'node:events';
import {createStructureServer} from './structure-api.mjs';
import {SIX_CATEGORIES} from './quiz-pedagogy.mjs';

// 走完整生成、交叉檢查、驗證與草稿保存；模型回應為明確標示的測試資料。
test('六類配額、交叉檢查及教師審核發布；學生不能出題', async t => {
  const db = new Map(); let calls = 0, reject = false, short = false, duplicate = false;
  const store = {
    list: async prefix => ({names: [...db.keys()].filter(k => k.startsWith(prefix))}),
    get: async key => { if (!db.has(key)) throw Object.assign(Error('missing'), {status:404}); return structuredClone(db.get(key)); },
    create: async (key,value) => { db.set(key,{value:structuredClone(value),generation:1}); },
    update: async (key,value) => { db.set(key,{value:structuredClone(value),generation:2}); },
  };
  const questions = SIX_CATEGORIES.map((category,i) => ({category,difficulty:'中',stem:`測試資料：第${i+1}個考點？`,variants:[`測試資料：考點${i+1}應選何者？`,`測試資料：哪項符合考點${i+1}？`],options:category==='標點符號'?['小安說：「大家一起幫忙。」','小安說，大家一起幫忙。','小安說；大家一起幫忙。','小安說、大家一起幫忙。']:['測試甲','測試乙','測試丙','測試丁'],answer:i%4,explanation:'虛構模型測試資料，不供學生作答。',evidence:'大家一起幫忙。'}));
  const server = createStructureServer({quizStore:store,
    quizAuthenticate:async req => ({uid:req.headers['x-test-user'] || 'teacher',email:'test@example.com',admin:req.headers['x-test-user']!=='student'}),
    configStore:{load:async()=>({version:2,selected:'deepseek',profiles:{deepseek:{provider:'deepseek',model:'mock',apiKey:'test-only',enabled:true}}})},
    fetchProvider:async (_url,options) => {
      calls++; const prompt=JSON.parse(options.body).messages[0].content;
      const review=prompt.startsWith('核對');
      const emitted=structuredClone(questions);if(duplicate&&!prompt.startsWith('修正'))emitted[0].options[3]=emitted[0].options[0];
      const output=review ? {checks:questions.map((_,index)=>({index,ok:!reject,reason:'測試'}))} : {questions:short?emitted.slice(0,5):emitted};
      return {ok:true,json:async()=>({choices:[{message:{content:JSON.stringify(output)}}]})};
    },
  }).listen(0,'127.0.0.1'); await once(server,'listening');t.after(()=>server.close());
  const call=async(path,body,user='teacher')=>{const r=await fetch(`http://127.0.0.1:${server.address().port}/api/structure/quiz${path}`,{method:'POST',headers:{Origin:'http://127.0.0.1:5173','X-Notebook-Request':'quiz','Content-Type':'application/json','x-test-user':user},body:JSON.stringify(body)});return {status:r.status,data:await r.json()};};
  const payload={title:'六類測試',lesson:'測試課文',grade:5,className:'虛構測試班',roster:['test@example.com'],passage:'大家一起幫忙。',questionMode:'original',count:6,categories:SIX_CATEGORIES,difficulty:'中',questionPlan:SIX_CATEGORIES.map(category=>({category,difficulty:'中',count:1}))};
  assert.equal((await call('/generate',payload,'student')).status,403);assert.equal(calls,0);
  assert.equal((await call('/generate',{...payload,count:7})).status,400);assert.equal(calls,0);
  const created=await call('/generate',payload);assert.equal(created.status,201,JSON.stringify(created.data));assert.equal(calls,2);
  assert.deepEqual(created.data.questions.map(q=>q.category),SIX_CATEGORIES);assert.ok(created.data.questions.every(q=>q.reviewed===false));
  assert.equal((await call(`/papers/${created.data.id}/publish`,created.data)).status,400);
  assert.equal((await call(`/papers/${created.data.id}/save`,created.data)).status,200);
  assert.equal((await call(`/papers/${created.data.id}/publish`,{...created.data,questions:created.data.questions.map(q=>({...q,reviewed:true}))})).status,200);
  duplicate=true;const beforeRepair=calls;const fixed=await call('/generate',payload);assert.equal(fixed.status,201);assert.equal(calls-beforeRepair,4);assert.equal(fixed.data.aiCheck.repaired,true);duplicate=false;
  const size=db.size, beforeReject=calls;reject=true;assert.equal((await call('/generate',payload)).status,400);assert.equal(db.size,size);assert.equal(calls-beforeReject,4,'修正與複查最多各一次');
  reject=false;short=true;assert.equal((await call('/generate',payload)).status,400);assert.equal(db.size,size);
});

test('標點選項拒絕符號碎片，但允許完整句中的錯誤標點作為干擾項',()=>{
  for(const value of ['：」、「','冒號','「」']) assert.equal(validPunctuationOption(value),false);
  assert.equal(validPunctuationOption('小安說：「大家一起幫忙。'),true);
  assert.equal(validPunctuationOption('小安說：「大家一起幫忙。」'),true);
});
