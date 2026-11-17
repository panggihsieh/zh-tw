import {test} from 'node:test';
import assert from 'node:assert/strict';
import {exportCompetitionClassroom} from './classroom-export.mjs';

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
