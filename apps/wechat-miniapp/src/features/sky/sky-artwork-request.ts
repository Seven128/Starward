import { matchesSkyImageBytes } from "../../services/sky-image-bytes";
import type { DeepSkyImageRequestOptions,DeepSkyImageWriteOptions } from "./deep-sky-image-request";
import type { LoadedSkyArtwork, SkyArtworkFileCache } from "./sky-artwork-loader";
import { registerSkyNativeImageLifetime } from "./sky-artwork-loader";
import type { SkyPublicImageAcquisition, SkyPublicImageLease } from "../../services/sky-public-image-cache";
export interface SkyArtworkImage { src:string;onload:(()=>void)|null;onerror:(()=>void)|null;width?:number;height?:number; }
export interface SkyArtworkCanvas { createImage():SkyArtworkImage; }

export { skyJpegDimensions } from "../../services/sky-image-bytes";

/** Request identity is bound by the same-origin publication/hash URL. Validate
 * response length, encoded dimensions and the actual byte digest before writing
 * or native decode. Server validation alone cannot verify the client's payload. */
type SkyArtworkRequestInput = {
  asset:{bytes:number;width:number;height:number;sha256:string};url:string;canvas:SkyArtworkCanvas;
  format?:"png"|"jpeg";
  ready(image:LoadedSkyArtwork):void;fail():void;
} & ({
  acquire:()=>SkyPublicImageAcquisition;
} | {
  filePath:string;
  request(options:DeepSkyImageRequestOptions):{abort?:()=>void;catch?:(handler:(error:unknown)=>unknown)=>unknown};
  writeFile(options:DeepSkyImageWriteOptions):void;
  removeFile(path:string):void;
});
export function startSkyArtworkRequest(input:SkyArtworkRequestInput):()=>void {
  let active=true,written=false,image:SkyArtworkImage|null=null,released=false,decodeId=0;
  let lease:SkyPublicImageLease|undefined,decodePath="filePath" in input?input.filePath:"",unsubscribe:(()=>void)|undefined;
  let pendingDecodeFail:(()=>void)|undefined;
  const retirementHandlers=new Set<()=>void>(),bitmapRetirements=new Set<()=>void>();
  const detach=()=>{pendingDecodeFail=undefined;if(image){image.onload=null;image.onerror=null;image=null;}};
  const remove=()=>{
    if(lease){lease.release();lease=undefined;}
    if(written&&"removeFile" in input){written=false;try{input.removeFile(input.filePath);}catch{/* Cache cleanup cannot restore a stale image. */}}
  };
  const release=()=>{if(released)return;released=true;decodeId++;unsubscribe?.();unsubscribe=undefined;detach();
    for(const retireBitmap of bitmapRetirements)retireBitmap();bitmapRetirements.clear();retirementHandlers.clear();remove();};
  const fail=()=>{if(!active)return;active=false;release();input.fail();};
  const isCurrent=()=>!released&&(!lease||lease.isCurrent());
  const retire=()=>{
    const failed=pendingDecodeFail,handlers=[...retirementHandlers];release();failed?.();
    if(active)fail();
    for(const handler of handlers)handler();
  };
  if (!/^[a-f0-9]{64}$/.test(input.asset.sha256)) { fail(); return () => {}; }
  const onRetire=(handler:()=>void)=>{
    if(!isCurrent()){handler();return()=>{};}
    retirementHandlers.add(handler);return()=>{retirementHandlers.delete(handler);};
  };
  const file:SkyArtworkFileCache={release,isCurrent,onRetire,decode(ready,failed){
    if(!isCurrent()){failed();return()=>{};}
    detach();const id=++decodeId;
    const current=()=>!released&&decodeId===id;
    const decodeFailed=()=>{if(!current())return;detach();decodeId++;failed();};
    pendingDecodeFail=failed;
    try{
      image=input.canvas.createImage();
      image.onload=()=>{
        if(!current())return;
        if(lease && !lease.isCurrent()){decodeFailed();return;}
        if(image?.width!==input.asset.width||image.height!==input.asset.height){decodeFailed();return;}
        const decoded=image;detach();
        const retireBitmap=registerSkyNativeImageLifetime(decoded,()=>current()&&isCurrent());
        bitmapRetirements.add(retireBitmap);
        ready({image:decoded,
          // A suspended/superseded handle cannot delete a file now used by a
          // newer decode. The cache lease retains the unconditional release.
          release(){if(current())release();},
          isCurrent:()=>current()&&isCurrent(),onRetire,
          retainFile(){
            if(!current()||!isCurrent())throw new Error('sky_image_file_lease_retired');
            retireBitmap();bitmapRetirements.delete(retireBitmap);
            decodeId++;return file;
          }});
      };
      image.onerror=decodeFailed;
      if(current())image.src=decodePath;
    }catch{decodeFailed();}
    return()=>{if(current()){decodeId++;detach();}};
  }};
  if("acquire" in input){
    let acquisition:SkyPublicImageAcquisition|undefined;
    try{
      acquisition=input.acquire();
      void acquisition.promise.then(value=>{
        if(!active){value.release();return;}
        lease=value;decodePath=value.filePath;
        const unbind=value.onRetire(retire);
        if(released){unbind();return;}unsubscribe=unbind;
        file.decode(loaded=>{
          if(!active){loaded.release();return;}
          active=false;input.ready(loaded);
        },fail);
      },fail);
    }catch{fail();}
    return()=>{
      if(!active)return;active=false;
      try{acquisition?.cancel();}
      catch{/* An external cancel failure cannot retain a decode or stop Canvas disposal. */}
      finally{release();}
    };
  }
  let task:ReturnType<typeof input.request>|undefined;
  try { task=input.request({url:input.url,responseType:'arraybuffer',fail,success(response){
    if(!active)return;
    if(response.statusCode!==200 || !(response.data instanceof ArrayBuffer) || response.data.byteLength!==input.asset.bytes || response.data.byteLength<24){fail();return;}
    if(!matchesSkyImageBytes(response.data,{...input.asset,format:input.format??"png"})){fail();return;}
    try { input.writeFile({filePath:input.filePath,data:response.data,
      fail(){written=true;remove();fail();},success(){
      written=true;
      if(!active){remove();return;}
      file.decode(loaded=>{
        if(!active){loaded.release();return;}
        active=false;input.ready(loaded);
      },fail);
    }}); } catch { written=true;remove();fail(); }
  }}); } catch { fail(); }
  task?.catch?.(()=>undefined);
  return()=>{if(!active)return;active=false;try{task?.abort?.();}
    catch{/* An external abort failure cannot retain a decoded graph or file. */}finally{release();}};
}
