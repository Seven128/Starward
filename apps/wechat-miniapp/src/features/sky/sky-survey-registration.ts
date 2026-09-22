import type { DeepSkyScenePoint } from "@starward/miniapp-contracts";
import { registerSkyArtwork } from "./sky-artwork-registration";
import type { SkyVector } from "./sky-view-projection";

const rad = Math.PI / 180;
const dot = (a: SkyVector, b: SkyVector) => a.reduce((sum, n, i) => sum + n * b[i]!, 0);
const unit = (v: SkyVector): SkyVector => v.map(n => n / Math.hypot(...v)) as unknown as SkyVector;
const direction = (az: number, alt: number): SkyVector =>
  [Math.sin(az * rad) * Math.cos(alt * rad), Math.cos(az * rad) * Math.cos(alt * rad), Math.sin(alt * rad)];

/** CDS TAN cutouts have CDELT=2*tan(fov/2)/N (radians) and FITS
 * CRPIX=N/2, not (N+1)/2. JPEG rows are reversed from FITS rows.
 * Recover the ICRS north tangent from the exact +0.1° declination sample;
 * the old RA-offset east sample is only a handedness check, not a tangent.
 * Equal-radius corner anchors lie on one plane after normalization, so the
 * existing inverse ray/plane shader preserves the full TAN mapping.
 */
export function registerSkySurvey(point: DeepSkyScenePoint, fieldDegrees: number, pixels: number) {
  if (!point.slice(1).every(Number.isFinite) || !Number.isFinite(fieldDegrees) || fieldDegrees <= 0 || fieldDegrees > 4 ||
    ![256, 512].includes(pixels)) return null;
  const c = direction(point[1], point[2]);
  const sample = direction(point[3], point[4]);
  const cosine = dot(c, sample);
  const tangent = sample.map((n, i) => n - cosine * c[i]!) as unknown as SkyVector;
  if (Math.abs(Math.acos(Math.max(-1, Math.min(1, cosine))) / rad - .1) > .00001) return null;
  const n = unit(tangent);
  const e: SkyVector = [n[1]*c[2]-n[2]*c[1], n[2]*c[0]-n[0]*c[2], n[0]*c[1]-n[1]*c[0]];
  if (dot(e, direction(point[5], point[6])) <= 0) return null;
  const half = Math.tan(fieldDegrees * rad / 2);
  const u0 = .5 - .5 / pixels, v0 = .5 + .5 / pixels;
  return registerSkyArtwork(([[-1,-1],[1,-1],[-1,1]] as const).map(([x,y]) => ({
    uv: [u0+x/2, v0+y/2] as const,
    direction: unit(c.map((v,i) => v - half*x*e[i]! - half*y*n[i]!) as unknown as SkyVector),
  })));
}
