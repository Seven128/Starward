import type { DeepSkyImageRequestOptions,DeepSkyImageWriteOptions } from "./deep-sky-image-request";
import type { LoadedSkyArtwork } from "./sky-artwork-loader";
export interface SkyArtworkImage { src:string;onload:(()=>void)|null;onerror:(()=>void)|null;width?:number;height?:number; }
export interface SkyArtworkCanvas { createImage():SkyArtworkImage; }

/** JPEG frame dimensions are in a Start-of-Frame segment, not a fixed header.
 * Stop at Start-of-Scan and bound metadata scanning before native decode. */
export function skyJpegDimensions(bytes:Uint8Array):{width:number;height:number}|null {
  if(bytes.length<12 || bytes[0]!==0xff || bytes[1]!==0xd8 ||
    bytes[bytes.length-2]!==0xff || bytes[bytes.length-1]!==0xd9)return null;
  let offset=2;
  while(offset+4<=Math.min(bytes.length,64*1024)){
    if(bytes[offset++]!==0xff)return null;
    while(bytes[offset]===0xff)offset++;
    const marker=bytes[offset++];
    if(marker===undefined || marker===0xda || marker===0xd9)return null;
    if(marker===0x01 || (marker>=0xd0 && marker<=0xd7))continue;
    if(offset+2>bytes.length)return null;
    const length=(bytes[offset]!<<8)|bytes[offset+1]!;
    if(length<2 || offset+length>bytes.length)return null;
    if((marker>=0xc0&&marker<=0xc3)||(marker>=0xc5&&marker<=0xc7)||
      (marker>=0xc9&&marker<=0xcb)||(marker>=0xcd&&marker<=0xcf)){
      if(length<8 || bytes[offset+2]!==8)return null;
      const height=(bytes[offset+3]!<<8)|bytes[offset+4]!;
      const width=(bytes[offset+5]!<<8)|bytes[offset+6]!;
      return width>0&&height>0?{width,height}:null;
    }
    offset+=length;
  }
  return null;
}

/** Request identity is bound by the same-origin publication/hash URL. Validate
 * response length and encoded dimensions before native decode; server verifies SHA. */
export function startSkyArtworkRequest(input:{
  asset:{bytes:number;width:number;height:number};url:string;filePath:string;canvas:SkyArtworkCanvas;
  format?:"png"|"jpeg";
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
  let task:ReturnType<typeof input.request>|undefined;
  try { task=input.request({url:input.url,responseType:'arraybuffer',fail,success(response){
    if(!active)return;
    if(response.statusCode!==200 || !(response.data instanceof ArrayBuffer) || response.data.byteLength!==input.asset.bytes || response.data.byteLength<24){fail();return;}
    const bytes=new Uint8Array(response.data),header=new DataView(response.data);
    const dimensions=input.format==="jpeg"?skyJpegDimensions(bytes)
      : [137,80,78,71,13,10,26,10].every((v,i)=>bytes[i]===v) && header.getUint32(12)===0x49484452
        ? {width:header.getUint32(16),height:header.getUint32(20)}:null;
    if(dimensions?.width!==input.asset.width || dimensions.height!==input.asset.height){fail();return;}
    try { input.writeFile({filePath:input.filePath,data:response.data,
      fail(){written=true;remove();fail();},success(){
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
    }}); } catch { written=true;remove();fail(); }
  }}); } catch { fail(); }
  task?.catch?.(()=>undefined);
  return()=>{if(!active)return;active=false;try{task?.abort?.();}finally{release();}};
}
