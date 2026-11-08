---
name: zh-tw-publisher-sync
description: 為 zh-tw 更新南一、康軒、翰林國小國語官方教材來源，保留原檔與版本，比對課文是否變更，並建立待審選擇題母題。適用於學期教材更新及出版社資源盤點。
---

在使用者授權的出版社、年級與學期範圍內操作。專案預設 K:/CODEX/zh-tw，正式站 voltaic-circuit-511310-a3-zh-tw.web.app。

## 取得來源

1. 從南一 nanidigi.nani.com.tw / box3.nani.com.tw、康軒 945cloud.knsh.com.tw / digitalmaster.knsh.com.tw、翰林 hanlindigi.hle.com.tw / edisc3.hle.com.tw 目前可見的官方入口開始。
2. 登入限定內容使用使用者的瀏覽器與正式下載操作。等待 SSO 完成後重新讀取畫面，勿把短暫未登入當成永久無權限。不得把帳密、cookie、簽章權杖放進原始碼、來源清單或後台。
3. 先核對學制國小、科目國語、學年度、上下冊與年級。登記來源只能來自實際可見檔名／預覽或下載資產；不猜 URL、不把入口頁當作教材全文。
4. 原檔存專案 .local/publisher-sources 或私有雲端 publisher-originals/；不提交出版社原文、題卷或答案到 GitHub/public。記錄官方網址、檔名、年版、冊次、課次、原始 SHA256、下載日期、頁數與解析版本。

## 更新與課文比對

後台「國語母題與錯題管理」內的 PublisherSync 流程由 server/publisher-sync.mjs 執行，不是任意 shell 執行器。

- 官方入口即時下載後可由 AI 盤點資源與限制，但盤點不是完成教材下載。
- 已登記直接官方 PDF 由伺服器下載並保留原版本；下載失敗、登入頁、無文字層或格式不明均列待確認。
- 用 NFC 與換行正規化的全文 SHA256 比對，不刪數字、標點、否定詞或語意內容。只有已取得完整課文，且新舊內容相同，才判定課文未變並略過母題更新。
- 若只有題卷，僅能判定題卷是否變更；明示未取得課文全文。標題、檔名、學期或網站 HTML 不足以判定課文沒變。
- 更新原始版本保留，不覆寫既有已發布試卷、作答與錯題紀錄。內容變更建立新待審母題；已核對相同內容可重用先前草稿。

## 母題

目前先處理南一國語五、六年級。原卷只取四選一單選題；答案以教用卷核對。先做一課檢查文字順序、選項與答案，再依授權範圍分批。

- server/publisher-sync.mjs 的 extractChoices 用於目前已驗證的教用卷格式；不匹配或不合理題數不補猜，轉待核對。
- AI 僅補兩個同義題幹、題型、簡短解析，保留原題、四個選項、唯一正解、課文／題卷依據。再用 AI 檢查語意與答案一致，失敗不自動無限重試。
- 題卷不是課文全文。母題標示 sourceKind=assessment；含教用答案的來源內容只供教師，不得傳到學生交卷前的閱讀課文。
- 草稿全數 reviewed=false，供教師檢查；除非另有明確發布指示，不發布到學生前台。

詳細 API、驗收與來源格式見專案 docs/PUBLISHER_SYNC.md。修改程式後執行測試、瀏覽器驗證並依專案指示 commit/push/deploy；下載內容與執行資料留在私有儲存。

本機原檔保留可執行 `node scripts/cache-publisher-resources.mjs registry.json .local/publisher-sources`。後台批次逐課呼叫、逐課保存，需保持頁面開啟；不是自動登入出版社或離線排程服務。來源清單須按當期官方可見資料重新確認，不能只改 URL 年份。
