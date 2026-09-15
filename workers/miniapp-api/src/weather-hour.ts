import type { CanonicalWeatherAlert } from "./ports.ts";

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
