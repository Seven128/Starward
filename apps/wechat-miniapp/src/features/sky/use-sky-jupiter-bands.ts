import type {SkyGeometryReport} from "@starward/miniapp-contracts";
import {getJupiterBandsManifest,jupiterBandsImageUrl} from "@/services/jupiter-bands-client";
import {useSkyOpalBands} from "./use-sky-opal-bands";
import type {SkyArtworkView} from "./sky-artwork-registration";
import type {SkyArtworkCanvas} from "./sky-artwork-request";

/** A licensed historical latitude profile, not current longitudinal weather. */
export function useSkyJupiterBands(report:Pick<SkyGeometryReport,"hourly">|undefined,at:string|undefined,
  view:SkyArtworkView|null,width:number,height:number,canvas:SkyArtworkCanvas|null,
  canvasRevision:number,active:boolean){
  return useSkyOpalBands({body:"JUPITER",id:"jupiter:opal-2024c-bands",
    queryKey:"jupiter-bands-manifest",getManifest:getJupiterBandsManifest,imageUrl:jupiterBandsImageUrl},
  report,at,view,width,height,canvas,canvasRevision,active);
}
