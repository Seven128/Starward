import {useMemo} from "react";
import type {SkyGeometryReport} from "@starward/miniapp-contracts";
import {useResourceQuery} from "@/hooks/use-resource-query";
import {getGalacticImageManifest,galacticImageUrl} from "@/services/galactic-image-client";
import {useSkyNativeImages} from "./use-sky-artwork";
import {skyGalacticBandAt} from "./sky-galactic-band";
import {skyFixedImageStatus} from "./sky-fixed-image-status";
import type {SkyArtworkCanvas} from "./sky-artwork-request";

/** Source image is needed only for a dark, wide view with a current exact frame. */
export function useSkyGalacticImage(report:Pick<SkyGeometryReport,"hourly"|"observationFrames">|undefined,
  at:string|undefined,fov:number,canvas:SkyArtworkCanvas|null,revision:number,active:boolean){
  const wanted=active&&Boolean(skyGalacticBandAt(report,at,fov));
  const manifest=useResourceQuery({queryKey:["galactic-image-manifest"],queryFn:getGalacticImageManifest,
    enabled:wanted,staleTime:60_000,structuralSharing:false});
  const publication=manifest.data;
  const assets=useMemo(()=>publication?[{...publication.image,id:"galactic:2mass"}]:[],[publication]);
  const images=useSkyNativeImages(canvas,revision,publication?.publicationHash,wanted,assets,
    asset=>({url:galacticImageUrl(asset.downloadUrl),format:"jpeg"}));
  const image=images.images.get("galactic:2mass")??images.retainedImages.get("galactic:2mass")??null;
  const status=skyFixedImageStatus(wanted,image,manifest.isError,Boolean(manifest.refreshError),images.failed);
  return {image,publication,loading:wanted&&(manifest.isFetching||images.loading),
    ...status,
    failedImage:images.failedImage,
    retry(){const resetGpu=images.retryImages();void manifest.refetch();return resetGpu;}};
}
