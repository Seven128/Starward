/** Normalize a real calendar instant with an explicit offset. Host timezone
 * and Date.parse's permissive calendar rollover must never supply provenance. */
export function sourceInstant(value: unknown): string | null {
  const raw = typeof value === "string" ? value.trim() : "";
  const match = /^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.\d+)?)?(?:Z|[+-](\d{2}):(\d{2}))$/u.exec(raw);
  if (!match || Number(match[2]) > 23 || Number(match[3]) > 59 || Number(match[4] ?? 0) > 59
    || Number(match[5] ?? 0) > 23 || Number(match[6] ?? 0) > 59) return null;
  const calendar = Date.parse(`${match[1]}T00:00:00Z`);
  if (!Number.isFinite(calendar) || new Date(calendar).toISOString().slice(0, 10) !== match[1]) return null;
  const parsed = Date.parse(raw);
  return Number.isFinite(parsed) ? new Date(parsed).toISOString() : null;
}
