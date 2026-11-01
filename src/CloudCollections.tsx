import { useEffect, useState } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import {
  cloudConfigured,
  cloudServices,
  cloudLogin,
  cloudLogout,
  uploadCloudCollections,
  downloadCloudCollections,
} from "./cloudSync";
import { listCollections, mergeCloudCollections } from "./storage";

export default function CloudCollections({
  onRefresh,
}: {
  onRefresh: () => Promise<void>;
}) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (!cloudConfigured) return;
    try {
      return onAuthStateChanged(
        cloudServices().auth,
        (value) => {
          setUser(value);
          setReady(true);
          setMessage("");
        },
        () => {
          setFailed(true);
          setMessage("無法確認雲端登入狀態，請重新整理。");
        },
      );
    } catch {
      setFailed(true);
      setMessage("Firebase 設定無效，請聯絡教師。");
    }
  }, []);
  async function run(action: () => Promise<string>) {
    setBusy(true);
    setFailed(false);
    setMessage("");
    try {
      setMessage(await action());
    } catch (error) {
      setFailed(true);
      const code = (error as { code?: string }).code;
      if (error instanceof Error && error.message.startsWith("此帳號已停用")) {
        setMessage(error.message);
        return;
      }
      setMessage(
        code === "permission-denied"
          ? "雲端權限尚未開通，請教師確認生字收藏本的 Firestore 規則。"
          : code === "auth/unauthorized-domain"
            ? "此網站尚未加入 Firebase 登入允許網域，請教師完成設定。"
            : code === "auth/popup-closed-by-user"
              ? "登入視窗已關閉，尚未登入。"
              : "雲端操作未完成，請檢查登入與網路後重試。部分收藏可能已傳送；本機收藏仍保留。",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <section
      className="cloud-collections"
      aria-labelledby="cloud-collections-title"
    >
      <h2 id="cloud-collections-title">雲端生字收藏本</h2>
      <p>
        登入自己的 Google
        帳號，將收藏備份到雲端，或在另一台裝置取回。同步時保留較新的收藏；刪除本機收藏不會刪除雲端備份。
      </p>
      {!cloudConfigured ? (
        <p>雲端同步尚未設定，本機收藏可正常使用。</p>
      ) : (
        <>
          <p>
            {user
              ? `目前帳號：${user.email || user.displayName || "已登入"}`
              : "尚未登入雲端帳號"}
          </p>
          <div className="cloud-actions">
            {!user ? (
              <button
                className="secondary"
                disabled={busy || !ready}
                onClick={() =>
                  void run(async () => {
                    await cloudLogin();
                    return "已登入，可選擇上傳或取回收藏。";
                  })
                }
              >
                Google 登入
              </button>
            ) : (
              <>
                <button
                  className="primary"
                  disabled={busy}
                  onClick={() =>
                    void run(async () => {
                      const items = await listCollections();
                      await uploadCloudCollections(items);
                      return `已核對 ${items.length} 份本機收藏，雲端已保留各份較新的版本。`;
                    })
                  }
                >
                  上傳本機收藏
                </button>
                <button
                  className="secondary"
                  disabled={busy}
                  onClick={() =>
                    void run(async () => {
                      const items = await downloadCloudCollections();
                      const count = await mergeCloudCollections(items);
                      await onRefresh();
                      return `已讀取 ${items.length} 份雲端收藏，本機新增或更新 ${count} 份。`;
                    })
                  }
                >
                  取回雲端收藏
                </button>
                <button
                  className="secondary"
                  disabled={busy}
                  onClick={() =>
                    void run(async () => {
                      await cloudLogout();
                      return "已登出雲端帳號。";
                    })
                  }
                >
                  登出雲端
                </button>
              </>
            )}
          </div>
        </>
      )}
      <p
        role={failed ? "alert" : "status"}
        className={failed ? "cloud-error" : ""}
      >
        {busy ? "處理中，請稍候…" : message}
      </p>
    </section>
  );
}
