# API 後台設定

2026-11-01。入口：WebApp 左側「API 設定」，直接定位「AI 字形結構 API 後台」。亦可從「TTS 設定後台」進入。

## 使用方式

1. 預設 Lock。按 Unlock 取得本機編輯工作階段。
2. 選服務、填模型及 API Key。預設 DeepSeek，Base URL 為 https://api.deepseek.com，模型 deepseek-flash。
3. 按 Save，加密保存並設為目前預設服務，隨即自動 Lock。空白金鑰保留該服務原有金鑰；不同服務各自保存，不共用。
4. 可在 Lock 狀態直接按「測試已儲存 API 連線」，無須解鎖設定。測試只發出短文字訊息，成功不代表圖像分析品質已通過。成功顯示藍色服務與模型名稱，失敗顯示紅色原因；上次成功時間隨加密設定保存。修改設定後會清除過期成功紀錄。
5. 需要字形分析時，輸入一字並按分析。會將該字繪製成 PNG，送至所選服務；不傳送收藏本。回傳比例僅為待核候選，可預覽及下載 JSON，不自動改寫教材。

## 支援服務

| 服務 | 預填模型 | 備註 |
| --- | --- | --- |
| DeepSeek | deepseek-flash | 預設選項；依官方 Vision 文件傳入圖片 |
| Qwen | qwen-plus | 預填文字模型；可測試文字連線，字形影像分析須另選支援圖片的模型 |
| MiniMax | MiniMax-M3.1-Flash | 使用官方相容端點 |
| Gemini | gemini-3.8-flash | 使用官方相容端點 |
| OpenAI | gpt-4.1-mini | 使用 Chat Completions 圖片輸入 |
| Ollama | 使用者填入 | 僅允許本機 loopback；需自行準備支援圖片的模型 |

模型名稱可修改，實際可用性及額度以各帳號為準。Qwen 的 URL 及金鑰須使用同一區域；可填官方工作空間專用網域。雲端服務按供應商規定計費，系統不自動進行背景或批次模型呼叫。

## 本機加密與 Lock

API 設定保存在 .local/structure-api.json，使用 Windows DPAPI CurrentUser 加密整份設定。金鑰不存前端 localStorage、sessionStorage 或 Git；API 不回傳金鑰，只回傳是否存在。

預設鎖定，Save 後自動鎖定；Unlock token 僅存分頁記憶體，閒置 15 分鐘過期，重整後不還原。Lock 是本機編輯工作階段控制，不是管理員帳號登入；同一 Windows 帳號可按 Unlock。DPAPI 綁定 Windows 使用者，不宜直接將設定檔當成可跨帳號的備份。

後端僅監聽 127.0.0.1:5174；變更操作檢查固定前台 Origin 及自訂標頭。雲端端點採官方網域／路徑白名單，HTTPS 傳送，不跟隨重導。未使用或要求使用者在聊天提供金鑰。

## 啟動及測試

既有 scripts/Start-Local.ps1 會啟動 AI 後端；也可在專案根目錄執行 npm run structure-api。啟動腳本已以 Windows PowerShell 驗證 UTF-8 BOM 相容性。

- npm test：163 項通過。
- npm run test:structure-api：5 項通過，包含五家供應商模擬請求、金鑰隔離、不回傳金鑰、存檔自動鎖定、未解鎖拒絕操作，以及 Windows DPAPI 實際加解密。
- npm run build：通過。
- 瀏覽器：確認鎖定時不能編輯、Unlock 後可編輯與測試、未填金鑰時提示先儲存，Lock 後停用編輯。

使用者設定金鑰後，已實際驗證 DeepSeek / deepseek-flash 的短文字連線成功。其他四家真實帳號連線與所有圖片分析品質仍待測試；不可把模擬測試當作已連線成功。

## 官方資料

- https://api-docs.deepseek.com/guides/vision/
- https://www.alibabacloud.com/help/en/model-studio/compatibility-of-openai-with-dashscope
- https://platform.minimax.io/docs/api-reference/text-openai-api
- https://ai.google.dev/gemini-api/docs/openai/
- https://developers.openai.com/api/docs/guides/images-vision
- https://docs.ollama.com/capabilities/vision
