# zh-tw Firebase 部署

Firebase 專案：`voltaic-circuit-511310-a3`。

- Hosting site：`voltaic-circuit-511310-a3-zh-tw`
- 前端：`https://voltaic-circuit-511310-a3-zh-tw.web.app/`
- 教師後台：`https://voltaic-circuit-511310-a3-zh-tw.web.app/?view=backend`
- Cloud Run：`zh-tw-structure-api`，`asia-east1`
- Secret Manager：`zh-tw-ai-settings`（獨立秘密，不自動搬移本機金鑰）
- Runtime service account：`zh-tw-runtime@voltaic-circuit-511310-a3.iam.gserviceaccount.com`

## 隔離與登入

使用 Hosting target `zh-tw`，不部署既有 PISA 的兩個站點。部署指令一律指定 project 與 target。Firestore 沿用生字專用集合與既有安全規則，部署 Hosting 不會發布或覆蓋 Firestore 規則。正式站點兩個預設網域已加入 Google OAuth 授權網域，保留原有項目。

新網域有獨立的 IndexedDB 與 localStorage；本機收藏不會自動出現。要使用既有資料，可在本機先上傳雲端，正式站登入同帳號後取回，或匯入 JSON。

## AI 後端

Hosting 將 `/api/structure/**` 轉交同區域的獨立 Cloud Run 服務。Cloud Run 網路入口允許 HTTP 請求，但應用程式所有 API 仍驗證 Firebase Google 管理者 ID token，未登入回覆 401；POST 另檢查本站 Origin 與專用標頭。

金鑰與供應商設定存於 Secret Manager，runtime 只取得此秘密的讀取及新增版本權。空白設定起始，不上傳 `.local` 或本機金鑰。設定 Save 後自動鎖定。編輯鎖為記憶體短期狀態，服務重新啟動時需重新 Unlock。

Cloud Run 設定 min 0、max 1、concurrency 8、512 MiB、1 CPU（閒置釋出 CPU）。雲端不支援本機 Ollama。雲端設定儲存會新增秘密版本；AI 服務需管理者重新輸入金鑰及模型，才可測試或分析。網站與 AI API 的雲端資源依實際用量計費。

## 重複部署

需 Node.js 與已登入的 Firebase CLI、Google Application Default Credentials。不要把憑證寫入 repo。

```powershell
Set-Location K:\CODEX\zh-tw
npm ci
npm test
npm run test:structure-api
node scripts/deploy-cloud-run.mjs
npm run build
npx firebase-tools deploy --only hosting:zh-tw --project voltaic-circuit-511310-a3
```

Cloud 建置使用 `deploy/cloud` 的鎖定相依套件與 Dockerfile，只封裝列出的後端程式；`.env.local` 只用於前端公開 Firebase SDK 設定，不封裝入後端映像。後端金鑰不得填入 VITE 環境變數。每次部署腳本建立獨立來源封包，上傳至生字專用來源 bucket（7 天自動清除來源），映像存於 `asia-east1` 的 `zh-tw` Artifact Registry repository。

## 2026-11-01 部署紀錄

Cloud Build `4302ffe2-a49c-4a55-a756-c29f756b9725` 成功。Cloud Run URL：`https://zh-tw-structure-api-6wahhjmeha-de.a.run.app`。Hosting 已成功發布 166 個檔案。正式首頁 HTTP 200，同源 `/api/structure/settings` 未登入 HTTP 401（回傳 google-secret-manager 設定保護方式）。既有 PISA 兩站首頁仍回覆 HTTP 200。

瀏覽器已驗證正式站逐字學習與教育部詞庫載入；Google 整頁 OAuth 可開啟帳號選擇並返回網站。183 項前端測試、8 項伺服器測試與正式建置通過。AI 供應商尚未設定雲端金鑰，因此不宣稱真實 AI 呼叫驗收已通過。

正式站 Firebase SDK authDomain 使用同源 Hosting 網域，並已在 Google OAuth 用戶端保留原有回呼的前提下，新增專用站點兩個預設網域及各自的 `/__/auth/handler` 回呼，避免整頁登入依賴跨站儲存。

正式站登入最終驗收：使用者完成側邊 Google 帳號登入後，已確認教師後台正常顯示；使用者管理可讀取 `teacher.hsieh@gmail.com` 固定管理者紀錄；AI 設定顯示「雲端後端已連線」及 Secret Manager 保護方式，證明 Hosting 同源轉接、Cloud Run ID token 驗證及秘密讀取權限均正常。雲端尚未設定 AI 金鑰，未執行付費 AI 測試。
