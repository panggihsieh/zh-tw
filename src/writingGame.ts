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
  sourceRevision: string;
  uid?: string;
  email?: string;
  displayName?: string;
  submittedAt?: string;
  grade?: { score: number; comment: string; gradedAt: string };
}
export function length(points: Point[]) {
  return points
    .slice(1)
    .reduce(
      (n, p, i) => n + Math.hypot(p.x - points[i].x, p.y - points[i].y),
      0,
    );
}
export function sample(points: Point[], count = 32): Point[] {
  if (!points.length) return [];
  const total = length(points);
  if (total === 0)
    return Array.from({ length: count }, () => ({ ...points[0] }));
  const distances = [0];
  for (let i = 1; i < points.length; i++)
    distances.push(
      distances[i - 1] +
        Math.hypot(
          points[i].x - points[i - 1].x,
          points[i].y - points[i - 1].y,
        ),
    );
  let j = 1;
  return Array.from({ length: count }, (_, i) => {
    const at = (i * total) / (count - 1);
    while (j < points.length - 1 && distances[j] < at) j++;
    const a = points[j - 1],
      b = points[j],
      t = (at - distances[j - 1]) / (distances[j] - distances[j - 1] || 1);
    return {
      x: Math.round(a.x + (b.x - a.x) * t),
      y: Math.round(a.y + (b.y - a.y) * t),
    };
  });
}
// Coordinates are normalized to 1000; compare ordered points, endpoints and length.
// This is a teaching aid with tolerance, not handwriting aesthetics grading.
export function judgeStroke(input: Point[], reference: Point[]) {
  if (input.length < 2 || reference.length < 2 || length(input) < 8)
    return false;
  const a = sample(input),
    b = sample(reference),
    distance = (p: Point, q: Point) => Math.hypot(p.x - q.x, p.y - q.y);
  const ratio = length(input) / length(reference);
  return (
    ratio >= 0.45 &&
    ratio <= 1.9 &&
    distance(a[0], b[0]) <= 115 &&
    distance(a[31], b[31]) <= 115 &&
    a.reduce((n, p, i) => n + distance(p, b[i]), 0) / 32 <= 85
  );
}
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
