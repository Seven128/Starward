import type { SpotAirQualityData } from "@starward/miniapp-contracts";

/** A returned hour covers only its own interval. Current readings never stand in for future data. */
export function airQualityState(data: SpotAirQualityData | undefined, selectedAt: string, now: number) {
  const fetched = Date.parse(data?.current.source.retrievedAt ?? "");
  const currentExpired = Boolean(data?.current.value) && (!Number.isFinite(fetched) || now < fetched || now >= fetched + 3_600_000);
  const current = currentExpired || data?.current.state === "UNAVAILABLE" ? null : data?.current.value ?? null;
  const hours = data?.forecast.state === "UNAVAILABLE" ? [] : data?.forecast.value?.filter(hour => Date.parse(hour.at) + 3_600_000 > now) ?? [];
  const selected = Date.parse(selectedAt);
  const forecast = hours.find(hour => Date.parse(hour.at) <= selected && selected < Date.parse(hour.at) + 3_600_000) ?? null;
  const forecastExpired = Boolean(data?.forecast.value?.length) && hours.length === 0;
  const failed = currentExpired || forecastExpired || [data?.current, data?.forecast].some(segment => segment?.unavailableReason === "REQUEST_FAILED" || segment?.state === "STALE_USABLE");
  return { current, forecast, hours, failed };
}
