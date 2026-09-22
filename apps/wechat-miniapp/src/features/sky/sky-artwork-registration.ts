import { skyProjectionScale, validBasis, type SkyVector, type SkyViewBasis } from "./sky-view-projection";
import type { SkyProjectionCenter } from "./sky-viewport";

export interface SkyArtworkAnchor {
  /** Source image coordinates, normalized from its original pixel anchors. */
  readonly uv: readonly [number, number];
  /** Actual selected instant/location direction, in the same ENU frame as stars. */
  readonly direction: SkyVector;
}
export interface SkyArtworkRegistration {
  readonly rows: readonly [SkyVector, SkyVector, SkyVector];
  readonly determinant: number;
  readonly anchorU: SkyVector;
  readonly anchorV: SkyVector;
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
  const [a,b,c] = anchors as readonly [SkyArtworkAnchor, SkyArtworkAnchor, SkyArtworkAnchor];
  const uvArea = (b.uv[0]-a.uv[0])*(c.uv[1]-a.uv[1])-(c.uv[0]-a.uv[0])*(b.uv[1]-a.uv[1]);
  const rows = [cross(b.direction,c.direction), cross(c.direction,a.direction), cross(a.direction,b.direction)] as const;
  const determinant = dot(a.direction,rows[0]);
  if (Math.abs(uvArea) < 1e-10 || Math.abs(determinant) < 1e-10) return null;
  const directionAt = (u: number,v: number): SkyVector | null => {
    const wb=((u-a.uv[0])*(c.uv[1]-a.uv[1])-(v-a.uv[1])*(c.uv[0]-a.uv[0]))/uvArea;
    const wc=((b.uv[0]-a.uv[0])*(v-a.uv[1])-(b.uv[1]-a.uv[1])*(u-a.uv[0]))/uvArea;
    const vector=a.direction.map((n,i)=>(1-wb-wc)*n+wb*b.direction[i]!+wc*c.direction[i]!) as unknown as SkyVector;
    const length=Math.hypot(...vector);
    return length > 1e-10 ? vector.map(n=>n/length) as unknown as SkyVector : null;
  };
  const center=directionAt(.5,.5),corners=[[0,0],[1,0],[0,1],[1,1]].map(([u,v])=>directionAt(u!,v!));
  if (!center || corners.some(c=>!c)) return null;
  const radius=Math.max(...corners.map(c=>Math.acos(Math.max(-1,Math.min(1,dot(center,c!))))));
  // A <90° cap is convex, so the normalized affine image plane stays within
  // the corner bound. For a wider set conservatively disable cap culling.
  const bounds=Object.freeze({center:Object.freeze(center),radius:radius < Math.PI/2 ? radius : Math.PI});
  rows.forEach(Object.freeze);
  return Object.freeze({ rows:Object.freeze(rows), determinant,bounds,
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
