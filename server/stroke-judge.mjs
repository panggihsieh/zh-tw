export function length(points) {
  return points
    .slice(1)
    .reduce(
      (n, p, i) => n + Math.hypot(p.x - points[i].x, p.y - points[i].y),
      0,
    );
}
export function sample(points, count = 32) {
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
export function judgeStroke(input, reference) {
  if (input.length < 2 || reference.length < 2 || length(input) < 8)
    return false;
  const a = sample(input),
    b = sample(reference),
    distance = (p, q) => Math.hypot(p.x - q.x, p.y - q.y);
  const ratio = length(input) / length(reference);
  return (
    ratio >= 0.45 &&
    ratio <= 1.9 &&
    distance(a[0], b[0]) <= 115 &&
    distance(a[31], b[31]) <= 115 &&
    a.reduce((n, p, i) => n + distance(p, b[i]), 0) / 32 <= 85
  );
}
