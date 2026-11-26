import { useState } from 'react';
import { Users } from 'lucide-react';
import type { CompetitionRoom } from './competitionApi';
import { openCompetitionPreview } from './competitionPreviewTab';

/** 所有遊戲共用此入口；僅將題目複本送至本機模擬分頁。 */
export default function CompetitionSimulationButton({ room }: { room: CompetitionRoom }) {
  const [error, setError] = useState('');
  const ready = !!room.questions?.length && room.questions.every(question => question.prompt.trim() && (question.type === 'writing' || question.type === 'sentence-practice' ? !!question.character : !!question.options?.length && Number.isInteger(question.answer) && question.answer! >= 0 && question.answer! < question.options.length));
  return <>
    <button type="button" className="secondary" disabled={!ready} title={ready ? "開啟獨立的學生模擬分頁" : "請先完成題目設定"} onClick={() => {
      setError('');
      try { openCompetitionPreview(room); } catch (error) { setError((error as Error).message); }
    }}><Users size={18}/>學生模擬（新分頁）</button>
    {error && <p role="alert">{error}</p>}
  </>;
}
