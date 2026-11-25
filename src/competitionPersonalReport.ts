export interface PersonalReport {
  title: string; className: string; name: string; points: number; date: number;
  questions: { prompt: string; options: string[]; answer?: number; character?: string; type: string; submitted?: string | number; points: number | null; answered: boolean }[];
}
export function personalReportLines(report: PersonalReport): string[] {
  const choice = (index: number, options: string[]) => `${String.fromCharCode(65 + index)}．${options[index] ?? "紀錄不完整"}`;
  return ["課堂競賽個人學習紀錄", report.title, `${report.className} · ${report.name}`,
    `${new Date(report.date).toLocaleDateString("zh-TW", { timeZone: "Asia/Taipei" })} · 總分 ${report.points} 分`, "",
    ...report.questions.flatMap((q, i) => [
      `第 ${i + 1} 題　${q.prompt}`,
      ...q.options.map((_, index) => choice(index, q.options)),
      `個人作答：${q.submitted === undefined ? (q.answered ? "舊課堂未保存作答紀錄" : "未作答") : typeof q.submitted === "number" ? choice(q.submitted, q.options) : q.submitted}`,
      `正確答案：${q.answer !== undefined ? choice(q.answer, q.options) : q.type === "writing" ? q.character ?? "依指定字書寫" : "開放作答，無唯一標準答案"}`,
      `本題得分：${q.points === null ? (q.answered ? "舊課堂未保存分數紀錄" : "0 分") : `${q.points} 分`}`, "",
    ]),
  ];
}
/** 以瀏覽器中文字型繪製，每行先量測再分頁，避免 PDF 缺字或裁切。 */
export async function personalReportPdf(report: PersonalReport): Promise<Blob> {
  await document.fonts.ready;
  const { jsPDF } = await import("jspdf");
  const pdf = new jsPDF({ unit: "mm", format: "a4", compress: true });
  const canvas = document.createElement("canvas"); canvas.width = 1240; canvas.height = 1754;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw Error("無法產生 PDF，請更換瀏覽器後重試。");
  let y = 90, pages = 0;
  const reset = () => { ctx.fillStyle = "white"; ctx.fillRect(0, 0, canvas.width, canvas.height); ctx.fillStyle = "#203c32"; ctx.font = '28px "Microsoft JhengHei", "Noto Sans TC", sans-serif'; y = 90; };
  const flush = () => { ctx.font = '22px "Microsoft JhengHei", sans-serif'; ctx.fillText(`第 ${++pages} 頁`, 1070, 1700); if (pages > 1) pdf.addPage(); pdf.addImage(canvas.toDataURL("image/jpeg", 0.9), "JPEG", 0, 0, 210, 297); reset(); };
  reset();
  const groups: string[][] = [[]];
  for (const paragraph of personalReportLines(report)) {
    let line = "";
    for (const char of paragraph) {
      if (char === "\n") { groups.at(-1)!.push(line); line = ""; continue; }
      if (ctx.measureText(line + char).width > 1080) { groups.at(-1)!.push(line); line = ""; }
      line += char;
    }
    groups.at(-1)!.push(line);
    if (!paragraph) groups.push([]);
  }
  for (const group of groups.filter(group => group.length)) {
    // 能放進一頁的題目整組換頁；超長單題仍按行續頁。
    if (group.length <= 35 && y + (group.length - 1) * 44 > 1620) flush();
    for (const line of group) { if (y > 1620) flush(); ctx.fillText(line, 80, y); y += 44; }
  }
  flush(); return pdf.output("blob");
}
