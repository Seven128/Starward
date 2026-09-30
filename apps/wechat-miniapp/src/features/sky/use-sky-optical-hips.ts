import {useMemo} from "react";
import type {SkyGeometryReport} from "@starward/miniapp-contracts";
import {useResourceQuery} from "@/hooks/use-resource-query";
import {getOpticalHipsIndex,getOpticalHipsManifest,opticalHipsTileUrl} from "@/services/optical-hips-client";
import {exactSkyObservationFrame} from "./sky-observation-frame";
import {selectSkyHipsTiles} from "./sky-hips-tile-selection";
import type {SkyArtworkView} from "./sky-artwork-registration";
import type {SkyArtworkCanvas} from "./sky-artwork-request";
import {publishedOpticalCoverageComplete,resolvePublishedOpticalTiles,
  selectPublishedOpticalCandidates} from "./sky-optical-tile-selection";
import {useSkyNativeImages} from "./use-sky-artwork";
import type {SkyHipsCanvasTile} from "./sky-scene-render";

/** Optional optical layer. Missing publication or missing coverage never
 * withdraws the independent stars, targets or registered deep-sky image. */
export function useSkyOpticalHips(report:Pick<SkyGeometryReport,"hourly"|"observationFrames">|undefined,
  at:string|undefined,view:SkyArtworkView|null,width:number,height:number,
  canvas:SkyArtworkCanvas|null,canvasRevision:number,active:boolean){
  // The service only accepts an optical publication in a LOCAL memory trial.
  // A commercial bundle must not query its absent manifest or offer retry UI.
  const trialActive=active&&__MINIAPP_DEVELOPMENT_FIXTURE_MODE__;
  const manifest=useResourceQuery({queryKey:["optical-hips-manifest"],queryFn:getOpticalHipsManifest,
    enabled:trialActive,staleTime:60_000,structuralSharing:false});
  const publication=trialActive?manifest.data:null;
  const frame=exactSkyObservationFrame(report,at);
  const candidates=useMemo(()=>trialActive&&publication&&frame&&view&&width>0&&height>0
    ? selectPublishedOpticalCandidates(publication,frame,view,width,height):[],
    [trialActive,publication,frame,view?.basis,view?.verticalFovDeg,view?.center?.x,view?.center?.y,width,height]);
  const shardKey=candidates.map(candidate=>
    `${candidate.sourceId}:${candidate.order}:${candidate.pixels.join(":")}`).join("|");
  const reference=candidates.length&&frame&&view?selectSkyHipsTiles({frame,view,width,height,
    maxOrder:Math.max(...candidates.map(candidate=>candidate.order)),
    minOrder:candidates.some(candidate=>candidate.order===0)?0:1}):null;
  const referenceKey=reference?.state==="SELECTED"?`${reference.order}:${reference.pixels.join(":")}`:"";
  const indexes=useResourceQuery({
    queryKey:["optical-hips-index",publication?.publicationHash,shardKey,referenceKey],
    queryFn:async signal=>{
      const data=[] as Awaited<ReturnType<typeof getOpticalHipsIndex>>[];
      let failed=false;
      if(reference?.state!=="SELECTED")return {data,failed};
      for(const candidate of candidates){
        if(signal?.aborted)throw new Error("optical_index_aborted");
        const settled=await Promise.allSettled(candidate.dirs.map(dir=>
          getOpticalHipsIndex(publication!,candidate.sourceId,candidate.order,dir,signal)));
        if(signal?.aborted)throw new Error("optical_index_aborted");
        data.push(...settled.flatMap(result=>result.status==="fulfilled"?[result.value]:[]));
        failed ||=settled.some(result=>result.status==="rejected");
        const selected=resolvePublishedOpticalTiles(candidates,data,reference);
        if(publishedOpticalCoverageComplete(reference,selected))break;
      }
      return {data,failed};
    },
    enabled:trialActive&&candidates.length>0&&reference?.state==="SELECTED",
    staleTime:Infinity,structuralSharing:false,
  });
  const assets=useMemo(()=>{
    return reference?.state==="SELECTED"
      ?resolvePublishedOpticalTiles(candidates,indexes.data?.data??[],reference):[];
  },[shardKey,referenceKey,candidates,indexes.data]);
  const images=useSkyNativeImages(canvas,canvasRevision,publication?.publicationHash,
    trialActive&&candidates.length>0,assets,asset=>({url:opticalHipsTileUrl(asset.downloadUrl),format:asset.format}));
  const tiles=useMemo(()=>{
    if(!trialActive||!candidates.length)return [] as SkyHipsCanvasTile[];
    const ready=new Map([...images.retainedImages,...images.images]);
    const result:Array<SkyHipsCanvasTile & {sourcePriority:number}>=[];
    for(const [id,image] of ready){
      const match=/^([a-z0-9-]+):(\d+):(\d+)$/u.exec(id);
      const sourcePriority=candidates.findIndex(candidate=>candidate.sourceId===match?.[1]);
      const candidate=candidates[sourcePriority];
      if(!match||!candidate||Number(match[2])>candidate.order)continue;
      result.push({layer:"OPTICAL",order:Number(match[2]),pixel:Number(match[3]),image,sourcePriority});
    }
    return result.sort((a,b)=>b.sourcePriority-a.sourcePriority||a.order-b.order);
  },[trialActive,candidates,images.images,images.retainedImages]);
  return {tiles,loading:trialActive&&(manifest.isFetching||indexes.isFetching||images.loading),
    failed:trialActive&&(manifest.isError||Boolean(manifest.refreshError)||indexes.isError||
      Boolean(indexes.refreshError)||Boolean(indexes.data?.failed)||images.failed),
    retry(){if(!trialActive)return false;const resetGpu=images.retryImages();void manifest.refetch();void indexes.refetch();return resetGpu;},
    failedImage:images.failedImage,
    publication,selection:candidates[0]??null};
}
