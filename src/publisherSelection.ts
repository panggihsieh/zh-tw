export interface PublisherResource {
  id: string;
  publisher: string;
  grade: number;
  term: string;
  year: string;
  title: string;
  url: string;
  kind: string;
  status: string;
  courseComparison?: string;
  lastError?: string;
  lastDraftError?: string;
  pendingURL?: boolean;
  draftId?: string;
  rawHash?: string;
}
export function academicYears(items: PublisherResource[]) {
  return [...new Set(items.map((item) => item.year))].sort((a, b) =>
    b.localeCompare(a),
  );
}
export const resourceBookKey = (
  r: Pick<PublisherResource, "grade" | "term" | "year">,
) => `${r.grade}|${r.term}|${r.year}`;
export function draftBooks(items: PublisherResource[]) {
  const books = new Map<
    string,
    { key: string; label: string; grade: number; term: string; year: string }
  >();
  for (const r of items.filter(
    (r) => r.publisher === "南一" && [5, 6].includes(r.grade),
  )) {
    const key = resourceBookKey(r);
    books.set(key, {
      key,
      grade: r.grade,
      term: r.term,
      year: r.year,
      label: `${r.grade === 5 ? "五" : "六"}年級${r.term}學期（${r.year.split("_")[0]} 學年度）`,
    });
  }
  return [...books.values()].sort(
    (a, b) =>
      a.grade - b.grade ||
      ["上", "下"].indexOf(a.term) - ["上", "下"].indexOf(b.term) ||
      b.year.localeCompare(a.year),
  );
}
export function bookResources(items: PublisherResource[], key: string) {
  return items
    .filter(
      (r) =>
        r.publisher === "南一" &&
        [5, 6].includes(r.grade) &&
        resourceBookKey(r) === key,
    )
    .sort(
      (a, b) =>
        a.title.localeCompare(b.title, "zh-TW", { numeric: true }) ||
        a.id.localeCompare(b.id),
    );
}
export function canCreateDraft(r: PublisherResource) {
  return !!r.rawHash && !r.draftId && !r.pendingURL && !r.lastError;
}
export function resourceDraftStatus(r: PublisherResource) {
  if (r.draftId) return "已有草稿，可另開視窗查核";
  if (r.pendingURL || r.lastError) return "最新來源尚未取得，請先下載／比對";
  if (!r.rawHash) return "尚未下載教材";
  return r.lastDraftError ? "上次製作待確認，可重新建立" : "可建立待審草稿";
}
export function draftReviewUrl(id: string) {
  return `/?view=backend&section=quiz&paper=${encodeURIComponent(id)}`;
}
export function reviewPaperId(search: string) {
  const id = new URLSearchParams(search).get("paper");
  return id &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
    ? id
    : null;
}
