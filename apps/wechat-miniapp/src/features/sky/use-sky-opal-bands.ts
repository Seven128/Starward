import {useMemo} from "react";
import type {JupiterBandsManifestData,SaturnBandsManifestData,UranusBandsManifestData,NeptuneBandsManifestData,SkyGeometryReport} from "@starward/miniapp-contracts";
import {useResourceQuery} from "@/hooks/use-resource-query";
import {useSkyNativeImages} from "./use-sky-artwork";
import {skyPlanetDiscsAt} from "./sky-planet-disc";
import {skyFixedImageStatus} from "./sky-fixed-image-status";
import type {SkyArtworkView} from "./sky-artwork-registration";
import type {SkyArtworkCanvas} from "./sky-artwork-request";

type Manifest=JupiterBandsManifestData|SaturnBandsManifestData|UranusBandsManifestData|NeptuneBandsManifestData;
type Profile={body:"JUPITER"|"SATURN"|"URANUS"|"NEPTUNE";id:string;queryKey:string;
  getManifest:(signal?:AbortSignal)=>Promise<Manifest>;imageUrl:(path:string)=>string};

/** Historical axisymmetric cloud bands share one eligibility and image lifecycle. */
export function useSkyOpalBands(profile:Profile,report:Pick<SkyGeometryReport,"hourly">|undefined,at:string|undefined,
  view:SkyArtworkView|null,width:number,height:number,canvas:SkyArtworkCanvas|null,
  canvasRevision:number,active:boolean){
  const disc=useMemo(()=>active&&view&&width>0&&height>0
    ?skyPlanetDiscsAt(report?.hourly,at,view.basis,width,height,view.verticalFovDeg,view.center,profile.body)?.[0]??null
    :null,[report?.hourly,at,view?.basis,view?.verticalFovDeg,view?.center?.x,view?.center?.y,width,height,active,profile.body]);
  const wanted=active&&Boolean(disc?.surfaceOrientation&&disc.oblate&&disc.oblate.majorRadiusPx>=4);
  const manifest=useResourceQuery({queryKey:[profile.queryKey],queryFn:profile.getManifest,
    enabled:wanted,staleTime:60_000,structuralSharing:false});
  const publication=manifest.data;
  const assets=useMemo(()=>publication?[{...publication.image,id:profile.id}]:[],[publication,profile.id]);
  const images=useSkyNativeImages(canvas,canvasRevision,publication?.publicationHash,wanted,assets,
    asset=>({url:profile.imageUrl(asset.downloadUrl),format:"png"}));
  const image=images.images.get(profile.id)??images.retainedImages.get(profile.id)??null;
  const status=skyFixedImageStatus(wanted,image,manifest.isError,Boolean(manifest.refreshError),images.failed);
  return {image,publication,loading:wanted&&(manifest.isFetching||images.loading),
    ...status,failedImage:images.failedImage,
    retry(){const resetGpu=images.retryImages();void manifest.refetch();return resetGpu;}};
}
