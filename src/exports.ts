import type { Card, Collection } from "./model";
import { safeFilename } from "./model";
const font = '"Microsoft JhengHei", "PingFang TC", sans-serif';
export function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = safeFilename(name);
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}
export function jsonBlob(collection: Collection) {
  return new Blob([JSON.stringify(collection, null, 2)], {
    type: "application/json",
  });
}
function lines(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
) {
  let line = "";
  for (const c of text) {
    if (ctx.measureText(line + c).width > maxWidth) {
      ctx.fillText(line, x, y);
      line = c;
      y += lineHeight;
    } else line += c;
  }
  ctx.fillText(line, x, y);
  return y + lineHeight;
}
export async function renderCard(
  card: Card,
  phrase: string,
): Promise<HTMLCanvasElement> {
  await document.fonts.ready;
  const canvas = document.createElement("canvas");
  canvas.width = 1240;
  canvas.height = 1754;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("瀏覽器無法建立圖片。");
  ctx.fillStyle = "#f8f7f1";
  ctx.fillRect(0, 0, 1240, 1754);
  ctx.fillStyle = "#285d50";
  ctx.fillRect(0, 0, 1240, 20);
  ctx.font = `bold 30px ${font}`;
  ctx.fillText("生字動畫收藏本  /  我的學習卡", 80, 90);
  ctx.fillStyle = "#65746b";
  ctx.font = `26px ${font}`;
  ctx.fillText(`語詞：${phrase}　｜　第 ${card.position + 1} 個字`, 80, 145);
  ctx.strokeStyle = "#d5ded3";
  ctx.lineWidth = 2;
  ctx.strokeRect(80, 195, 430, 430);
  ctx.setLineDash([8, 8]);
  ctx.beginPath();
  ctx.moveTo(295, 195);
  ctx.lineTo(295, 625);
  ctx.moveTo(80, 410);
  ctx.lineTo(510, 410);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = "#285d50";
  ctx.textAlign = "center";
  ctx.font = `310px ${font}`;
  ctx.fillText(card.character, 295, 520);
  ctx.textAlign = "left";
  ctx.font = `36px ${font}`;
  ctx.fillText(card.reading, 570, 300);
  ctx.font = `bold 32px ${font}`;
  ctx.fillText(card.master.structure, 570, 380);
  ctx.font = `26px ${font}`;
  lines(
    ctx,
    `部件示意：${card.master.components.join("、") || "待核對"}`,
    570,
    440,
    570,
    42,
  );
  ctx.fillStyle = "#806236";
  ctx.font = `24px ${font}`;
  lines(ctx, "教材待教師審定；未收錄核對筆順路徑。", 570, 560, 560, 36);
  ctx.fillStyle = "#285d50";
  ctx.font = `bold 32px ${font}`;
  ctx.fillText("在這個語詞裡", 80, 705);
  ctx.fillStyle = "#293e35";
  ctx.font = `30px ${font}`;
  let y = lines(ctx, card.meaning, 80, 760, 1080, 46);
  ctx.font = `28px ${font}`;
  y = lines(ctx, card.simple, 80, y + 8, 1080, 44) + 42;
  ctx.fillStyle = "#285d50";
  ctx.font = `bold 32px ${font}`;
  ctx.fillText("一起學造詞", 80, y);
  y += 55;
  for (const v of card.vocabulary.slice(0, 6)) {
    ctx.fillStyle = "#293e35";
    ctx.font = `bold 27px ${font}`;
    ctx.fillText(`${v.word}　${v.reading}`, 80, y);
    y += 39;
    ctx.font = `25px ${font}`;
    ctx.fillStyle = "#52645a";
    y = lines(ctx, v.example, 80, y, 1080, 36) + 23;
  }
  if (!card.vocabulary.length) {
    ctx.font = `26px ${font}`;
    ctx.fillText("目前無已核對資料，可與老師一起查字典。", 80, y);
  }
  ctx.fillStyle = "#65746b";
  ctx.font = `21px ${font}`;
  lines(
    ctx,
    `查核參考：${card.source?.title || "教育部辭典"}。白話與例句為本專案編寫，待教師審定。`,
    80,
    1605,
    1080,
    30,
  );
  ctx.font = `17px ${font}`;
  lines(
    ctx,
    card.source?.url || "https://dict.concised.moe.edu.tw/",
    80,
    1670,
    1080,
    24,
  );
  return canvas;
}
export async function pngBlob(card: Card, phrase: string) {
  const canvas = await renderCard(card, phrase);
  return new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("圖片匯出失敗。"))),
      "image/png",
    ),
  );
}
export async function pdfBlob(collection: Collection) {
  const { jsPDF } = await import("jspdf");
  const pdf = new jsPDF({ unit: "mm", format: "a4" });
  for (let i = 0; i < collection.cards.length; i++) {
    if (i) pdf.addPage();
    const canvas = await renderCard(
      collection.cards[i],
      collection.sourcePhrase,
    );
    pdf.addImage(canvas.toDataURL("image/png"), "PNG", 0, 0, 210, 297);
  }
  return pdf.output("blob");
}
