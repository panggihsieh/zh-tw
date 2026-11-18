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
