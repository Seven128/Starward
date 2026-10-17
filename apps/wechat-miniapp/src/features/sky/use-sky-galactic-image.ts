import {galacticImageFormat,type SkyGeometryReport} from "@starward/miniapp-contracts";
import {useMemo} from "react";
import {useResourceQuery} from "@/hooks/use-resource-query";
import {getGalacticImageManifest,galacticImageUrl} from "@/services/galactic-image-client";
import {useSkyFixedImage} from "./use-sky-fixed-image";
import {useSkyImageRecovery} from "./use-sky-image-recovery";
import {resolveSkyGalacticView} from "./sky-galactic-band";
import {skyFixedImageStatus} from "./sky-fixed-image-status";
import type {SkyArtworkCanvas} from "./sky-artwork-request";

/** A dark exact frame wants optical pixels at every scale. Fading keeps the same
 * bounded source file; page/layer/Canvas/publication retirement drops its owner. */
export function useSkyGalacticImage(report:Pick<SkyGeometryReport,"hourly"|"observationFrames">|undefined,
  at:string|undefined,fov:number,canvas:SkyArtworkCanvas|null,revision:number,active:boolean,paused=false){
  const view=useMemo(()=>active?resolveSkyGalacticView(report,at,fov):null,
    [active,report?.hourly,report?.observationFrames,at,fov]);
  const discover=Boolean(view?.image);
  const manifest=useResourceQuery({queryKey:["galactic-image-manifest"],queryFn:getGalacticImageManifest,
    enabled:discover&&!paused,staleTime:60_000,structuralSharing:false});
  const publication=manifest.data;
  const wanted=discover&&(publication?.schemaVersion!=="starward-2mass-galactic-v1"||Boolean(view?.schematic));
  const images=useSkyFixedImage(canvas,revision,publication,active,wanted,
    publication&&publication.schemaVersion!=="starward-2mass-galactic-v1"?"galactic:mellinger-optical":"galactic:2mass",
    asset=>({url:galacticImageUrl(asset.downloadUrl),format:publication?galacticImageFormat(publication):"jpeg"}),paused);
  // Hide dormant pixels before effects run; a fresh decode must finish before
  // a returning frame can present them or reserve their texture budget.
  const image=images.image;
  const status=skyFixedImageStatus(wanted,image,manifest.isError,Boolean(manifest.refreshError),images.failed);
  const retry=useSkyImageRecovery(discover&&!paused,images.retryImages,manifest.refetch);
  return {image,publication,loading:wanted&&(manifest.isFetching||images.loading),
    ...status,
    failedImage:images.failedImage,
    retry};
}
