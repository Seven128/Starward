import type { SkyGeometryReport } from "@starward/miniapp-contracts";
import { exactSkyObservationFrame, skyEquatorialDirectionToEnu } from "./sky-observation-frame";
import { skySolarLightAt } from "./sky-solar-light";
import type { SkyVector } from "./sky-view-projection";

export interface SkyGalacticBand {
  /** Observer-frame directions, registered to the exact report instant. */
  pole: SkyVector;
  center: SkyVector;
  strength: number;
}

// Canonical ICRS Galactic axes from ERFA's ICRS-to-Galactic definition:
// https://github.com/liberfa/erfa/blob/master/src/icrs2g.c
// They locate the schematic fallback and register the historical 2MASS image.
// No Gaia catalog rows, ESA image, or measured visible brightness is used.
const NORTH_GALACTIC_POLE: SkyVector = [-0.8676661490, -0.1980763734, 0.4559837762];
const GALACTIC_CENTER: SkyVector = [-0.0548755604, -0.8734370902, -0.4838350155];

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

/** Schematic Galactic-plane orientation; not a licensed all-sky image.
 * Suppress it whenever the observer/time, solar darkness or useful view scale
 * is unavailable rather than recycling a prior frame. */
export function skyGalacticBandAt(report: Pick<SkyGeometryReport, "hourly" | "observationFrames"> | undefined,
  at: string | undefined, verticalFovDeg: number): SkyGalacticBand | null {
  if (!report || !Number.isFinite(verticalFovDeg)) return null;
  const frame = exactSkyObservationFrame(report, at);
  const sun = skySolarLightAt(report.hourly, at);
  if (!frame || !sun) return null;
  const darkness = clamp01((-sun.altitudeDeg - 12) / 6);
  const viewScale = clamp01((verticalFovDeg - 12) / 20);
  const strength = darkness * viewScale;
  if (strength <= 0) return null;
  return {
    pole: skyEquatorialDirectionToEnu(frame.equatorialToEnu, NORTH_GALACTIC_POLE),
    center: skyEquatorialDirectionToEnu(frame.equatorialToEnu, GALACTIC_CENTER),
    strength,
  };
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
