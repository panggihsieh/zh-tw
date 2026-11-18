# 補充教學描線

`57e1.json`（埡）、`54cf.json`（哏）取自 Hanzi Writer Data，版本
`68d10a4b21150cae5e1ebbd223eed289cf32d90c`。
`7c84.json`（粄）為本站組合教學描線：同版本「粉」第 1–6 筆及「飯」第 9–12 筆，保留各部件原有相對位置。

來源：https://github.com/chanind/hanzi-writer-data

原資料源自 Make Me A Hanzi 與文鼎字型，依 Arphic Public License 使用及轉換；完整授權見同目錄 `ARPHICPL.TXT`。
座標由原始 `(x,y)` 轉為 `(2x, 2(900-y))`，輪廓曲線與描線使用相同轉換。

以上三字為替代教學資料，並非教育部筆順動畫原檔，不適用本目錄其他教育部來源資料的來源標示。
總筆畫及組字部件核對來源：

- 埡：https://www.cns11643.gov.tw/wordView.jsp?ID=144452
- 粄：https://www.cns11643.gov.tw/wordView.jsp?ID=143723
- 哏：https://www.cns11643.gov.tw/wordView.jsp?ID=141632

逐筆名稱及書寫驗證紀錄保存於專案 `reports/nani-supplemental-stroke-review.json`、
`reports/candidate-characters-browser-writing-check.json`。瀏覽器測試攔截 TTS 呼叫以驗證文字，未宣稱裝置發音試聽通過。
