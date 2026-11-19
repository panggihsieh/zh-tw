# Kahoot 式競賽開課模組

## 使用流程

1. 若使用名冊班級，教師先在「國語母題與錯題管理 → 班級學生名冊」建立班級，啟用學生並填寫 Google Email。
2. 到「Kahoot 競賽開課」選擇班級，或選「匿名參加（小鳥公仔）」免建名冊，再填寫競賽名稱，再輸入題目、2–6 個選項、正解與每題作答秒數。
3. 建立大廳後，畫面產生四碼開課代碼與 QR Code。代碼排除 `I`、`O`、`0`、`1` 等容易混淆的字元。
4. 學生免 Google／SchoolIAM 登入，輸入代碼或掃描 QR Code。名冊課堂選姓名；匿名課堂輸入40字內暱稱，從6×5矩陣選一隻小鳥加入。已選小鳥變灰且停用，後端以條件寫入保證同一課堂不重複；最多30人，排名沿用彩色原公仔。
5. 老師按「開始競賽」後學生才能作答；每題由伺服器記錄開始與送出時間。逾時或答錯為 0 分，答對為 800 基礎分加最多 200 速度分。
6. 老師可即時查看排名，或按「結束並排名」保留最終結果。同分依答對數、總作答時間排序；三項都相同時並列。

## 模組邊界

- `server/competition-api.mjs`：房間、代碼、名單授權、伺服器計時、作答、計分與排名。
- `src/competitionApi.ts`：前端共用型別與 API 用戶端。
- `src/CompetitionAdmin.tsx`：教師通用出題與開課介面。
- `src/CompetitionPlay.tsx`：學生代碼、大廳、作答與排行榜介面。
- 其他遊戲若要接入，只需把題目轉為 `prompt`、`options`、`answer`、`seconds`；不可在學生端傳送正解或自行計分。

## 權限與限制

- 建立、開始及結束競賽只開放管理者。
- 學生使用受保護的課堂 Cookie 存取所加入課堂，不能藉匿名參加取得教師權限。匿名公仔保留在該場課堂，重送不重複占位；開始後新參賽者不得加入。
- QR Code 只包含學生入口與四碼代碼，不包含答案、名單或權杖。
- 目前共用引擎支援單選題。造句等需教師覆核的開放式題型仍保留專用評分流程，後續可共用本模組的房間與排名介面，但不可把 AI 建議分數冒充教師最終分數。

## 驗證

- `npm run test:competition-api`：輸入驗證、代碼、名單權限、計時、計分、逐題作答與並列排名。
- `npm test`：前端及既有功能回歸。
- `npm run build`：TypeScript 與正式建置。


### Firebase Hosting 匿名 Cookie

匿名課堂使用 `__session` Cookie，Path 僅限 `/api/structure/competition`，保留 HttpOnly、Secure、SameSite=Strict。Firebase Hosting 只轉送此名稱的 Cookie，避免 GET 排名與重新進入課堂遺失身分；SchoolIAM 的同名 Cookie 仍限 `/auth/schooliam`，兩者路徑分離。舊 `competition_guest` 在原 Cookie 可送達的請求中安全轉換，沿用原 UID、公仔與成績，不重建參賽者。
