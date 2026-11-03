import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
const mocks = vi.hoisted(() => ({ admin: vi.fn(), tx: {get:vi.fn(),set:vi.fn()} }));
vi.mock("./cloudSync", () => ({cloudConfigured:true, cloudServices:()=>({auth:{currentUser:{}},db:{}})}));
vi.mock("./userAccess", () => ({isAdmin:mocks.admin}));
vi.mock("firebase/firestore", () => ({doc:(_db:unknown,c:string,id:string)=>`${c}/${id}`,collection:vi.fn(),onSnapshot:vi.fn(),runTransaction:(_db:unknown,fn:(tx:unknown)=>unknown)=>fn(mocks.tx)}));
import { builtInThemes, parseSiteTheme, themeVariables, saveSiteTheme } from "./siteThemes";
import SiteThemeLibrary from "./SiteThemeLibrary";
beforeEach(()=> {vi.clearAllMocks();mocks.tx.get.mockResolvedValue({exists:()=>false});});
describe("網站樣式資料庫",()=>{
 it("內建樣式皆有效，轉成有限的 CSS 變數",()=>{
  for(const t of builtInThemes){expect(parseSiteTheme(t)).toEqual(t);expect(Object.keys(themeVariables(t))).toHaveLength(8);}
 });
 it("拒絕非法色碼、任意 CSS、非法 ID 與超出範圍圓角",()=>{
  const t=builtInThemes[0];
  for(const value of [{...t,id:'../x'},{...t,radius:100},{...t,name:''},{...t,colors:{...t.colors,primary:'url(https://example.com)'}}])
    expect(()=>parseSiteTheme(value)).toThrow();
 });
 it("一般帳號不能儲存或套用",async()=>{
  mocks.admin.mockReturnValue(false);
  await expect(saveSiteTheme(builtInThemes[0],true)).rejects.toThrow('僅管理者');
  expect(mocks.tx.set).not.toHaveBeenCalled();
 });
 it("儲存草稿不變更現有主題，套用時原子更新全站設定",async()=>{
  mocks.admin.mockReturnValue(true);
  await saveSiteTheme(builtInThemes[0]);expect(mocks.tx.set).toHaveBeenCalledTimes(1);
  mocks.tx.set.mockClear();
  await saveSiteTheme(builtInThemes[0],true);expect(mocks.tx.set).toHaveBeenCalledTimes(2);
  expect(mocks.tx.set).toHaveBeenCalledWith('hanzi_notebook_settings/websiteTheme',builtInThemes[0]);
 });
 it("修改目前套用的樣式時，同步更新全站設定",async()=>{
  mocks.admin.mockReturnValue(true);
  mocks.tx.get.mockResolvedValue({exists:()=>true,data:()=>({id:builtInThemes[0].id})});
  await saveSiteTheme({...builtInThemes[0],name:'更新樣式'});
  expect(mocks.tx.set).toHaveBeenCalledTimes(2);
 });
 it("後台提供樣式列表、配色編輯、即時預覽與套用按鈕",()=>{
  const html=renderToStaticMarkup(<SiteThemeLibrary active={builtInThemes[0]}/>);
  for(const text of ['森林冒險','清新閱讀','新增樣式','樣式即時預覽','套用全站'])expect(html).toContain(text);
 });
});
