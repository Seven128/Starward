import type {SkyGeometryReport} from "@starward/miniapp-contracts";
import {useResourceQuery} from "@/hooks/use-resource-query";
import {getGalacticImageManifest,galacticImageUrl} from "@/services/galactic-image-client";
import {useSkyFixedImage} from "./use-sky-fixed-image";
import {skyGalacticBandAt} from "./sky-galactic-band";
import {skyFixedImageStatus} from "./sky-fixed-image-status";
import type {SkyArtworkCanvas} from "./sky-artwork-request";

/** A dark wide exact frame wants pixels. Temporary fading keeps only the same
 * bounded source file; page/layer/Canvas/publication retirement drops its owner. */
export function useSkyGalacticImage(report:Pick<SkyGeometryReport,"hourly"|"observationFrames">|undefined,
  at:string|undefined,fov:number,canvas:SkyArtworkCanvas|null,revision:number,active:boolean){
  const wanted=active&&Boolean(skyGalacticBandAt(report,at,fov));
  const manifest=useResourceQuery({queryKey:["galactic-image-manifest"],queryFn:getGalacticImageManifest,
    enabled:wanted,staleTime:60_000,structuralSharing:false});
  const publication=manifest.data;
  const images=useSkyFixedImage(canvas,revision,publication,active,wanted,"galactic:2mass",
    asset=>({url:galacticImageUrl(asset.downloadUrl),format:"jpeg"}));
  // Hide dormant pixels before effects run; a fresh decode must finish before
  // a returning frame can present them or reserve their texture budget.
  const image=images.image;
  const status=skyFixedImageStatus(wanted,image,manifest.isError,Boolean(manifest.refreshError),images.failed);
  return {image,publication,loading:wanted&&(manifest.isFetching||images.loading),
    ...status,
    failedImage:images.failedImage,
    retry(){const resetGpu=images.retryImages();void manifest.refetch();return resetGpu;}};
}
