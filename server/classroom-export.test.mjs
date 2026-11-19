import test from 'node:test';import assert from 'node:assert/strict';import {exportCompetitionClassroom} from './classroom-export.mjs';
const room={id:'test-room',classId:'test-class',title:'隔離課堂',status:'closed',closedAt:2000,startedAt:1000,gameType:'writing',questions:[{character:'漢'}],students:[{seat:1,name:'示範學生',email:'fixture@example.test'}]};
const ranking=[{uid:'guest-test',seat:1,name:'示範學生',rank:1,points:900,correct:1,index:1}];
const input={confirmed:true,revision:JSON.stringify([['guest-test',1,900,1,1]]),image:'data:image/jpeg;base64,/9j/2Q==',limitKB:20};
const env={CLASSROOM_LEARNING_TOKEN:'test-only-secret',CLASSROOM_EXPORT_SCHOOL:'demo-school',CLASSROOM_EXPORT_CLASSES:JSON.stringify({'test-class':'iam-class'}),CLASSROOM_LEARNING_STUDENTS:JSON.stringify({'test-class':[{seat:1,name:'示範學生',email:'fixture@example.test',studentId:'iam-student'}]})};
test('已明確對應名冊的學生經新版 API 送出統計；不使用 guest UID 當跨站身分',async()=>{let body;const result=await exportCompetitionClassroom(room,ranking,input,async(url,options)=>{assert.equal(url,'https://school-iam.web.app/v1/classroom-learning/import');body=JSON.parse(options.body);return {ok:true,json:async()=>({schemaVersion:2,id:'test-record'})};},env);assert.equal(result.schemaVersion,2);assert.equal(body.ranking[0].studentId,'iam-student');assert.equal(body.ranking[0].correct,1);assert.equal(body.ranking[0].maxScore,1000);assert.equal(body.ranking[0].activeMs,null);});
test('姓名座號或已確認名冊 email 不一致則拒絕，不能猜測身分',async()=>{for(const changed of [{...ranking[0],name:'另一位學生'},{...ranking[0],seat:2}])await assert.rejects(exportCompetitionClassroom(room,[changed],{...input,revision:JSON.stringify([[changed.uid,changed.rank,changed.points,changed.correct,changed.index]])},()=>{throw Error('must not fetch');},env));await assert.rejects(exportCompetitionClassroom({...room,students:[{...room.students[0],email:'changed@example.test'}]},ranking,input,()=>{throw Error('must not fetch');},env));});
test('沒有新版設定仍保留舊版課堂照片匯出',async()=>{const legacy={...env,CLASSROOM_LEARNING_TOKEN:undefined,CLASSROOM_EXPORT_TOKEN:'legacy-test-secret'};await exportCompetitionClassroom(room,ranking,input,async url=>{assert.equal(url,'https://school-iam.web.app/v1/classroom-records/import');return {ok:true,json:async()=>({id:'legacy'})};},legacy);});

test('confirmed export uses seven server standings and requires a current preview',async()=>{
 const room={id:'test-seven',status:'closed',title:'範例測試課堂',classId:'source-class-a',closedAt:1794902400000};
 const rows=Array.from({length:7},(_,i)=>({uid:'student-'+i,rank:i+1,name:'測試學生 '+(i+1),points:98-i,correct:4,index:5}));
 const revision=JSON.stringify(rows.map(row=>[row.uid,row.rank,row.points,row.correct,row.index]));
 const preview={revision,limitKB:50,image:'data:image/jpeg;base64,test'};
 const env={CLASSROOM_EXPORT_TOKEN:'fixture',CLASSROOM_EXPORT_SCHOOL:'danan',CLASSROOM_EXPORT_CLASSES:'{"source-class-a":"class-a"}'};
 const sent=[];
 const sender=async (_url,request)=>{sent.push(JSON.parse(request.body));return Response.json({id:'record'});};
 await assert.rejects(exportCompetitionClassroom(room,rows,preview,sender,env),{status:400});
 await assert.rejects(exportCompetitionClassroom(room,rows,{...preview,confirmed:true,revision:'stale'},sender,env),{status:409});
 await assert.rejects(exportCompetitionClassroom({...room,testRoom:true},rows,{...preview,confirmed:true},sender,env),{status:409});
 assert.equal(sent.length,0);
 assert.deepEqual(await exportCompetitionClassroom(room,rows,{...preview,confirmed:true,ranking:[]},sender,env),{id:'record'});
 assert.equal(sent[0].ranking.length,7);
 assert.equal(sent[0].ranking[0].score,98);
 assert.equal(sent[0].image,preview.image);
});
