import { useEffect, useState, type ReactNode } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import {
  cloudConfigured,
  cloudLogin,
  cloudLogout,
  cloudServices,
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
      return onAuthStateChanged(cloudServices().auth, (value) => {
        setUser(value);
        setReady(true);
      });
    } catch {
      setError("Google 登入設定無效，請檢查 Firebase 設定。");
      setReady(true);
    }
  }, []);
  if (ready && isAdmin(user)) return children;
  return (
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
              onClick={async () => {
                setBusy(true);
                setError("");
                try {
                  if (user) await cloudLogout();
                  await cloudLogin();
                } catch (e) {
                  setError(
                    (e as { code?: string }).code === "auth/unauthorized-domain"
                      ? "此網站尚未加入 Firebase 授權網域，請先完成登入來源設定。"
                      : "Google 登入未完成，請重試。",
                  );
                } finally {
                  setBusy(false);
                }
              }}
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
      {error && <p role="alert">{error}</p>}
      <p>
        <a href="/">返回學生網站</a>
      </p>
    </main>
  );
}
