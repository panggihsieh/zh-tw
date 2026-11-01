# 教師後台 Google OAuth 與使用者管理

固定管理者：`teacher.hsieh@gmail.com`。登入入口：`http://127.0.0.1:5173/?view=backend`。
只使用 Google 登入的基本電子郵件與個人資料，不要求 Gmail 信件讀取權限。

## 權限

- 前端未確認登入身分前不掛載後台內容；非管理者只能切換帳號或返回學生網站。
- 伺服器所有結構 API（包含 settings、unlock、test、analyze）要求 Bearer Firebase ID token。
- 使用 Google Secure Token 公開 JWK 驗證 RS256 簽章、issuer、audience、exp、iat、auth_time、sub，並要求已驗證的指定管理者 email 與 google.com 登入方式。權杖不寫入日誌或專案檔案。
- Unlock 僅為已登入管理者的短期編輯鎖，綁定 UID，不取代 OAuth 驗證。
- 登出會呼叫 Firebase signOut，再返回學生網站。已發出的 ID token 在其到期前仍具效力；本版本沒有 Firebase Admin SDK 的即時撤銷檢查。

## 使用者管理

獨立集合 `hanzi_notebook_access/{email}`，欄位為 email、displayName、enabled。管理者可列出已登記帳號、新增／啟用或停用。使用者首次 Google 登入會登記自己的資料；無法自行變更既有 enabled。名單不是整個既有 Firebase 專案的 Authentication 帳號清單。

停用限制生字網站雲端收藏讀寫，不刪除 Google 帳號、Firebase Auth 帳號或本機收藏。既有其他網站、集合與後端不受影響。管理者帳號固定，不提供其他帳號管理者角色，亦不可停用固定管理者。

## 啟用與驗收

1. Firebase Authentication 授權網域新增 `127.0.0.1`；使用 Google 登入供應商。
2. 把 `firestore.hanzi.rules` 合併片段置入既有 documents 區塊，保留全庫預設拒絕與既有其他規則。
3. 重新啟動 `npm run structure-api`；本次已重啟，匿名 GET 實測回覆 401。
4. 以指定管理者登入，驗證名單新增、停用、重新登入與雲端讀寫拒絕。

目前程式已實作；新增 OAuth 來源及授予使用者名單管理權的雲端規則尚待確認發布。不可宣稱真實 Google 登入與使用者停用端對端驗收已通過。

參考：[Firebase ID token 驗證](https://firebase.google.com/docs/auth/admin/verify-id-tokens)。

驗證：175 項前端測試、7 項伺服器測試、正式建置通過；本機匿名 API 實測 401。Firebase 規則測試區已確認管理者讀取使用者紀錄允許，其他帳號讀取他人紀錄拒絕。雲端規則目前為未發布草稿。
