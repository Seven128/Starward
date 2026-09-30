import { assertStellarRotation, type StellarGeometryObserver } from "./stellar-geometry.ts";

export const OBSERVATION_FRAME_FORMAT = "eqj-enu-observer-v1";

/** Report-owned geometry for catalog-independent sky layers such as HiPS. */
export interface SkyObservationFrame {
  format: typeof OBSERVATION_FRAME_FORMAT;
  at: string;
  observer: StellarGeometryObserver;
  equatorialToEnu: readonly [number, number, number, number, number, number, number, number, number];
}

export function assertSkyObservationFrames(value: unknown, hourlyAt: readonly string[]): asserts value is readonly SkyObservationFrame[] {
  if (!Array.isArray(value) || value.length !== hourlyAt.length) throw new TypeError("observation_frames_count");
  let observer: StellarGeometryObserver | null = null;
  value.forEach((frame: unknown, index: number) => {
    if (!frame || typeof frame !== "object" || Array.isArray(frame)) throw new TypeError("observation_frame_shape");
    const candidate = frame as Partial<SkyObservationFrame>;
    const at = hourlyAt[index];
    if (candidate.format !== OBSERVATION_FRAME_FORMAT || candidate.at !== at ||
      typeof at !== "string" || !Number.isFinite(Date.parse(at)) || new Date(at).toISOString() !== at)
      throw new TypeError("observation_frame_time");
    const point = candidate.observer;
    if (!point || ![point.latitude,point.longitude,point.elevationM].every(Number.isFinite) ||
      Math.abs(point.latitude)>90 || Math.abs(point.longitude)>180 ||
      (observer && (observer.latitude!==point.latitude || observer.longitude!==point.longitude || observer.elevationM!==point.elevationM)))
      throw new TypeError("observation_frame_observer");
    observer = point;
    assertStellarRotation(candidate.equatorialToEnu);
  });
}
