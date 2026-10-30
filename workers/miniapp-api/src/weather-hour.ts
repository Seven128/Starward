import { cloudPointSeriesAt, sourceInstant, type CloudForecastEvidence } from "@starward/miniapp-contracts";
import type { CanonicalWeatherAlert, CanonicalWeatherHour, WeatherEvidenceResult, WeatherForecastResult } from "./ports.ts";

export function materialAlertAt(alert: CanonicalWeatherAlert, at: string) {
  const instant = Date.parse(at);
  return alert.material && alert.status === "ACTIVE" && instant >= Date.parse(alert.effectiveAt ?? alert.issuedAt) &&
    (!alert.expiresAt || instant < Date.parse(alert.expiresAt));
}

/** Project a source hour forward within that hour only. Never borrow a later
 * forecast across a missing hour or extrapolate beyond the final source hour. */
export function weatherHourAt<T extends { at: string }>(rows: readonly T[], at: string): T | null {
  const instant = Date.parse(at);
  if (!Number.isFinite(instant)) return null;
  return rows.reduce<T | null>((latest, row) => {
    const start = Date.parse(row.at);
    return start <= instant && instant < start + 3_600_000 && (!latest || start > Date.parse(latest.at)) ? row : latest;
  }, null);
}

export interface ProjectedWeatherAt {
  /** Actual non-cloud weather hour; cloud-only coverage does not invent one. */
  weather: CanonicalWeatherHour | null;
  weatherAt: string | null;
  cloudPercent: number | null;
  /** undefined is legacy; null means the negotiated new lane has no valid value. */
  cloudEvidence?: CloudForecastEvidence | null;
}

/** Keep QWeather's hour rule and ECMWF's exact-time rule independently. The
 * returned weather copy is suitable for existing rules needing both sources. */
export function projectWeatherAt(weather: Pick<WeatherEvidenceResult | WeatherForecastResult, "value" | "source" | "totalCloud">,
  at: string, now = Date.now()): ProjectedWeatherAt {
  const legacy = weather.totalCloud === undefined;
  const candidate = legacy || !["UNAVAILABLE", "EXPIRED"].includes(weather.source.state)
    ? weatherHourAt(weather.value ?? [], at) : null;
  const matching = legacy || candidate && Date.parse(candidate.at) + 3_600_000 > now ? candidate : null;
  if (legacy) return { weather: matching, weatherAt: matching?.at ?? null, cloudPercent: matching?.cloudPercent ?? null };
  const cloud = weather.totalCloud;
  const cloudEvidence = cloud?.value && !["UNAVAILABLE", "EXPIRED"].includes(cloud.state) ? cloudPointSeriesAt(cloud.value, at, now) : null;
  const cloudPercent = cloudEvidence?.cloudPercent ?? null;
  return { weather: matching ? { ...matching, cloudPercent } : null, weatherAt: matching?.at ?? null, cloudPercent, cloudEvidence };
}

export interface ComposedWeatherSnapshotHour {
  schemaVersion: "weather-snapshot-hour-v2";
  at: string;
  weatherAt: string | null;
  /** Non-cloud weather retains its source hour; null does not invent hazards,
   * temperatures or other missing provider fields. */
  weather: Omit<CanonicalWeatherHour, "cloudPercent"> | null;
  cloudPercent: number | null;
  cloudEvidence: CloudForecastEvidence | null;
}

/** Existing background snapshot consumer. The new contract stores independent
 * fields explicitly; the historical rows retain their original shape. */
export function weatherSnapshotHours(weather: WeatherEvidenceResult, windowUtc: { start: string; end: string }, now: number):
  readonly (CanonicalWeatherHour | ComposedWeatherSnapshotHour)[] {
  if (weather.totalCloud === undefined) return weather.value ?? [];
  const start = Date.parse(windowUtc.start), end = Date.parse(windowUtc.end);
  if (!Number.isFinite(start) || !Number.isFinite(end) || start >= end || end - start > 240 * 3_600_000)
    throw new Error("weather_snapshot_window_invalid");
  const instants = new Set((weather.value ?? []).map(row => sourceInstant(row.at)).filter((at): at is string => at !== null));
  for (let at = Math.ceil(start / 3_600_000) * 3_600_000; at < end; at += 3_600_000) instants.add(new Date(at).toISOString());
  return [...instants].filter(value => Date.parse(value) >= start && Date.parse(value) < end)
    .sort((left, right) => Date.parse(left) - Date.parse(right)).flatMap(at => {
      const projected = projectWeatherAt(weather, at, now);
      if (!projected.weather && !projected.cloudEvidence) return [];
      const { cloudPercent: _, ...primary } = projected.weather ?? { cloudPercent: null };
      return [{ schemaVersion: "weather-snapshot-hour-v2" as const, at, weatherAt: projected.weatherAt,
        weather: projected.weather ? primary as Omit<CanonicalWeatherHour, "cloudPercent"> : null,
        cloudPercent: projected.cloudPercent, cloudEvidence: projected.cloudEvidence ?? null }];
    });
}
