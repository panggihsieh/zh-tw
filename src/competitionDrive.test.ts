import { describe, expect, it, vi, afterEach } from 'vitest';
import { uploadCompetitionPdf } from './drive';
afterEach(()=>vi.unstubAllGlobals());
describe('競賽 PDF 上傳',()=>{
 it('使用專用資料夾、只上傳 PDF，token 僅在 Google 請求標頭',async()=>{
  const calls:{url:string;options:RequestInit}[]=[];
  vi.stubGlobal('fetch',vi.fn(async(url:string,options:RequestInit)=>{
   calls.push({url,options});
   return {ok:true,json:async()=> url.includes('uploadType')?{id:'pdf-id'}:{files:[{id:calls.length===1?'root':'competition'}]}};
  }));
  expect(await uploadCompetitionPdf('test-token','測試.pdf',new Blob(['%PDF-1.3'],{type:'application/pdf'}))).toBe('https://drive.google.com/file/d/pdf-id/view');
  expect(calls).toHaveLength(3);
  expect(decodeURIComponent(calls[1].url)).toContain("'root' in parents");
  const payload=await (calls[2].options.body as Blob).text();
  expect(payload).toContain('"parents":["competition"]');expect(payload).toContain('測試.pdf');expect(payload).not.toContain('test-token');
 });
 it('拒絕失敗回應，不假裝成功',async()=>{
  vi.stubGlobal('fetch',vi.fn(async()=>({ok:false,status:403})));
  await expect(uploadCompetitionPdf('test','x.pdf',new Blob())).rejects.toThrow('403');
 });
});
