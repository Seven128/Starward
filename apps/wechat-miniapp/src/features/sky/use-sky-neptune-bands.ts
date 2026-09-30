import type {SkyGeometryReport} from "@starward/miniapp-contracts";
import {getNeptuneBandsManifest,neptuneBandsImageUrl} from "@/services/neptune-bands-client";
import {useSkyOpalBands} from "./use-sky-opal-bands";
import type {SkyArtworkView} from "./sky-artwork-registration";
import type {SkyArtworkCanvas} from "./sky-artwork-request";

/** A licensed historical latitude profile, not current longitudinal weather. */
export function useSkyNeptuneBands(report:Pick<SkyGeometryReport,"hourly">|undefined,at:string|undefined,
  view:SkyArtworkView|null,width:number,height:number,canvas:SkyArtworkCanvas|null,
  canvasRevision:number,active:boolean){
  return useSkyOpalBands({body:"NEPTUNE",id:"neptune:opal-2025b-bands",
    queryKey:"neptune-bands-manifest",getManifest:getNeptuneBandsManifest,imageUrl:neptuneBandsImageUrl},
  report,at,view,width,height,canvas,canvasRevision,active);
}
