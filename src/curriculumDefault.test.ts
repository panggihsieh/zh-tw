import { describe, expect, it, vi, beforeEach } from "vitest";
const mocks = vi.hoisted(() => ({ getDoc: vi.fn(), setDoc: vi.fn(), isAdmin: vi.fn() }));
vi.mock("firebase/firestore", () => ({ doc: vi.fn(() => "curriculum"), getDoc: mocks.getDoc, setDoc: mocks.setDoc }));
vi.mock("./cloudSync", () => ({ cloudConfigured: true, cloudServices: () => ({ db: {}, auth: { currentUser: {} } }) }));
vi.mock("./userAccess", () => ({ isAdmin: mocks.isAdmin }));
import { loadCurriculumDefault, saveCurriculumDefault, parseCurriculumDefault } from "./curriculumDefault";
const preset = { publisher: "南一", grade: 5, term: "上", lesson: "第五課：漫遊花東" };
beforeEach(() => vi.resetAllMocks());
describe("老師指定的學生預設課別", () => {
  it("未設定時不指定課別，設定後可從雲端讀取", async () => {
    mocks.getDoc.mockResolvedValueOnce({ exists: () => false });
    expect(await loadCurriculumDefault()).toBeNull();
    mocks.getDoc.mockResolvedValueOnce({ exists: () => true, data: () => preset });
    expect(await loadCurriculumDefault()).toEqual(preset);
  });
  it("拒絕不合法課別", () => {
    for (const invalid of [null, { ...preset, grade: 7 }, { ...preset, term: "暑假" }, { ...preset, lesson: "" }])
      expect(() => parseCurriculumDefault(invalid)).toThrow();
  });
  it("僅管理者可以儲存，且只寫入課別欄位", async () => {
    mocks.isAdmin.mockReturnValue(false);
    await expect(saveCurriculumDefault(preset)).rejects.toThrow("僅管理者");
    expect(mocks.setDoc).not.toHaveBeenCalled();
    mocks.isAdmin.mockReturnValue(true);
    await saveCurriculumDefault({ ...preset, selected: ["字"] } as typeof preset);
    expect(mocks.setDoc).toHaveBeenCalledWith("curriculum", preset);
  });
});
