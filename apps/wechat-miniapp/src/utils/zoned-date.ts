/** Display an API timestamp in the feedback form's explicit observation timezone. */
export function displayBeijingTimestamp(value: string): string {
  try {
    const date = new Date(value);
    return `${calendarDateInTimezone(date, "Asia/Shanghai")} ${clockTimeInTimezone(date, "Asia/Shanghai")}（北京时间）`;
  } catch { return "时间暂不可用"; }
}

/** Serialize a Gregorian calendar date in the requested IANA zone, not a display locale. */
export function calendarDateInTimezone(date: Date, timezone: string): string {
  assertUsableDate(date);
  let parts: Intl.DateTimeFormatPart[];
  try {
    const formatter = new Intl.DateTimeFormat("en", {
      timeZone: timezone,
      calendar: "gregory",
      numberingSystem: "latn",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    if (typeof formatter.formatToParts !== "function")
      return fixedEastEightParts(date, timezone)!.date;
    parts = formatter.formatToParts(date);
  } catch (error) {
    const fallback = fixedEastEightParts(date, timezone, false);
    if (fallback) return fallback.date;
    throw error;
  }
  const values: Record<string, string> = {};
  for (const part of parts) values[part.type] = part.value;
  const year = values.year?.padStart(4, "0");
  const month = values.month?.padStart(2, "0");
  const day = values.day?.padStart(2, "0");
  const result = `${year}-${month}-${day}`;
  if (!/^\d{4}-\d{2}-\d{2}$/u.test(result) ||
      Number(year) < 1 || Number(month) < 1 || Number(month) > 12 ||
      Number(day) < 1 || Number(day) > 31)
    throw new RangeError("calendar_date_parts_unavailable");
  return result;
}

export function clockTimeInTimezone(date: Date, timezone: string): string {
  assertUsableDate(date);
  let parts: Intl.DateTimeFormatPart[];
  try {
    const formatter = new Intl.DateTimeFormat("en", {
      timeZone: timezone, numberingSystem: "latn", hourCycle: "h23",
      hour: "2-digit", minute: "2-digit",
    });
    if (typeof formatter.formatToParts !== "function")
      return fixedEastEightParts(date, timezone)!.time;
    parts = formatter.formatToParts(date);
  } catch (error) {
    const fallback = fixedEastEightParts(date, timezone, false);
    if (fallback) return fallback.time;
    throw error;
  }
  const values: Record<string, string> = {};
  for (const part of parts) values[part.type] = part.value;
  const hour = values.hour?.padStart(2, "0");
  const minute = values.minute?.padStart(2, "0");
  if (!/^\d{2}:\d{2}$/.test(`${hour}:${minute}`) || Number(hour) > 23 || Number(minute) > 59)
    throw new RangeError("clock_time_parts_unavailable");
  return `${hour}:${minute}`;
}

function assertUsableDate(date: Date) {
  if (!Number.isFinite(date.getTime())) throw new RangeError("zoned_date_invalid");
}

/**
 * Current Mini Program spot contracts admit Shanghai and Hong Kong. Both have
 * stayed at UTC+8 throughout the product's supported modern observation range.
 * This path is used only when a phone runtime lacks usable Intl time-zone parts;
 * historical dates and every other IANA zone continue to require Intl.
 */
function fixedEastEightParts(
  date: Date,
  timezone: string,
  required = true,
): { date: string; time: string } | null {
  const supported = timezone === "Asia/Shanghai" || timezone === "Asia/Hong_Kong";
  const year = date.getUTCFullYear();
  if (!supported || year < 2000 || year > 2100) {
    if (required) throw new RangeError("zoned_date_intl_unavailable");
    return null;
  }
  const shifted = new Date(date.getTime() + 8 * 60 * 60 * 1000);
  const localYear = String(shifted.getUTCFullYear()).padStart(4, "0");
  const month = String(shifted.getUTCMonth() + 1).padStart(2, "0");
  const day = String(shifted.getUTCDate()).padStart(2, "0");
  const hour = String(shifted.getUTCHours()).padStart(2, "0");
  const minute = String(shifted.getUTCMinutes()).padStart(2, "0");
  return { date: `${localYear}-${month}-${day}`, time: `${hour}:${minute}` };
}
