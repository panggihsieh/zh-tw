# 模擬學生預覽模組

教師在尚未開始的課堂按「測試學生畫面」，可查看加入競賽、等候室、答題與排名。加入後按「模擬老師開始課程」，學生畫面會於下一次狀態更新進入題目。

預覽使用課堂資料的獨立副本。所有操作都在記憶體進行，不寫入正式課堂、名冊與成績，不呼叫 AI；離開預覽後丟棄模擬進度。模擬評量與積分僅用於檢視流程。

## 在其他專案使用

`src/competitionSimulation.ts` 的 `createCompetitionSimulation(room)` 建立獨立模擬服務，僅依賴 `competitionApi.ts` 的 TypeScript 型別。可將這兩個檔案帶入另一個 TypeScript 專案，再把回傳的 `request<T>(path, body)` 注入該專案的學生介面。

服務支援代碼查詢、加入、讀取狀態、作答及排名；`start()` 在測試學生加入後開始本機課程。`joined` 與 `running` 可用於控制預覽按鈕。每個服務實例的狀態互相隔離。

本站的 `CompetitionPlay` 透過可選的 `request` 與 `initialCode` props 接收模擬服務；未提供時維持正式 API。`CompetitionStudentPreview.tsx` 是整合範例。重用完整 UI 時也需攜帶其樣式與 React 相依套件。

模擬服務也提供 `finish()`，可透過「模擬老師結束課程」預覽最終排名、拍照下載與結束音效。模擬照片不會上傳到正式課堂。
