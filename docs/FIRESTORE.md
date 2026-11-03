# 生字收藏本 Firestore 同步

專案：`voltaic-circuit-511310-a3`，資料庫 `(default)`。

## 資料分離

僅使用 `hanzi_notebook_users/{Firebase UID}/collections/c-{編碼後的收藏 ID}`。
每份文件包含 `schemaVersion`、`updatedAt` 和經驗證的 JSON `payload`。
不存放 Google access token、AI API 金鑰、教師後台設定或原專案資料。

瀏覽器 Google 登入後，在「我的生字收藏本」手動上傳或取回。以收藏 updatedAt 比較版本，保留較新的整份收藏；相同時間保留現有版本。不合併單張字卡欄位。刪除本機資料不刪除雲端備份。上傳中斷可重試；取回先驗證整批，再以 IndexedDB transaction 寫入。共用裝置應登出並自行管理本機收藏；本機收藏仍為該瀏覽器共用，登入不會自動上傳。

## 設定

1. 在 Firebase Authentication 啟用 Google 登入。授權網域加入實際開啟網站的主機，例如 `127.0.0.1`。Google Cloud 控制台登入不等於 Web App 已登入。
2. 從 Firebase 專案設定取得公開 Web SDK 設定，填入未納入版本控制的 `.env.local`，格式為 `VITE_FIREBASE_CONFIG={...}`。範例欄位見 `.env.example`。重啟開發服務或重新建置。
3. 將 `firestore.hanzi.rules` 的 match 片段合併進既有 documents 區塊。必須保留原專案規則；不要把片段當成完整規則檔部署，也不要開放全庫讀寫。

學生預設課別儲存在 `hanzi_notebook_settings/curriculum`，公開單筆讀取，僅管理者可寫入出版社、年級、學期與課別。啟用此功能前須合併規則檔中的對應 match。老師在「三家出版社生字資料庫」選好課別後按「設為學生預設課別」。學生開啟選課區會優先載入此設定，再自行選課；每批最多八字。未設定時沿用原本記憶的選課，讀取失敗會顯示提示並允許自行選課。
4. 兩個測試帳號確認：本人可讀寫，其他人與未登入者不能讀寫。透過資料庫規則模擬器測試不會建立實際收藏。

首次成功上傳才會建立使用者收藏文件；不需要先建立空集合。

## AI API

現有 `server/structure-api.mjs` 與 `.local` 加密設定保持使用。前端只連既有本機 API；Firebase 同步不傳送 AI 金鑰。Firestore 是資料庫，並不執行 AI API。若未來要將網站公開部署，需另行部署有身分驗證、用量限制與伺服器端秘密管理的 AI 服務；目前本機 API 不能直接當成公開雲端服務。不可部署此專案到既有 Hosting 站點而覆蓋原站。

## 驗證界線

單元測試涵蓋資料格式、時間檢核、取回時的新舊版本選擇與整批寫入。它們不代表真實 Google 登入或跨裝置同步已驗收。實際雲端驗收與已發布規則狀態以本次交付回報為準。

## 2026-11-01 實際設定狀態

已在 Firebase 控制台合併並發布生字集合規則；原本全庫拒絕客戶端讀寫的預設規則保留。規則測試區實測本人 get 允許、未登入與其他 UID get 拒絕。尚未建立實際收藏文件。

本機公開 Web 設定已填入忽略追蹤的 `.env.local`。初次登入測試曾回報 `auth/unauthorized-domain`，當時控制台授權網域清單未包含 `127.0.0.1`。2026-11-01 後續確認後，已新增本機 OAuth 來源並發布管理者與帳號啟停規則；Google 管理者登入及使用者名單讀取已通過。未完成真實帳號上傳／取回及跨裝置測試，不能視為已完成雲端驗收。

173 項前端測試與 5 項伺服器測試、正式建置通過。Firebase SDK 採延遲載入，雲端功能區塊仍有約 557 kB 的建置大小提示，不阻止建置。npm audit 為 0 vulnerabilities。
