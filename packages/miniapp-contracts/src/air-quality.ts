import type { DataState, SourceSummary } from "./types.ts";

/** Index values from different standards cannot be compared or substituted. */
export interface AirQualityIndex {
  code: string; name: string; value: number; display: string;
  category: string | null; primaryPollutant: string | null;
}
export interface AirQualityPollutant { code: string; name: string; value: number; unit: string }
export interface AirQualitySnapshot {
  indexes: readonly AirQualityIndex[];
  pollutants: readonly AirQualityPollutant[];
}
export interface AirQualityHour extends AirQualitySnapshot { at: string }
export interface AirQualitySegment<T> {
  value: T | null;
  state: DataState;
  unavailableReason: "NO_DATA" | "REQUEST_FAILED" | "EXPIRED" | null;
  source: SourceSummary;
}
export interface SpotAirQualityData {
  spotId: string;
  current: AirQualitySegment<AirQualitySnapshot>;
  forecast: AirQualitySegment<readonly AirQualityHour[]>;
}

const HOUR = 3_600_000;
type AirQualityEvidence = Pick<SpotAirQualityData, "current" | "forecast">;

/** Product use deadlines; retrievedAt is not an inferred observation time. */
export function airQualityBoundaries(data: AirQualityEvidence): readonly number[] {
  return [data.current.value ? Date.parse(data.current.source.retrievedAt ?? "") + HOUR : NaN,
    ...(data.forecast.value ?? []).map(hour => Date.parse(hour.at) + HOUR)].filter(Number.isFinite);
}

/** Shared service/client delivery rule. Preserve acquisition facts and input
 * identity when unchanged; elapsed evidence is distinct from request failure. */
export function projectAirQuality<T extends AirQualityEvidence>(data: T, now: number): T {
  let { current, forecast } = data;
  const unavailable = <V>(segment: AirQualitySegment<V>, reason: "EXPIRED" | "REQUEST_FAILED"): AirQualitySegment<V> => {
    // Passing time cannot erase a separately established refresh failure.
    if (segment.state === "STALE_USABLE" || segment.unavailableReason === "REQUEST_FAILED") reason = "REQUEST_FAILED";
    const state = reason === "EXPIRED" ? "EXPIRED" : "UNAVAILABLE";
    return { ...segment, value: null, state, unavailableReason: reason, source: { ...segment.source, state } };
  };
  if (current.value) {
    const fetched = Date.parse(current.source.retrievedAt ?? "");
    if (!Number.isFinite(fetched) || now < fetched) current = unavailable(current, "REQUEST_FAILED");
    else if (now >= fetched + HOUR) current = unavailable(current, "EXPIRED");
  }
  if (forecast.value) {
    const retained = forecast.value.filter(hour => Date.parse(hour.at) + HOUR > now);
    if (forecast.value.length && !retained.length) forecast = unavailable(forecast, "EXPIRED");
    else if (retained.length !== forecast.value.length) {
      const state = forecast.state === "STALE_USABLE" ? "STALE_USABLE" : "PARTIAL";
      forecast = { ...forecast, value: retained, state,
        source: { ...forecast.source, state, validFrom: retained[0]!.at,
          validTo: new Date(Date.parse(retained.at(-1)!.at) + HOUR).toISOString() } };
    }
  }
  return current === data.current && forecast === data.forecast ? data : { ...data, current, forecast };
}
