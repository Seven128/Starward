import { useCallback, useEffect, useRef, useState } from "react";
import Taro from "@tarojs/taro";
import type { ConstellationArtwork } from "@starward/miniapp-contracts";
import { constellationAssetUrl } from "@/services/api-client";
import { skyImageFileSession } from "../../services/sky-image-file-session";
import { acquirePublishedSkyImage } from "../../services/sky-public-image-runtime";
import { createSkyArtworkLoader, type SkyArtworkLoadState, type SkyNativeImageAsset } from "./sky-artwork-loader";
import { startSkyArtworkRequest, type SkyArtworkCanvas } from "./sky-artwork-request";

const EMPTY:SkyArtworkLoadState={images:new Map(),retainedImages:new Map(),loading:false,failed:false};
/** Validated immutable publications use the bounded encoded cache. Isolated
 * callers may explicitly select temporary session files. */
type SkyNativeImageSource = {url:string;format:"png"|"jpeg";storage?:"public"} |
  {url:string;format:"png"|"jpeg";storage:"session"};

/** Decoded images belong to exactly one live native canvas and publication.
 * Pose updates only change wanted; Sources pauses work, ownership loss disposes it. */
export function useSkyNativeImages<Asset extends SkyNativeImageAsset & {bytes:number}>(
  canvas:SkyArtworkCanvas|null,revision:number,hash:string|undefined,
  active:boolean,wanted:readonly Asset[],resolve:(asset:Asset)=>SkyNativeImageSource,
  byteBudget?:number,retainedFallbackIds:readonly string[]=[],retentionPriority?:(asset:Asset)=>number,paused=false){
  const loader=useRef<ReturnType<typeof createSkyArtworkLoader>|null>(null);
  const pausedRef=useRef(paused);pausedRef.current=paused;
  const wantedRef=useRef(wanted);wantedRef.current=wanted;
  const resolveRef=useRef(resolve);resolveRef.current=resolve;
  const priorityRef=useRef(retentionPriority);priorityRef.current=retentionPriority;
  const [state,setState]=useState<{canvas:SkyArtworkCanvas;revision:number;hash:string;owner:ReturnType<typeof createSkyArtworkLoader>;value:SkyArtworkLoadState}|null>(null);
  // The native writer may run before React commits a ready-image dispatch.
  // Read the same owner payload without keeping another image/file cache.
  const nativeState=useRef<typeof state>(null);
  const currentScope=useRef({canvas,revision,hash,active,paused});currentScope.current={canvas,revision,hash,active,paused};
  useEffect(()=>{
    if(!active || !canvas || !hash)return;
    let live=true;
    const owner=createSkyArtworkLoader<Asset>({
      ...(byteBudget === undefined ? {} : { byteBudget }),
      retainedFallbackIds,
      retentionPriority:asset=>priorityRef.current?.(asset)??0,
      changed(value){if(live){const next={canvas,revision,hash,owner,value};nativeState.current=next;setState(next);}},
      start(asset,ready,fail){
        const resolved=resolveRef.current(asset);
        if(resolved.storage!=="session")return startSkyArtworkRequest({asset,canvas,url:resolved.url,
          acquire:()=>acquirePublishedSkyImage({...asset,format:resolved.format},resolved.url,hash),ready,fail});
        // An explicit temporary caller owns its existing session-only path.
        // A rejected public route never silently falls back to this branch.
        const fs=Taro.getFileSystemManager();
        const filePath=`${Taro.env.USER_DATA_PATH}/sky-art-${skyImageFileSession.nextRequestSuffix()}.${resolved.format==="jpeg"?"jpg":"png"}`;
        return startSkyArtworkRequest({asset,canvas,filePath,url:resolved.url,format:resolved.format,
          request:options=>Taro.request<ArrayBuffer>(options),writeFile:options=>fs.writeFile(options),
          removeFile:path=>fs.unlink({filePath:path,fail:()=>undefined}),ready,fail});
      },
    });
    loader.current=owner;if(pausedRef.current)owner.pause();owner.update(wantedRef.current);
    return()=>{
      if(nativeState.current?.owner===owner)nativeState.current=null;
      live=false;owner.dispose();if(loader.current===owner)loader.current=null;
      // Hiding the returned view does not release the state graph: it still
      // holds this Canvas and its decoded images after their files are removed.
      setState(previous=>previous?.owner===owner?null:previous);
    };
  },[canvas,revision,hash,active,byteBudget,JSON.stringify(retainedFallbackIds)]);
  useEffect(()=>{
    const owner=loader.current;
    if(paused)owner?.pause();
    else {owner?.update(wantedRef.current);owner?.resume();}
  },[paused]);
  const wantedKey=JSON.stringify(wanted.map(a=>[a.id,a.sha256]));
  useEffect(()=>{loader.current?.update(wantedRef.current);},[wantedKey]);
  const failed=useCallback((image:object)=>loader.current?.failed(image),[]);
  const retryImages=useCallback(()=>loader.current?.retry()??false,[]);
  const suspendUnusedDecoded=useCallback(()=>loader.current?.suspendUnusedDecoded(),[]);
  const currentImages=useCallback(()=>{
    const scope=currentScope.current,value=nativeState.current;
    // A queued Sources frame may hold a reader created while paused. The
    // current phase controls access; Canvas/publication/owner still fence it.
    return active&&scope.active&&!scope.paused&&scope.canvas===canvas&&scope.revision===revision&&scope.hash===hash&&
      value?.owner===loader.current&&value.canvas===canvas&&value.revision===revision&&value.hash===hash
      ?value.value:EMPTY;
  },[canvas,revision,hash,active]);
  const value=active && !paused && state?.owner===loader.current && state?.canvas===canvas && state.revision===revision && state.hash===hash ? state.value : EMPTY;
  return {...value,currentImages,failedImage:failed,retryImages,suspendUnusedDecoded};
}

export function useSkyArtwork(canvas:SkyArtworkCanvas|null,revision:number,hash:string|undefined,
  active:boolean,wanted:readonly ConstellationArtwork[],paused=false){
  const images=useSkyNativeImages(canvas,revision,hash,active,wanted,
    asset=>({url:constellationAssetUrl(hash!,asset.file),format:"png"}),undefined,[],undefined,paused);
  // Illustrations consume only wanted images. Coarse/optical consumers retain
  // their existing fallback bitmaps; their owners do not use this operation.
  useEffect(()=>{images.suspendUnusedDecoded();},[images.images,images.retainedImages,images.suspendUnusedDecoded]);
  return images;
}
