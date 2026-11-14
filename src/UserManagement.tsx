import ClassRoster, { type QuizClass } from "./ClassRoster";
import { quizRequest } from "./quizApi";
import BackendCard from "./BackendCard";
import { useEffect, useState } from "react";
import {
  ADMIN_EMAIL,
  listAppUsers,
  saveAppUser,
  type AppUser,
} from "./userAccess";

export default function UserManagement() {
  const [tab, setTab] = useState<"teachers" | "students">("teachers");
  return <section aria-labelledby="user-management-title">
    <h2 id="user-management-title">使用者管理</h2>
    <div className="competition-actions" role="group" aria-label="使用者管理分頁">
      <button className={tab === "teachers" ? "primary" : "secondary"} aria-pressed={tab === "teachers"} onClick={() => setTab("teachers")}>老師</button>
      <button className={tab === "students" ? "primary" : "secondary"} aria-pressed={tab === "students"} onClick={() => setTab("students")}>班級（學生）</button>
    </div>
    {tab === "teachers" ? <TeacherAccounts /> : <StudentClasses />}
  </section>;
}

function StudentClasses() {
  const [classes, setClasses] = useState<QuizClass[] | null>(null);
  const [error, setError] = useState("");
  async function load() {
    setError("");
    try {
      setClasses((await quizRequest<{ items: QuizClass[] }>("/classes")).items);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "無法載入班級名冊。");
    }
  }
  useEffect(() => { void load(); }, []);
  if (error) return <div><p role="alert">{error}</p><button className="secondary" onClick={() => void load()}>重新載入</button></div>;
  if (!classes) return <p role="status">正在載入班級名冊…</p>;
  return <ClassRoster classes={classes} onSaved={record => setClasses(items => [...(items ?? []).filter(item => item.id !== record.id), record])} />;
}

function TeacherAccounts() {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function refresh() {
    setUsers(await listAppUsers());
  }
  async function run(action: () => Promise<void>) {
    setBusy(true);
    setMessage("");
    try {
      await action();
      await refresh();
      setMessage("使用者設定已更新。");
    } catch (e) {
      setMessage(
        e instanceof Error ? e.message : "操作失敗，請確認權限與網路。",
      );
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    void refresh().catch(() =>
      setMessage("無法讀取使用者，請確認管理者登入與 Firestore 規則。"),
    );
  }, []);
  return (
    <section
      className="user-management"
      id="user-management"
      aria-labelledby="users-title"
    >
      <h2 id="users-title">老師帳號與權限</h2>
      <p>
        固定管理者：{ADMIN_EMAIL}
        。管理生字網站的雲端存取權限；停用後，該帳號無法讀寫雲端收藏，本機收藏仍保留。
      </p>
      <BackendCard
        title="新增或啟用使用者"
        description="設定 Google 帳號與顯示名稱"
      >
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void run(async () => {
              await saveAppUser({ email, displayName: name, enabled: true });
              setEmail("");
              setName("");
            });
          }}
        >
          <label>
            Google 帳號電子郵件
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          <label>
            顯示名稱
            <input
              maxLength={80}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          <button className="primary" disabled={busy}>
            新增／啟用使用者
          </button>
        </form>
      </BackendCard>
      <p role="status">{busy ? "處理中…" : message}</p>
      <BackendCard
        title="使用者名單與權限"
        description={`${users.length} 位使用者 · 查看帳號與啟停權限`}
      >
        <button
          className="secondary"
          disabled={busy}
          onClick={() => void run(refresh)}
        >
          重新整理名單
        </button>
        {!users.length && (
          <p>尚無使用者紀錄。可先新增帳號，或由使用者首次登入時建立紀錄。</p>
        )}
        <div className="managed-users">
          {users.map((item) => (
            <article key={item.email}>
              <h3>{item.displayName || item.email}</h3>
              <p>{item.email}</p>
              <p>
                {item.email === ADMIN_EMAIL
                  ? "固定管理者"
                  : item.enabled
                    ? "已啟用"
                    : "已停用"}
              </p>
              {item.email !== ADMIN_EMAIL && (
                <button
                  className="secondary"
                  disabled={busy}
                  onClick={() =>
                    void run(() =>
                      saveAppUser({ ...item, enabled: !item.enabled }),
                    )
                  }
                >
                  {item.enabled ? "停用" : "啟用"}
                </button>
              )}
            </article>
          ))}
        </div>
      </BackendCard>
    </section>
  );
}
