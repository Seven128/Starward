import {useEffect,useMemo} from "react";
import type {SkyGeometryReport} from "@starward/miniapp-contracts";
import {useResourceQuery} from "@/hooks/use-resource-query";
import {getGalacticImageManifest,galacticImageUrl} from "@/services/galactic-image-client";
import {useSkyNativeImages} from "./use-sky-artwork";
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
  const assets=useMemo(()=>publication&&wanted?[{...publication.image,id:"galactic:2mass"}]:[],[publication,wanted]);
  const images=useSkyNativeImages(canvas,revision,publication?.publicationHash,active,assets,
    asset=>({url:galacticImageUrl(asset.downloadUrl),format:"jpeg"}));
  useEffect(()=>{images.suspendUnusedDecoded();},[images.images,images.retainedImages,images.suspendUnusedDecoded]);
  // Hide dormant pixels before effects run; a fresh decode must finish before
  // a returning frame can present them or reserve their texture budget.
  const image=wanted?(images.images.get("galactic:2mass")??null):null;
  const status=skyFixedImageStatus(wanted,image,manifest.isError,Boolean(manifest.refreshError),images.failed);
  return {image,publication,loading:wanted&&(manifest.isFetching||images.loading),
    ...status,
    failedImage:images.failedImage,
    retry(){const resetGpu=images.retryImages();void manifest.refetch();return resetGpu;}};
}
