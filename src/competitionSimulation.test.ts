import { describe, expect, it } from 'vitest';
import { createCompetitionSimulation } from './competitionSimulation';
import type { CompetitionParticipant, CompetitionRoom } from './competitionApi';

const room:CompetitionRoom={id:'room1',code:'Y5XU',title:'測試課堂',className:'五年一班',status:'lobby',questionCount:1,createdAt:0,duration:600,maxParticipants:30,startedAt:null,expiresAt:null,closedAt:null,loginMode:'roster',gameType:'structure',testRoom:false,questions:[{type:'structure',character:'林',prompt:'字形結構？',options:['左右','上下'],answer:0,seconds:20}]};
describe('本機模擬學生服務',()=>{
 it('預覽加入、等候、開始、答題和排名，不改動正式課堂資料',async()=>{
  const original=structuredClone(room),simulation=createCompetitionSimulation(room,()=>1000);
  expect(()=>simulation.start()).toThrow('請先');
  const lookup=await simulation.request<{room:CompetitionRoom}>('/code/Y5XU');
  expect(lookup.room.questions).toBeUndefined();
  const joined=await simulation.request<{participant:CompetitionParticipant;question:unknown}>('/rooms/room1/join',{});
  expect(joined.participant.name).toBe('測試學生');expect(joined.question).toBeNull();
  simulation.start();
  const state=await simulation.request<{room:CompetitionRoom;question:{character:string}}>('/rooms/room1/state');
  expect(state.room.status).toBe('running');expect(state.room.expiresAt).toBe(601000);expect(state.question.character).toBe('林');
  const answered=await simulation.request<{correct:boolean;participant:CompetitionParticipant}>('/rooms/room1/answer',{answer:0});
  expect(answered.correct).toBe(true);expect(answered.participant.finished).toBe(true);
  const ranking=await simulation.request<{items:{rank:number;points:number}[]}>('/rooms/room1/leaderboard');
  expect(ranking.items[0]).toMatchObject({rank:1,points:1000});
  expect(room).toEqual(original);
  await expect(simulation.request('/rooms/room1/answer',{answer:0})).rejects.toThrow('已完成');
 });
 it('不同預覽互相隔離，無法操作正式開課 API',async()=>{
  const first=createCompetitionSimulation(room),second=createCompetitionSimulation(room);
  await first.request('/rooms/room1/join',{});
  expect(second.joined).toBe(false);
  await expect(first.request('/rooms/room1/start',{})).rejects.toThrow('不支援');
 });
 it('造句提供模擬回饋',async()=>{
  const simulation=createCompetitionSimulation({...room,gameType:'sentence-practice',questions:[{type:'sentence-practice',character:'林',prompt:'造句',seconds:90}]});
  await simulation.request('/rooms/room1/join',{});simulation.start();
  const answer=await simulation.request<{grade:{level:string;feedback:string}}>('/rooms/room1/answer',{sentence:'森林裡有許多樹木。'});
  expect(answer.grade).toEqual({level:'模擬評量',feedback:'這是測試回饋，未呼叫 AI。'});
 });
});
