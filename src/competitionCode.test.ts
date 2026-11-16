import { describe, expect, it } from 'vitest';
import { competitionCodeFromInput } from './competitionApi';

describe('競賽開課代碼輸入',()=>{
 it('接受手動輸入、小寫及貼上的四碼代碼',()=>{
  expect(competitionCodeFromInput('y5')).toBe('Y5');
  expect(competitionCodeFromInput(' y5xu ')).toBe('Y5XU');
 });
 it('從完整加入連結擷取代碼，不會截成 HTTP',()=>{
  expect(competitionCodeFromInput('https://zh-tw.web.app/#games/competition?code=Y5XU')).toBe('Y5XU');
  expect(competitionCodeFromInput('https://voltaic-circuit-511310-a3-zh-tw.web.app/#games/competition?code=y5xu&other=1')).toBe('Y5XU');
  expect(competitionCodeFromInput('#games/competition?code=%59%35%58%55')).toBe('Y5XU');
 });
 it('無代碼或非法代碼的連結不會變成看似有效的四碼',()=>{
  for(const value of ['https://zh-tw.web.app/','#games/competition','https://zh-tw.web.app/#games/competition?code=Y5XU2','https://zh-tw.web.app/?code=A10B','https://zh-tw.web.app/?code=%']){
   expect(competitionCodeFromInput(value)).toBe('');
  }
 });
});
