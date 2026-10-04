import { useCallback, useEffect, useRef, useState } from "react";
import Taro from "@tarojs/taro";
import type { ConstellationArtwork } from "@starward/miniapp-contracts";
import { constellationAssetUrl } from "@/services/api-client";
import { createSkyArtworkLoader, type SkyArtworkLoadState, type SkyNativeImageAsset } from "./sky-artwork-loader";
import { startSkyArtworkRequest, type SkyArtworkCanvas } from "./sky-artwork-request";

const EMPTY:SkyArtworkLoadState={images:new Map(),retainedImages:new Map(),loading:false,failed:false};
let requestSequence=0;
const session=Date.now().toString(36);

/** Decoded images belong to exactly one live native canvas and publication.
 * Pose updates only change the wanted set; hide/replacement cancels its owner. */
export function useSkyNativeImages<Asset extends SkyNativeImageAsset & {bytes:number}>(
  canvas:SkyArtworkCanvas|null,revision:number,hash:string|undefined,
  active:boolean,wanted:readonly Asset[],resolve:(asset:Asset)=>{url:string;format:"png"|"jpeg"},
  byteBudget?:number){
  const loader=useRef<ReturnType<typeof createSkyArtworkLoader>|null>(null);
  const wantedRef=useRef(wanted);wantedRef.current=wanted;
  const resolveRef=useRef(resolve);resolveRef.current=resolve;
  const [state,setState]=useState<{canvas:SkyArtworkCanvas;revision:number;hash:string;owner:ReturnType<typeof createSkyArtworkLoader>;value:SkyArtworkLoadState}|null>(null);
  useEffect(()=>{
    if(!active || !canvas || !hash)return;
    const fs=Taro.getFileSystemManager();
    let live=true;
    const owner=createSkyArtworkLoader<Asset>({
      ...(byteBudget === undefined ? {} : { byteBudget }),
      changed(value){if(live)setState({canvas,revision,hash,owner,value});},
      start(asset,ready,fail){
        // Unique per request: a late canceled write can only delete its own file.
        const resolved=resolveRef.current(asset);
        const filePath=`${Taro.env.USER_DATA_PATH}/sky-art-${session}-${++requestSequence}.${resolved.format==="jpeg"?"jpg":"png"}`;
        return startSkyArtworkRequest({asset,canvas,filePath,url:resolved.url,format:resolved.format,
          request:options=>Taro.request<ArrayBuffer>(options),writeFile:options=>fs.writeFile(options),
          removeFile:path=>fs.unlink({filePath:path,fail:()=>undefined}),ready,fail});
      },
    });
    loader.current=owner;owner.update(wantedRef.current);
    return()=>{live=false;owner.dispose();if(loader.current===owner)loader.current=null;};
  },[canvas,revision,hash,active,byteBudget]);
  const wantedKey=JSON.stringify(wanted.map(a=>[a.id,a.sha256]));
  useEffect(()=>{loader.current?.update(wantedRef.current);},[wantedKey]);
  const failed=useCallback((image:object)=>loader.current?.failed(image),[]);
  const retryImages=useCallback(()=>loader.current?.retry(),[]);
  const value=active && state?.owner===loader.current && state?.canvas===canvas && state.revision===revision && state.hash===hash ? state.value : EMPTY;
  return {...value,failedImage:failed,retryImages};
}

export function useSkyArtwork(canvas:SkyArtworkCanvas|null,revision:number,hash:string|undefined,
  active:boolean,wanted:readonly ConstellationArtwork[]){
  return useSkyNativeImages(canvas,revision,hash,active,wanted,
    asset=>({url:constellationAssetUrl(hash!,asset.file),format:"png"}));
}
