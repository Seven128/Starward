export interface ForecastHourLike {
  validTimeUtc: string;
}

function nextCalendarDate(date: string): string {
  const parsed = new Date(`${date}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) return "";
  parsed.setUTCDate(parsed.getUTCDate() + 1);
  return parsed.toISOString().slice(0, 10);
}

function localDateAndHour(instant: string, timezone: string): { date: string; hour: number } | null {
  const parsed = new Date(instant);
  if (Number.isNaN(parsed.getTime())) return null;
  try {
    const parts = new Intl.DateTimeFormat("en-CA", {
      day: "2-digit",
      hour: "2-digit",
      hourCycle: "h23",
      month: "2-digit",
      timeZone: timezone,
      year: "numeric",
    }).formatToParts(parsed);
    const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
    const hour = Number(values.hour);
    if (!values.year || !values.month || !values.day || !Number.isInteger(hour)) return null;
    return { date: `${values.year}-${values.month}-${values.day}`, hour };
  } catch {
    return null;
  }
}

export function observingNightHours<T extends ForecastHourLike>(
  hours: readonly T[],
  nightDate: string,
  timezone: string,
): T[] {
  const followingDate = nextCalendarDate(nightDate);
  if (!followingDate) return [];
  return hours.filter((hour) => {
    const local = localDateAndHour(hour.validTimeUtc, timezone);
    return local !== null
      && ((local.date === nightDate && local.hour >= 18)
        || (local.date === followingDate && local.hour <= 6));
  });
}
