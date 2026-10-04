import type { SkyLandscapeManifestData, SkyLandscapeResource } from "@starward/miniapp-contracts";
import type { SkyVector } from "./sky-view-projection";
import { skyLandscapeOccludes, skyLandscapeCoversRayHull } from "./sky-landscape-geometry";
import { skyArtworkViewBounds } from "./sky-artwork-visibility";
import type { SkyArtworkView } from "./sky-artwork-registration";

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
export interface SkyLandscapePanorama { image: object; mask: SkyPanoramaMask }
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
