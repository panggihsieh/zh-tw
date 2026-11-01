import type { Collection } from "./model";
import { jsonBlob, pdfBlob, pngBlob } from "./exports";
type TokenResponse = {
  access_token?: string;
  error?: string;
  error_description?: string;
};
declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient: (config: {
            client_id: string;
            scope: string;
            callback: (r: TokenResponse) => void;
            error_callback: () => void;
          }) => { requestAccessToken: () => void };
        };
      };
    };
  }
}
export const CLIENT_ID =
  (import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined) || "";
let loading: Promise<void> | null = null;
export function loadGoogle() {
  if (window.google) return Promise.resolve();
  if (loading) return loading;
  loading = new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.onload = () => resolve();
    script.onerror = () => {
      loading = null;
      script.remove();
      reject(new Error("Google 授權服務載入失敗，請檢查網路後重試。"));
    };
    document.head.append(script);
  });
  return loading;
}
export function authorize() {
  return new Promise<string>((resolve, reject) => {
    if (!CLIENT_ID || !window.google) {
      reject(new Error("尚未設定 Google OAuth 用戶端 ID。"));
      return;
    }
    const client = window.google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: "https://www.googleapis.com/auth/drive.file",
      callback: (r) =>
        r.access_token
          ? resolve(r.access_token)
          : reject(new Error(r.error_description || r.error || "授權失敗。")),
      error_callback: () =>
        reject(new Error("授權視窗已關閉或遭瀏覽器阻擋，可再試一次。")),
    });
    client.requestAccessToken();
  });
}
export async function uploadCollection(
  token: string,
  collection: Collection,
  progress: (text: string) => void,
) {
  const request = async (url: string, options: RequestInit = {}) => {
    const response = await fetch(url, {
      ...options,
      headers: { ...options.headers, Authorization: `Bearer ${token}` },
    });
    if (!response.ok) {
      let message = "";
      try {
        message = (await response.json()).error?.message || "";
      } catch {
        /* preserve HTTP status */
      }
      throw new Error(
        `Google Drive 上傳失敗（${response.status}）${message}。本機收藏仍保留。`,
      );
    }
    return response.json();
  };
  const folder = async (name: string, parent?: string) =>
    request("https://www.googleapis.com/drive/v3/files?fields=id,webViewLink", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        mimeType: "application/vnd.google-apps.folder",
        ...(parent
          ? { parents: [parent] }
          : { appProperties: { app: "hanzi-notebook-v1" } }),
      }),
    });
  progress("確認專用資料夾…");
  // 以應用程式標記找到自己建立的資料夾，不依任意同名資料夾上傳，也不保存 OAuth token。
  const q = encodeURIComponent(
    "trashed = false and mimeType = 'application/vnd.google-apps.folder' and appProperties has { key='app' and value='hanzi-notebook-v1' }",
  );
  const roots = await request(
    `https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id)&pageSize=100`,
  );
  const root = roots.files[0] || (await folder("生字動畫收藏本"));
  const project = await folder(
    `${collection.sourcePhrase}_${new Date().toISOString().replace(/[:.]/g, "-")}`,
    root.id,
  );
  const files: { name: string; id: string; url: string }[] = [];
  const upload = async (name: string, blob: Blob) => {
    progress(`正在上傳 ${name}…`);
    const boundary = `hanzi_${crypto.randomUUID()}`;
    const body = new Blob(
      [
        `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify({ name, parents: [project.id] })}\r\n--${boundary}\r\nContent-Type: ${blob.type}\r\n\r\n`,
        blob,
        `\r\n--${boundary}--`,
      ],
      { type: `multipart/related; boundary=${boundary}` },
    );
    const result = await request(
      "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink",
      { method: "POST", body },
    );
    if (!result.id) throw new Error("Google 未回傳檔案 ID，請重試。");
    files.push({
      name,
      id: result.id,
      url:
        result.webViewLink ||
        `https://drive.google.com/file/d/${result.id}/view`,
    });
  };
  await upload(`${collection.sourcePhrase}_資料.json`, jsonBlob(collection));
  await upload(
    `${collection.sourcePhrase}_學習本.pdf`,
    await pdfBlob(collection),
  );
  for (const card of collection.cards)
    await upload(
      `${card.character}_${card.position + 1}_學習卡.png`,
      await pngBlob(card, collection.sourcePhrase),
    );
  return {
    folderId: project.id,
    files,
    url: `https://drive.google.com/drive/folders/${project.id}`,
  };
}
