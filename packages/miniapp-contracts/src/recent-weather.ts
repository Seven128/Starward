/** Regional reanalysis for preceding calendar days, independent of plan/sky time. */
export interface RecentWeatherDay {
  localDate: string;
  precipitationMm: number | null;
  temperatureMinC: number | null;
  temperatureMaxC: number | null;
  /** Maximum only among returned valid hourly wind samples, not a full-day maximum. */
  sampledWindMaxKph: number | null;
  sampledWindHours: number;
  conditions: readonly string[];
}

export interface SpotRecentWeatherData {
  spotId: string;
  region: { locationId: string; name: string; timezone: string } | null;
  requestedDates: readonly string[];
  days: readonly RecentWeatherDay[];
  missingDates: readonly string[];
  /** Actual query's date in the returned region, never the selected observing date. */
  asOfLocalDate: string | null;
  unavailableReason: "NO_DATA" | "REQUEST_FAILED" | null;
}
