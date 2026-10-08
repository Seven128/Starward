import type {SkyGeometryReport} from "@starward/miniapp-contracts";
import {getSaturnBandsManifest,saturnBandsImageUrl} from "@/services/saturn-bands-client";
import {useSkyOpalBands} from "./use-sky-opal-bands";
import type {SkyArtworkView} from "./sky-artwork-registration";
import type {SkyArtworkCanvas} from "./sky-artwork-request";

/** A licensed historical latitude profile, not current longitudinal weather. */
export function useSkySaturnBands(report:Pick<SkyGeometryReport,"hourly">|undefined,at:string|undefined,
  view:SkyArtworkView|null,width:number,height:number,canvas:SkyArtworkCanvas|null,
  canvasRevision:number,active:boolean,paused=false){
  return useSkyOpalBands({body:"SATURN",id:"saturn:opal-2025a-bands",
    queryKey:"saturn-bands-manifest",getManifest:getSaturnBandsManifest,imageUrl:saturnBandsImageUrl},
  report,at,view,width,height,canvas,canvasRevision,active,paused);
}
