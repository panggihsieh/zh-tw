import { useEffect, useState, type ReactNode } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import {
  cloudConfigured,
  cloudLogin,
  cloudLogout,
  cloudServices,
  finishCloudRedirect,
} from "./cloudSync";
import { ADMIN_EMAIL, isAdmin } from "./userAccess";

export default function BackendGate({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!cloudConfigured) {
      setReady(true);
      return;
    }
    try {
      void finishCloudRedirect().catch(() =>
        setError(
          "整頁登入未完成，請重新登入；若瀏覽器阻擋 Google 登入，請改用 Chrome 或 Edge 開啟本機網址。",
        ),
      );
      return onAuthStateChanged(cloudServices().auth, (value) => {
        setUser(value);
        setReady(true);
      });
    } catch {
      setError("Google 登入設定無效，請檢查 Firebase 設定。");
      setReady(true);
    }
  }, []);
  async function login(redirect = false) {
    setBusy(true);
    setError("");
    try {
      if (user) await cloudLogout();
      await cloudLogin(redirect);
    } catch (e) {
      const code = (e as { code?: string }).code;
      setError(
        code === "auth/unauthorized-domain"
          ? "Firebase 尚未允許此網站登入，若剛更新設定請重新整理後重試。"
          : code === "auth/popup-blocked"
            ? "瀏覽器阻擋登入視窗，請使用下方整頁登入。"
            : code === "permission-denied"
              ? "Google 登入成功，但使用者權限尚未生效，請稍後重試。"
              : "Google 登入未完成，請重試或改用整頁登入。",
      );
    } finally {
      setBusy(false);
    }
  }
  if (ready && isAdmin(user)) return children;
  return (
    <div className="backend-auth-shell">
      <aside className="backend-auth-aside">
        <span>教師工作區</span>
        <h2>生字教學管理</h2>
        <p>教學設定 · 雲端資料 · 帳號管理</p>
      </aside>
      <main className="backend-login">
        <h1>教師後台登入</h1>
        <p>請使用管理者 Google 帳號登入：{ADMIN_EMAIL}</p>
        {!ready ? (
          <p role="status">確認登入狀態…</p>
        ) : (
          <>
            {user && <p role="alert">目前帳號 {user.email} 沒有後台權限。</p>}
            {!cloudConfigured ? (
              <p role="alert">尚未設定 Firebase Google 登入。</p>
            ) : (
              <button
                className="primary"
                disabled={busy}
                onClick={() => void login()}
              >
                {busy
                  ? "登入中…"
                  : user
                    ? "切換 Google 帳號"
                    : "使用 Google 登入"}
              </button>
            )}
          </>
        )}
        {ready && cloudConfigured && (
          <>
            {busy && (
              <p role="status">
                正在等待 Google 登入視窗。若未出現帳號選擇畫面，請改用整頁登入。
              </p>
            )}
            <button className="secondary" onClick={() => void login(true)}>
              改用整頁 Google 登入
            </button>
          </>
        )}
        {error && <p role="alert">{error}</p>}
        <p>
          <a href="/">返回學生網站</a>
        </p>
      </main>
    </div>
  );
}
