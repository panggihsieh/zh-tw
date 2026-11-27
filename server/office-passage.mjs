import mammoth from 'mammoth';
import WordExtractor from 'word-extractor';
import * as XLSX from 'xlsx';
const MAX=10*1024*1024;
const OLE=Buffer.from('d0cf11e0a1b11ae1','hex');
function checkZip(bytes,required){
 let end=-1;for(let i=bytes.length-22;i>=Math.max(0,bytes.length-65557);i--)if(bytes.readUInt32LE(i)===0x06054b50){end=i;break;}
 if(end<0)throw Error('Office壓縮檔格式不完整。');
 const count=bytes.readUInt16LE(end+10);let at=bytes.readUInt32LE(end+16),total=0,found=false;
 if(count>2000||count===65535)throw Error('Office檔內容過多，請拆成較小檔案。');
 for(let i=0;i<count;i++){if(at+46>bytes.length||bytes.readUInt32LE(at)!==0x02014b50)throw Error('Office壓縮檔目錄損壞。');
  if(bytes.readUInt16LE(at+8)&1)throw Error('請先移除檔案密碼再上傳。');
  total+=bytes.readUInt32LE(at+24);if(total>40*1024*1024)throw Error('Office解壓縮內容超過40MB，請拆分檔案。');
  const n=bytes.readUInt16LE(at+28),extra=bytes.readUInt16LE(at+30),comment=bytes.readUInt16LE(at+32);if(at+46+n+extra+comment>bytes.length)throw Error('Office壓縮檔目錄損壞。');
  if(bytes.subarray(at+46,at+46+n).toString('utf8')===required)found=true;at+=46+n+extra+comment;
 }
 if(!found)throw Error('檔案內容與副檔名不符，請另存正確格式再上傳。');
}
export async function extractOfficePassage(input){
 if(!input||typeof input.filename!=='string'||input.filename.length>200||!(/\.(docx?|xlsx?)$/i.test(input.filename))||typeof input.base64!=='string'||input.base64.length>Math.ceil(MAX/3)*4||!(/^[A-Za-z0-9+/]+={0,2}$/.test(input.base64)))throw Error('請上傳10MB內的DOC、DOCX、XLS或XLSX檔。');
 const bytes=Buffer.from(input.base64,'base64');if(!bytes.length||bytes.length>MAX)throw Error('文章檔案最多10MB。');
 const ext=input.filename.split('.').at(-1).toLowerCase();let content='';
 if(ext==='docx'||ext==='xlsx')checkZip(bytes,ext==='docx'?'word/document.xml':'xl/workbook.xml');
 else if(!bytes.subarray(0,8).equals(OLE))throw Error('檔案內容與副檔名不符，請另存正確格式再上傳。');
 try{
  if(ext==='docx')content=(await mammoth.extractRawText({buffer:bytes},{externalFileAccess:false})).value;
  else if(ext==='doc')content=(await new WordExtractor().extract(bytes)).getBody();
  else{
   const book=XLSX.read(bytes,{type:'buffer',cellFormula:true,cellHTML:false,cellText:true,sheetRows:1001});
   if(book.SheetNames.length>20)throw Error('試算表最多20張工作表，請分檔上傳。');
   const parts=[];for(const [index,name]of book.SheetNames.entries()){
    if(book.Workbook?.Sheets?.[index]?.Hidden)continue;
    const sheet=book.Sheets[name];if(!sheet['!ref'])continue;const range=XLSX.utils.decode_range(sheet['!fullref']||sheet['!ref']);
    if(range.e.r>=1000||range.e.c>=100)throw Error('每張工作表最多1000列、100欄，請先整理文章範圍。');
    for(const [key,cell]of Object.entries(sheet))if(!key.startsWith('!')&&cell.f&&cell.v==null)throw Error('公式尚無已儲存結果，請用試算表重新計算儲存後再上傳。');
    const rows=XLSX.utils.sheet_to_json(sheet,{header:1,raw:false,blankrows:false,defval:''}).map(row=>row.join('\t').trimEnd()).filter(row=>row.trim());
    if(rows.length)parts.push(`【工作表：${name}】\n${rows.join('\n')}`);
   }content=parts.join('\n\n');
  }
 }catch(error){if(/最多|公式|每張/.test(error.message))throw error;throw Error('無法讀取Office檔，請確認未加密且檔案完整，或另存為DOCX／XLSX後重試。');}
 content=content.replace(/\r\n?/g,'\n').trim();if(!content)throw Error('沒有讀到文字；圖片或掃描內容請先辨識文字後貼上。');if(content.length>12000)throw Error('文章超過12000字，請拆分後上傳。');
 return {content};
}
