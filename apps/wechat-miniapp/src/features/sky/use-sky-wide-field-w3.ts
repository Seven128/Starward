import {useMemo} from "react";
import type {SkyGeometryReport} from "@starward/miniapp-contracts";
import {useResourceQuery} from "@/hooks/use-resource-query";
import {getWideFieldW3Manifest,wideFieldW3TileUrl} from "@/services/wide-field-w3-client";
import {exactSkyObservationFrame} from "./sky-observation-frame";
import {skySolarLightAt} from "./sky-solar-light";
import {selectSkyHipsTiles} from "./sky-hips-tile-selection";
import type {SkyArtworkView} from "./sky-artwork-registration";
import type {SkyArtworkCanvas} from "./sky-artwork-request";
import {useSkyNativeImages} from "./use-sky-artwork";
import type {SkyHipsCanvasTile} from "./sky-scene-render";

/** Archived 12 µm data is a low-resolution, optional wide-sky layer. It is
 * selected by the report's exact observer frame, never by a guessed GPS/time. */
export function useSkyWideFieldW3(report:Pick<SkyGeometryReport,"hourly"|"observationFrames">|undefined,
  at:string|undefined,view:SkyArtworkView|null,width:number,height:number,
  canvas:SkyArtworkCanvas|null,canvasRevision:number,active:boolean){
  const sun=skySolarLightAt(report?.hourly,at);
  const wantedWide=active&&Boolean(view&&view.verticalFovDeg>=60&&sun&&sun.altitudeDeg<=-12);
  const manifest=useResourceQuery({queryKey:["wide-field-w3-manifest"],queryFn:getWideFieldW3Manifest,
    enabled:wantedWide,staleTime:60_000,structuralSharing:false});
  const publication=manifest.data;
  const frame=exactSkyObservationFrame(report,at);
  const selection=useMemo(()=>wantedWide&&publication&&frame&&view&&width>0&&height>0
    ? selectSkyHipsTiles({frame,view,width,height,maxOrder:0,minOrder:0}) : null,
    [wantedWide,publication,frame,view?.basis,view?.verticalFovDeg,view?.center?.x,view?.center?.y,width,height]);
  const selected=selection?.state==="SELECTED"?selection.pixels:[];
  const wanted=useMemo(()=>publication?.tiles.filter(tile=>selected.includes(tile.pixel)).map(tile=>({
    id:`w3:0:${tile.pixel}`,sha256:tile.sha256,width:512 as const,height:512 as const,
    bytes:tile.bytes,pixel:tile.pixel,downloadUrl:tile.downloadUrl}))??[],
    [publication,selected.join(":")]);
  const images=useSkyNativeImages(canvas,canvasRevision,publication?.publicationHash,
    wantedWide&&selection?.state==="SELECTED",wanted,
    asset=>({url:wideFieldW3TileUrl(asset.downloadUrl),format:"jpeg"}));
  const tiles=useMemo(()=>{
    if(!wantedWide||selection?.state!=="SELECTED")return [] as SkyHipsCanvasTile[];
    const ready=new Map([...images.retainedImages,...images.images]);
    const result:SkyHipsCanvasTile[]=[];
    for(const [id,image] of ready){
      const match=/^w3:0:(\d+)$/u.exec(id);
      if(match)result.push({layer:"WIDE_FIELD_W3",order:0,pixel:Number(match[1]),image});
    }
    return result.sort((a,b)=>a.pixel-b.pixel);
  },[wantedWide,selection,images.images,images.retainedImages]);
  return {tiles,publication,loading:wantedWide&&(manifest.isFetching||images.loading),
    failed:wantedWide&&(manifest.isError||Boolean(manifest.refreshError)||images.failed),
    failedImage:images.failedImage,
    retry(){const resetGpu=images.retryImages();void manifest.refetch();return resetGpu;}};
}
