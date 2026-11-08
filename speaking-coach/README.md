# 再說一次｜中英文口說與造句練習

獨立於生字收藏本主程式的功能目錄。繁體中文介面，支援英文與繁體中文、初階／中階、情境口說／雙語造句／自由表達，以及咖啡店、問路、日常、工作、爬山五種情境。

流程：選擇練習 → 麥克風辨識或輸入 → 確認文字 → AI 修正與原因 → 示範朗讀 → 再說一次 → 保存弱點並換情境練習。

視覺沿用主專案：Noto Sans TC／Microsoft JhengHei 字體、森林冒險背景、漸層導覽、圓角按鈕與小畫眉圖示。`/theme.css` 只讀主專案公開的 `websiteTheme` 設定並快取五分鐘；設定不存在時使用與主專案相同的森林冒險預設。自訂主題的色碼與圓角通過相同範圍驗證後才套用，不接受任意 CSS。

## 本機啟動

在 `K:\CODEX\zh-tw\speaking-coach` 執行：

```powershell
npm run dev
```

開啟 `http://127.0.0.1:5186`。以 Ctrl+C 停止。沒有額外 npm 依賴，需要支援 fetch 的現代 Node.js（本次以 25.2.1 執行）。

本機後端在記憶體讀取父專案 `.local/structure-api.json` 的 DPAPI 加密設定，僅使用已啟用的預設供應商，不改寫原設定。複製到其他電腦時，可改用伺服器環境變數：`AI_API_KEY`、`AI_ENDPOINT`、`AI_MODEL`、`AI_PROVIDER`。只支援 OpenAI Chat Completions 相容服務，尚未實作 Ollama adapter。

```powershell
npm test
npm run build
```

## 雲端部署

部署於獨立、限擁有者存取的 Sites，原始碼仍保存在本 GitHub 專案。GitHub Pages 只有靜態託管，不能安全執行持有金鑰的 AI 後端，因此本功能使用獨立 Worker。

站點：https://say-again-bilingual-hsieh.hsiehpangg.chatgpt.site

站點 ID 保存在 `.openai/hosting.json`。`npm run build` 產生包含所有靜態資源的 `dist/server/index.js` Worker。雲端金鑰只放在 Sites 的 secret 環境變數，不放 Git、HTML、前端儲存或部署 manifest。部署時需使用 Sites 的來源同步、封裝及部署流程；單獨推送 GitHub 不等同已部署。

## 資料與限制

- 語音辨識使用瀏覽器 SpeechRecognition / webkitSpeechRecognition，可能由瀏覽器的線上服務處理聲音。本程式不錄製、儲存或上傳音訊檔到本站後端。裝置／瀏覽器不支援時可用文字輸入。
- 朗讀使用裝置 speechSynthesis 音色；音色可用性、語音辨識與真實麥克風品質需在使用者裝置驗收。
- 文字送出後由後端傳送至已設定 AI 供應商。只評估文法、用詞、語意、題目完成度，不評估發音、聲調、停頓，也不提供沒有音訊依據的口說分數。
- 每次送出最多 2000 字；每個 Worker instance／IP 每分鐘最多十次，屬輔助限制，並非全域用量配額。站點需維持擁有者私人存取；若對外開放，應先加入正式使用者驗證及持久化額度限制。
- 複習紀錄只保存在當前瀏覽器 localStorage，上限 300 筆，可匯出 JSON、逐筆移除或確認後清空；不跨裝置同步。無法儲存時會顯示錯誤，不假稱成功。
- AI 建議可能出錯，會保留原意不確定提示；正確但不同的說法應被接受。重說以語意判斷，不要求逐字一致。
- 題庫為自行撰寫，雙語造句每個情境三題；情境題每次換題改變情境。難度影響情境要求與 AI 回饋。

## REA 與 Craft Anything 交叉分析

已實際執行 REA 4.0.1 與 Craft Anything 0.5.0，對 MandarinGo 首頁公開載入的四個 JavaScript 檔進行獨立靜態分析，並保存去除本機路徑的摘要於 `docs/analysis-evidence.json`。

- REA：4 個檔案、44,150 個 AST 節點，沒有解析失敗或截斷。
- Craft Anything：對同一份腳本盤點 endpoint、storage 與模組關係。
- 交叉發現：網站前端有 API 包裝與瀏覽器儲存；動態 API 路徑無法靠靜態結果證明完整後端行為。
- 不繞過登入、不存取私人 API、不複製網站品牌、圖片、文案或原始腳本到本功能。原站僅作功能參考，AI 教學規則與新介面自行實作。
- 這是兩套分析工具配合開發和測試，不是使用 Craft Anything 自動生成整個專案，也沒有取得原站的模型提示詞或後端原始碼。

實際命令（工具安裝於 Git 忽略的 `.local`，REA 透過 npm 的 Node 24 執行，以符合其版本要求）：

```powershell
npm exec --yes --package=node@24 --package=rea-agents -- rea analyze-javascript-application <公開腳本目錄> --format json
craft-anything-cli --deep --project <本機分析專案.cany> js-app-map --input-path <同一公開腳本目錄> --limit 10
```

瀏覽器操作、真實模型測試與程式測試另行驗證；靜態工具成功不代表所有功能已通過。
