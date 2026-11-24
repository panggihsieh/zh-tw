import { useState } from 'react';
import { BIG_STRUCTURES, removeStructureOverride, saveStructureOverride, subtypesOf, type BigStructureName, type StructureOverride } from './structureOverrides';
import { structureImage } from './structureSubtype';

/** 管理者修正單一生字的結構；儲存後所有新產生的結構題都會採用。 */
export default function StructureOverrideEditor({ character, current, guess, onDone }: {
  character: string;
  current?: StructureOverride;
  /** 目前題目的正確答案（自動判斷或既有修正），作為預設值。 */
  guess?: string;
  onDone: (value: StructureOverride | null | undefined) => void;
}) {
  const initialBig = current?.structure ?? (BIG_STRUCTURES as readonly string[]).find(big => big === guess || subtypesOf(big).includes(guess ?? '')) as BigStructureName | undefined ?? '左右';
  const [structure, setStructure] = useState<BigStructureName>(initialBig);
  const [subtype, setSubtype] = useState(current?.subtype ?? (subtypesOf(initialBig).includes(guess ?? '') ? guess! : ''));
  const [exclude, setExclude] = useState(current?.exclude ?? false);
  const [busy, setBusy] = useState(false), [message, setMessage] = useState('');
  async function save() {
    setBusy(true); setMessage('');
    const value = { character, structure, subtype, exclude };
    try { await saveStructureOverride(value); onDone(value); }
    catch (error) { setMessage(`儲存失敗：${(error as Error).message}`); }
    finally { setBusy(false); }
  }
  async function reset() {
    setBusy(true); setMessage('');
    try { await removeStructureOverride(character); onDone(null); }
    catch (error) { setMessage(`恢復失敗：${(error as Error).message}`); }
    finally { setBusy(false); }
  }
  const preview = structureImage(subtype || structure);
  return <div className="structure-override-editor" role="group" aria-label={`修正「${character}」的字形結構`}>
    <label>大類結構<select value={structure} disabled={busy || exclude} onChange={event => { const next = event.target.value as BigStructureName; setStructure(next); setSubtype(subtypesOf(next)[0] ?? ''); }}>
      {BIG_STRUCTURES.map(big => <option key={big} value={big}>{big}</option>)}
    </select></label>
    <label>細分結構<select value={subtype} disabled={busy || exclude} onChange={event => setSubtype(event.target.value)}>
      <option value="">只出八大類題</option>
      {subtypesOf(structure).map(item => <option key={item} value={item}>{item}</option>)}
    </select></label>
    {preview && !exclude && <img src={preview} alt={`${subtype || structure}結構縮圖`} />}
    <label className="structure-override-exclude"><input type="checkbox" checked={exclude} disabled={busy} onChange={event => setExclude(event.target.checked)} />這個字不出結構題</label>
    <div className="competition-actions">
      <button type="button" className="primary" disabled={busy} onClick={() => void save()}>儲存修正</button>
      {current && <button type="button" className="secondary" disabled={busy} onClick={() => void reset()}>恢復自動判斷</button>}
      <button type="button" className="secondary" disabled={busy} onClick={() => onDone(undefined)}>取消</button>
    </div>
    {message && <p role="alert">{message}</p>}
  </div>;
}
