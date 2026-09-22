import { useCallback, useEffect, useRef, useState } from "react";
import Taro from "@tarojs/taro";
import type { ConstellationArtwork } from "@starward/miniapp-contracts";
import { constellationAssetUrl } from "@/services/api-client";
import { createSkyArtworkLoader, type SkyArtworkLoadState } from "./sky-artwork-loader";
import { startSkyArtworkRequest, type SkyArtworkCanvas } from "./sky-artwork-request";

const EMPTY:SkyArtworkLoadState={images:new Map(),loading:false,failed:false};
let requestSequence=0;
const session=Date.now().toString(36);

/** Decoded images belong to exactly one live native canvas and publication.
 * Pose updates only change the wanted set; hide/replacement cancels its owner. */
export function useSkyArtwork(canvas:SkyArtworkCanvas|null,revision:number,hash:string|undefined,
  active:boolean,wanted:readonly ConstellationArtwork[]){
  const loader=useRef<ReturnType<typeof createSkyArtworkLoader>|null>(null);
  const wantedRef=useRef(wanted);wantedRef.current=wanted;
  const [state,setState]=useState<{canvas:SkyArtworkCanvas;revision:number;hash:string;owner:ReturnType<typeof createSkyArtworkLoader>;value:SkyArtworkLoadState}|null>(null);
  useEffect(()=>{
    if(!active || !canvas || !hash)return;
    const fs=Taro.getFileSystemManager();
    let live=true;
    const owner=createSkyArtworkLoader({
      changed(value){if(live)setState({canvas,revision,hash,owner,value});},
      start(asset,ready,fail){
        // Unique per request: a late canceled write can only delete its own file.
        const filePath=`${Taro.env.USER_DATA_PATH}/sky-art-${session}-${++requestSequence}.png`;
        return startSkyArtworkRequest({asset,canvas,filePath,url:constellationAssetUrl(hash,asset.file),
          request:options=>Taro.request<ArrayBuffer>(options),writeFile:options=>fs.writeFile(options),
          removeFile:path=>fs.unlink({filePath:path,fail:()=>undefined}),ready,fail});
      },
    });
    loader.current=owner;owner.update(wantedRef.current);
    return()=>{live=false;owner.dispose();if(loader.current===owner)loader.current=null;};
  },[canvas,revision,hash,active]);
  const wantedKey=wanted.map(a=>a.sha256).join(':');
  useEffect(()=>{loader.current?.update(wantedRef.current);},[wantedKey]);
  const failed=useCallback((image:object)=>loader.current?.failed(image),[]);
  const value=active && state?.owner===loader.current && state?.canvas===canvas && state.revision===revision && state.hash===hash ? state.value : EMPTY;
  return {...value,failedImage:failed};
}
