# 網址與部署

唯一正式發布網址為 https://zh-tw.web.app/ 。依使用者最新要求，只部署此站；舊網址 https://voltaic-circuit-511310-a3-zh-tw.web.app/ 不再同步發布。舊站部署設定將一般頁面永久轉址至主站；只保留 Google 登入所需的 Firebase 保留路徑 `/__/auth/**`。不得刪除 Hosting site，以免影響主站登入。

兩站均屬同一 Firebase 專案 `voltaic-circuit-511310-a3`，共用原有 Cloud Run API、Firestore、Google 帳號UID、私人儲存體與模型設定。新站Google登入沿用已註冊的舊站OAuth驗證回呼網域，避免使用尚未註冊的新OAuth回呼網址；新站網域已加入Firebase Authentication允許清單。若將來要改為新站同源OAuth回呼，須先在Google OAuth用戶端註冊 `https://zh-tw.web.app/__/auth/handler`，再修改前端authDomain並驗證整頁登入。

本機收藏與登入狀態以瀏覽器來源區隔，不會因雲端資料共用而自動搬移。請先從舊站匯出JSON備份，再在新站匯入；已同步至同一帳號的雲端收藏可在登入後下載。

Firebase Hosting目標：`zh-tw`對應新站，`zh-tw-legacy`對應舊站。正式部署必須使用 `firebase deploy --only hosting:zh-tw --project voltaic-circuit-511310-a3`。不得使用 `--only hosting`，以免同步更新舊站。兩站均保留API轉送與安全標頭。API只接受明確允許的新舊網站來源，不接受任意web.app網域。

使用者明確要求舊站不再提供內容時，可單次部署 `--only hosting:zh-tw-legacy` 套用轉址。後續日常發布仍只部署 `hosting:zh-tw`。Firebase 保留路徑優先於轉址規則：https://firebase.google.com/docs/hosting/full-config#hosting_priority_order 。
