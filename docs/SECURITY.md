# 本機資料與雲端

- IndexedDB 保存收藏，不收姓名。`127.0.0.1:5173` 與其他來源隔離。
- 匯入只接受 5 MB 以下 JSON，檢查 schema、字卡、分鏡與 HTTPS 來源。每次匯入分配新收藏 ID，避免默默覆寫。
- React 以文字輸出資料，不用 `dangerouslySetInnerHTML`。來源新分頁使用 noreferrer。
- OAuth client ID 為公開識別碼，client secret／access token／refresh token 不可填入前端環境或提交 Git。
- Google access token 只存在授權當次記憶體，不存 localStorage、IndexedDB 或匯出。
- `drive.file` 僅找回應用程式標記的專用根資料夾，子目錄用回傳 folderId，不對任意同名資料夾上傳。
- 上傳失敗保持本機副本；每次重試新增子資料夾，部分成功的遠端檔案不自動刪除。
- 預設無 Google 用戶端設定，不會發生實際授權或上傳。GIS 在使用者開啟雲端視窗時才載入。
- 字型可從 Google Fonts 載入，失敗時使用本機字型；不向字型服務送出語詞。此版不是 PWA，也不承諾重新啟動後無網路仍能載入應用程式。
- 筆順幕只載入官方清單中的 HTTPS 教育部 iframe，使用 no-referrer，僅將所選單字的公開字碼傳到官方網址，不傳收藏或 Google token。第三方播放器含來源網站的分析工具；本專案不控制該頁面的紀錄。只在筆順幕掛載，離開即移除播放器。
- TTS 文字交由裝置 Web Speech API，語音引擎可能使用廠商網路服務；本專案沒有額外 TTS 後端或金鑰。頁面只朗讀本身可見文字或教學講稿，不擷取第三方 iframe、隱藏的 OAuth token 或瀏覽器其他分頁。切頁／換幕取消舊語音，停止後的舊事件不重啟佇列。
- TTS 設定後台只是本機偏好頁，沒有管理員權限或安全驗證宣稱。localStorage 僅保存 voiceURI、name、lang、localService，載入時驗證並只取白名單欄位，不保存 token 或雲端 API 金鑰。獨立雲端服務未啟用；來源依瀏覽器 localService 回報分類，不猜測供應商、費用或是否完全離線。
