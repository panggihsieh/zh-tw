import { describe, it, expect } from "vitest";
import {
  bookResources,
  draftBooks,
  resourceBookKey,
  canCreateDraft,
  draftReviewUrl,
  reviewPaperId,
  academicYears,
  type PublisherResource,
} from "./publisherSelection";
const resource = (
  id: string,
  grade = 5,
  term = "上",
  year = "115_1",
  patch: Partial<PublisherResource> = {},
): PublisherResource => ({
  id,
  publisher: "南一",
  grade,
  term,
  year,
  title: `第${id}課`,
  url: "https://example.test/resource.pdf",
  kind: "assessment",
  status: "downloaded",
  rawHash: "abc",
  ...patch,
});
describe("指定冊別與課別製作母題", () => {
  it("同課號在不同年級、學期、年版與出版社互不混用", () => {
    const rows = [
      resource("1"),
      resource("2"),
      resource("3", 5, "下", "114_2"),
      resource("4", 6),
      resource("5", 5, "上", "114_1"),
      resource("6", 5, "上", "115_1", { publisher: "康軒" }),
      resource("7", 4),
    ];
    const key = resourceBookKey(rows[0]);
    expect(bookResources(rows, key).map((x) => x.id)).toEqual(["1", "2"]);
    expect(draftBooks(rows).map((x) => x.key)).toEqual([
      "5|上|115_1",
      "5|上|114_1",
      "5|下|114_2",
      "6|上|115_1",
    ]);
  });
  it("課別依數字排序，選定單課只製作該課，已有草稿與未取得最新版不得重製", () => {
    const rows = [
      resource("10"),
      resource("2"),
      resource("1"),
      resource("3", 5, "上", "115_1", { draftId: "existing" }),
      resource("4", 5, "上", "115_1", { pendingURL: true }),
      resource("5", 5, "上", "115_1", { lastError: "下載失敗" }),
      resource("6", 5, "上", "115_1", { rawHash: undefined }),
      resource("7", 5, "上", "115_1", { lastDraftError: "上次AI未通過" }),
    ];
    const selected = bookResources(rows, resourceBookKey(rows[0]));
    expect(selected.map((x) => x.id)).toEqual([
      "1",
      "2",
      "3",
      "4",
      "5",
      "6",
      "7",
      "10",
    ]);
    expect(
      selected
        .filter((x) => x.id === "2")
        .filter(canCreateDraft)
        .map((x) => x.id),
    ).toEqual(["2"]);
    expect(selected.filter(canCreateDraft).map((x) => x.id)).toEqual([
      "1",
      "2",
      "7",
      "10",
    ]);
  });
  it("新視窗連結直達教師該份草稿，拒絕無效草稿識別碼", () => {
    const id = "12345678-1234-1234-1234-123456789012",
      url = draftReviewUrl(id);
    expect(url).toContain("view=backend&section=quiz");
    expect(reviewPaperId(url.slice(url.indexOf("?")))).toBe(id);
    expect(reviewPaperId("?paper=../other")).toBeNull();
    expect(draftReviewUrl("x&view=quiz")).toContain("paper=x%26view%3Dquiz");
  });
  it("沒有來源時保持空清單，不虛構課次", () => {
    expect(draftBooks([])).toEqual([]);
    expect(bookResources([], "5|上|115_1")).toEqual([]);
  });
  it("學年度由新到舊且不重複", () => {
    expect(
      academicYears([
        resource("1", 5, "上", "115_1"),
        resource("2", 6, "上", "115_1"),
        resource("3", 5, "下", "114_2"),
      ]),
    ).toEqual(["115_1", "114_2"]);
  });
});
