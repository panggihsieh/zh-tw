# 100 字結構測試說明

2026-11-01 製作。選用 115 學年度上學期、康軒版五年級國語。

## 生字範圍

依教育部教育百科生字詞彙表各課連結的詞條順序，取第一至第六課前 100 個不重複單字。多字詞不納入。這不是全冊全部生字，也未宣稱逐頁比對紙本課本。

來源：https://pedia.cloud.edu.tw/Bookmark/Textword?category=國語&degree=5&press=康軒版&year=115_1

每字所屬課別、來源網址與選取順序見 characters.json、report.csv。

## 結構來源及授權

結構候選來自 CJKVI 的 ids.txt，Copyright (c) 2014-2017 CJKVI Database，Based on CHISE IDS Database。

- 原始資料：https://raw.githubusercontent.com/cjkvi/cjkvi-ids/master/ids.txt
- 專案與授權說明：https://github.com/cjkvi/cjkvi-ids
- 上游說明：https://raw.githubusercontent.com/cjkvi/cjkvi-ids/master/README.md
- GPLv2 授權全文隨附於 GPL-2.0.txt。

此目錄的 IDS 摘錄及其結構圖衍生資料依 GPLv2 提供。包含上游原始候選 variants、選用版本 rawIds 與解析值 ids，可供檢查。優先選取 T 地區標記候選，沒有 T 時採無地區標記版本，再退到首個候選；不是所有字都有臺灣專屬資料。

## 圖像規則與限制

左側為字型呈現的完整字，右側為 IDS 位置結構圖。支援左右、上下、上中下、左上包圍、左下包圍及重疊候選，含遞迴配置。獨體／未再拆分字保留單一方框；不任意再拆。

分區比例是程式的教學示意規則，例如艹等短上部、氵等窄左旁，不是逐字量測或教育部標準比例。所有 100 字結構及比例仍待教師核對，未自動擴充到正式學習教材。未呼叫 AI 或付費 API。

存、典的上游候選含未編碼的部件代號，不將代號當漢字畫出，改以「待核」方框呈現。德、哀、豐、養、嚴、勞、聯、局、冊含非 BMP 部件，另標示罕見部件；字型覆蓋依裝置而異。

## 重建及檢查

1. 將上游 ids.txt 保存到 .local/qa/ids.txt，將 GPLv2 原文保存到 .local/qa/GPL-2.0.txt。
2. 執行 python scripts/collect-structure-review.py。若 Python 本機憑證鏈無法連線，可先用 PowerShell Invoke-WebRequest 下載各課頁面到 .local/qa/kangxuan115-01.html 至 06.html，再執行腳本；不關閉 TLS 驗證。
3. 執行 python scripts/render-structure-review.py，產生 100 個 SVG、四張 25 字網頁、總覽與 CSV。
4. 腳本檢查 100 字唯一性、IDS 語法完整消耗及所有繪圖區塊邊界。瀏覽器檢查實際字型與版面。

批次繪圖成功不等於字源、教學拆字或精確比例已核對。


## 五六年級四冊目測修正頁（2026-11-01）

入口：editor.html。資料：books.json。四冊單字項目共 811 筆（跨冊可能重複），不再限前 100 字。

- 康軒五上：115_1，12 課、224 字。
- 康軒五下：114_2，12 課、217 字。
- 康軒六上：115_1，12 課、217 字。
- 康軒六下：114_2，9 課、153 字。

115_2 字表尚未收錄，故下冊明示使用 114_2，未混稱同一學年。各課來源網址保存在 books.json。完整字表指教育百科各課所列的單字詞條，未宣稱逐頁核對紙本課本；多字詞不拆入生字。

部首、注音及釋義原文取自教育部《國語辭典簡編本》（版本 2014_20260929），保留多音項，未判定特定課文讀音；原資料與公眾授權說明見 https://dict.concised.moe.edu.tw/ 。教育部資料依 CC BY-ND 3.0 TW 原授權提供，與 GPLv2 IDS 資料分別標示；本頁並非教育部審定教材。

IDS 是字形配置候選，不能直接視為形旁／聲旁或字源結論。罕見部件由裝置字型呈現，未編碼代號顯示待核。包圍與重疊結構使用區位示意，非精確字形輪廓；比例欄位調整第一層橫排／直排部件，包圍與重疊仍採區位示意。所有候選初始為待核對，形音義依據及查證來源留給教師填寫。

修正以單字為鍵跨冊共用，存於同一瀏覽器、同一網址來源的 localStorage。重新整理保留篩選及頁碼。可匯出／匯入 JSON 備份；匯入時相同字以匯入版本覆蓋。清除瀏覽器資料會移除本機紀錄，請先匯出。此階段只套用教師檢視頁，不自動改寫學生收藏或正式教材。未呼叫付費 API。

重建：先執行 scripts/Collect-Kangxuan.ps1，再執行 python scripts/build-kangxuan-review.py。檢查：node --test scripts/kangxuan-review.check.mjs。

## 五上獨立快速總覽

five-upper.html 將上述五上全部 224 字（12 課）同頁列出，無分頁。部件區域做位移拆開／合起，末段淡入完整字作對照；動畫為候選圖解而非精確字形輪廓組裝。215 字可播放，9 字為獨體／未再拆分或含未編碼代號而維持靜態。動畫預設 OFF，遵循系統減少動態偏好。支援課別與生字篩選；從縮圖可跳至該字修正頁。開啟頁面時讀取同網址本機已儲存的修正，編輯後重新整理總覽即可更新。


## 每課生字結構筆畫查詢後台

入口：editor.html?mode=lesson。上傳 TXT 生字清單、CSV（第一列需有「生字／字／character／characters」欄）或 JSON（title 與 characters 字串／陣列），或貼上生字；PDF、照片與 DOCX 尚不直接辨識。檔案最大 1 MB，每課 1–500 個不重複漢字，最多 100 課。文字預覽只保留漢字，保留原字形與輸入順序；確認後明確儲存。CSV 只取生字欄，JSON 只取 characters 欄，不將課名或說明欄誤當生字。

課別資料保存於同網址 localStorage 的 hanzi-notebook.lesson-structures.v1，修正仍沿用單字共用資料。可更新或移除上傳課別，當次頁面可復原最後一次移除；清除瀏覽器資料會遺失紀錄，請先匯出備份。匯出包含上傳課別和結構修正，匯入時相同課別 ID／同字修正以匯入版本為準。不自動更動學生收藏。

ids-catalog.json 是 CJKVI／CHISE ids.txt 的完整選用 IDS 摘錄，依同目錄 GPLv2 授權，優先 T 標記、再無標記、最後首候選。缺少或無法解析的 IDS 僅保留完整字待核，不猜測部件。重建指令：python scripts/build-ids-catalog.py；上游來源及授權同上。

總筆畫、部首、讀音及釋義使用本專案既有教育部《國語辭典簡編本》原資料，總筆畫取「總筆畫數」欄；缺項顯示待核對。moe-stroke-ids.json 複用已核對的教育部可嵌入清單。官方筆順播放器按需載入原版，不下載、不修改、不列入備份。授權說明：https://stroke-order.learningweb.moe.edu.tw/page.jsp?ID=52 。單字可修正結構與比例並存檔；候選、形音義與字源仍待教師查證。

## 字卡直接修正

右上角顯示後台 SVG 結構縮圖，底部選單依現有 IDS 與比例對應圖例。自訂比例以最近的預設圖作縮圖示意，未改選而直接儲存不會改掉原比例；改選後顯示預覽，按儲存才套用。圖例清單由 scripts/build-structure-atlas.py 產生到 /structure-atlas/catalog.json。儲存沿用同字共用的結構修正資料，可透過原有備份匯出；部件不足時請進詳細修正補齊。
