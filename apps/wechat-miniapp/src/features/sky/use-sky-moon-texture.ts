import {useMemo} from "react";
import type {SkyGeometryReport} from "@starward/miniapp-contracts";
import {useResourceQuery} from "@/hooks/use-resource-query";
import {getMoonTextureManifest,moonTextureImageUrl} from "@/services/moon-texture-client";
import {useSkyFixedImage} from "./use-sky-fixed-image";
import {skyMoonDiscAt} from "./sky-moon-disc";
import {skyFixedImageStatus} from "./sky-fixed-image-status";
import type {SkyArtworkView} from "./sky-artwork-registration";
import type {SkyArtworkCanvas} from "./sky-artwork-request";

/** A single immutable local image, requested only for a resolved Moon whose
 * surface detail can occupy visible pixels. Plain phase remains the fallback. */
export function useSkyMoonTexture(report:Pick<SkyGeometryReport,"hourly">|undefined,at:string|undefined,
  view:SkyArtworkView|null,width:number,height:number,canvas:SkyArtworkCanvas|null,
  canvasRevision:number,active:boolean,paused=false){
  const disc=useMemo(()=>active&&view&&width>0&&height>0
    ? skyMoonDiscAt(report?.hourly,at,view.basis,width,height,view.verticalFovDeg,view.center)
    : null,[report?.hourly,at,view?.basis,view?.verticalFovDeg,view?.center?.x,view?.center?.y,width,height,active]);
  const wanted=active&&Boolean(disc?.surfaceOrientation&&disc.radiusPx>=4);
  const manifest=useResourceQuery({queryKey:["moon-texture-manifest","coverage-v2"],queryFn:getMoonTextureManifest,
    enabled:wanted&&!paused,staleTime:60_000,structuralSharing:false});
  const publication=manifest.data;
  const images=useSkyFixedImage(canvas,canvasRevision,publication,active,wanted,"moon:uv750:coverage-v2",
    asset=>({url:moonTextureImageUrl(asset.downloadUrl),format:"png"}),paused);
  const image=images.image;
  const status=skyFixedImageStatus(wanted,image,manifest.isError,Boolean(manifest.refreshError),images.failed);
  return {image,publication,loading:wanted&&(manifest.isFetching||images.loading),
    ...status,
    failedImage:images.failedImage,
    retry(){const resetGpu=images.retryImages();void manifest.refetch();return resetGpu;}};
}
