import { useState } from 'react';
import { Lock, Unlock, Save } from 'lucide-react';

export default function BackendLabelSettings({titles, labels, onSave}: {
  titles: Record<string, string>;
  labels: Partial<Record<string, string>>;
  onSave: (next: Record<string, string>) => void;
}) {
  const [locked, setLocked] = useState(true);
  const [draft, setDraft] = useState(labels);
  const [message, setMessage] = useState('');
  function toggleLock() {
    setDraft({...labels});
    setMessage(locked ? '已解鎖全部欄位；修改後請按「儲存名稱」。' : '已鎖定，未儲存的修改已取消。');
    setLocked(!locked);
  }
  function save() {
    if (locked) return;
    const next = Object.fromEntries(Object.keys(titles).map(key => [key, (draft[key] || '').trim()]).filter(([, value]) => value));
    try {
      onSave(next);
      setLocked(true);
      setMessage('功能名稱已儲存，並自動鎖定。');
    } catch {
      setMessage('無法儲存，請確認此瀏覽器允許本機儲存後再試。');
    }
  }
  return <details className="theme-library" onToggle={event => {
    if (!event.currentTarget.open) { setLocked(true); setMessage(''); }
  }}>
    <summary>修改後台功能名稱</summary>
    <p>預設鎖定，解鎖後才可編輯與儲存。留空可恢復預設名稱，設定儲存在此瀏覽器。</p>
    <div className="backend-label-actions">
      <button type="button" className="secondary" onClick={toggleLock} aria-pressed={!locked}>
        {locked ? <Lock size={18}/> : <Unlock size={18}/>}{locked ? '解鎖全部名稱' : '鎖定並取消未儲存修改'}
      </button>
      <button type="button" className="primary" disabled={locked} onClick={save}><Save size={18}/>儲存名稱</button>
      <span>{locked ? '目前：已鎖定' : '目前：已解鎖'}</span>
    </div>
    <fieldset className="backend-label-fields" disabled={locked}>
      <legend>後台功能名稱</legend>
      <div className="backend-label-settings">
        {Object.entries(titles).map(([key, title]) => <label key={key}>{title}
          <input maxLength={32} placeholder={title} value={(locked ? labels[key] : draft[key]) || ''} onChange={event => setDraft({...draft, [key]: event.target.value})}/>
        </label>)}
      </div>
    </fieldset>
    <p role="status">{message}</p>
  </details>;
}
