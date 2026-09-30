import {useMemo} from "react";
import type {SkyGeometryReport} from "@starward/miniapp-contracts";
import {useResourceQuery} from "@/hooks/use-resource-query";
import {getMarsTextureManifest,marsTextureImageUrl} from "@/services/mars-texture-client";
import {useSkyNativeImages} from "./use-sky-artwork";
import {skyPlanetDiscsAt} from "./sky-planet-disc";
import {skyFixedImageStatus} from "./sky-fixed-image-status";
import type {SkyArtworkView} from "./sky-artwork-registration";
import type {SkyArtworkCanvas} from "./sky-artwork-request";

/** Loads a single low-resolution Mars surface only when its globe is resolved. */
export function useSkyMarsTexture(report:Pick<SkyGeometryReport,"hourly">|undefined,at:string|undefined,
  view:SkyArtworkView|null,width:number,height:number,canvas:SkyArtworkCanvas|null,
  canvasRevision:number,active:boolean){
  const disc=useMemo(()=>active&&view&&width>0&&height>0
    ? skyPlanetDiscsAt(report?.hourly,at,view.basis,width,height,view.verticalFovDeg,view.center,"MARS")?.[0]??null
    : null,[report?.hourly,at,view?.basis,view?.verticalFovDeg,view?.center?.x,view?.center?.y,width,height,active]);
  const wanted=active&&Boolean(disc?.surfaceOrientation&&disc.radiusPx>=4);
  const manifest=useResourceQuery({queryKey:["mars-texture-manifest"],queryFn:getMarsTextureManifest,
    enabled:wanted,staleTime:60_000,structuralSharing:false});
  const publication=manifest.data;
  const assets=useMemo(()=>publication?[{...publication.image,id:"mars:mdim21"}]:[],[publication]);
  const images=useSkyNativeImages(canvas,canvasRevision,publication?.publicationHash,wanted,assets,
    asset=>({url:marsTextureImageUrl(asset.downloadUrl),format:"jpeg"}));
  const image=images.images.get("mars:mdim21")??images.retainedImages.get("mars:mdim21")??null;
  const status=skyFixedImageStatus(wanted,image,manifest.isError,Boolean(manifest.refreshError),images.failed);
  return {image,publication,loading:wanted&&(manifest.isFetching||images.loading),
    ...status,
    failedImage:images.failedImage,
    retry(){const resetGpu=images.retryImages();void manifest.refetch();return resetGpu;}};
}
