# SchoolIAM 教師試點與學生免登入原則

- 教師使用統一的「S＋SchoolIAM＋登入」按鈕；原 Google 登入保留。
- 本階段只允許既有管理教師，SchoolIAM 的教師角色不會自動取得本網站管理權限。學生 SchoolIAM 接入暫不啟用。
- Kahoot 學生免 Google／SchoolIAM 帳號登入，輸入四碼課程代碼後選擇名冊姓名。這是課堂參與識別，不是已驗證的個人帳號。姓名只作課堂顯示，不作帳號驗證。
- 等候室最長開放兩小時；教師開始後鎖定新加入。作答依教師設定的課堂分鐘數由後端截止。臨時識別僅能存取輸入代碼所對應的課堂，不能建立、控制或管理課程。
- 教師開課時需選擇有姓名與座號的班級名冊。只有 Email 的舊課堂需重新以完整名冊開課，才能提供免登入選姓名。

## 上線設定

1. SchoolIAM 登記 Client ID `zh-tw`，唯一回呼 `https://zh-tw.web.app/auth/schooliam/callback`；只啟用試點教師的 `iamClients/zh-tw/members/{iamUid}`。
2. 生字網站 Firestore 由管理端建立 `hanzi_schooliam_links/{iamUid}`：`iamUid`、`localUid`（既有 Firebase 教師 UID）、`role: "teacher"`、`enabled: true`。不依 Email 自動連結、不建立新管理帳號；一般教師與學生對照本階段均拒絕。
3. 既有 Cloud Run 服務設定 `SCHOOLIAM_BROKER_URL`（SchoolIAM Token API 的 HTTPS 來源）與 Secret Manager 掛載的 `SCHOOLIAM_CLIENT_SECRET`。密鑰不得放前端。未設定時入口回應尚未啟用，可用原 Google 登入。
4. 執行服務帳號需具備讀取教師 Firebase Auth、讀寫登入狀態與讀取帳號對照的權限，以及簽發 Firebase custom token 所需的簽章權限。使用 Firestore TTL 清除 `hanzi_schooliam_pending.deleteAfter`；登入驗證本身仍會檢查五分鐘有效期。
5. `hanzi_schooliam_links` 與 `hanzi_schooliam_pending` 禁止前端讀寫。將 `firestore.hanzi.rules` 的變更合併至既有正式規則，不覆蓋共用專案的其他規則。只接受具 `schooliam: "zh-tw-teacher"` 簽章宣告及固定管理教師 Email 的 custom 登入。
6. 經使用者要求部署後，部署既有 Cloud Run、Hosting 與合併後規則。確認教師登入回到後台、原 Google 登入、學生無帳號選姓名、開始鎖定及逾時拒答。不得用 UI 出現按鈕代替完整登入驗收。

本機檢查：`npm run build`；`node --test server/competition-api.check.mjs server/admin-auth.check.mjs server/schooliam-policy.check.mjs`。
