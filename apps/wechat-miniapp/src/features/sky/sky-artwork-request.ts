import type { ConstellationArtwork } from "@starward/miniapp-contracts";
import type { DeepSkyImageRequestOptions,DeepSkyImageWriteOptions } from "./deep-sky-image-request";
import type { LoadedSkyArtwork } from "./sky-artwork-loader";
export interface SkyArtworkImage { src:string;onload:(()=>void)|null;onerror:(()=>void)|null;width?:number;height?:number; }
export interface SkyArtworkCanvas { createImage():SkyArtworkImage; }

/** Request identity is bound by the same-origin publication/hash URL. Validate
 * response length and PNG dimensions before native decode; server verifies SHA. */
export function startSkyArtworkRequest(input:{
  asset:ConstellationArtwork;url:string;filePath:string;canvas:SkyArtworkCanvas;
  request(options:DeepSkyImageRequestOptions):{abort?:()=>void;catch?:(handler:(error:unknown)=>unknown)=>unknown};
  writeFile(options:DeepSkyImageWriteOptions):void;
  removeFile(path:string):void;
  ready(image:LoadedSkyArtwork):void;fail():void;
}):()=>void {
  let active=true,written=false,image:SkyArtworkImage|null=null,released=false;
  const detach=()=>{if(image){image.onload=null;image.onerror=null;}};
  const remove=()=>{if(written){written=false;try{input.removeFile(input.filePath);}catch{/* Cache cleanup cannot restore a stale image. */}}};
  const release=()=>{if(released)return;released=true;detach();remove();image=null;};
  const fail=()=>{if(!active)return;active=false;release();input.fail();};
  const task=input.request({url:input.url,responseType:'arraybuffer',fail,success(response){
    if(!active)return;
    if(response.statusCode!==200 || !(response.data instanceof ArrayBuffer) || response.data.byteLength!==input.asset.bytes || response.data.byteLength<24){fail();return;}
    const bytes=new Uint8Array(response.data),header=new DataView(response.data);
    if(![137,80,78,71,13,10,26,10].every((v,i)=>bytes[i]===v) ||
      header.getUint32(12)!==0x49484452 || header.getUint32(16)!==input.asset.width || header.getUint32(20)!==input.asset.height){fail();return;}
    try { input.writeFile({filePath:input.filePath,data:response.data,fail,success(){
      written=true;
      if(!active){remove();return;}
      try {
        image=input.canvas.createImage();
        image.onload=()=>{
          if(!active){release();return;}
          if(image?.width!==input.asset.width || image.height!==input.asset.height){fail();return;}
          active=false;detach();input.ready({image,release});
        };
        image.onerror=fail;image.src=input.filePath;
      }catch{fail();}
    }}); } catch { fail(); }
  }});
  task.catch?.(()=>undefined);
  return()=>{if(!active)return;active=false;try{task.abort?.();}finally{release();}};
}
