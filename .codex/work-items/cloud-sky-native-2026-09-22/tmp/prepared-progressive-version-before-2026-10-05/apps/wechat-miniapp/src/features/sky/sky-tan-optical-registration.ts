import { assertStellarRotation, type SkyObservationFrame } from "@starward/miniapp-contracts";
import { registerSkyArtworkPlane } from "./sky-artwork-registration";
import { skyEquatorialDirectionToEnu } from "./sky-observation-frame";
import type { SkyVector } from "./sky-view-projection";

export interface SkyTanOpticalAsset { readonly fieldDegrees: number; readonly pixels: 512; readonly crpixFitsOneBased: 256.5 }
export interface SkyTanOpticalPublication {
  readonly center: { readonly raDeg: number; readonly decDeg: number; readonly frame: "ICRS J2000" };
  readonly orientation: "north-up/east-left";
  readonly levels: Readonly<Record<string, SkyTanOpticalAsset>>;
}

/** Geometry of an already admitted TAN field in the report's actual frame.
 * This preserves the publication's linear TAN approximation, not a claim that
 * the original source distortion or scientific validity has been verified.
 * The ready descriptor must belong to this publication. Catalog rounded centers
 * and +0.1-degree north samples do not define this field's pixel coordinates.
 */
export function registerSkyTanOpticalField(publication: SkyTanOpticalPublication,
  asset: SkyTanOpticalAsset, observation: SkyObservationFrame | null) {
  if (!observation || !Object.values(publication.levels).includes(asset) ||
    publication.orientation !== "north-up/east-left" || publication.center.frame !== "ICRS J2000" ||
    ![publication.center.raDeg, publication.center.decDeg, asset.fieldDegrees].every(Number.isFinite) ||
    publication.center.raDeg < 0 || publication.center.raDeg >= 360 || Math.abs(publication.center.decDeg) > 90 ||
    asset.fieldDegrees <= 0 || asset.fieldDegrees >= 180 || asset.pixels !== 512 || asset.crpixFitsOneBased !== 256.5) return null;
  try { assertStellarRotation(observation.equatorialToEnu); } catch { return null; }
  const rad = Math.PI / 180, ra = publication.center.raDeg * rad, dec = publication.center.decDeg * rad;
  const c: SkyVector = [Math.cos(dec) * Math.cos(ra), Math.cos(dec) * Math.sin(ra), Math.sin(dec)];
  const e: SkyVector = [-Math.sin(ra), Math.cos(ra), 0];
  const n: SkyVector = [-Math.sin(dec) * Math.cos(ra), -Math.sin(dec) * Math.sin(ra), Math.cos(dec)];
  const half = Math.tan(asset.fieldDegrees * rad / 2);
  const u0 = (asset.crpixFitsOneBased - .5) / asset.pixels, v0 = 1 - u0;
  return registerSkyArtworkPlane(([[0, 0], [1, 0], [0, 1]] as const).map(uv => {
    const raw = c.map((value, i) => value - 2 * half * (uv[0] - u0) * e[i]! -
      2 * half * (uv[1] - v0) * n[i]!) as unknown as SkyVector;
    // Preserve the same affine plane through the actual report rotation. A
    // separately normalized corner would lose its homogeneous length when the
    // admitted rotation has finite numerical non-orthogonality.
    return { uv, point: skyEquatorialDirectionToEnu(observation.equatorialToEnu, raw) };
  }));
}
