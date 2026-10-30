import {useMemo} from "react";
import type {SkyGeometryReport} from "@starward/miniapp-contracts";
import {useResourceQuery} from "@/hooks/use-resource-query";
import {getBodyImageManifest,bodyImageUrl} from "@/services/body-image-client";
import type {SkyBodyImageProfile} from "@/services/sky-body-image-profile";
import {useSkyFixedImage} from "./use-sky-fixed-image";
import {useSkyImageRecovery} from "./use-sky-image-recovery";
import {skyMoonDiscAt} from "./sky-moon-disc";
import {skyPlanetProjectionsAt} from "./sky-planet-disc";
import {skyFixedImageStatus} from "./sky-fixed-image-status";
import {skyBodyImageBinding,type SkyBodyImageBinding} from "./sky-body-image-completion";
import type {SkyArtworkView} from "./sky-artwork-registration";
import type {SkyArtworkCanvas} from "./sky-artwork-request";

export type SkyBodyImageInput=[report:Pick<SkyGeometryReport,'hourly'>|undefined,at:string|undefined,
  view:SkyArtworkView|null,width:number,height:number,canvas:SkyArtworkCanvas|null,
  canvasRevision:number,active:boolean,paused?:boolean];

/** One manifest/status/retry lifecycle; projection and coverage stay with their existing owners. */
export function useSkyBodyImage(profile:SkyBodyImageProfile,...[report,at,view,width,height,canvas,canvasRevision,active,paused=false]:SkyBodyImageInput){
  const disc=useMemo(()=>!active||!view||width<=0||height<=0?null:profile.kind==='moon'
    ?skyMoonDiscAt(report?.hourly,at,view.basis,width,height,view.verticalFovDeg,view.center)
    :skyPlanetProjectionsAt(report?.hourly,at,view.basis,width,height,view.verticalFovDeg,view.center,profile.body)?.[0]??null,
    [report?.hourly,at,view?.basis,view?.verticalFovDeg,view?.center?.x,view?.center?.y,width,height,active,profile]);
  const radius=profile.style==='bands'&&disc&&'oblate' in disc?disc.oblate?.majorRadiusPx:disc?.radiusPx;
  const wanted=active&&Boolean(disc?.surfaceOrientation&&radius!==undefined&&radius>=4);
  // A cached metadata fetch must not keep this render's report and decoded image.
  const manifest=useResourceQuery({queryKey:profile.queryKey,queryFn:getBodyImageManifest.bind(null,profile.kind),
    enabled:wanted&&!paused,staleTime:60_000,structuralSharing:false});
  const publication=manifest.data;
  const images=useSkyFixedImage(canvas,canvasRevision,publication,active,wanted,profile.id,
    asset=>({url:bodyImageUrl(asset.downloadUrl,profile.kind),format:asset.downloadUrl.endsWith('.png')?'png':'jpeg'}),paused);
  const image=images.image,status=skyFixedImageStatus(wanted,image,manifest.isError,Boolean(manifest.refreshError),images.failed);
  const binding=useMemo(()=>skyBodyImageBinding(profile.reference,image,publication) as SkyBodyImageBinding|null,[profile,image,publication]);
  const retry=useSkyImageRecovery(wanted&&!paused,images.retryImages,manifest.refetch);
  return useMemo(()=>({profile,image,publication,binding,loading:wanted&&(manifest.isFetching||images.loading),
    ...status,failedImage:images.failedImage,retry}),[profile,image,publication,binding,wanted,manifest.isFetching,images.loading,
    status.failed,status.refreshFailed,images.failedImage,retry]);
}
export type SkyBodyImageResource=ReturnType<typeof useSkyBodyImage>;
