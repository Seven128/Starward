import { useCallback, useEffect, useRef, useState } from "react";
import Taro from "@tarojs/taro";
import type { ConstellationArtwork } from "@starward/miniapp-contracts";
import { constellationAssetUrl } from "@/services/api-client";
import { skyImageFileSession } from "../../services/sky-image-file-session";
import { acquirePublishedSkyImage } from "../../services/sky-public-image-runtime";
import { createSkyArtworkLoader, type SkyArtworkLoadState, type SkyNativeImageAsset } from "./sky-artwork-loader";
import { startSkyArtworkRequest, type SkyArtworkCanvas } from "./sky-artwork-request";

const EMPTY:SkyArtworkLoadState={images:new Map(),retainedImages:new Map(),loading:false,failed:false};
/** Approved immutable publications use the public cache. The existing LOCAL
 * optical fixture explicitly keeps session storage until it is adopted. */
type SkyNativeImageSource = {url:string;format:"png"|"jpeg";storage?:"public"} |
  {url:string;format:"png"|"jpeg";storage:"session"};

/** Decoded images belong to exactly one live native canvas and publication.
 * Pose updates only change the wanted set; hide/replacement cancels its owner. */
export function useSkyNativeImages<Asset extends SkyNativeImageAsset & {bytes:number}>(
  canvas:SkyArtworkCanvas|null,revision:number,hash:string|undefined,
  active:boolean,wanted:readonly Asset[],resolve:(asset:Asset)=>SkyNativeImageSource,
  byteBudget?:number,retainedFallbackIds:readonly string[]=[]){
  const loader=useRef<ReturnType<typeof createSkyArtworkLoader>|null>(null);
  const wantedRef=useRef(wanted);wantedRef.current=wanted;
  const resolveRef=useRef(resolve);resolveRef.current=resolve;
  const [state,setState]=useState<{canvas:SkyArtworkCanvas;revision:number;hash:string;owner:ReturnType<typeof createSkyArtworkLoader>;value:SkyArtworkLoadState}|null>(null);
  useEffect(()=>{
    if(!active || !canvas || !hash)return;
    let live=true;
    const owner=createSkyArtworkLoader<Asset>({
      ...(byteBudget === undefined ? {} : { byteBudget }),
      retainedFallbackIds,
      changed(value){if(live)setState({canvas,revision,hash,owner,value});},
      start(asset,ready,fail){
        const resolved=resolveRef.current(asset);
        if(resolved.storage!=="session")return startSkyArtworkRequest({asset,canvas,url:resolved.url,
          acquire:()=>acquirePublishedSkyImage({...asset,format:resolved.format},resolved.url,hash),ready,fail});
        // The unadopted LOCAL fixture retains its existing session-only path.
        // A rejected public route never silently falls back to this branch.
        const fs=Taro.getFileSystemManager();
        const filePath=`${Taro.env.USER_DATA_PATH}/sky-art-${skyImageFileSession.nextRequestSuffix()}.${resolved.format==="jpeg"?"jpg":"png"}`;
        return startSkyArtworkRequest({asset,canvas,filePath,url:resolved.url,format:resolved.format,
          request:options=>Taro.request<ArrayBuffer>(options),writeFile:options=>fs.writeFile(options),
          removeFile:path=>fs.unlink({filePath:path,fail:()=>undefined}),ready,fail});
      },
    });
    loader.current=owner;owner.update(wantedRef.current);
    return()=>{
      live=false;owner.dispose();if(loader.current===owner)loader.current=null;
      // Hiding the returned view does not release the state graph: it still
      // holds this Canvas and its decoded images after their files are removed.
      setState(previous=>previous?.owner===owner?null:previous);
    };
  },[canvas,revision,hash,active,byteBudget,JSON.stringify(retainedFallbackIds)]);
  const wantedKey=JSON.stringify(wanted.map(a=>[a.id,a.sha256]));
  useEffect(()=>{loader.current?.update(wantedRef.current);},[wantedKey]);
  const failed=useCallback((image:object)=>loader.current?.failed(image),[]);
  const retryImages=useCallback(()=>loader.current?.retry()??false,[]);
  const suspendUnusedDecoded=useCallback(()=>loader.current?.suspendUnusedDecoded(),[]);
  const value=active && state?.owner===loader.current && state?.canvas===canvas && state.revision===revision && state.hash===hash ? state.value : EMPTY;
  return {...value,failedImage:failed,retryImages,suspendUnusedDecoded};
}

export function useSkyArtwork(canvas:SkyArtworkCanvas|null,revision:number,hash:string|undefined,
  active:boolean,wanted:readonly ConstellationArtwork[]){
  const images=useSkyNativeImages(canvas,revision,hash,active,wanted,
    asset=>({url:constellationAssetUrl(hash!,asset.file),format:"png"}));
  // Illustrations consume only wanted images. Coarse/optical consumers retain
  // their existing fallback bitmaps; their owners do not use this operation.
  useEffect(()=>{images.suspendUnusedDecoded();},[images.images,images.retainedImages,images.suspendUnusedDecoded]);
  return images;
}
