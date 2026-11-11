import { useState } from "react";
import { quizRequest } from "./quizApi";

interface Student {
  seat: number;
  name: string;
  email: string;
  active: boolean;
  avatar?: string;
}

export interface QuizClass {
  id: string;
  name: string;
  roster: string[];
  students?: Student[];
  revision?: string;
}

export default function ClassRoster({ classes, onSaved }: {
  classes: QuizClass[];
  onSaved: (record: QuizClass) => void;
}) {
  const [selected, setSelected] = useState<QuizClass>();
  const [name, setName] = useState("");
  const [students, setStudents] = useState<Student[]>([]);
  const [input, setInput] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  function open(record?: QuizClass) {
    setSelected(record);
    setName(record?.name ?? "");
    setStudents(record?.students ?? record?.roster.map((email, index) => ({
      seat: index + 1, name: "", email, active: true,
    })) ?? []);
    setMessage("");
  }

  function importRows() {
    const next = new Map(students.map(student => [student.seat, student]));
    const lines = input.trim().split(/\r?\n/).filter(line => line.trim());
    const seen = new Set<number>();
    for (const [index, line] of lines.entries()) {
      const fields = line.split(line.includes("\t") ? "\t" : ",").map(value => value.trim());
      if (index === 0 && fields[0] === "座號") continue;
      const [seatText, studentName, email] = fields;
      const seat = Number(seatText);
      if (fields.length < 2 || fields.length > 3 || !Number.isInteger(seat) || seat < 1 || seat > 999 || !studentName || seen.has(seat)) {
        setMessage(`第 ${index + 1} 列格式不符，請使用「座號、姓名、Email」並檢查重複座號。`);
        return;
      }
      seen.add(seat);
      const previous = next.get(seat);
      next.set(seat, { ...previous, seat, name: studentName, email: email || previous?.email || "", active: previous?.active ?? true });
    }
    if (!seen.size || next.size > 100) {
      setMessage("每班可儲存 1–100 位學生。");
      return;
    }
    setStudents([...next.values()].sort((a, b) => a.seat - b.seat));
    setInput("");
    setMessage("已帶入名單，請核對後儲存。");
  }

  return <section aria-labelledby="class-roster-heading" className="class-roster">
    <h2 id="class-roster-heading">班級學生名冊</h2>
    <div className="quiz-grid">
      <label>班級
        <select disabled={busy} value={selected?.id ?? ""} onChange={e => open(classes.find(record => record.id === e.target.value))}>
          <option value="">新增班級</option>
          {classes.map(record => <option key={record.id} value={record.id}>{record.name}</option>)}
        </select>
      </label>
      <label>班級名稱<input required maxLength={80} value={name} disabled={busy} onChange={e => setName(e.target.value)} /></label>
    </div>
    <details>
      <summary>批次匯入學生名冊</summary>
      <label>每列填寫座號、姓名和選填的 Google Email，以 Tab 或逗號分隔
        <textarea value={input} disabled={busy} onChange={e => setInput(e.target.value)} placeholder="座號,姓名,Email" />
      </label>
      <button type="button" className="secondary" disabled={busy || !input.trim()} onClick={importRows}>帶入名單</button>
    </details>
    <p>{students.length} 位學生 · {students.filter(student => student.active && student.email).length} 位已啟用且有派卷帳號</p>
    <form onSubmit={async e => {
      e.preventDefault();
      setBusy(true);
      setMessage("儲存中…");
      try {
        const record = await quizRequest<QuizClass>("/classes", {
          name, students, id: selected?.id, revision: selected?.revision ?? null,
        });
        onSaved(record);
        open(record);
        setMessage("名冊已儲存，可在出題時選用。");
      } catch (error) {
        setMessage((error as Error).message);
      } finally {
        setBusy(false);
      }
    }}>
      <fieldset disabled={busy}>
        <legend>學生名單</legend>
        <div className="class-roster-table">
          <table>
            <thead><tr><th>公仔</th><th>班級</th><th>座號</th><th>姓名</th><th>Google Email</th><th>啟用</th><th>操作</th></tr></thead>
            <tbody>{students.map((student, index) => {
              const change = (patch: Partial<Student>) => setStudents(rows => rows.map((row, i) => i === index ? {...row, ...patch} : row));
              return <tr key={index}>
                <td>{student.avatar ? <img className="class-roster-avatar" src={student.avatar} alt={student.name + "的公仔"} /> : <span>未設定</span>}</td>
                <td>{name || "—"}</td>
                <td><input aria-label={`第 ${index + 1} 列座號`} required type="number" min={1} max={999} value={student.seat || ""} onChange={e => change({seat: Number(e.target.value)})} /></td>
                <td><input aria-label={`第 ${index + 1} 列姓名`} required maxLength={80} value={student.name} onChange={e => change({name: e.target.value})} /></td>
                <td><input aria-label={`第 ${index + 1} 列 Google Email`} type="email" maxLength={254} value={student.email} onChange={e => change({email: e.target.value})} /></td>
                <td><input aria-label={`啟用第 ${index + 1} 列`} type="checkbox" checked={student.active} onChange={e => change({active: e.target.checked})} /></td>
                <td>
                  <label>更換公仔<input aria-label={`更換第 ${index + 1} 列公仔`} type="file" accept="image/jpeg,image/png,image/webp" onChange={async e => {
                    const file = e.currentTarget.files?.[0];
                    e.currentTarget.value = "";
                    if (!file) return;
                    if (file.size > 5_000_000 || !["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
                      setMessage("請選擇 5 MB 以下的 JPEG、PNG 或 WebP 圖片。");
                      return;
                    }
                    setBusy(true);
                    try {
                      const bitmap = await createImageBitmap(file);
                      const canvas = document.createElement("canvas");
                      const scale = Math.min(1, 96 / Math.max(bitmap.width, bitmap.height));
                      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
                      canvas.height = Math.max(1, Math.round(bitmap.height * scale));
                      const ctx = canvas.getContext("2d")!;
                      ctx.fillStyle = "#fff";
                      ctx.fillRect(0, 0, canvas.width, canvas.height);
                      ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
                      bitmap.close();
                      const avatar = canvas.toDataURL("image/jpeg", .72);
                      if (avatar.length > 12000) throw Error("圖片縮圖過大");
                      change({ avatar });
                      setMessage("公仔已更換，請儲存名冊。");
                    } catch {
                      setMessage("無法讀取這張圖片，請選擇另一張。");
                    } finally {
                      setBusy(false);
                    }
                  }} /></label>
                  <button type="button" className="secondary" onClick={() => setStudents(rows => rows.filter((_, i) => i !== index))}>移除</button>
                </td>
              </tr>;
            })}</tbody>
          </table>
        </div>
        <div className="quiz-actions">
          <button type="button" className="secondary" disabled={students.length >= 100} onClick={() => {
            const seat = Array.from({length: 999}, (_, index) => index + 1).find(number => !students.some(student => student.seat === number))!;
            setStudents([...students, {seat, name:"", email:"", active:true}]);
          }}>新增學生</button>
          <button className="primary" disabled={!name.trim() || !students.length}>儲存名冊</button>
        </div>
      </fieldset>
    </form>
    <p role="status">{message}</p>
  </section>;
}
