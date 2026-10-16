import { WEB_MERCATOR_MAX_LATITUDE } from "@starward/coordinate-system";
import type { TerrainBounds, TerrainOverlayRequest } from "@starward/miniapp-contracts";
import type { TerrainPublication } from "./terrain-publication.ts";

export const TERRAIN_RENDER_VERSION = "glo30-cn-v1";
export const TERRAIN_LEGACY_MAP_RENDER_VERSION = "glo30-cn-v2-map";
export const TERRAIN_MAP_RENDER_VERSION = "glo30-cn-v3-map";
export const TERRAIN_VIEWPORT_RENDER_VERSION = "terrarium-cn-v1-map";
export const TERRAIN_SUPPORTED_BOUNDS: TerrainBounds = { west: 72.004, south: 0.8293, east: 137.8347, north: 55.8271 };
export interface RenderedTerrain { publication: TerrainPublication; bytes: Buffer }
/** Only the asset owner may recover the previous immutable Map representation. */
export type TerrainRenderRequest = TerrainOverlayRequest & { renderVersion?: typeof TERRAIN_LEGACY_MAP_RENDER_VERSION };
export type TerrainRenderer = (input: TerrainRenderRequest, signal: AbortSignal) => Promise<RenderedTerrain | null>;

export function validateTerrainRequest(input: TerrainOverlayRequest) {
  const { latitude, longitude } = input.center;
  if ((input.purpose !== "MAP" && input.purpose !== "SPOT") || input.center.system !== "GCJ02" || !Number.isFinite(latitude) || latitude < -90 || latitude > 90
    || !Number.isFinite(longitude) || longitude < -180 || longitude > 180) throw new Error("terrain_overlay_request_invalid");
  if (input.viewportBounds) {
    const b = input.viewportBounds;
    if (input.purpose !== "MAP" || input.radiusKm !== undefined
      || !Object.values(b).every(Number.isFinite) || b.west < -180 || b.east > 180
      || b.south < -WEB_MERCATOR_MAX_LATITUDE - 1e-7 || b.north > WEB_MERCATOR_MAX_LATITUDE + 1e-7
      || b.west >= b.east || b.south >= b.north || longitude < b.west || longitude > b.east
      || latitude < b.south || latitude > b.north) throw new Error("terrain_overlay_request_invalid");
  } else if (!Number.isFinite(input.radiusKm) || input.radiusKm! < 2 || input.radiusKm! > 50)
    throw new Error("terrain_overlay_request_invalid");
}

export function normalizeTerrainRequest(input: TerrainRenderRequest): TerrainRenderRequest {
  const center = { system: "GCJ02" as const, latitude: Math.round(input.center.latitude * 1e7) / 1e7,
    longitude: Math.round(input.center.longitude * 1e7) / 1e7 };
  if (input.viewportBounds) {
    const b = input.viewportBounds;
    return { purpose: "MAP", center, viewportBounds: {
      // Tolerance is below a micrometre and only absorbs floating-point noise
      // when an exact seven-decimal immutable identity is reconstructed.
      west: Math.floor(b.west * 1e7 + 1e-6) / 1e7, south: Math.floor(b.south * 1e7 + 1e-6) / 1e7,
      east: Math.ceil(b.east * 1e7 - 1e-6) / 1e7, north: Math.ceil(b.north * 1e7 - 1e-6) / 1e7,
    } };
  }
  return { ...input, center, radiusKm: Math.ceil(input.radiusKm! * 1000 - 1e-8) / 1000 };
}

export function terrainBounds(input: TerrainOverlayRequest): TerrainBounds {
  if (input.viewportBounds) return input.viewportBounds;
  const latDelta = input.radiusKm! / 111.32;
  const lonDelta = latDelta / Math.cos(input.center.latitude * Math.PI / 180);
  return { west: input.center.longitude - lonDelta, south: input.center.latitude - latDelta,
    east: input.center.longitude + lonDelta, north: input.center.latitude + latDelta };
}

export function terrainRenderVersion(input: TerrainRenderRequest) {
  return input.viewportBounds ? TERRAIN_VIEWPORT_RENDER_VERSION
    : input.purpose === "MAP" ? input.renderVersion ?? TERRAIN_MAP_RENDER_VERSION : TERRAIN_RENDER_VERSION;
}

// Positive offset integers keep viewport identities reconstructible, including
// southern/western edges. Every bound participates in cache and immutable URLs.
const encode = (value: number, offset: number) => Math.round((value + offset) * 1e7);
export function terrainRequestKey(input: TerrainRenderRequest) {
  const canonical = normalizeTerrainRequest(input), version = terrainRenderVersion(canonical);
  if (canonical.viewportBounds) {
    const b = canonical.viewportBounds;
    return `${version}-${encode(canonical.center.latitude, 90)}-${encode(canonical.center.longitude, 180)}-${encode(b.west, 180)}-${encode(b.south, 90)}-${encode(b.east, 180)}-${encode(b.north, 90)}`;
  }
  return `${version}-${Math.round(canonical.center.latitude * 1e7)}-${Math.round(canonical.center.longitude * 1e7)}-${Math.round(canonical.radiusKm! * 1000)}`;
}

export function terrainLocationIsSupported(input: TerrainOverlayRequest) {
  const b = input.viewportBounds, s = TERRAIN_SUPPORTED_BOUNDS;
  return b ? b.west < s.east && b.east > s.west && b.south < s.north && b.north > s.south
    : input.center.latitude >= s.south && input.center.latitude <= s.north
      && input.center.longitude >= s.west && input.center.longitude <= s.east;
}
