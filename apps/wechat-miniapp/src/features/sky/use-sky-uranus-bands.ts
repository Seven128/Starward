import type {SkyGeometryReport} from "@starward/miniapp-contracts";
import {getUranusBandsManifest,uranusBandsImageUrl} from "@/services/uranus-bands-client";
import {useSkyOpalBands} from "./use-sky-opal-bands";
import type {SkyArtworkView} from "./sky-artwork-registration";
import type {SkyArtworkCanvas} from "./sky-artwork-request";

/** A licensed historical latitude profile, not current longitudinal weather. */
export function useSkyUranusBands(report:Pick<SkyGeometryReport,"hourly">|undefined,at:string|undefined,
  view:SkyArtworkView|null,width:number,height:number,canvas:SkyArtworkCanvas|null,
  canvasRevision:number,active:boolean){
  return useSkyOpalBands({body:"URANUS",id:"uranus:opal-2025a-bands",
    queryKey:"uranus-bands-manifest",getManifest:getUranusBandsManifest,imageUrl:uranusBandsImageUrl},
  report,at,view,width,height,canvas,canvasRevision,active);
}
