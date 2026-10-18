import { displayRasterWindowForBounds, displayRasterWindowKey, normalizeDisplayRasterBounds } from "@starward/coordinate-system";
import { terrainMapBoundsAreSupported, type TerrainOverlayRequest } from "@starward/miniapp-contracts";

/** Keep the real requested rectangle/point at transport precision. Only the
 * metadata query identity uses the producer's fixed window, never its bounds
 * as a substitute for the caller's requested area or the returned coverage. */
export function normalizeTerrainOverlayRequest(input: TerrainOverlayRequest): TerrainOverlayRequest {
  const center = { system: input.center.system, latitude: Number(input.center.latitude.toFixed(7)),
    longitude: Number(input.center.longitude.toFixed(7)) };
  return input.viewportBounds ? { purpose: "MAP", center, viewportBounds: normalizeDisplayRasterBounds(input.viewportBounds) }
    : { purpose: input.purpose, center, radiusKm: Number(input.radiusKm!.toFixed(1)) };
}

/** Only valid, supported viewport requests can share a fixed product identity
 * or retain an older covering request. Keep that admission rule in one place. */
export function terrainOverlayRequestWindow(input: TerrainOverlayRequest) {
  if (input.purpose !== "MAP" || !input.viewportBounds || input.radiusKm !== undefined) return null;
  const request = normalizeTerrainOverlayRequest(input);
  const center = request.center, bounds = request.viewportBounds;
  if (bounds && center.system === "GCJ02" && Number.isFinite(center.latitude) && Number.isFinite(center.longitude)
    && center.latitude >= bounds.south && center.latitude <= bounds.north
    && center.longitude >= bounds.west && center.longitude <= bounds.east && terrainMapBoundsAreSupported(bounds)) {
    try { return displayRasterWindowForBounds(bounds); }
    catch { /* Invalid requests retain an individual failure/recovery identity. */ }
  }
  return null;
}

export function terrainOverlayRequestIdentity(input: TerrainOverlayRequest) {
  const request = normalizeTerrainOverlayRequest(input), window = terrainOverlayRequestWindow(request);
  if (window) return `MAP:window:${displayRasterWindowKey(window)}`;
  return `${request.purpose}:${request.center.latitude.toFixed(7)}:${request.center.longitude.toFixed(7)}:${request.viewportBounds
    ? [request.viewportBounds.west, request.viewportBounds.south, request.viewportBounds.east, request.viewportBounds.north].join(":")
    : request.radiusKm!.toFixed(1)}`;
}
