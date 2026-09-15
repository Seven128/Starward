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
  unavailableReason: "NO_DATA" | "REQUEST_FAILED" | null;
  source: SourceSummary;
}
export interface SpotAirQualityData {
  spotId: string;
  current: AirQualitySegment<AirQualitySnapshot>;
  forecast: AirQualitySegment<readonly AirQualityHour[]>;
}
