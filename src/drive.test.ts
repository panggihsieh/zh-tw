import { describe, it, expect, vi, afterEach } from "vitest";
vi.mock("./exports", () => ({
  jsonBlob: () => new Blob(["{}"], { type: "application/json" }),
  pdfBlob: async () => new Blob(["test"], { type: "application/pdf" }),
  pngBlob: async () => new Blob(["test"], { type: "image/png" }),
}));
import { uploadCollection, authorize } from "./drive";
import { buildCollection } from "./data";
afterEach(() => vi.unstubAllGlobals());
describe("Google Drive 前端流程（模擬 API，不代表實際帳號授權驗收）", () => {
  it("未設定 OAuth 時不虛報已授權", async () => {
    vi.stubGlobal("window", {});
    await expect(authorize()).rejects.toThrow("尚未設定");
  });
  it("401 錯誤回報失敗，保留本機資料", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(JSON.stringify({ error: { message: "Unauthorized" } }), {
            status: 401,
          }),
      ),
    );
    await expect(
      uploadCollection("test-token", buildCollection("感謝", [0]), () => {}),
    ).rejects.toThrow("401");
  });
  it("網路失敗不回報成功", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("Network error");
      }),
    );
    await expect(
      uploadCollection("test-token", buildCollection("感謝", [0]), () => {}),
    ).rejects.toThrow("Network");
  });
  it("以應用程式標記找到資料夾，逐檔傳送並回傳 ID", async () => {
    let index = 0;
    const fetcher = vi.fn(async (url: string) =>
      url.includes("files?q=")
        ? new Response(JSON.stringify({ files: [{ id: "app-root" }] }))
        : new Response(JSON.stringify({ id: `file-${++index}` })),
    );
    vi.stubGlobal("fetch", fetcher);
    const progress = vi.fn();
    const result = await uploadCollection(
      "test-token",
      buildCollection("感謝", [0]),
      progress,
    );
    expect(result.folderId).toBe("file-1");
    expect(result.files).toHaveLength(3);
    expect(result.files.map((f) => f.name)).toEqual([
      "感謝_資料.json",
      "感謝_學習本.pdf",
      "感_1_學習卡.png",
    ]);
    const calls = fetcher.mock.calls;
    expect(calls[0][0]).toContain("appProperties");
    expect(progress).toHaveBeenCalled();
  });
  it("無專用資料夾時建立新的，非取用任意同名資料夾", async () => {
    const bodies: string[] = [];
    const fetcher = vi.fn(async (url: string, init?: RequestInit) => {
      if (url.includes("files?q="))
        return new Response(JSON.stringify({ files: [] }));
      if (typeof init?.body === "string") bodies.push(init.body);
      return new Response(JSON.stringify({ id: crypto.randomUUID() }));
    });
    vi.stubGlobal("fetch", fetcher);
    await uploadCollection(
      "test-token",
      buildCollection("感謝", [0]),
      () => {},
    );
    expect(JSON.parse(bodies[0]).appProperties.app).toBe("hanzi-notebook-v1");
    expect(JSON.parse(bodies[1]).parents).toHaveLength(1);
  });
  it("未回傳 fileId 視為失敗", async () => {
    let i = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) =>
        url.includes("files?q=")
          ? new Response(JSON.stringify({ files: [{ id: "root" }] }))
          : new Response(JSON.stringify(++i === 1 ? { id: "folder" } : {})),
      ),
    );
    await expect(
      uploadCollection("test-token", buildCollection("感謝", [0]), () => {}),
    ).rejects.toThrow("未回傳檔案 ID");
  });
});
