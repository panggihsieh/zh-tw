import type { CompetitionParticipant, CompetitionRoom } from './competitionApi';
import { judgeStroke, type Point } from './writingGame';

/** 可注入學生畫面的本機模擬服務；不呼叫正式 API、不儲存成績。 */
export function createCompetitionSimulation(source: CompetitionRoom, now = () => Date.now()) {
 const room = structuredClone(source);
 room.status = 'lobby';
 room.startedAt = null;
 room.expiresAt = null;
 room.closedAt = null;
 const questions = room.questions ?? [];
 let participant: CompetitionParticipant | null = null;
 const publicRoom = () => { const { questions: _questions, roster: _roster, ...value } = room; return value; };
 const state = () => ({ room: publicRoom(), participant, question: room.status === 'running' && participant && !participant.finished ? questions[participant.index] : null });
 return {
  get joined() { return participant !== null; },
  get running() { return room.status === 'running'; },
  get ended() { return room.status === 'closed'; },
  finish() { room.status='closed';room.closedAt=now(); },
  start() {
   if (!participant) throw Error('請先以測試學生加入等候室。');
   if (!questions.length) throw Error('此課堂沒有可預覽的題目。');
   room.status = 'running'; room.startedAt = now(); room.expiresAt = now() + room.duration * 1000;
  },
  async request<T>(path: string, body?: unknown): Promise<T> {
   if(room.status==='running'&&room.expiresAt!=null&&room.expiresAt<=now()){room.status='closed';room.closedAt=room.expiresAt;}
   let result: unknown;
   if (path === `/code/${room.code}`) result = { room: publicRoom() };
   else if (path === `/rooms/${room.id}/join`) {
    if (room.status !== 'lobby') throw Error('測試課堂已鎖定加入。');
    participant ??= { uid: 'simulation-student', name: '測試學生', seat: 1, avatarKind: 'default', avatar: null, index: 0, correct: 0, points: 0, finished: false, mine: true };
    result = state();
   } else if (path === `/rooms/${room.id}/state`) result = state();
   else if (path === `/rooms/${room.id}/leaderboard`) result = { items: participant ? [{ ...participant, rank: 1, answered: participant.index }] : [] };
   else if (path === `/rooms/${room.id}/answer`) {
    if (!participant || room.status !== 'running' || participant.finished) throw Error('測試課堂尚未開始或已完成。');
    const question = questions[participant.index];
    const value = body as { answer?: number; sentence?: string; traces?:Point[][] };
    let writingCorrect=false;
    if(question.type==='writing'){
     const response=await fetch(`/game-strokes/${question.character!.codePointAt(0)!.toString(16)}.json`);
     if(!response.ok)throw Error("此字尚無可用筆順資料。");
     const references=await response.json() as {track:Point[]}[];
     writingCorrect=Boolean(value.traces?.length===references.length&&references.every((stroke,index)=>judgeStroke(value.traces![index],stroke.track.map(p=>({x:p.x/2048*1000,y:p.y/2048*1000})))));
    }
    const correct = question.type === 'writing' ? writingCorrect : question.type === 'sentence-practice' ? Boolean(value.sentence?.includes(question.character ?? '') && value.sentence.length >= 5) : value.answer === question.answer;
    participant.index++; participant.correct += Number(correct); participant.points += correct ? 1000 : 0;
    participant.finished = participant.index >= questions.length;
    result = { ...state(), correct, correctAnswer: question.answer, points: correct ? 1000 : 0, ...(question.type === 'sentence-practice' ? { grade: { level: '待確認', total: null, scores: { correctness: 0, completeness: 0, fluency: 0, detail: 0, mechanics: 0 }, targetOk: true, meaningOk: true, uncertain: true, highlight: '', feedback: '模擬預覽未呼叫 AI，分數待確認。' } } : {}) };
   } else throw Error('不支援的模擬學生操作。');
   return structuredClone(result) as T;
  },
 };
}
