import { useEffect, useState } from "react";
import { authorize, CLIENT_ID, loadGoogle, uploadCompetitionPdf } from "./drive";
import { personalReportPdf, type PersonalReport } from "./competitionPersonalReport";
import { competitionStudentRequest } from "./competitionApi";

export default function CompetitionDriveSave({ roomId, request = competitionStudentRequest, simulated = false }: { roomId: string; request?: typeof competitionStudentRequest; simulated?: boolean }) {
  const [ready, setReady] = useState(false), [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(""), [url, setUrl] = useState("");
  useEffect(() => {
    if (simulated) return;
    let active = true;
    void loadGoogle().then(() => { if (active) setReady(true); }).catch(error => { if (active) setMessage(error.message); });
    return () => { active = false; };
  }, [simulated]);
  async function save() {
    setBusy(true); setMessage("請選擇要儲存的 Google 帳號並授權。"); setUrl("");
    try {
      // 必須在點擊事件內直接開啟授權，避免產生 PDF 後才開啟而被瀏覽器阻擋。
      const token = await authorize();
      setMessage("正在整理個人題目與 PDF…");
      const report = await request<PersonalReport>(`/rooms/${roomId}/personal-report`);
      const blob = await personalReportPdf(report);
      const result = await uploadCompetitionPdf(token, `${report.title}_${report.name}_競賽紀錄.pdf`, blob);
      setUrl(result); setMessage("已儲存到 Google Drive 的「生字動畫收藏本／課堂競賽」資料夾。");
    } catch (error) { setMessage(`${(error as Error).message} 尚未確認儲存成功，請重試。`); }
    finally { setBusy(false); }
  }
  return <section aria-label="儲存個人競賽題目">
    <button className="primary" disabled={busy || simulated || !CLIENT_ID} onClick={() => {
      if (!ready) { setMessage("正在載入 Google 授權，請稍後再按一次。"); void loadGoogle().then(() => setReady(true)).catch(error => setMessage(error.message)); return; }
      void save();
    }}>{busy ? "正在儲存…" : "儲存我的題目到 Google Drive"}</button>
    <p>參賽免登入；儲存時才選擇 Google 帳號並授權。PDF 包含題目、選項、個人作答、正確答案及分數。</p>
    {simulated && <p>模擬課堂不會上傳個人資料。</p>}
    {!CLIENT_ID && <p>目前尚未設定 Google Drive 授權。</p>}
    <p role="status" aria-live="polite">{message}</p>
    {url && <a href={url} target="_blank" rel="noopener noreferrer">開啟 Google Drive PDF</a>}
  </section>;
}
