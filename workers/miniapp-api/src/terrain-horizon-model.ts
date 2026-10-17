import { setImmediate } from "node:timers/promises";
import { gcj02ToWgs84, type Wgs84Coordinate } from "@starward/coordinate-system";
import type { TerrainOverlayRequest } from "@starward/miniapp-contracts";
import { readCopernicusElevationWindow } from "./copernicus-elevation.ts";
import { terrainLocationIsSupported, validateTerrainRequest } from "./terrain-request.ts";

export const HORIZON_METHOD = "glo30-native-sector-envelope-v1";
export const HORIZON_RADIUS_M = 20_000;
export const HORIZON_OBSERVER_HEIGHT_M = 2;
// A 40 km box at the supported northern boundary contains about 3.1M 1-arcsec
// samples. This input cap includes tile/halo rounding; it is not an RSS claim.
const maximumNativeSamples = 4_000_000;
const earthRadiusM = 6_371_008.8, degrees = Math.PI / 180;
type Window = Omit<Awaited<ReturnType<typeof readCopernicusElevationWindow>>, "values"> & { values: ArrayLike<number | bigint> };
type Bounds = { west: number; south: number; east: number; north: number };

/** Fixed-source numerical path. The TerrainService caller owns deadline,
 * concurrency and cancellation, as for existing renderTerrain. No client DEM. */
export async function readTerrainHorizonModel(center: TerrainOverlayRequest["center"], signal: AbortSignal,
  transport: typeof fetch = fetch) {
  const request = { purpose: "SPOT" as const, center, radiusKm: HORIZON_RADIUS_M / 1000 };
  validateTerrainRequest(request);
  if (!terrainLocationIsSupported(request)) return null;
  const observer = gcj02ToWgs84({ system: "GCJ-02", lat: center.latitude, lon: center.longitude });
  const bounds = horizonBounds(observer, HORIZON_RADIUS_M);
  const budget = { bytes: 0, nativeSamples: 0, maximumNativeSamples };
  const windows: Window[] = [], sourceIssues: { tile: string; reason: "NOT_FOUND" | "READ_FAILED" }[] = [];
  // Sequential windows bound decompression work; the shared source byte/sample
  // budget spans all tiles, including a partially failed read.
  for (let lat = Math.floor(bounds.south); lat <= Math.floor(bounds.north); lat++)
    for (let lon = Math.floor(bounds.west); lon <= Math.floor(bounds.east); lon++) {
      signal.throwIfAborted();
      try {
        windows.push(await readCopernicusElevationWindow(lat, lon,
          [bounds.west, bounds.south, bounds.east, bounds.north], 0, signal, budget, transport, "NATIVE"));
      } catch (error) {
        signal.throwIfAborted();
        const message = error instanceof Error ? error.message : "unknown_source_failure";
        if (/budget_exceeded|sample_format_changed/u.test(message)) throw error;
        sourceIssues.push({ tile: `${lat},${lon}`, reason: message === "terrain_source_http_404" ? "NOT_FOUND" : "READ_FAILED" });
      }
    }
  const model = await computeTerrainHorizon(windows, observer, HORIZON_RADIUS_M, HORIZON_OBSERVER_HEIGHT_M, signal);
  return { ...model, centerGcj02: center, sources: windows.map(window => window.source), sourceIssues,
    sourceBytes: budget.bytes, nativeSamples: budget.nativeSamples, derivedAt: new Date().toISOString() };
}

export type TerrainHorizonResult = Awaited<ReturnType<typeof readTerrainHorizonModel>>;

export function horizonBounds(observer: Wgs84Coordinate, radiusM: number): Bounds {
  const delta = radiusM / earthRadiusM, latitude = observer.lat * degrees;
  const longitudeDelta = Math.asin(Math.sin(delta) / Math.cos(latitude)) / degrees;
  return { west: observer.lon - longitudeDelta, south: observer.lat - delta / degrees,
    east: observer.lon + longitudeDelta, north: observer.lat + delta / degrees };
}

/** 1-degree sector maxima over every native sample centre, rather than sparse
 * radial rays. A narrow native-grid peak therefore cannot fall between rays.
 * Negative elevations are retained. No-data footprints and absent source
 * rectangles mark affected sectors unknown, never flat or clear.
 *
 * Spherical tangent geometry includes curvature, with no refraction. DSM
 * station height and sample heights share their original vertical datum.
 * The 2m offset is a declared assumption, never a measured eye height. */
export async function computeTerrainHorizon(windows: Window[], observer: Wgs84Coordinate, radiusM: number,
  observerHeightM: number, signal: AbortSignal) {
  if (observer.system !== "WGS84" || !Number.isFinite(observer.lat) || Math.abs(observer.lat) > 56.1
    || !Number.isFinite(observer.lon) || Math.abs(observer.lon) > 180 || !Number.isFinite(radiusM)
    || radiusM <= 0 || radiusM > HORIZON_RADIUS_M || !Number.isFinite(observerHeightM) || observerHeightM < 0)
    throw new Error("terrain_horizon_input_invalid");
  signal.throwIfAborted();
  let count = 0;
  for (const window of windows) {
    if (window.selection !== "NATIVE" || ![window.pixelX, window.pixelY, ...window.origin].every(Number.isFinite)
      || window.pixelX <= 0 || window.pixelY >= 0
      || window.values.length !== window.width * window.height) throw new Error("terrain_horizon_native_grid_required");
    count += window.values.length;
  }
  if (count > maximumNativeSamples) throw new Error("terrain_native_sample_budget_exceeded");
  const maxima = new Float64Array(360).fill(-Infinity), samples = new Uint32Array(360), unknown = new Uint8Array(360);
  let station: { elevationM: number | null; latitude: number; longitude: number } | null = null;
  for (const window of windows) {
    const offset = window.pixelIsArea ? 0.5 : 0;
    const x = (observer.lon - window.origin[0]) / window.pixelX - offset - window.left;
    const y = (observer.lat - window.origin[1]) / window.pixelY - offset - window.top;
    if (x < -0.5 || y < -0.5 || x >= window.width - 0.5 || y >= window.height - 0.5) continue;
    const column = Math.round(x), row = Math.round(y), value = Number(window.values[row * window.width + column]);
    station = { elevationM: valid(value, window.noData) ? value : null,
      latitude: window.origin[1] + (window.top + row + offset) * window.pixelY,
      longitude: window.origin[0] + (window.left + column + offset) * window.pixelX };
    break;
  }
  const bounds = horizonBounds(observer, radiusM);
  let uncovered: Bounds[] = [bounds];
  for (const window of windows) uncovered = uncovered.flatMap(rectangle => subtract(rectangle, gridBounds(window)));
  for (const rectangle of uncovered) markUnknownRectangle(unknown, rectangle, observer, radiusM);
  if (station?.elevationM == null) unknown.fill(1);
  else for (const window of windows) {
    const offset = window.pixelIsArea ? 0.5 : 0;
    for (let row = 0; row < window.height; row++) {
      if (row % 64 === 0) { await setImmediate(); signal.throwIfAborted(); }
      const latitude = window.origin[1] + (window.top + row + offset) * window.pixelY;
      for (let column = 0; column < window.width; column++) {
        const longitude = window.origin[0] + (window.left + column + offset) * window.pixelX;
        const position = direction(observer, latitude, longitude);
        if (position.distanceM > radiusM || position.distanceM < 1e-6) continue;
        const value = Number(window.values[row * window.width + column]);
        if (!valid(value, window.noData)) {
          markUnknownRectangle(unknown, { west: longitude - window.pixelX / 2, east: longitude + window.pixelX / 2,
            south: latitude + window.pixelY / 2, north: latitude - window.pixelY / 2 }, observer, radiusM);
          continue;
        }
        const sector = Math.floor((position.bearingDegrees + 0.5) % 360);
        const angle = terrainElevationAngle(value, station.elevationM, observerHeightM, position.distanceM);
        maxima[sector] = Math.max(maxima[sector], angle); samples[sector]++;
      }
    }
  }
  const sectors = Array.from({ length: 360 }, (_, bearingDegrees) => ({ bearingDegrees,
    elevationDegrees: !unknown[bearingDegrees] && samples[bearingDegrees] ? maxima[bearingDegrees] : null,
    sampleCount: samples[bearingDegrees] }));
  const knownSectors = sectors.filter(sector => sector.elevationDegrees !== null).length;
  signal.throwIfAborted();
  return { methodVersion: HORIZON_METHOD, status: knownSectors === 360 ? "COMPLETE" as const
    : knownSectors ? "PARTIAL" as const : "UNAVAILABLE" as const,
    observerWgs84: observer, observerElevationM: station?.elevationM ?? null, observerHeightM,
    stationSample: station, radiusM, bearingReference: "TRUE_NORTH_CLOCKWISE" as const, sectorWidthDegrees: 1,
    earthModel: { radiusM: earthRadiusM, refraction: "NONE" as const }, knownSectors, sectors };
}

export function terrainElevationAngle(elevationM: number, stationM: number, eyeM: number, distanceM: number) {
  const centralAngle = distanceM / earthRadiusM;
  const horizontal = (earthRadiusM + elevationM) * Math.sin(centralAngle);
  const vertical = elevationM - stationM - eyeM - 2 * (earthRadiusM + elevationM) * Math.sin(centralAngle / 2) ** 2;
  return Math.atan2(vertical, horizontal) / degrees;
}

function valid(value: number, noData: number | null) { return Number.isFinite(value) && value !== noData; }
function direction(observer: Wgs84Coordinate, latitude: number, longitude: number) {
  const lat = latitude * degrees, lat0 = observer.lat * degrees, delta = (longitude - observer.lon) * degrees;
  const east = Math.sin(delta) * Math.cos(lat);
  const north = Math.cos(lat0) * Math.sin(lat) - Math.sin(lat0) * Math.cos(lat) * Math.cos(delta);
  const dot = Math.sin(lat0) * Math.sin(lat) + Math.cos(lat0) * Math.cos(lat) * Math.cos(delta);
  return { distanceM: earthRadiusM * Math.atan2(Math.hypot(east, north), dot),
    bearingDegrees: (Math.atan2(east, north) / degrees + 360) % 360 };
}
function gridBounds(window: Window): Bounds {
  const offset = window.pixelIsArea ? 0.5 : 0;
  return { west: window.origin[0] + (window.left + offset - 0.5) * window.pixelX,
    east: window.origin[0] + (window.left + window.width + offset - 0.5) * window.pixelX,
    north: window.origin[1] + (window.top + offset - 0.5) * window.pixelY,
    south: window.origin[1] + (window.top + window.height + offset - 0.5) * window.pixelY };
}
function subtract(a: Bounds, b: Bounds): Bounds[] {
  // Adjacent geotags may differ by floating-point roundoff. This ~11um
  // tolerance prevents a numerical seam becoming an unknown half-circle.
  const tolerance = 1e-10;
  const west = Math.max(a.west, b.west - tolerance), east = Math.min(a.east, b.east + tolerance);
  const south = Math.max(a.south, b.south - tolerance), north = Math.min(a.north, b.north + tolerance);
  if (west >= east || south >= north) return [a];
  return [{ west: a.west, east: west, south: a.south, north: a.north },
    { west: east, east: a.east, south: a.south, north: a.north },
    { west, east, south: a.south, north: south }, { west, east, south: north, north: a.north }]
    .filter(bounds => bounds.west < bounds.east && bounds.south < bounds.north);
}
function markUnknownRectangle(mask: Uint8Array, bounds: Bounds, observer: Wgs84Coordinate, radiusM: number) {
  if (observer.lon > bounds.west && observer.lon < bounds.east && observer.lat > bounds.south && observer.lat < bounds.north) {
    mask.fill(1); return;
  }
  // Clip the geographic rectangle to the spherical analysis circle. Its
  // azimuth extrema lie at inside corners, circle/edge intersections or a
  // parallel's tangent. An absent bbox corner outside the circle is irrelevant.
  const bearings: number[] = [];
  const add = (latitude: number, longitude: number) => {
    const tolerance = 1e-10;
    if (latitude < bounds.south - tolerance || latitude > bounds.north + tolerance
      || longitude < bounds.west - tolerance || longitude > bounds.east + tolerance) return;
    const point = direction(observer, latitude, longitude);
    if (point.distanceM > radiusM + 1e-5 || point.distanceM < 1e-6) return;
    bearings.push(point.bearingDegrees);
  };
  for (const latitude of [bounds.south, bounds.north])
    for (const longitude of [bounds.west, bounds.east]) add(latitude, longitude);
  const lat0 = observer.lat * degrees, cosRadius = Math.cos(radiusM / earthRadiusM);
  const sin0 = Math.sin(lat0), cos0 = Math.cos(lat0);
  for (const latitude of [bounds.south, bounds.north]) {
    const lat = latitude * degrees;
    const circleCos = (cosRadius - sin0 * Math.sin(lat)) / (cos0 * Math.cos(lat));
    if (Math.abs(circleCos) <= 1) {
      const delta = Math.acos(circleCos) / degrees;
      add(latitude, observer.lon - delta); add(latitude, observer.lon + delta);
    }
    const tangentCos = Math.tan(lat0) / Math.tan(lat);
    if (Math.abs(tangentCos) <= 1) {
      const delta = Math.acos(tangentCos) / degrees;
      add(latitude, observer.lon - delta); add(latitude, observer.lon + delta);
    }
  }
  for (const longitude of [bounds.west, bounds.east]) {
    const b = cos0 * Math.cos((longitude - observer.lon) * degrees);
    const magnitude = Math.hypot(sin0, b), circleCos = cosRadius / magnitude;
    if (Math.abs(circleCos) <= 1) {
      const latitude = Math.atan2(sin0, b), delta = Math.acos(circleCos);
      add((latitude - delta) / degrees, longitude); add((latitude + delta) / degrees, longitude);
    }
  }
  if (!bearings.length) return;
  bearings.sort((a, b) => a - b);
  let gap = -1, start = 0;
  for (let i = 0; i < bearings.length; i++) {
    const next = (i + 1) % bearings.length, distance = (bearings[next] - bearings[i] + 360) % 360;
    if (distance > gap) { gap = distance; start = bearings[next]; }
  }
  const span = 360 - gap;
  for (let i = Math.ceil(start - 0.5); i <= Math.floor(start + span + 0.5); i++) mask[(i + 360) % 360] = 1;
}
