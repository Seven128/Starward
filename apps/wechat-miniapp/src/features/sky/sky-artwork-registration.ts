import { skyProjectionScale, validBasis, type SkyVector, type SkyViewBasis } from "./sky-view-projection";
import type { SkyProjectionCenter } from "./sky-viewport";

export interface SkyArtworkAnchor {
  /** Source image coordinates, normalized from its original pixel anchors. */
  readonly uv: readonly [number, number];
  /** Actual selected instant/location direction, in the same ENU frame as stars. */
  readonly direction: SkyVector;
}
export interface SkyArtworkPlaneAnchor {
  readonly uv: readonly [number, number];
  /** Raw points in one affine image plane. Their lengths are homogeneous
   * weights, not independently normalized ray directions. */
  readonly point: SkyVector;
}
export interface SkyArtworkRegistration {
  readonly rows: readonly [SkyVector, SkyVector, SkyVector];
  readonly determinant: number;
  readonly anchorU: SkyVector;
  readonly anchorV: SkyVector;
  /** Corner rays of the same affine image plane, in UV winding order. */
  readonly corners: readonly SkyVector[];
  /** Conservative spherical cap of the whole image, independent of a label. */
  readonly bounds: { readonly center: SkyVector; readonly radius: number };
}
export interface SkyArtworkView {
  readonly basis: SkyViewBasis;
  readonly verticalFovDeg: number;
  readonly center?: SkyProjectionCenter;
}

const dot = (a: SkyVector, b: SkyVector) => a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
const cross = (a: SkyVector, b: SkyVector): SkyVector =>
  [a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0]];

/** Three real anchors define a texture plane, not a camera-facing billboard.
 * The inverse map is valid beyond the anchors themselves, including an image
 * whose anchors/label are off screen. No nearest-star or center-point fallback.
 */
export function registerSkyArtwork(anchors: readonly SkyArtworkAnchor[]): SkyArtworkRegistration | null {
  if (anchors.length !== 3 || anchors.some(a => a.uv.length !== 2 || a.direction.length !== 3 ||
    ![...a.uv, ...a.direction].every(Number.isFinite) || Math.abs(Math.hypot(...a.direction)-1) > 1e-6)) return null;
  return registerSkyArtworkPlane(anchors.map(a => ({ uv: a.uv, point: a.direction })));
}

/** The inverse/UV/bounds owner also accepts a known raw image plane. This
 * preserves unequal homogeneous lengths after a finite report transform;
 * normalizing each point first would alter off-anchor pixel coordinates.
 * The existing unit-ray entry keeps its original validation and meaning.
 */
export function registerSkyArtworkPlane(anchors: readonly SkyArtworkPlaneAnchor[]): SkyArtworkRegistration | null {
  if (anchors.length !== 3 || anchors.some(a => a.uv.length !== 2 || a.point.length !== 3 ||
    ![...a.uv, ...a.point].every(Number.isFinite) || !Number.isFinite(Math.hypot(...a.point)) ||
    Math.hypot(...a.point) <= 1e-10)) return null;
  const [a,b,c] = anchors as readonly [SkyArtworkPlaneAnchor, SkyArtworkPlaneAnchor, SkyArtworkPlaneAnchor];
  const uvArea = (b.uv[0]-a.uv[0])*(c.uv[1]-a.uv[1])-(c.uv[0]-a.uv[0])*(b.uv[1]-a.uv[1]);
  const rows = [cross(b.point,c.point), cross(c.point,a.point), cross(a.point,b.point)] as const;
  const determinant = dot(a.point,rows[0]);
  if (!Number.isFinite(uvArea) || !Number.isFinite(determinant) ||
    rows.some(row => !row.every(Number.isFinite)) || Math.abs(uvArea) < 1e-10 || Math.abs(determinant) < 1e-10) return null;
  const directionAt = (u: number,v: number): SkyVector | null => {
    const wb=((u-a.uv[0])*(c.uv[1]-a.uv[1])-(v-a.uv[1])*(c.uv[0]-a.uv[0]))/uvArea;
    const wc=((b.uv[0]-a.uv[0])*(v-a.uv[1])-(b.uv[1]-a.uv[1])*(u-a.uv[0]))/uvArea;
    const vector=a.point.map((n,i)=>(1-wb-wc)*n+wb*b.point[i]!+wc*c.point[i]!) as unknown as SkyVector;
    const length=Math.hypot(...vector);
    return Number.isFinite(length) && length > 1e-10 ? vector.map(n=>n/length) as unknown as SkyVector : null;
  };
  const center=directionAt(.5,.5),corners=[[0,0],[1,0],[1,1],[0,1]].map(([u,v])=>directionAt(u!,v!));
  if (!center || corners.some(c=>!c)) return null;
  const radius=Math.max(...corners.map(c=>Math.acos(Math.max(-1,Math.min(1,dot(center,c!))))));
  // A <90° cap is convex, so the normalized affine image plane stays within
  // the corner bound. For a wider set conservatively disable cap culling.
  const bounds=Object.freeze({center:Object.freeze(center),radius:radius < Math.PI/2 ? radius : Math.PI});
  rows.forEach(Object.freeze);
  return Object.freeze({ rows:Object.freeze(rows), determinant,bounds,
    corners:Object.freeze(corners.map(c=>Object.freeze(c!))),
    anchorU:Object.freeze([a.uv[0],b.uv[0],c.uv[0]] as const), anchorV:Object.freeze([a.uv[1],b.uv[1],c.uv[1]] as const) });
}

/** Same inverse ray/plane relationship as the shader; useful for bounds/picking
 * of the artwork itself. Stars keep their independent factual identity.
 */
export function skyArtworkUvAtDirection(registration: SkyArtworkRegistration, direction: SkyVector): readonly [number, number] | null {
  if (!direction.every(Number.isFinite)) return null;
  const coefficients = registration.rows.map(row => dot(row,direction)) as unknown as SkyVector;
  const sum = coefficients[0]+coefficients[1]+coefficients[2];
  if (Math.abs(sum) < 1e-10 || registration.determinant/sum <= 0) return null;
  return [dot(coefficients,registration.anchorU)/sum, dot(coefficients,registration.anchorV)/sum];
}

/** Logical-pixel parameters shared with star projection; DPR is a GPU boundary. */
export function skyArtworkViewParameters(view: SkyArtworkView, width: number, height: number) {
  const scale = skyProjectionScale(height,view.verticalFovDeg);
  const center = view.center ?? { x: width/2, y: height/2 };
  return validBasis(view.basis) && Number.isFinite(width) && width > 0 && scale !== null &&
    [center.x,center.y].every(Number.isFinite) ? { scale, center } : null;
}
