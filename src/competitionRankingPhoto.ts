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
export async function captureCompetitionRanking(node:HTMLElement){
 await bounded(document.fonts.ready,10000);
 await bounded(Promise.all([...node.querySelectorAll('img')].map(image=>image.decode())),10000);
 const render=await bounded(renderer(),15000),rect=node.getBoundingClientRect();
 const canvas=await bounded(render(node,{backgroundColor:'#fffff5',scale:Math.min(2,2400/Math.max(rect.width,rect.height)),logging:false,imageTimeout:10000}),20000);
 const image=canvas.toDataURL('image/jpeg',.85);
 if(image.length>1200000)throw Error('排名照片過大，請縮小畫面後重試。');
 return image;
}
