import { distanceMeters, gcj02ToWgs84, latitudeForMercatorY, mercatorY } from "@starward/coordinate-system";

export type MapCameraPoint = { latitude: number; longitude: number };
export type MapFocusFrame = { top: number; height: number; visibleBottom: number };
type MapBounds = { west: number; south: number; east: number; north: number };

// About eight 500m annual-nightlight cells across the longer visible dimension,
// with roughly 30m terrain remaining distinct. This is a ground-range starting
// view, not an increase in either source's resolution or a physical scale.
export const NEIGHBORHOOD_MAX_VISIBLE_SPAN_M = 4_000;

/** Seed the same native camera used for address selection. Selection cannot
 * finish from this zoom alone: its measured ground range is checked below. */
export function spotNeighborhoodCamera(point: MapCameraPoint, currentZoom: number) {
  return { center: { ...point }, zoom: Math.max(currentZoom, 14) };
}

function checkFocusFrame(bounds: MapBounds, frame: MapFocusFrame) {
  if (![bounds.west, bounds.south, bounds.east, bounds.north, frame.top, frame.height, frame.visibleBottom].every(Number.isFinite)
    || bounds.west >= bounds.east || bounds.west < -180 || bounds.east > 180 || bounds.south >= bounds.north
    || Math.abs(bounds.south) > 85.05112878 || Math.abs(bounds.north) > 85.05112878
    || frame.height <= 0 || frame.visibleBottom <= frame.top || frame.visibleBottom > frame.top + frame.height)
    throw new Error("map_projection_frame_invalid");
}

/** The same north-up native bounds and measured panel fraction used by focus.
 * Convert the native GCJ coordinates through the shared owner before measuring
 * metres; logical screen dimensions only locate the unoccluded map boundary. */
export function spotNeighborhoodGroundRange(bounds: MapBounds, frame: MapFocusFrame, currentZoom: number) {
  checkFocusFrame(bounds, frame);
  if (!Number.isFinite(currentZoom) || currentZoom < 3 || currentZoom > 20) throw new Error("map_neighborhood_zoom_invalid");
  const fraction = (frame.visibleBottom - frame.top) / frame.height;
  const south = latitudeForMercatorY(mercatorY(bounds.north) + (mercatorY(bounds.south) - mercatorY(bounds.north)) * fraction);
  const widestLatitude = Math.min(bounds.north, Math.max(south, 0));
  const longitude = (bounds.west + bounds.east) / 2;
  const point = (latitude: number, lon: number) => gcj02ToWgs84({ system: "GCJ-02", lat: latitude, lon });
  const widthM = distanceMeters(point(widestLatitude, bounds.west), point(widestLatitude, bounds.east));
  const heightM = distanceMeters(point(bounds.north, longitude), point(south, longitude));
  const spanM = Math.max(widthM, heightM);
  if (!Number.isFinite(spanM) || spanM <= 0) throw new Error("map_neighborhood_range_invalid");
  if (spanM <= NEIGHBORHOOD_MAX_VISIBLE_SPAN_M) return { widthM, heightM, spanM, zoom: currentZoom };
  if (currentZoom === 20) throw new Error("map_neighborhood_range_unreachable");
  return { widthM, heightM, spanM,
    zoom: Math.min(20, Math.ceil(currentZoom + Math.log2(spanM / NEIGHBORHOOD_MAX_VISIBLE_SPAN_M))) };
}

type NativeCallbacks = { success(value: unknown): void; fail(error: unknown): void };
export interface NativeMapProjection {
  toScreenLocation(input: MapCameraPoint & NativeCallbacks): unknown;
  fromScreenLocation(input: { x: number; y: number } & NativeCallbacks): unknown;
}

function nativeProjectionCall(invoke: (callbacks: NativeCallbacks) => unknown, signal: AbortSignal) {
  signal.throwIfAborted();
  return new Promise<unknown>((resolve, reject) => {
    let finished = false;
    const finish = (success: boolean, value: unknown) => {
      if (finished) return;
      finished = true; signal.removeEventListener("abort", aborted);
      if (success) resolve(value); else reject(value);
    };
    const aborted = () => finish(false, signal.reason);
    signal.addEventListener("abort", aborted, { once: true });
    try {
      const result = invoke({ success: value => finish(true, value), fail: error => finish(false, error) });
      if (result && typeof (result as PromiseLike<unknown>).then === "function")
        void Promise.resolve(result).then(value => finish(true, value), error => finish(false, error));
    } catch (error) { finish(false, error); }
  });
}

/** Convert through the actual native projection. Ratios use the same native
 * coordinate system on both sides, including any device pixel conversion. */
export async function cameraCenterForNativeMapTarget(
  point: MapCameraPoint,
  bounds: MapBounds,
  frame: MapFocusFrame,
  projection: NativeMapProjection,
  signal: AbortSignal,
): Promise<MapCameraPoint> {
  checkFocusFrame(bounds, frame);
  if (![point.latitude, point.longitude].every(Number.isFinite)
    || Math.abs(point.latitude) > 85.05112878 || Math.abs(point.longitude) > 180) throw new Error("map_projection_frame_invalid");
  const toScreen = async (location: MapCameraPoint) => {
    const value = await nativeProjectionCall(callbacks => projection.toScreenLocation({ ...location, ...callbacks }), signal) as { x?: unknown; y?: unknown } | null;
    signal.throwIfAborted();
    if (typeof value?.x !== "number" || typeof value.y !== "number" || !Number.isFinite(value.x) || !Number.isFinite(value.y))
      throw new Error("map_projection_screen_point_invalid");
    return { x: value.x, y: value.y };
  };
  const selected = await toScreen(point);
  const northwest = await toScreen({ latitude: bounds.north, longitude: bounds.west });
  const southeast = await toScreen({ latitude: bounds.south, longitude: bounds.east });
  if (southeast.x <= northwest.x || southeast.y <= northwest.y) throw new Error("map_projection_span_invalid");
  const coveredFraction = (frame.top + frame.height - frame.visibleBottom) / frame.height;
  const result = await nativeProjectionCall(callbacks => projection.fromScreenLocation({
    x: selected.x, y: selected.y + coveredFraction * (southeast.y - northwest.y) / 2, ...callbacks,
  }), signal) as MapCameraPoint | null;
  signal.throwIfAborted();
  if (!result || !Number.isFinite(result.latitude) || !Number.isFinite(result.longitude)
    || Math.abs(result.latitude) > 85.05112878 || Math.abs(result.longitude) > 180)
    throw new Error("map_projection_coordinate_invalid");
  return { latitude: result.latitude, longitude: result.longitude };
}
