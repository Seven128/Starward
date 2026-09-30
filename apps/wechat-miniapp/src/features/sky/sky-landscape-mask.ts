import type { SkyLandscapeManifestData, SkyLandscapeResource } from "@starward/miniapp-contracts";
import type { SkyVector } from "./sky-view-projection";
import { skyLandscapeOccludes, skyLandscapeCoversRayHull } from "./sky-landscape-geometry";

export interface SkyPanoramaMask {
  kind: "panorama";
  publication: SkyLandscapeManifestData;
  resource: SkyLandscapeResource;
  alpha: Uint8Array;
  /** Every row at/after this index is opaque. Holes raise the bound, never fill it. */
  opaqueFromRow: Uint16Array;
}
export type SkyLandscapeMask = { kind: "procedural" } | SkyPanoramaMask;
export interface SkyLandscapePanorama { image: object; mask: SkyPanoramaMask }
export const PROCEDURAL_SKY_LANDSCAPE: SkyLandscapeMask = { kind: "procedural" };

export function createSkyPanoramaMask(publication: SkyLandscapeManifestData, resource: SkyLandscapeResource,
  alpha: Uint8Array): SkyPanoramaMask {
  const { width, height } = resource.image;
  if (alpha.length !== width * height) throw new Error("sky_landscape_mask_size_invalid");
  const opaqueFromRow = new Uint16Array(width);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++)
    if (alpha[y * width + x] !== 255) opaqueFromRow[x] = y + 1;
  return { kind: "panorama", publication, resource, alpha, opaqueFromRow };
}

const wrap = (x: number, width: number) => (x % width + width) % width;
const clamp = (value: number, low: number, high: number) => Math.max(low, Math.min(high, value));

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
  return mask.kind === "procedural" ? skyLandscapeOccludes(ray) : skyPanoramaAlpha(mask, ray) >= 254.5;
}

/** Certify an entire convex ray cone, never a union of sampled corner hits. */
export function skyLandscapeMaskCoversRayHull(mask: SkyLandscapeMask, rays: readonly SkyVector[] | null): boolean {
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
