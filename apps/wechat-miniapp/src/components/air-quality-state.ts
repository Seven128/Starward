import { projectAirQuality, type SpotAirQualityData } from "@starward/miniapp-contracts";

/** A returned hour covers only its own interval. Current readings never stand in for future data. */
export function airQualityState(data: SpotAirQualityData | undefined, selectedAt: string, now: number) {
  const evidence = data ? projectAirQuality(data, now) : undefined;
  const current = evidence?.current.state === "UNAVAILABLE" || evidence?.current.state === "EXPIRED" ? null : evidence?.current.value ?? null;
  const hours = evidence?.forecast.state === "UNAVAILABLE" || evidence?.forecast.state === "EXPIRED" ? [] : evidence?.forecast.value ?? [];
  const selected = Date.parse(selectedAt);
  const forecast = hours.find(hour => Date.parse(hour.at) <= selected && selected < Date.parse(hour.at) + 3_600_000) ?? null;
  const segments = [evidence?.current, evidence?.forecast];
  const failed = segments.some(segment => segment?.unavailableReason === "REQUEST_FAILED" || segment?.state === "STALE_USABLE");
  const expired = segments.some(segment => segment?.state === "EXPIRED");
  return { current, forecast, hours, failed, expired };
}
