export type Point = { x: number; y: number };
export type Trace = { points: Point[]; correct: boolean; stroke: number };
export interface GameWork {
  character: string;
  traces: Trace[];
  expected: number;
  complete: boolean;
}
export interface GameDraft {
  id: string;
  lesson: string;
  characters: string[];
  works: Record<string, GameWork>;
  updatedAt: string;
}
export interface GameSubmission extends GameDraft {
  image: string;
  thumbnail?: string;
  sourceRevision: string;
  uid?: string;
  email?: string;
  displayName?: string;
  submittedAt?: string;
  grade?: { score: number; comment: string; gradedAt: string };
  assignmentId?: string;
}
export function makeThumbnail(image:string){return new Promise<string>((resolve,reject)=>{const source=new Image();source.onload=()=>{const canvas=document.createElement('canvas');canvas.width=240;canvas.height=Math.max(1,Math.round(source.height/source.width*240));const context=canvas.getContext('2d');if(!context)return reject(Error('無法建立作品縮圖'));context.fillStyle='#fff';context.fillRect(0,0,canvas.width,canvas.height);context.drawImage(source,0,0,canvas.width,canvas.height);resolve(canvas.toDataURL('image/jpeg',.72));};source.onerror=()=>reject(Error('無法建立作品縮圖'));source.src=image;});}
export { length, sample, judgeStroke } from "../server/stroke-judge.mjs";
export function outlinePath(outline: any[]): string {
  return (
    outline
      .map((p) =>
        p.type === "Q"
          ? `Q ${p.begin.x} ${p.begin.y} ${p.end.x} ${p.end.y}`
          : p.type === 'C' ? `C ${p.begin.x} ${p.begin.y} ${p.mid.x} ${p.mid.y} ${p.end.x} ${p.end.y}` : `${p.type} ${p.x} ${p.y}`,
      )
      .join(" ") + " Z"
  );
}
export function tracePath(points: Point[]) {
  return points.map((p, i) => `${i ? "L" : "M"} ${p.x} ${p.y}`).join(" ");
}
export function workComplete(work: GameWork) {
  return (
    work.expected > 0 &&
    work.traces.filter((t) => t.correct).length === work.expected
  );
}
export function snapshot(draft: GameDraft) {
  const canvas = document.createElement("canvas");
  canvas.width = 1000;
  canvas.height = 130 + Math.ceil(draft.characters.length / 2) * 440;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw Error("無法建立作品圖片");
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#163d36";
  ctx.font = "bold 26px sans-serif";
  ctx.fillText("生詞遊戲專區 · 我的書寫作品", 30, 40);
  ctx.font = "19px sans-serif";
  ctx.fillText(draft.lesson.slice(0, 60), 30, 75);
  ctx.fillText(new Date().toLocaleString("zh-TW"), 30, 105);
  draft.characters.forEach((c, i) => {
    const x = 40 + (i % 2) * 500,
      y = 150 + Math.floor(i / 2) * 440,
      w = draft.works[c];
    ctx.fillStyle = "#163d36";
    ctx.font = "22px sans-serif";
    ctx.fillText(
      `「${c}」${w?.complete ? "完成" : "未完成"} · 重試 ${w?.traces.filter((t) => !t.correct).length || 0} 次`,
      x,
      y,
    );
    ctx.save();
    ctx.translate(x, y + 15);
    ctx.strokeStyle = "#cbd5d9";
    ctx.lineWidth = 1;
    ctx.strokeRect(0, 0, 360, 360);
    ctx.setLineDash([6, 6]);
    ctx.beginPath();
    ctx.moveTo(180, 0);
    ctx.lineTo(180, 360);
    ctx.moveTo(0, 180);
    ctx.lineTo(360, 180);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.scale(0.36, 0.36);
    ctx.lineWidth = 12;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    w?.traces.forEach((t) => {
      ctx.strokeStyle = t.correct ? "#175d9a" : "#c35c30";
      ctx.beginPath();
      t.points.forEach((p, j) =>
        j ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y),
      );
      ctx.stroke();
    });
    ctx.restore();
  });
  return canvas.toDataURL("image/png");
}
