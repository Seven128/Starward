import { WEB_MERCATOR_MAX_LATITUDE, displayRasterBounds, displayRasterRegionForBounds, displayRasterRegionKey,
  displayRasterWindowForBounds, displayRasterWindowBounds, displayRasterWindowKey, normalizeDisplayRasterBounds,
  type DisplayRasterRegion, type DisplayRasterWindow } from "@starward/coordinate-system";
import { MAP_TERRAIN_SUPPORTED_BOUNDS, terrainMapBoundsAreSupported, type TerrainBounds, type TerrainOverlayRequest } from "@starward/miniapp-contracts";
import type { TerrainPublication } from "./terrain-publication.ts";

export const TERRAIN_RENDER_VERSION = "glo30-cn-v1";
export const TERRAIN_LEGACY_MAP_RENDER_VERSION = "glo30-cn-v2-map";
export const TERRAIN_MAP_RENDER_VERSION = "glo30-cn-v3-map";
export const TERRAIN_VIEWPORT_RENDER_VERSION = "terrarium-cn-v1-map";
export const TERRAIN_FIXED_RENDER_VERSION = "terrarium-cn-v2-fixed";
export const TERRAIN_WINDOW_RENDER_VERSION = "terrarium-cn-v2-window";
export const TERRAIN_SUPPORTED_BOUNDS = MAP_TERRAIN_SUPPORTED_BOUNDS;
export interface RenderedTerrain { publication: TerrainPublication; bytes: Buffer }
/** Only the asset owner may recover the previous immutable Map representation. */
export type TerrainRenderRequest = TerrainOverlayRequest & { renderVersion?: typeof TERRAIN_LEGACY_MAP_RENDER_VERSION;
  fixedRaster?: DisplayRasterRegion; fixedWindow?: DisplayRasterWindow };
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
  if (input.fixedWindow) return terrainWindowRequest(input.fixedWindow);
  if (input.fixedRaster) return terrainFixedRequest(input.fixedRaster);
  const center = { system: "GCJ02" as const, latitude: Math.round(input.center.latitude * 1e7) / 1e7,
    longitude: Math.round(input.center.longitude * 1e7) / 1e7 };
  if (input.viewportBounds) {
    return { purpose: "MAP", center, viewportBounds: normalizeDisplayRasterBounds(input.viewportBounds) };
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
  return input.fixedWindow ? TERRAIN_WINDOW_RENDER_VERSION : input.fixedRaster ? TERRAIN_FIXED_RENDER_VERSION : input.viewportBounds ? TERRAIN_VIEWPORT_RENDER_VERSION
    : input.purpose === "MAP" ? input.renderVersion ?? TERRAIN_MAP_RENDER_VERSION : TERRAIN_RENDER_VERSION;
}

// Positive offset integers keep viewport identities reconstructible, including
// southern/western edges. Every bound participates in cache and immutable URLs.
const encode = (value: number, offset: number) => Math.round((value + offset) * 1e7);
export function terrainRequestKey(input: TerrainRenderRequest) {
  const canonical = normalizeTerrainRequest(input), version = terrainRenderVersion(canonical);
  if (canonical.fixedWindow) return `${version}-${displayRasterWindowKey(canonical.fixedWindow)}`;
  if (canonical.fixedRaster) return `${version}-${displayRasterRegionKey(canonical.fixedRaster)}`;
  if (canonical.viewportBounds) {
    const b = canonical.viewportBounds;
    return `${version}-${encode(canonical.center.latitude, 90)}-${encode(canonical.center.longitude, 180)}-${encode(b.west, 180)}-${encode(b.south, 90)}-${encode(b.east, 180)}-${encode(b.north, 90)}`;
  }
  return `${version}-${Math.round(canonical.center.latitude * 1e7)}-${Math.round(canonical.center.longitude * 1e7)}-${Math.round(canonical.radiusKm! * 1000)}`;
}

export function terrainFixedRequest(region: DisplayRasterRegion): TerrainRenderRequest {
  const bounds = displayRasterBounds(region);
  return { purpose: "MAP", center: { system: "GCJ02", latitude: (bounds.south + bounds.north) / 2,
    longitude: (bounds.west + bounds.east) / 2 }, viewportBounds: bounds, fixedRaster: { ...region } };
}

export function terrainFixedViewport(input: TerrainOverlayRequest, span: 1 | 2 | 4 = 2) {
  if (!input.viewportBounds) throw new Error("terrain_fixed_requires_bounds");
  return terrainFixedRequest(displayRasterRegionForBounds(input.viewportBounds, span));
}

export function terrainWindowRequest(window: DisplayRasterWindow): TerrainRenderRequest {
  const bounds = displayRasterWindowBounds(window);
  return { purpose: "MAP", center: { system: "GCJ02", latitude: (bounds.south + bounds.north) / 2,
    longitude: (bounds.west + bounds.east) / 2 }, viewportBounds: bounds, fixedWindow: { ...window } };
}

export function terrainWindowViewport(input: TerrainOverlayRequest) {
  if (!input.viewportBounds) throw new Error("terrain_fixed_requires_bounds");
  return terrainWindowRequest(displayRasterWindowForBounds(input.viewportBounds));
}

export function terrainLocationIsSupported(input: TerrainOverlayRequest) {
  const b = input.viewportBounds, s = TERRAIN_SUPPORTED_BOUNDS;
  return b ? terrainMapBoundsAreSupported(b)
    : input.center.latitude >= s.south && input.center.latitude <= s.north
      && input.center.longitude >= s.west && input.center.longitude <= s.east;
}
