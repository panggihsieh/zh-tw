# 生字動畫收藏本

臺灣繁體中文生字學習前端。輸入語詞、逐字選取、六幕教學、本機收藏及 PNG／PDF／JSON 匯出。此階段不建立後台。

## 本機使用

需要 Node.js 22.12 以上（目前以 Node.js 25.2.1 驗證）。PowerShell：

```powershell
Set-Location K:\CODEX\zh-tw
npm ci
npm run dev
```

開啟 <http://127.0.0.1:5173/>。使用相同的網址及瀏覽器才能找到原本的 IndexedDB 收藏；`localhost` 與 `127.0.0.1` 是不同儲存空間。

亦可雙擊 `啟動生字收藏本.cmd`，自動檢查套件、建立正式版、在背景啟動本機服務及開啟瀏覽器。已有服務時直接開啟，不重複啟動。服務只綁定 127.0.0.1，不開放區網。重新開機後再點一次即可。

## 功能

- 1–8 字輸入與多選；保留重複字的位置、語詞語境與獨立字卡。
- 六幕：認識生字、結構示意、部件示意、筆順查詢、語境字義、一字多詞。
- 上下一幕、切字、播放／暫停、重播、慢中快、朗讀、注音與字幕、減少動態。
- 「銀行／行走」依語境顯示不同讀音；未收錄的語境不猜讀音。
- IndexedDB 收藏、字詞搜尋、複習狀態、刪除前確認、JSON 備份匯入。
- 單字 PNG、每字一頁的語詞 PDF、含語境與分鏡快照的 JSON。
- 官方查字資源連結。沒有自建管理後台或教師登入。

## 資料限制

內建少量教材：感謝、謝謝、銀行、行走、觀察。白話、造詞、注音與結構示意標為待教師審定。來源與查核範圍見 [docs/DATA_SOURCES.md](docs/DATA_SOURCES.md)。

**尚未收錄逐字核對且可重製的臺灣筆順路徑，因此筆順幕提供教育部網站查詢，沒有逐筆或影片輸出。** 部件動畫是字型區域的分離示意，不能當作標準字形拆解、字源或筆順。

PDF 以瀏覽器 Canvas 轉成逐頁圖片，確保繁體字顯示；PDF 內文字目前無法選取搜尋。PNG/PDF 不含外部網站素材。

## Google Drive（選用）

前端已提供 GIS OAuth token model 與 Drive `drive.file` 上傳流程，沒有後端。須由專案擁有者建立 Google Cloud OAuth Web 用戶端、啟用 Drive API 並設定允許的 origin，將 `.env.example` 複製為 `.env.local`，填入 `VITE_GOOGLE_CLIENT_ID` 後重啟／重建。

只按「Google Drive」才載入 GIS，只按「Google 授權並上傳」才請求授權；token 只在該次函式執行記憶體中使用。不保存 token，不要求讀寫整個 Drive。以應用程式標記找回專用 folderId，每次上傳建立新的子資料夾並回傳檔案連結。失敗可重試，部分已上傳的檔案保留在上次子資料夾，不覆寫或清除。

**未設定 client ID 時如實顯示未啟用；真實 OAuth／帳號／學校政策／上傳尚待實機授權測試。** 自動測試中的 Drive API 是模擬，不表示真實雲端測試通過。

## 檢查與建置

```powershell
npm test
npm run build
npm run preview
```

`npm run build` 先執行 TypeScript 檢查，再產生 `dist/`。Vite 相對 base 可用於靜態託管；此階段僅本機啟動，未發佈網站。詳細驗收記錄見 [docs/ACCEPTANCE.md](docs/ACCEPTANCE.md)。

無追蹤分析、無姓名欄位、無 AI 金鑰。收藏只在瀏覽器，清除瀏覽資料前請下載 JSON。
