import type { GalacticImageManifestData, SkyGeometryReport, SkyObservationFrame } from "@starward/miniapp-contracts";
import { exactSkyObservationFrame, skyEquatorialDirectionToEnu } from "./sky-observation-frame";
import { skySolarLightAt } from "./sky-solar-light";
import type { SkyVector } from "./sky-view-projection";

export interface SkyGalacticBand {
  /** Observer-frame directions, registered to the exact report instant. */
  pole: SkyVector;
  center: SkyVector;
  strength: number;
  /** Optical pixels may remain at narrow scales where the schematic is off. */
  schematicStrength?: number;
  /** Texture axes are independent of the Galactic schematic fallback. */
  imageProjection?: {pole:SkyVector;center:SkyVector;smoothInfraredPointSources:boolean;display?:"optical"};
}

/** The conditional optical bitmap's J2000 axes use the same exact observer
 * transform as the rest of the Scene. A failed image still falls back to the
 * original Galactic band, never an equatorial band. */
export function skyGalacticImageBand(report:Pick<SkyGeometryReport,"hourly"|"observationFrames">,
  at:string|undefined,band:SkyGalacticBand,publication:GalacticImageManifestData):SkyGalacticBand|null {
  if(publication.schemaVersion==="starward-2mass-galactic-v1")return band;
  const frame=exactSkyObservationFrame(report,at);
  if(!frame)return null;
  return withOpticalAxes(band,frame);
}

function withOpticalAxes(band:SkyGalacticBand,frame:SkyObservationFrame):SkyGalacticBand {
  return {...band,imageProjection:{
    pole:skyEquatorialDirectionToEnu(frame.equatorialToEnu,[0,0,1]),
    center:skyEquatorialDirectionToEnu(frame.equatorialToEnu,[0,-1,0]),
    smoothInfraredPointSources:false,
    display:"optical",
  }};
}

// Canonical ICRS Galactic axes from ERFA's ICRS-to-Galactic definition:
// https://github.com/liberfa/erfa/blob/master/src/icrs2g.c
// They locate the schematic fallback and register the historical 2MASS image.
// No Gaia catalog rows, ESA image, or measured visible brightness is used.
const NORTH_GALACTIC_POLE: SkyVector = [-0.8676661490, -0.1980763734, 0.4559837762];
const GALACTIC_CENTER: SkyVector = [-0.0548755604, -0.8734370902, -0.4838350155];

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

/** Resolve the exact observation once for this job. Schematic, optional image
 * and the Scene's other sky layers share it; no cross-report validation cache. */
export function resolveSkyGalacticView(report: Pick<SkyGeometryReport, "hourly" | "observationFrames"> | undefined,
  at: string | undefined, verticalFovDeg: number, publication?: GalacticImageManifestData) {
  const observation = exactSkyObservationFrame(report, at);
  const sun = skySolarLightAt(report?.hourly, at);
  const result: {observation:SkyObservationFrame|null; schematic:SkyGalacticBand|null; image:SkyGalacticBand|null} =
    {observation,schematic:null,image:null};
  if (!observation || !sun || !Number.isFinite(verticalFovDeg)) return result;
  const strength = clamp01((-sun.altitudeDeg - 12) / 6);
  if (strength <= 0) return result;
  const band:SkyGalacticBand = {
    pole: skyEquatorialDirectionToEnu(observation.equatorialToEnu, NORTH_GALACTIC_POLE),
    center: skyEquatorialDirectionToEnu(observation.equatorialToEnu, GALACTIC_CENTER),
    strength,
  };
  const schematicStrength = strength * clamp01((verticalFovDeg - 12) / 20);
  if (schematicStrength > 0) result.schematic = {...band,strength:schematicStrength};
  if (verticalFovDeg > 0) {
    if (publication?.schemaVersion === "starward-2mass-galactic-v1") result.image = result.schematic;
    else {
      const optical = {...band,schematicStrength};
      result.image = publication ? withOpticalAxes(optical,observation) : optical;
    }
  }
  return result;
}

/** Schematic Galactic-plane orientation; not a licensed all-sky image.
 * Suppress it whenever the observer/time, solar darkness or useful view scale
 * is unavailable rather than recycling a prior frame. */
export function skyGalacticBandAt(report: Pick<SkyGeometryReport, "hourly" | "observationFrames"> | undefined,
  at: string | undefined, verticalFovDeg: number): SkyGalacticBand | null {
  return resolveSkyGalacticView(report,at,verticalFovDeg).schematic;
}

/** The low-resolution optical panorama is a display background at every valid
 * scale. Magnification supplies no new resolution or registration guarantee.
 * Unknown discovery must be requested even on a cold narrow entry; once known,
 * the historical infrared publication retains its original wide-only rule. */
export function skyGalacticImageBandAt(report: Pick<SkyGeometryReport, "hourly" | "observationFrames"> | undefined,
  at: string | undefined, verticalFovDeg: number, publication?: GalacticImageManifestData): SkyGalacticBand | null {
  return resolveSkyGalacticView(report,at,verticalFovDeg,publication).image;
}

/** IPAC's 2MASS equirectangular panorama has Galactic l=0 at image center,
 * longitude increasing to the left and Galactic north at the top. The GPU
 * uploads without UNPACK_FLIP_Y_WEBGL, so v=0 addresses the source top row. */
export function galacticEquirectUv(direction:SkyVector,pole:SkyVector,center:SkyVector):readonly [number,number]{
  const east:SkyVector=[pole[1]*center[2]-pole[2]*center[1],
    pole[2]*center[0]-pole[0]*center[2],pole[0]*center[1]-pole[1]*center[0]];
  const dot=(other:SkyVector)=>direction[0]*other[0]+direction[1]*other[1]+direction[2]*other[2];
  const latitude=Math.asin(Math.max(-1,Math.min(1,dot(pole))));
  const longitude=Math.atan2(dot(east),dot(center));
  return [0.5-longitude/(2*Math.PI),0.5-latitude/Math.PI];
}
