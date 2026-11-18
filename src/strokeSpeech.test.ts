import {describe,it,expect,vi} from 'vitest';
import {strokeSpeechText,speakStrokeText,type StrokeSpeechEntry} from './strokeSpeech';

const entry:StrokeSpeechEntry={confirmed:true,fingerprint:'test',strokes:[{name:'橫',spoken:'橫'},{name:'豎',spoken:'豎'},{name:'橫折鉤',spoken:'橫折鉤'}]};
describe('教師確認的筆畫語音時機',()=>{
 it('正式比賽只在正確後說出名稱，不念第一筆或下一筆',()=>{
  for(let i=0;i<entry.strokes.length;i++){
   expect(strokeSpeechText(entry,i,'competition','prompt')).toBe('');
   expect(strokeSpeechText(entry,i,'competition','correct')).toBe(entry.strokes[i].spoken);
   expect(strokeSpeechText(entry,i,'competition','mistake')).toBe('請再試一次。');
  }
 });
 it('練習會先提示筆畫，寫錯也可重播當前筆畫',()=>{
  expect(strokeSpeechText(entry,0,'practice','prompt')).toBe('第一筆，橫。');
  expect(strokeSpeechText(entry,1,'practice','prompt')).toBe('下一筆，豎。');
  expect(strokeSpeechText(entry,2,'practice','mistake')).toBe('請再試一次，這一筆是橫折鉤。');
  expect(strokeSpeechText(entry,0,'practice','correct')).toBe('');
 });
 it('未發布、缺少資料、已完成的筆號不朗讀',()=>{
  expect(strokeSpeechText({...entry,confirmed:false},0,'competition','correct')).toBe('');
  expect(strokeSpeechText(null,0,'practice','prompt')).toBe('');
  expect(strokeSpeechText(entry,3,'practice','prompt')).toBe('');
 });
 it('裝置語音出錯不會使書寫處理中斷',()=>{
  vi.stubGlobal('window',{speechSynthesis:{cancel(){throw Error('device failure');}}});
  try{expect(speakStrokeText('橫')).toBe(false);}finally{vi.unstubAllGlobals();}
 });
});

it('優先朗讀獨立口訣，舊資料與空口訣仍使用朗讀文字',()=>{
 const value={...entry,strokes:[{name:'豎折',spoken:'豎折',mnemonic:'豎，右折'}]};
 expect(strokeSpeechText(value,0,'practice','prompt')).toBe('第一筆，豎，右折。');
 expect(strokeSpeechText(value,0,'competition','correct')).toBe('豎，右折');
 expect(strokeSpeechText(value,0,'competition','prompt')).toBe('');
 expect(strokeSpeechText({...value,strokes:[{...value.strokes[0],mnemonic:' '}]},0,'competition','correct')).toBe('豎折');
});
