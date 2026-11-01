export interface InkBox { x: number; y: number; width: number; height: number }
export function fitInk(source: InkBox, target: InkBox) {
  if (source.width <= 0 || source.height <= 0 || target.width <= 0 || target.height <= 0) return null;
  const sx = target.width / source.width, sy = target.height / source.height;
  return `matrix(${sx} 0 0 ${sy} ${target.x - source.x * sx} ${target.y - source.y * sy})`;
}
export function relativeInkBox(full: InkBox, box: number[]): InkBox {
  return { x: full.x + full.width * box[0], y: full.y + full.height * box[1], width: full.width * box[2], height: full.height * box[3] };
}
