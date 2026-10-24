import type { ForecastPrimaryAcquisition } from "../forecast/forecast-query-service";
import { commandDigest } from "../../persistence/command-transaction";
import { assertNormalizedWeatherRun } from "../../../../../packages/weather-schema/src/index";
import { notificationWeatherMetrics, requireNotificationInstant, NotificationEvaluationError,
  type NotificationWeatherAcquisition, type NotificationWeatherMetric } from "../../../../../packages/domain/src/notifications/evaluation";

/** Only the server's normalized acquisition port calls this. There is no HTTP
 * route accepting provider events or caller-supplied permission/version claims. */
export function notificationWeatherAcquisition(input: ForecastPrimaryAcquisition): NotificationWeatherAcquisition {
  const { query, run } = input;
  assertNormalizedWeatherRun(run);
  if (run.coordinateSystem !== "WGS84" || !["open-meteo", "qweather"].includes(run.provider)
    || !["noncommercial-poc", "production"].includes(run.use)
    || !Number.isFinite(query.latitude) || Math.abs(query.latitude) > 90 || !Number.isFinite(query.longitude) || Math.abs(query.longitude) > 180
    || !["milky-way-core", "moon", "mercury", "venus", "mars", "jupiter", "saturn"].includes(query.target)) throw new NotificationEvaluationError("notification_source_invalid");
  new Intl.DateTimeFormat("en", { timeZone: query.timezone }).format();
  const acquiredAt = requireNotificationInstant(run.ingestedAt), fetchedAt = requireNotificationInstant(run.fetchedAt);
  const expiresAt = requireNotificationInstant(run.expiresAt), modelRunTimeUtc = requireNotificationInstant(run.modelRunTimeUtc);
  if (Date.parse(expiresAt) <= Date.parse(acquiredAt)) throw new NotificationEvaluationError("notification_source_invalid");
  const nightWindow = input.nightWindow && {
    startUtc: requireNotificationInstant(input.nightWindow.startUtc), endUtc: requireNotificationInstant(input.nightWindow.endUtc),
  };
  const targetWindow = input.targetWindow && { startUtc: requireNotificationInstant(input.targetWindow.startUtc), endUtc: requireNotificationInstant(input.targetWindow.endUtc) };
  if (nightWindow && Date.parse(nightWindow.endUtc) <= Date.parse(nightWindow.startUtc)) throw new NotificationEvaluationError("notification_source_invalid");
  if (targetWindow && Date.parse(targetWindow.endUtc) <= Date.parse(targetWindow.startUtc) || !input.astronomyAlgorithmVersion) throw new NotificationEvaluationError("notification_source_invalid");
  const seen = new Set<string>();
  const hours = run.hours.map(hour => {
    const at = requireNotificationInstant(hour.validTimeUtc);
    if (seen.has(at)) throw new NotificationEvaluationError("notification_source_duplicate_hour");
    seen.add(at);
    const values = {} as Record<NotificationWeatherMetric, number | null>;
    for (const metric of Object.keys(notificationWeatherMetrics) as NotificationWeatherMetric[]) {
      const value = hour.quality === "missing" || hour.missingFields.includes(metric) ? null : hour[metric];
      if (value !== null && (typeof value !== "number" || !Number.isFinite(value)
        || metric.endsWith("Pct") && (value < 0 || value > 100)
        || ["windSpeedMps", "windGustMps", "precipitationMm"].includes(metric) && value < 0)) throw new NotificationEvaluationError("notification_source_value_invalid");
      values[metric] = value;
    }
    return { at, endUtc: new Date(Date.parse(at) + 60 * 60_000).toISOString(), gridCellId: hour.gridCellId, values };
  }).sort((a, b) => a.at.localeCompare(b.at));
  const providerPoint = { latitude: run.latitude, longitude: run.longitude, coordinateSystem: "WGS84" as const };
  const attribution = run.attribution.map(({ label, url, licenseId, licenseVersion, modified }) => ({ label, url, licenseId, licenseVersion, modified }));
  const dataVersion = commandDigest({ provider: run.provider, model: run.model, providerPoint, hours, sourceLicense: run.sourceLicense, attribution });
  const source = { provider: run.provider, model: run.model, runId: run.runId, modelRunTimeUtc, acquiredAt, fetchedAt, expiresAt,
    dataVersion, use: run.use, sourceLicense: run.sourceLicense, attribution };
  // These are acquisition identities, not a claimed upstream model-run version.
  const event = { schemaVersion: "starward-notification-weather-acquisition-v1" as const, query: { ...query }, providerPoint, source, nightWindow, targetWindow, astronomyAlgorithmVersion: input.astronomyAlgorithmVersion, hours };
  return { ...event, id: commandDigest(event) };
}
