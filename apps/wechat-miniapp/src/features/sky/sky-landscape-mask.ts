import type { SkyLandscapeManifestData, SkyLandscapeResource } from "@starward/miniapp-contracts";
import { unprojectSkyPoint, skyProjectionScale, type SkyVector } from "./sky-view-projection";
import { skyLandscapeOccludes, skyLandscapeCoversRayHull, skyLandscapeIntersectsCap, SKY_LANDSCAPE_MAXIMUM_Z } from "./sky-landscape-geometry";
import { skyArtworkViewBounds, skyArtworkViewRayHull } from "./sky-artwork-visibility";
import type { SkyArtworkView } from "./sky-artwork-registration";
import { NO_SKY_INSETS, skyVisibleViewport, type SkyViewportInsets, type SkyCanvasBounds } from "./sky-viewport";

export interface SkyPanoramaMask {
  kind: "panorama";
  /** Effective alpha of the successful foreground pass; omitted means opaque. */
  opacity?: number;
  publication: SkyLandscapeManifestData;
  resource: SkyLandscapeResource;
  alpha: Uint8Array;
  /** Every row at/after this index is opaque. Holes raise the bound, never fill it. */
  opaqueFromRow: Uint16Array;
  /** First nonzero source alpha row; height means a genuinely empty panorama. */
  firstNonzeroAlphaRow: number;
}
export type SkyProceduralLandscapeMask = { kind: "procedural"; opacity?: number };
export type SkyLandscapeMask = SkyProceduralLandscapeMask | SkyPanoramaMask | {
  kind: "transition"; opacity?: number;
  /** Actual source-over passes, in drawing order; never an invented photo mask. */
  background: SkyProceduralLandscapeMask; foreground: SkyPanoramaMask;
};
export interface SkyLandscapePanorama {
  image: object; mask: SkyPanoramaMask;
  /** One already decoded same-publication overview, never another request or
   * a recursive history. A failed fine bitmap cannot erase independent pixels. */
  coarser?: { image:object; mask:SkyPanoramaMask } | null;
}
export const PROCEDURAL_SKY_LANDSCAPE: SkyLandscapeMask = { kind: "procedural" };

export function skyLandscapeMaskWithOpacity(mask: SkyLandscapeMask, opacity: number): SkyLandscapeMask {
  return opacity === (mask.opacity ?? 1) ? mask : { ...mask, opacity };
}

export function skyLandscapeHasPaintedModel(mask: SkyLandscapeMask | null | undefined): boolean {
  return Boolean(mask && (mask.opacity ?? 1) > 0 && (mask.kind === "procedural" ||
    mask.kind === "transition" && (mask.background.opacity ?? 1) > 0));
}

export function skyLandscapePaintedPanorama(mask: SkyLandscapeMask | null | undefined): SkyPanoramaMask | null {
  if (!mask || (mask.opacity ?? 1) <= 0) return null;
  const photo = mask?.kind === "transition" ? mask.foreground : mask?.kind === "panorama" ? mask : null;
  return photo && (photo.opacity ?? 1) > 0 ? photo : null;
}

/** Effective source-over alpha of the actual successful material passes. */
export function skyLandscapeMaskAlpha(mask: SkyLandscapeMask, ray: SkyVector): number {
  const opacity = mask.opacity ?? 1;
  if (mask.kind === "procedural") return opacity * (skyLandscapeOccludes(ray) ? 1 : 0);
  if (mask.kind === "panorama") return opacity * skyPanoramaAlpha(mask, ray) / 255;
  const foreground = skyLandscapeMaskAlpha(mask.foreground, ray);
  return opacity * (foreground + (1 - foreground) * skyLandscapeMaskAlpha(mask.background, ray));
}

export function createSkyPanoramaMask(publication: SkyLandscapeManifestData, resource: SkyLandscapeResource,
  alpha: Uint8Array): SkyPanoramaMask {
  const { width, height } = resource.image;
  if (alpha.length !== width * height) throw new Error("sky_landscape_mask_size_invalid");
  const opaqueFromRow = new Uint16Array(width);
  let firstNonzeroAlphaRow = height;
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const value = alpha[y * width + x]!;
    if (value !== 255) opaqueFromRow[x] = y + 1;
    if (value > 0 && firstNonzeroAlphaRow === height) firstNonzeroAlphaRow = y;
  }
  return { kind: "panorama", publication, resource, alpha, opaqueFromRow, firstNonzeroAlphaRow };
}

const wrap = (x: number, width: number) => (x % width + width) % width;
const clamp = (value: number, low: number, high: number) => Math.max(low, Math.min(high, value));

/** Reject only a viewport certified above every nonzero source alpha texel.
 * The shared spherical footprint encloses rolled/offset/curved view edges.
 * Retain LINEAR neighbours plus one texel and float-uniform uncertainty; wide
 * or invalid inputs stay eligible. This is source transparency, not terrain. */
export function skyPanoramaMaskIntersectsView(mask: SkyPanoramaMask, view: SkyArtworkView,
  width: number, height: number): boolean {
  const bounds = skyArtworkViewBounds(view, width, height);
  const first = mask.firstNonzeroAlphaRow, sourceHeight = mask.resource.image.height;
  if (!bounds || !Number.isInteger(first) || first < 0 || first > sourceHeight) return true;
  if (first === sourceHeight) return false;
  const highestAlphaAltitude = Math.PI / 2 - (first - 1.5) * Math.PI / sourceHeight;
  const lowestViewAltitude = Math.asin(clamp(bounds.center[2], -1, 1)) - bounds.radius;
  return lowestViewAltitude <= highestAlphaAltitude + 1e-6;
}

/** Gesture selection uses the accepted foreground and the same conservative
 * viewport boundary as rendering. Unknown geometry keeps horizon behaviour. */
export function skyLandscapeIntersectsView(mask: SkyLandscapeMask | null | undefined,
  view: SkyArtworkView, width: number, height: number): boolean {
  if (!mask || (mask.opacity ?? 1) <= 0) return false;
  if (mask.kind === "transition") return skyLandscapeIntersectsView(mask.background, view, width, height) ||
    skyLandscapeIntersectsView(mask.foreground, view, width, height);
  if (mask.kind === "panorama") return skyPanoramaMaskIntersectsView(mask, view, width, height);
  const bounds = skyArtworkViewBounds(view, width, height);
  return !bounds || Math.asin(clamp(bounds.center[2], -1, 1)) - bounds.radius <=
    Math.asin(SKY_LANDSCAPE_MAXIMUM_Z) + 1e-6;
}

/** Is there a visible orientation cue in this screen, rather than merely a
 * bounding cap touching it? Sample the actual source/model alpha on a bounded
 * screen grid once at gesture start. This interaction choice is not a new
 * rendering/picking mask or a claim about every subpixel silhouette. */
export function skyLandscapeVisibleInView(mask: SkyLandscapeMask | null | undefined,
  view: SkyArtworkView, width: number, height: number, insets: SkyViewportInsets = NO_SKY_INSETS): boolean {
  if (!mask || !skyLandscapeIntersectsView(mask, view, width, height)) return false;
  const visible = skyVisibleViewport(width, height, insets);
  if (!visible) return true;
  const columns = Math.max(1, Math.ceil(width / 24)), rows = Math.max(1, Math.ceil(visible.height / 24));
  for (let y = 0; y <= rows; y++) for (let x = 0; x <= columns; x++) {
    const ray = unprojectSkyPoint(x * width / columns, insets.top + y * visible.height / rows,
      view.basis, width, height, view.verticalFovDeg, view.center);
    if (!ray) return true;
    if (skyLandscapeMaskAlpha(mask, ray) > 1 / 255) return true;
  }
  return false;
}

/** Same texel-centred LINEAR sampling as the shader, including the horizontal seam. */
export function skyPanoramaAlpha(mask: SkyPanoramaMask, ray: SkyVector): number {
  const { width, height } = mask.resource.image;
  const length = Math.hypot(...ray);
  if (!Number.isFinite(length) || length <= 0) return 0;
  const u = wrap(Math.atan2(ray[0], ray[1]) / (2 * Math.PI) -
    mask.publication.projection.seamAzimuthDeg / 360, 1);
  const v = .5 - Math.asin(clamp(ray[2] / length, -1, 1)) / Math.PI;
  const px = u * width - .5, py = clamp(v * height - .5, 0, height - 1);
  const x = Math.floor(px), y = Math.floor(py), fx = px - x, fy = py - y;
  const sample = (dx: number, dy: number) => mask.alpha[clamp(y + dy, 0, height - 1) * width + wrap(x + dx, width)]!;
  return (sample(0, 0) * (1 - fx) + sample(1, 0) * fx) * (1 - fy) +
    (sample(0, 1) * (1 - fx) + sample(1, 1) * fx) * fy;
}

export function skyLandscapeMaskOccludes(mask: SkyLandscapeMask, ray: SkyVector): boolean {
  // Partially transparent foliage can leave an actual celestial fragment visible.
  return skyLandscapeMaskAlpha(mask, ray) >= 254.5 / 255;
}

/** Upper bound of the actual successful foreground alpha over a whole label
 * window, including its interior and curved stereographic edges. This does not
 * sample a few corners or substitute requested terrain for the painted mask. */
export function skyLandscapeWindowAlphaBound(mask: SkyLandscapeMask, view: SkyArtworkView,
  width: number, height: number, bounds: SkyCanvasBounds): number {
  if (![bounds.left,bounds.top,bounds.width,bounds.height,width,height].every(Number.isFinite) ||
    bounds.width<=0 || bounds.height<=0 || bounds.left<0 || bounds.top<0 ||
    bounds.left+bounds.width>width || bounds.top+bounds.height>height) return 1;
  const scale=skyProjectionScale(height,view.verticalFovDeg);
  const center=unprojectSkyPoint(bounds.left+bounds.width/2,bounds.top+bounds.height/2,
    view.basis,width,height,view.verticalFovDeg,view.center);
  if(!scale||!center)return 1;
  const cx=view.center?.x??width/2,cy=view.center?.y??height/2;
  const ux=[(bounds.left-cx)/scale,(bounds.left+bounds.width-cx)/scale];
  const vy=[(cy-bounds.top-bounds.height)/scale,(cy-bounds.top)/scale];
  const minSquared=(a:number[])=>a[0]!<=0&&a[1]!>=0?0:Math.min(a[0]!*a[0]!,a[1]!*a[1]!);
  // The inverse stereographic map stretches by 2/(1+u²+v²). Its maximum
  // on this rectangle times the longest centre-to-corner path encloses EVERY
  // interior ray. Float/LINEAR uncertainty is retained at the source boundary.
  const radius=Math.min(Math.PI,Math.hypot(bounds.width,bounds.height)/scale/
    (1+minSquared(ux)+minSquared(vy))+1e-6);
  // Reuse the existing rectangular ray-cone certificate where the window is
  // in the forward hemisphere. A positive convex cone cannot have a lower Z
  // than its least-positive unit vertex. This avoids treating opaque texels
  // below a clear word as though they were inside its circumcircle.
  const hull=skyArtworkViewRayHull({...view,
    verticalFovDeg:Math.atan(bounds.height/(2*scale))*720/Math.PI,
    center:{x:cx-bounds.left,y:cy-bounds.top}},bounds.width,bounds.height);
  const minimumZ=hull?.every(ray=>ray[2]>0)?Math.max(0,Math.min(...hull.map(ray=>ray[2]))-1e-6):undefined;
  let longitudes:readonly [number,number]|null=null;
  if(hull?.every(ray=>Math.hypot(ray[0],ray[1])>1e-7)){
    const angles=hull.map(ray=>wrap(Math.atan2(ray[0],ray[1]),2*Math.PI)).sort((a,b)=>a-b);
    let gap=-1,index=0;
    for(let i=0;i<angles.length;i++){
      const difference=(angles[(i+1)%angles.length]!+(i===angles.length-1?2*Math.PI:0))-angles[i]!;
      if(difference>gap){gap=difference;index=i;}
    }
    const span=2*Math.PI-gap;
    if(span<Math.PI-1e-6){const start=angles[(index+1)%angles.length]!;longitudes=[start-1e-6,start+span+1e-6];}
  }
  const alphaBound=(value:SkyLandscapeMask):number=>{
    const opacity=value.opacity??1;
    if(!Number.isFinite(opacity)||opacity<0||opacity>1)return 1;
    if(opacity===0)return 0;
    if(value.kind==='procedural')return opacity*(skyLandscapeIntersectsCap(center,radius,minimumZ)?1:0);
    if(value.kind==='transition'){
      const foreground=alphaBound(value.foreground),background=alphaBound(value.background);
      return opacity*(foreground+(1-foreground)*background);
    }
    const {width:sw,height:sh}=value.resource.image;
    if(!Number.isSafeInteger(sw)||!Number.isSafeInteger(sh)||sw<=0||sh<=0||value.alpha.length!==sw*sh)return 1;
    const altitude=Math.asin(clamp(center[2],-1,1));
    const firstRow=Math.max(0,Math.floor((.5-Math.min(Math.PI/2,altitude+radius)/Math.PI)*sh-.5)-1);
    const lowestAltitude=minimumZ===undefined?Math.max(-Math.PI/2,altitude-radius):Math.asin(minimumZ);
    const lastRow=Math.min(sh-1,Math.ceil((.5-lowestAltitude/Math.PI)*sh-.5)+1);
    if(lastRow<value.firstNonzeroAlphaRow)return 0;
    const allLongitudes=radius>=Math.PI/2||Math.abs(altitude)+radius>=Math.PI/2;
    const delta=allLongitudes?Math.PI:Math.asin(clamp(Math.sin(radius)/Math.cos(altitude),0,1));
    const seam=value.publication.projection.seamAzimuthDeg*Math.PI/180;
    const azimuth=Math.atan2(center[0],center[1]);
    if(!Number.isFinite(azimuth)||!Number.isFinite(seam))return 1;
    const firstAzimuth=(longitudes?.[0]??azimuth-delta)-seam,lastAzimuth=(longitudes?.[1]??azimuth+delta)-seam;
    const first=Math.floor(firstAzimuth/(2*Math.PI)*sw-.5)-1;
    const count=Math.min(sw,Math.ceil(lastAzimuth/(2*Math.PI)*sw-.5)+1-first+1);
    let maximum=0;
    // Reuse existing source certificates: rows before the first nonzero alpha
    // are empty, and every row at/after opaqueFromRow in a column is 255.
    // Neither shortcut adds a view trail, mask cache or sampled opacity rule.
    for(let x=0;x<count;x++){
      const column=wrap(first+x,sw),opaqueRow=value.opaqueFromRow[column];
      if(Number.isInteger(opaqueRow)&&opaqueRow!>=0&&opaqueRow!<sh&&lastRow>=opaqueRow!)return opacity;
      for(let y=Math.max(firstRow,value.firstNonzeroAlphaRow);y<=lastRow;y++){
        maximum=Math.max(maximum,value.alpha[y*sw+column]!);
        if(maximum===255)return opacity;
      }
    }
    return opacity*maximum/255;
  };
  return alphaBound(mask);
}

/** Certify an entire convex ray cone, never a union of sampled corner hits. */
export function skyLandscapeMaskCoversRayHull(mask: SkyLandscapeMask, rays: readonly SkyVector[] | null): boolean {
  if ((mask.opacity ?? 1) < 254.5 / 255) return false;
  if (mask.kind === "transition") return skyLandscapeMaskCoversRayHull(
    { ...mask.background, opacity: (mask.opacity ?? 1) * (mask.background.opacity ?? 1) }, rays) ||
    skyLandscapeMaskCoversRayHull(
      { ...mask.foreground, opacity: (mask.opacity ?? 1) * (mask.foreground.opacity ?? 1) }, rays);
  if (mask.kind === "procedural") return skyLandscapeCoversRayHull(rays);
  if (!rays?.length) return false;
  const sum: [number, number, number] = [0, 0, 0];
  for (const ray of rays) for (let i = 0; i < 3; i++) sum[i]! += ray[i]!;
  const length = Math.hypot(...sum);
  if (!Number.isFinite(length) || length < 1e-9) return false;
  const centre = sum.map(value => value / length) as unknown as SkyVector;
  const radius = Math.max(...rays.map(ray => Math.acos(clamp(
    ray.reduce((value, item, i) => value + item * centre[i]!, 0), -1, 1)))) + 1e-7;
  if (radius >= Math.PI / 2) return false;
  // Positive combinations of these rays remain in this <90° spherical cap.
  const altitude = Math.asin(clamp(centre[2], -1, 1));
  const { width, height } = mask.resource.image;
  const firstRow = Math.floor(clamp((.5 - Math.min(Math.PI / 2, altitude + radius) / Math.PI) * height - .5, 0, height - 1));
  const allLongitudes = Math.abs(altitude) + radius >= Math.PI / 2;
  const delta = allLongitudes ? Math.PI : Math.asin(clamp(Math.sin(radius) / Math.cos(altitude), 0, 1));
  const azimuth = Math.atan2(centre[0], centre[1]) - mask.publication.projection.seamAzimuthDeg * Math.PI / 180;
  const first = Math.floor((azimuth - delta) / (2 * Math.PI) * width - .5) - 1;
  const last = Math.ceil((azimuth + delta) / (2 * Math.PI) * width - .5) + 1;
  for (let x = first; x <= last; x++) if (firstRow < mask.opaqueFromRow[wrap(x, width)]!) return false;
  return true;
}
