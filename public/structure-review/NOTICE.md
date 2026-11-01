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
