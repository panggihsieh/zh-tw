import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync } from 'node:fs';
import CompetitionSimulationButton from './CompetitionSimulationButton';
import { createCompetitionSimulation } from './competitionSimulation';
import { openCompetitionPreview } from './competitionPreviewTab';
import type { CompetitionRoom, CompetitionParticipant } from './competitionApi';
const room:CompetitionRoom={id:'demo',code:'TEST',title:'虛構測試課堂',className:'測試班',status:'lobby',questionCount:1,createdAt:0,duration:600,maxParticipants:30,startedAt:null,expiresAt:null,closedAt:null,loginMode:'roster',gameType:'quiz',testRoom:false,roster:['private@example.com'],questions:[{prompt:'題目',options:['甲','乙'],answer:0,seconds:30}]};
afterEach(()=>vi.unstubAllGlobals());
describe('全部競賽共用學生模擬',()=>{
 it.each(['quiz','structure','writing','sentence-practice'] as const)('%s 在課堂開始前皆提供入口',gameType=>{
  const question=gameType==='writing'||gameType==='sentence-practice'?{type:gameType,character:'一',prompt:'示範題',seconds:90}:room.questions![0];
  const html=renderToStaticMarkup(<CompetitionSimulationButton room={{...room,gameType,questions:[question]}}/>);
  expect(html).toContain('學生模擬（新分頁）');expect(html).not.toContain('disabled');
 });
 it('不完整題目先停用模擬，避免學生畫面崩潰',()=>{
  expect(renderToStaticMarkup(<CompetitionSimulationButton room={{...room,questions:[{prompt:'未完成',seconds:30}]}}/>)).toContain('disabled');
 });
 it('匿名加入使用模擬小鳥與暱稱，不帶入正式名冊或占用狀態',async()=>{
  const source={...room,loginMode:'anonymous' as const,anonymousBirds:[{id:'bird-01',name:'原鳥',occupied:true,mine:false}]};
  const original=structuredClone(source),simulation=createCompetitionSimulation(source);
  const data=await simulation.request<{room:CompetitionRoom}>('/code/TEST');
  expect(data.room.anonymousBirds?.[0].occupied).toBe(false);expect(data.room.roster).toBeUndefined();
  const joined=await simulation.request<{participant:CompetitionParticipant}>('/rooms/demo/join',{name:'示範小明',birdId:'bird-01'});
  expect(joined.participant).toMatchObject({name:'示範小明',avatarKind:'anonymous',avatar:'/bird-avatars/bird-01.png'});expect(source).toEqual(original);
 });
 it('書寫模擬依真正筆跡判斷，僅讀取靜態筆順，不呼叫正式 API',async()=>{
  const strokes=JSON.parse(readFileSync('public/game-strokes/4e00.json','utf8')) as {track:{x:number;y:number}[]}[];
  const fetchMock=vi.fn(async()=>({ok:true,json:async()=>strokes}));vi.stubGlobal('fetch',fetchMock);
  const simulation=createCompetitionSimulation({...room,gameType:'writing',questions:[{type:'writing',character:'一',prompt:'書寫一',seconds:90}]});
  await simulation.request('/rooms/demo/join',{});simulation.start();
  const result=await simulation.request<{correct:boolean}>('/rooms/demo/answer',{traces:strokes.map(stroke=>stroke.track.map(p=>({x:p.x/2048*1000,y:p.y/2048*1000})))});
  expect(result.correct).toBe(true);expect(fetchMock).toHaveBeenCalledWith('/game-strokes/4e00.json');
 });
 it('開新分頁僅複製題目，排除名冊並清除原頁暫存；遭封鎖可重試',()=>{
  const memory=new Map<string,string>();let snapshot='';
  vi.stubGlobal('sessionStorage',{setItem:(k:string,v:string)=>memory.set(k,v),removeItem:(k:string)=>memory.delete(k)});
  const open=vi.fn(()=>{snapshot=[...memory.values()][0];return {};});vi.stubGlobal('window',{open});
  openCompetitionPreview(room);expect(snapshot).not.toContain('private@example.com');expect(JSON.parse(snapshot).questions).toHaveLength(1);expect(memory.size).toBe(0);
  open.mockImplementation(()=>null as never);expect(()=>openCompetitionPreview(room)).toThrow('封鎖');expect(memory.size).toBe(0);
 });
});
