import { useState, type FormEvent } from "react";
import { Check, ClipboardCopy, History } from "lucide-react";
import {
  SITE_UPDATED_AT,
  SITE_VERSION,
  SITE_VERSION_NOTE,
} from "./siteVersion";
import {
  addVersionRecord,
  readVersionRecords,
  type VersionRecord,
} from "./versionRecords";

export default function VersionRecordAdmin() {
  const [summary, setSummary] = useState(SITE_VERSION_NOTE);
  const [records, setRecords] = useState(() =>
    readVersionRecords(localStorage),
  );
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  function submit(event: FormEvent) {
    event.preventDefault();
    const cleanSummary = summary.trim();
    if (!cleanSummary) {
      setError("請填寫本版修改摘要。");
      return;
    }
    const record: VersionRecord = {
      id: crypto.randomUUID(),
      version: SITE_VERSION,
      date: SITE_UPDATED_AT,
      summary: cleanSummary,
      submittedAt: new Date().toISOString(),
    };
    try {
      setRecords(addVersionRecord(localStorage, record));
      setError("");
      setStatus(`已提交 v${SITE_VERSION} 的版本紀錄。`);
    } catch {
      setStatus("");
      setError("瀏覽器無法保存版本紀錄，請確認本機儲存空間設定。");
    }
  }

  async function copy(record: VersionRecord) {
    await navigator.clipboard.writeText(
      `v${record.version}｜${record.date}｜${record.summary}`,
    );
    setStatus(`已複製 v${record.version} 的版本紀錄。`);
  }

  return (
    <section className="version-record-admin">
      <form onSubmit={submit}>
        <div className="version-record-current">
          <div>
            <span>目前版本</span>
            <strong>v{SITE_VERSION}</strong>
          </div>
          <div>
            <span>最後修改日期</span>
            <strong>{SITE_UPDATED_AT}</strong>
          </div>
        </div>
        <label htmlFor="version-record-summary">本版修改摘要</label>
        <textarea
          id="version-record-summary"
          rows={4}
          maxLength={300}
          value={summary}
          onChange={(event) => setSummary(event.target.value)}
          aria-describedby="version-record-help version-record-error"
        />
        <div className="version-record-form-footer">
          <small id="version-record-help">
            提交後保存在目前瀏覽器；同一版本再次提交會更新原紀錄。
          </small>
          <span>{summary.length}/300</span>
        </div>
        {error && (
          <p
            className="version-record-error"
            id="version-record-error"
            role="alert"
          >
            {error}
          </p>
        )}
        {status && (
          <p className="version-record-success" role="status">
            <Check size={18} />
            {status}
          </p>
        )}
        <button className="primary" type="submit">
          提交此版本紀錄
        </button>
      </form>
      <div className="version-record-history">
        <h2>
          <History size={20} />
          提交紀錄
        </h2>
        {records.length ? (
          <ol>
            {records.map((record) => (
              <li key={record.id}>
                <div>
                  <strong>v{record.version}</strong>
                  <time>{record.date}</time>
                </div>
                <p>{record.summary}</p>
                <button
                  className="secondary"
                  type="button"
                  onClick={() => void copy(record)}
                >
                  <ClipboardCopy size={16} />
                  複製
                </button>
              </li>
            ))}
          </ol>
        ) : (
          <div className="version-record-empty">尚未提交版本紀錄。</div>
        )}
      </div>
    </section>
  );
}
