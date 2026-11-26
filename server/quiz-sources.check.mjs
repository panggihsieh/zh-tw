import test from 'node:test';import assert from 'node:assert/strict';import {driveSourceId,splitNaniSource,makeQuizSourceHandlers} from './quiz-sources.mjs';
const text='國語五上課文文字檔\n一、幸福筆記本　虛構測試作者\n這是明確標記的合成來源，用來驗證拆課邊界，不是出版社全文。\n\n二、做人做事做長久　虛構測試作者\n這是第二段合成來源，不供實際命題或學生閱讀。\n讀寫練功房一　測試補充篇\n這一段不應併入第二課。';
test('Drive檔案及資料夾連結只辨識ID，不讀取任意遠端或保存權杖',()=>{
 assert.equal(driveSourceId('https://drive.google.com/drive/u/0/folders/sampleFolder123'),'sampleFolder123');
 assert.equal(driveSourceId('https://docs.google.com/document/d/sampleFile123/edit?usp=sharing'),'sampleFile123');
 for(const url of ['http://localhost/x','https://drive.google.com.evil.test/file/d/sample123/view','https://drive.google.com/file/d/sample123/view?access_token=secret','https://user:pass@drive.google.com/file/d/sample123/view'])assert.throws(()=>driveSourceId(url));
});
test('按登記課次拆分並排除補充閱讀，不能把錯冊課文直接綁定成所選課',()=>{
 const value=splitNaniSource(text,{grade:5,term:'上',year:'115_1'});assert.equal(value.lessons.length,2);assert.equal(value.missing.length,10);assert.ok(!value.lessons[1].passage.includes('不應併入'));assert.ok(value.lessons[0].passage.startsWith('一、幸福筆記本'));
 assert.throws(()=>splitNaniSource(text,{grade:6,term:'上',year:'115_1',lessonKey:'nani-115_1-6-1'}));
 assert.throws(()=>splitNaniSource(text,{grade:5,term:'上',year:'999_1'}));
});
test('來源模組保存原檔、重複匯入不覆寫、連結解析與讀回完整課次',async()=>{
 const db=new Map();const store={create:async(k,value)=>{if(db.has(k))throw Object.assign(Error('exists'),{status:412});db.set(k,{value:structuredClone(value)});},get:async k=>{if(!db.has(k))throw Object.assign(Error('missing'),{status:404});return structuredClone(db.get(k));}};
 const handler=makeQuizSourceHandlers({store,scan:async p=>[...db.entries()].filter(([k])=>k.startsWith(p)).map(([,v])=>v.value)});
 const input={filename:'虛構測試全文.txt',base64:Buffer.from(text).toString('base64'),grade:5,term:'上',year:'115_1',sourceUrls:['https://drive.google.com/drive/folders/sampleFolder123']};
 const source=await handler('/quiz-sources/import','POST',input);assert.equal(source.lessonCount,2);assert.equal(db.size,2);
 const again=await handler('/quiz-sources/import','POST',input);assert.equal(again.id,source.id);assert.equal(db.size,2);
 const listing=await handler('/quiz-sources','GET');assert.equal(listing.items[0].lessons,undefined);
 const resolved=await handler('/quiz-sources/resolve','POST',{url:'https://drive.google.com/drive/folders/sampleFolder123'});assert.equal(resolved.items[0].id,source.id);
 const full=await handler(`/quiz-sources/${source.id}`,'GET');assert.equal(full.lessons.length,2);assert.equal(full.base64,undefined);
 await assert.rejects(()=>handler('/quiz-sources/resolve','POST',{url:'https://drive.google.com/drive/folders/unknownSource123'}));
 await assert.rejects(()=>handler('/quiz-sources/import','POST',{...input,filename:'fake.exe'}));
});
