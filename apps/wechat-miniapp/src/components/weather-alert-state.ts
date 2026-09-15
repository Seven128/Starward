import type { WeatherEvidenceSummary } from "@starward/miniapp-contracts";

export const WEATHER_ALERT_REFRESH_MS = 5 * 60_000;

/** Current official warnings never use the selected astronomy/forecast instant. */
export function weatherAlertState(evidence: WeatherEvidenceSummary | undefined, now: number, refreshFailed = false) {
  const alerts = evidence?.alerts.filter(alert => alert.material && alert.status === "ACTIVE" &&
    Date.parse(alert.effectiveAt ?? alert.issuedAt) <= now &&
    (alert.expiresAt === null || Date.parse(alert.expiresAt) > now)) ?? [];
  const source = evidence?.warningSource;
  const feedExpiry = Date.parse(source?.validTo ?? "");
  const sample = evidence?.warningState === "SAMPLE_DATA";
  const failed = Boolean(evidence && (refreshFailed || (!sample &&
    (evidence.warningState !== "FRESH" || !Number.isFinite(feedExpiry) || feedExpiry <= now))));
  const boundaries = [feedExpiry, ...(evidence?.alerts ?? []).flatMap(alert =>
    [Date.parse(alert.effectiveAt ?? alert.issuedAt), Date.parse(alert.expiresAt ?? "")])]
    .filter(at => Number.isFinite(at) && at > now);
  return { alerts, failed, nextBoundary: boundaries.length ? Math.min(...boundaries) : null };
}
