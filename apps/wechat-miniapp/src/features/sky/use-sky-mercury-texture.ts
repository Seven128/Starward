import {useMemo} from "react";
import type {SkyGeometryReport} from "@starward/miniapp-contracts";
import {useResourceQuery} from "@/hooks/use-resource-query";
import {getMercuryTextureManifest,mercuryTextureImageUrl} from "@/services/mercury-texture-client";
import {useSkyFixedImage} from "./use-sky-fixed-image";
import {skyPlanetDiscsAt} from "./sky-planet-disc";
import {skyFixedImageStatus} from "./sky-fixed-image-status";
import type {SkyArtworkView} from "./sky-artwork-registration";
import type {SkyArtworkCanvas} from "./sky-artwork-request";

/** Loads the 2013 grayscale Mercury surface only when the globe is resolved. */
export function useSkyMercuryTexture(report:Pick<SkyGeometryReport,"hourly">|undefined,at:string|undefined,
  view:SkyArtworkView|null,width:number,height:number,canvas:SkyArtworkCanvas|null,
  canvasRevision:number,active:boolean,paused=false){
  const disc=useMemo(()=>active&&view&&width>0&&height>0
    ? skyPlanetDiscsAt(report?.hourly,at,view.basis,width,height,view.verticalFovDeg,view.center,"MERCURY")?.[0]??null
    : null,[report?.hourly,at,view?.basis,view?.verticalFovDeg,view?.center?.x,view?.center?.y,width,height,active]);
  const wanted=active&&Boolean(disc?.surfaceOrientation&&disc.radiusPx>=4);
  const manifest=useResourceQuery({queryKey:["mercury-texture-manifest"],queryFn:getMercuryTextureManifest,
    enabled:wanted&&!paused,staleTime:60_000,structuralSharing:false});
  const publication=manifest.data;
  const images=useSkyFixedImage(canvas,canvasRevision,publication,active,wanted,"mercury:messenger-2013",
    asset=>({url:mercuryTextureImageUrl(asset.downloadUrl),format:"jpeg"}),paused);
  const image=images.image;
  const status=skyFixedImageStatus(wanted,image,manifest.isError,Boolean(manifest.refreshError),images.failed);
  return {image,publication,loading:wanted&&(manifest.isFetching||images.loading),
    ...status,
    failedImage:images.failedImage,
    retry(){const resetGpu=images.retryImages();void manifest.refetch();return resetGpu;}};
}
