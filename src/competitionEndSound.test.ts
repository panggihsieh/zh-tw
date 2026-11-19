import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import type { CompetitionRoom } from './competitionApi';

const play=vi.fn().mockResolvedValue(undefined),pause=vi.fn();
beforeEach(()=>{
 vi.resetModules();play.mockClear();pause.mockClear();
 const settings=new Map<string,string>();
 vi.stubGlobal('localStorage',{getItem:(key:string)=>settings.get(key)??null,setItem:(key:string,value:string)=>settings.set(key,value)});
 vi.stubGlobal('Audio',class {play=play;pause=pause;currentTime=0;volume=1;constructor(public src:string){}});
});
afterEach(()=>vi.unstubAllGlobals());
const room=(id:string,status:string)=>({id,status} as CompetitionRoom);
it('四種競賽都只在執行中轉為結束時播放一次，重新載入已結束課堂不播放',async()=>{
 const sound=await import('./competitionEndSound'),previous=new Map<string,string>();
 sound.observeCompetitionEnd([room('old','closed')],previous);expect(play).not.toHaveBeenCalled();
 for(const gameType of ['quiz','writing','structure','sentence-practice']){
  sound.observeCompetitionEnd([room(gameType,'lobby')],previous);
  sound.observeCompetitionEnd([room(gameType,'running')],previous);
  sound.observeCompetitionEnd([room(gameType,'closed')],previous);
  sound.observeCompetitionEnd([room(gameType,'closed')],previous);
 }
 expect(play).toHaveBeenCalledTimes(4);
});
it('關閉時停止播放並保持靜音，重新開啟後可試聽',async()=>{
 const sound=await import('./competitionEndSound');
 await sound.playCompetitionEndSound();expect(play).toHaveBeenCalledTimes(1);
 sound.setEndSoundEnabled(false);expect(pause).toHaveBeenCalledTimes(1);
 await sound.playCompetitionEndSound();expect(play).toHaveBeenCalledTimes(1);
 sound.setEndSoundEnabled(true);await sound.playCompetitionEndSound();expect(play).toHaveBeenCalledTimes(2);
});
it('自動播放被阻擋時不延遲重播，仍可手動試聽',async()=>{
 const sound=await import('./competitionEndSound'),previous=new Map<string,string>();
 play.mockRejectedValueOnce(Error('autoplay blocked'));
 sound.observeCompetitionEnd([room('blocked','running')],previous);
 sound.observeCompetitionEnd([room('blocked','closed')],previous);
 await Promise.resolve();sound.observeCompetitionEnd([room('blocked','closed')],previous);expect(play).toHaveBeenCalledTimes(1);
 await sound.playCompetitionEndSound();expect(play).toHaveBeenCalledTimes(2);
});

it('老師手動結束會啟用音效且不與結束狀態輪詢重複播放',async()=>{
 const sound=await import('./competitionEndSound'),previous=new Map<string,string>();
 sound.setEndSoundEnabled(false);
 sound.observeCompetitionEnd([room('manual','running')],previous);
 await sound.playClosedCompetitionSound('manual');
 expect(sound.endSoundEnabled()).toBe(true);
 sound.observeCompetitionEnd([room('manual','closed')],previous);
 await sound.playClosedCompetitionSound('manual');
 expect(play).toHaveBeenCalledTimes(1);
});

it('時間到結束同樣啟用音效，重複輪詢不重播',async()=>{
 const sound=await import('./competitionEndSound'),previous=new Map<string,string>();
 sound.setEndSoundEnabled(false);
 sound.observeCompetitionEnd([room('timeout','running')],previous);
 sound.observeCompetitionEnd([room('timeout','closed')],previous);
 sound.observeCompetitionEnd([room('timeout','closed')],previous);
 expect(sound.endSoundEnabled()).toBe(true);
 expect(play).toHaveBeenCalledTimes(1);
});

it('預載較晚完成也不會暫停或靜音正式結束歌曲',async()=>{
 let finish!:()=>void;
 play.mockImplementationOnce(()=>new Promise<void>(resolve=>{finish=resolve;}));
 const sound=await import('./competitionEndSound');
 const primed=sound.primeCompetitionEndSound();
 await sound.playCompetitionEndSound();
 finish();await primed;
 expect(play).toHaveBeenCalledTimes(2);expect(pause).not.toHaveBeenCalled();
});
it('停止音樂會暫停並回到開頭，仍可重新播放且不關閉下次結束音樂',async()=>{
 const player={play,pause,currentTime:0,volume:1,muted:false,onended:null,onerror:null};
 vi.stubGlobal('Audio',function(){return player;});
 const sound=await import('./competitionEndSound');
 await sound.playCompetitionEndSound();player.currentTime=12;
 sound.stopCompetitionEndSound();
 expect(pause).toHaveBeenCalledTimes(1);expect(player.currentTime).toBe(0);expect(sound.endSoundEnabled()).toBe(true);
 await sound.playCompetitionEndSound();expect(play).toHaveBeenCalledTimes(2);
});
