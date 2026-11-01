# 教材來源與審定範圍

版本：2026-11-01.1。資料由 `src/data.ts` 分離為 CharacterMaster、PhraseContext 與 VocabularyEntry；收藏以快照保存使用者紀錄，沒有把所有層級混為共同可變學生資料。

## 實際查閱

- 教育部《國語辭典簡編本》：<https://dict.concised.moe.edu.tw/>
- 「感謝」詞條：<https://dict.concised.moe.edu.tw/dictView.jsp?ID=16434&la=0&powerMode=0>。核對語詞讀音及感激義，白話另行編寫。
- 教育部《國字標準字體筆順學習網》：<https://stroke-order.learningweb.moe.edu.tw/>
- 「行」進階學習：<https://stroke-order.learningweb.moe.edu.tw/dictMean.jsp?ID=34892>。核對行走及銀行兩種語境的讀音／義項區別。

## 狀態

沒有任何字被標為完整 verified。字形與部件為 partial；未知字為 unavailable。造詞、注音、例句與白話教材為 editorial、待教師審定；網站首頁連結僅是查詢入口，不能視為逐詞審核證據。介面和匯出均揭露狀態。

字形分離使用目前字型的同一整字區域裁切。每個字依上下／左右／左中右切分，邊界僅供觀察，不是精準筆畫向量。沒有重製 MOE SVG、動畫或 Hanzi Writer 軌跡。

## 官方筆順播放器（2026-11-01 新增）

依 [教育部教學資源](https://stroke-order.learningweb.moe.edu.tw/resource.jsp?ID=1)「全筆順動畫嵌入碼網址列表.csv」擷取 6,063 個十進位字碼，存於 `src/data/moe-characters.json`。只有清單內的單字才使用 `dictFrame.jsp?ID=字碼`。這是外部原版嵌入，沒有把字形主檔全部升級為 verified。

依 [教育部版權說明](https://stroke-order.learningweb.moe.edu.tw/page.jsp?ID=52)，視框連結限非商業利用，動畫採 CC BY-NC-ND 3.0 TW。此本機學習版保留原播放器、標示中華民國教育部及來源網址，不改作、錄製、離線包裝或加入匯出。其他商業用途需另行取得許可。

官方原版提供播放／暫停、下一畫、重播及速度控制；本專案不以跨來源腳本操作官方頁面，使用者直接操作播放器。瀏覽器測試工具可從 iframe 讀取實際 UI，與產品執行權限不同。

一般未知語詞即使含已收錄的字，也不沿用其他語詞讀音或意義。須先補充語境校對資料。書面語讀音與裝置 TTS 可能不同，朗讀只作輔助。

程式碼依專案授權設定；不宣稱取得教育部網站素材重製授權。白話與例句為本專案原創，正式課堂使用前建議教師審定。
