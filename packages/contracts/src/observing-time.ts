/** Calendar dates are labels of local observing nights, never UTC instants. */
export function isObservingNight(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/u.test(value)
    && Number.isFinite(Date.parse(`${value}T00:00:00.000Z`))
    && new Date(`${value}T00:00:00.000Z`).toISOString().slice(0, 10) === value;
}

export function shiftObservingNight(value: string, days: number): string {
  if (!isObservingNight(value) || !Number.isInteger(days)) throw new TypeError("observing_night_invalid");
  const date = new Date(`${value}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function normalizeUtcMoment(value: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/u.test(value)
    || !isObservingNight(value.slice(0, 10)) || !Number.isFinite(Date.parse(value))) return null;
  return new Date(value).toISOString();
}

/** Same noon-to-next-noon ownership as the astronomy night calculation. */
export function observingNightAt(instant: Date, timezone: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", hourCycle: "h23",
  }).formatToParts(instant);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const date = `${values.year}-${values.month}-${values.day}`;
  return Number(values.hour) < 12 ? shiftObservingNight(date, -1) : date;
}
