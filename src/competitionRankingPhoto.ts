type Renderer=(node:HTMLElement,options:Record<string,unknown>)=>Promise<HTMLCanvasElement>;
let rendererPromise:Promise<Renderer>|null=null;
async function bounded<T>(promise:Promise<T>,milliseconds:number):Promise<T>{
 let timer:ReturnType<typeof setTimeout>|undefined;
 try{return await Promise.race([promise,new Promise<never>((_,reject)=>{timer=setTimeout(()=>reject(Error('排名拍照處理逾時，請重試。')),milliseconds);})]);}finally{clearTimeout(timer);}
}
function renderer():Promise<Renderer>{
 const host=window as Window&{html2canvas?:Renderer};
 if(host.html2canvas)return Promise.resolve(host.html2canvas);
 return rendererPromise??=new Promise((resolve,reject)=>{
  const script=document.createElement('script');script.src=`${import.meta.env.BASE_URL}html2canvas.min.js`;
  script.onload=()=>{if(host.html2canvas)resolve(host.html2canvas);else{rendererPromise=null;reject(Error('拍照元件載入失敗。'));}};
  script.onerror=()=>{script.remove();rendererPromise=null;reject(Error('拍照元件載入失敗，請重試。'));};document.head.append(script);
 });
}
export async function captureCompetitionRanking(node:HTMLElement,maxBytes=900_000){
 await new Promise<void>((resolve,reject)=>{const deadline=Date.now()+35000;const check=()=>{if(!node.querySelector('[data-avatar-pending="true"]'))resolve();else if(Date.now()>deadline)reject(Error('公仔原圖載入逾時，請重試。'));else setTimeout(check,100);};check();});
 if(node.querySelector('[data-avatar-error="true"]'))throw Error('公仔原圖載入失敗，請先重試再匯出。');
 await bounded(document.fonts.ready,10000);
 await bounded(Promise.all([...node.querySelectorAll('img')].map(image=>image.decode())),10000);
 const render=await bounded(renderer(),15000),rect=node.getBoundingClientRect();
 const maxPixels=1_000_000;
 const scale=Math.min(2,Math.sqrt(maxPixels/(rect.width*rect.height)),2400/Math.max(rect.width,rect.height));
 const canvas=await bounded(render(node,{backgroundColor:'#fffff5',scale,logging:false,imageTimeout:10000}),20000);
 // Match the server's data URL limit, including the Base64 overhead.
 const output=document.createElement('canvas');
 const context=output.getContext('2d');
 if(!context)throw Error('無法處理排名圖片。');
 for(let size=1;size>=.12;size*=.75){
  output.width=Math.max(1,Math.floor(canvas.width*size));
  output.height=Math.max(1,Math.floor(canvas.height*size));
  context.drawImage(canvas,0,0,output.width,output.height);
  for(const quality of [.85,.7,.55,.4]){
   const image=output.toDataURL('image/jpeg',quality);
   if(!image.startsWith('data:image/jpeg;base64,'))continue;
   const base64=image.slice('data:image/jpeg;base64,'.length);
   const bytes=base64.length*3/4-(base64.endsWith('==')?2:base64.endsWith('=')?1:0);
   if(bytes<=maxBytes&&image.length<=1_200_000)return image;
  }
 }
 throw Error('排名照片無法縮到選定大小，請選較高的容量上限。');
}
