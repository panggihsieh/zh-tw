import {describe,it,expect,vi,beforeEach,afterEach} from 'vitest';
import {configureSentenceRecognition,type CompetitionRecognition} from './competitionSpeech';

function setup(initial='') {
 const recognition:CompetitionRecognition={lang:'',continuous:true,interimResults:false,onresult:null,onend:null,onerror:null,start(){},stop(){},abort(){}};
 const callbacks={text:vi.fn(),message:vi.fn(),end:vi.fn()};
 configureSentenceRecognition(recognition,initial,callbacks);
 return {recognition,callbacks};
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
 it('收到暫存及最終文字立即顯示，說完自動結束',()=>{
  const {recognition:r,callbacks:c}=setup();
  expect(r.continuous).toBe(false);expect(r.lang).toBe('zh-TW');
  r.onstart?.();expect(c.message).toHaveBeenLastCalledWith(expect.stringContaining('正在聆聽'));
  r.onresult?.({resultIndex:0,results:[{isFinal:false,0:{transcript:'我設計'}}]});
  expect(c.text).toHaveBeenLastCalledWith('我設計');
  r.onresult?.({resultIndex:0,results:[{isFinal:true,0:{transcript:'我設計了一張卡片。'}}]});
  expect(c.text).toHaveBeenLastCalledWith('我設計了一張卡片。');
  r.onend?.();expect(c.end).toHaveBeenCalled();expect(c.message).toHaveBeenLastCalledWith(expect.stringContaining('辨識完成'));
 });
 it('多次結果不重複累加，重試保留原句',()=>{
  const {recognition:r,callbacks:c}=setup('今天');
  const event={resultIndex:0,results:[{isFinal:true,0:{transcript:'我設計卡片。'}}]};
  r.onresult?.(event);r.onresult?.(event);
  expect(c.text).toHaveBeenLastCalledWith('今天我設計卡片。');
 });
 it('允許麥克風但無文字時顯示重試訊息',()=>{
  const {recognition:r,callbacks:c}=setup();r.onend?.();
  expect(c.message).toHaveBeenLastCalledWith(expect.stringContaining('尚未收到辨識文字'));expect(c.text).not.toHaveBeenCalled();
 });
 it.each(['network','not-allowed','audio-capture','no-speech'])('顯示具體錯誤且結束事件不覆蓋錯誤：%s',error=>{
  const {recognition:r,callbacks:c}=setup();r.onerror?.({error});const message=c.message.mock.lastCall?.[0];r.onend?.();
  expect(c.message.mock.lastCall?.[0]).toBe(message);expect(message).toBeTruthy();expect(c.end).toHaveBeenCalled();
 });
});
