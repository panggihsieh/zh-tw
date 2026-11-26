import {describe,it,expect,vi,beforeEach,afterEach} from 'vitest';
import {configureSentenceRecognition,type CompetitionRecognition} from './competitionSpeech';

function setup(initial='') {
 const recognition:CompetitionRecognition={lang:'',continuous:true,interimResults:false,onresult:null,onend:null,onerror:null,start(){},stop(){},abort(){}};
 const callbacks={text:vi.fn(),message:vi.fn(),end:vi.fn()};
 const session=configureSentenceRecognition(recognition,initial,callbacks);
 return {recognition,callbacks,session};
}
describe('課堂免登入語音造句',()=>{
 beforeEach(()=>vi.useFakeTimers());
 afterEach(()=>{vi.clearAllTimers();vi.useRealTimers();});
 it('服務沒有回應時解除聆聽狀態，不讓按鈕一直鎖住',()=>{
  const {recognition:r,callbacks:c}=setup();r.abort=vi.fn();
  vi.advanceTimersByTime(30000);
  expect(r.abort).toHaveBeenCalled();expect(c.end).toHaveBeenCalled();
  expect(c.message).toHaveBeenLastCalledWith(expect.stringContaining('30 秒'));
  r.onerror?.({error:'aborted'});r.onend?.();
  expect(c.message).toHaveBeenLastCalledWith(expect.stringContaining('30 秒'));
 });
 it('停頓後重新聆聽，保留前一段文字直到手動停止',()=>{
  const {recognition:r,callbacks:c,session}=setup();
  r.start=vi.fn();
  expect(r.continuous).toBe(true);expect(r.lang).toBe('zh-TW');
  r.onstart?.();expect(c.message).toHaveBeenLastCalledWith(expect.stringContaining('正在聆聽'));
  r.onresult?.({resultIndex:0,results:[{isFinal:false,0:{transcript:'我設計'}}]});
  expect(c.text).toHaveBeenLastCalledWith('我設計');
  r.onresult?.({resultIndex:0,results:[{isFinal:true,0:{transcript:'我設計了一張卡片。'}}]});
  expect(c.text).toHaveBeenLastCalledWith('我設計了一張卡片。');
  r.onend?.();
  vi.advanceTimersByTime(250);
  expect(r.start).toHaveBeenCalledOnce();
  expect(c.end).not.toHaveBeenCalled();
  r.onresult?.({resultIndex:0,results:[{isFinal:true,0:{transcript:'我把它送給朋友。'}}]});
  expect(c.text).toHaveBeenLastCalledWith('我設計了一張卡片。我把它送給朋友。');
  session.stop();
  r.onend?.();
  expect(c.end).toHaveBeenCalledOnce();
 });
 it('插入標點後自動續聽，忽略前一輪遲到的文字',()=>{
  const {recognition:r,callbacks:c,session}=setup();
  r.start=vi.fn();
  r.stop=vi.fn();
  session.continueWith('我看到海灘，');
  expect(r.stop).toHaveBeenCalledOnce();
  r.onresult?.({resultIndex:0,results:[{isFinal:true,0:{transcript:'我看到海灘'}}]});
  expect(c.text).not.toHaveBeenCalled();
  r.onend?.();
  vi.advanceTimersByTime(250);
  expect(r.start).toHaveBeenCalledOnce();
  r.onresult?.({resultIndex:0,results:[{isFinal:true,0:{transcript:'有很多螃蟹'}}]});
  expect(c.text).toHaveBeenLastCalledWith('我看到海灘，有很多螃蟹');
  expect(c.end).not.toHaveBeenCalled();
 });
 it('多次結果不重複累加，重試保留原句',()=>{
  const {recognition:r,callbacks:c}=setup('今天');
  const event={resultIndex:0,results:[{isFinal:true,0:{transcript:'我設計卡片。'}}]};
  r.onresult?.(event);r.onresult?.(event);
  expect(c.text).toHaveBeenLastCalledWith('今天我設計卡片。');
 });
 it('停止沒有結束事件時短時間內復原，保留最後一次連點的標點',()=>{
  const {recognition:r,callbacks:c,session}=setup();r.stop=vi.fn();r.abort=vi.fn();r.start=vi.fn();
  const lateResult=r.onresult,lateEnd=r.onend;
  session.continueWith('我喜歡海邊，');session.continueWith('我喜歡海邊，「');session.continueWith('我喜歡海邊，「」');
  expect(r.stop).toHaveBeenCalledOnce();
  vi.advanceTimersByTime(2500);
  expect(c.text).toHaveBeenLastCalledWith('我喜歡海邊，「」');expect(c.end).toHaveBeenCalledOnce();expect(r.abort).toHaveBeenCalledOnce();
  lateResult?.({resultIndex:0,results:[{isFinal:true,0:{transcript:'舊文字'}}]});lateEnd?.();session.stop();session.continueWith('不應覆蓋');vi.advanceTimersByTime(30000);
  expect(c.text).toHaveBeenLastCalledWith('我喜歡海邊，「」');expect(c.end).toHaveBeenCalledOnce();expect(r.start).not.toHaveBeenCalled();
 });
 it('連點標點及重複結束事件只重啟一次，等待期間的編輯也保留',()=>{
  const {recognition:r,callbacks:c,session}=setup();r.start=vi.fn();r.stop=vi.fn();
  session.continueWith('你好，');session.continueWith('你好，！');r.onend?.();r.onend?.();
  session.continueWith('你好，！？');vi.advanceTimersByTime(250);
  expect(r.stop).toHaveBeenCalledOnce();expect(r.start).toHaveBeenCalledOnce();
  r.onstart?.();r.onresult?.({resultIndex:0,results:[{isFinal:true,0:{transcript:'今天好嗎'}}]});
  expect(c.text).toHaveBeenLastCalledWith('你好，！？今天好嗎');expect(c.end).not.toHaveBeenCalled();
 });
 it('手動停止可取消排定的重啟，不再偷偷收音',()=>{
  const {recognition:r,callbacks:c,session}=setup();r.start=vi.fn();r.onend?.();session.stop();session.stop();vi.advanceTimersByTime(3000);
  expect(r.start).not.toHaveBeenCalled();expect(c.end).toHaveBeenCalledOnce();
 });
 it('重啟沒有開始事件時復原，保留插入的標點',()=>{
  const {recognition:r,callbacks:c,session}=setup();r.abort=vi.fn();session.continueWith('我的句子。');r.onend?.();vi.advanceTimersByTime(3250);
  expect(c.end).toHaveBeenCalledOnce();expect(r.abort).toHaveBeenCalledOnce();expect(c.message).toHaveBeenLastCalledWith(expect.stringContaining('重新啟動未回應'));
 });
 it.each(['stop','start'] as const)('%s 拋錯時不讓操作卡住，且保留文字',method=>{
  const {recognition:r,callbacks:c,session}=setup();r[method]=()=>{throw Error('InvalidStateError');};
  expect(()=>session.continueWith('保留標點，')).not.toThrow();
  if(method==='start'){r.onend?.();vi.advanceTimersByTime(250);}
  expect(c.end).toHaveBeenCalledOnce();expect(c.message).toHaveBeenLastCalledWith(expect.stringContaining('無法'));
 });
 it('離開題目會清除停止逾時與重啟計時，不再更新舊畫面',()=>{
  const {recognition:r,callbacks:c,session}=setup();r.start=vi.fn();session.continueWith('已離開，');session.dispose();vi.advanceTimersByTime(30000);
  expect(c.end).not.toHaveBeenCalled();expect(c.text).not.toHaveBeenCalled();expect(r.start).not.toHaveBeenCalled();
 });
 it('允許麥克風但無文字時顯示重試訊息',()=>{
  const {recognition:r,callbacks:c,session}=setup();session.stop();r.onend?.();
  expect(c.message).toHaveBeenLastCalledWith(expect.stringContaining('尚未收到辨識文字'));expect(c.text).not.toHaveBeenCalled();
 });
 it.each(['network','not-allowed','audio-capture'])('顯示具體錯誤且結束事件不覆蓋錯誤：%s',error=>{
  const {recognition:r,callbacks:c}=setup();r.onerror?.({error});const message=c.message.mock.lastCall?.[0];r.onend?.();
  expect(c.message.mock.lastCall?.[0]).toBe(message);expect(message).toBeTruthy();expect(c.end).toHaveBeenCalled();
 });
});
