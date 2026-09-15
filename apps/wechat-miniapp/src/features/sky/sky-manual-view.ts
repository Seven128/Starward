import type { SkyVector, SkyViewBasis } from "./sky-view-projection";

export interface SkyScreenPoint { x: number; y: number }
const dot = (a: SkyVector, b: SkyVector) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: SkyVector, b: SkyVector): SkyVector => [a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0]];
const unit = (v: SkyVector): SkyVector => { const n = Math.hypot(...v); return [v[0]/n, v[1]/n, v[2]/n]; };

/** Rotate the camera so the originally grabbed sky ray follows the finger.
 * Uses the same perspective as projectSkyDirection; never translates the
 * observer, changes time, or converts a manual direction into a device pose.
 * Each move uses the gesture-start basis, so reversing returns exactly home.
 */
export function dragSkyView(basis: SkyViewBasis, start: SkyScreenPoint, end: SkyScreenPoint,
  width: number, height: number, verticalFovDeg: number): SkyViewBasis {
  if (![start.x,start.y,end.x,end.y,width,height,verticalFovDeg].every(Number.isFinite) ||
    width <= 0 || height <= 0 || verticalFovDeg <= 0 || verticalFovDeg >= 180) return basis;
  const focal = height / (2 * Math.tan(verticalFovDeg * Math.PI / 360));
  const ray = (p: SkyScreenPoint): SkyVector => unit([0,1,2].map(i =>
    basis.forward[i]! + basis.right[i]! * (p.x-width/2)/focal + basis.up[i]! * (height/2-p.y)/focal) as unknown as SkyVector);
  const from = ray(end), to = ray(start);
  const product = cross(from, to), sine = Math.hypot(...product), cosine = Math.max(-1, Math.min(1, dot(from,to)));
  if (sine < 1e-12) return basis;
  const axis = unit(product);
  const rotate = (v: SkyVector): SkyVector => {
    const perpendicular = cross(axis,v), along = dot(axis,v) * (1-cosine);
    return [0,1,2].map(i => v[i]! * cosine + perpendicular[i]! * sine + axis[i]! * along) as unknown as SkyVector;
  };
  return { right: rotate(basis.right), up: rotate(basis.up), forward: rotate(basis.forward) };
}

/** Manual default is explicitly a view north/up, never a sensor reading. */
export const INITIAL_MANUAL_SKY_VIEW: SkyViewBasis = {
  right: [1,0,0], up: [0,-Math.SQRT1_2,Math.SQRT1_2], forward: [0,Math.SQRT1_2,Math.SQRT1_2],
};
