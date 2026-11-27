import {quizRequest} from './quizApi';
export async function readQuizPassage(file: File, request = quizRequest): Promise<string> {
  if (file.size > 10 * 1024 * 1024) throw Error('課文檔案最多10MB。');
  let content: string;
  if (/\.(docx?|xlsx?)$/i.test(file.name)) {
    const bytes=new Uint8Array(await file.arrayBuffer());let binary='';for(let i=0;i<bytes.length;i+=32768)binary+=String.fromCharCode(...bytes.subarray(i,i+32768));
    const result=await request<{content:string}>('/extract-passage',{filename:file.name,base64:btoa(binary)});content=result.content;
  } else if (/\.pdf$/i.test(file.name)) {
    const pdfjs = await import('pdfjs-dist');
    pdfjs.GlobalWorkerOptions.workerSrc = new URL('../node_modules/pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).href;
    const task = pdfjs.getDocument({data: new Uint8Array(await file.arrayBuffer())});
    const pdf = await task.promise;
    try {
      if (pdf.numPages > 30) throw Error('每次最多30頁，請只上傳本課課文。');
      const pages: string[] = [];
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const text = await page.getTextContent();
        pages.push(text.items.map(item => 'str' in item ? item.str + (item.hasEOL ? '\n' : ' ') : '').join(''));
      }
      content = pages.join('\n\n');
    } finally { await task.destroy(); }
  } else if (/\.(txt|md)$/i.test(file.name)) content = await file.text();
  else throw Error('請上傳DOCX、DOC、XLSX、XLS、UTF-8文字檔（TXT、MD）或含可選取文字的PDF。');
  content = content.replace(/\r\n/g,'\n').trim();
  if (!content) throw Error('沒有讀到文字；掃描PDF請先辨識文字後貼上。');
  if (content.length > 12000) throw Error('課文超過12000字，請分課上傳。');
  return content;
}
