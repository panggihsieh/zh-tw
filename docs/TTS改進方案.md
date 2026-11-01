# TTS 改進方案

記錄日期：2026-11-01。狀態：待後續評估；暫不安裝、下載模型或串接新服務。

## 核心需求

使用者主要需要「精準逐字時間定位」，以音訊實際播放位置驅動中文字醒目、放大與拖曳定位。只有語音合成、整句時間或依字數均分時間，不足以滿足需求。免費、可地端執行為優先評估方向，尚未選定方案。

## 現況

目前 Web Speech 使用 boundary 事件搭配估計進度，依音色與瀏覽器可能只有詞或句粒度，未驗證為精準逐字對齊。黃色提示、1.35 倍放大及暫停／定位已實作，但視覺特效不會提高時間準確度。[例] 僅在朗讀輸入轉為停頓，畫面原文保留；後續須保留原文與朗讀文字的索引映射。

## 候選技術與缺口

| 技術 | 用途 | 尚待驗證 |
| --- | --- | --- |
| Web Speech boundary | 現有語音位置事件 | 不保證每個中文字都有事件；估計進度不能當精準時間戳 |
| Azure Speech SDK wordBoundary | 文字偏移及音訊時間偏移 | 中文是否逐字、音色及標點行為；雲端服務，不視為免費地端解法 |
| Google Cloud TTS SSML mark timepoints | 標記對應音訊時間點 | 逐字插標記的支援、韻律影響及時間完整性；屬雲端方案 |
| sherpa-onnx＋中文 Kokoro | 本機離線產生音檔 | 能合成不代表有精準逐字時間；需核對輸出、模型授權及臺灣讀音 |
| Piper | 本機離線合成的另一候選 | 中文模型、授權、音質及時間資料需分別驗證 |
| Montreal Forced Aligner（MFA） | 已知文字與音檔強制對齊 | 中文模型／詞典、分詞、多音字及詞／音素到漢字映射；不能將詞級時間均分後宣稱逐字精準 |

目前未證實任何一組已滿足本專案需求，不承諾安裝後即可達成。

## 後續評估流程

1. 先確認可取得每字開始／結束時間，或可驗證的音素到漢字映射；無法取得時先回報缺口，不直接整合。
2. 免費地端方向先用少量教材測試「本機 TTS 音檔＋強制對齊」，再比較提供時間戳的其他服務。先驗證同步，再選音色與後台設定。
3. 保存原文、朗讀文字、索引映射、音檔及時間戳，並綁定文字、音色、模型與合成參數，避免快取錯配。
4. 以音訊播放時鐘查找目前的字，不使用獨立計時器累加。暫停、跳轉、重播與變速後重新依播放位置計算。
5. 現有瀏覽器 TTS 作為備用，明確區分估計提示與已驗證的時間對齊。

## 驗收方式（尚未執行）

- 涵蓋一般詞、多音字（銀行／行走、測量）、數字、標點、換行、空白、[例]、重複語句及非 BMP 漢字。
- 每字索引完整，時間單調且在音檔範圍內；停頓不誤標成文字發音。
- 對照真人標註或可檢查的音訊波形，量測開始／結束誤差及長段落漂移，報告中位數、95 百分位及最大誤差。
- 實驗前決定可接受的毫秒誤差與樣本規模；不以「看起來同步」取代量測，不先宣稱達標。
- 檢查播放、暫停、繼續、拖曳、重播及變速後的標示一致性；缺音檔或時間戳時明確降級。
- 地端方案驗證初次下載後可離線運作，記錄電腦規格、合成／對齊耗時、記憶體及模型容量。

## 技術參考

- [Web Speech boundary](https://developer.mozilla.org/en-US/docs/Web/API/SpeechSynthesisUtterance/boundary_event)
- [Azure Speech SDK 時間與文字偏移](https://learn.microsoft.com/en-us/javascript/api/microsoft-cognitiveservices-speech-sdk/speechsynthesiswordboundaryeventargs?view=azure-node-latest)
- [Google Cloud SSML／timepoints](https://docs.cloud.google.com/text-to-speech/docs/ssml)
- [sherpa-onnx 中文 Kokoro](https://k2-fsa.github.io/sherpa/onnx/tts/pretrained_models/kokoro.html)
- [Piper 官方專案](https://github.com/OHF-Voice/piper1-gpl)
- [MFA 官方專案](https://github.com/MontrealCorpusTools/Montreal-Forced-Aligner)

開始實作前重新核對當時版本、授權、模型與時間戳能力。
