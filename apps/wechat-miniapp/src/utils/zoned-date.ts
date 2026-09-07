/** Display an API timestamp in the feedback form's explicit observation timezone. */
export function displayBeijingTimestamp(value: string): string {
  try {
    const date = new Date(value);
    return `${calendarDateInTimezone(date, "Asia/Shanghai")} ${clockTimeInTimezone(date, "Asia/Shanghai")}（北京时间）`;
  } catch { return "时间暂不可用"; }
}

/** Serialize a Gregorian calendar date in the requested IANA zone, not a display locale. */
export function calendarDateInTimezone(date: Date, timezone: string): string {
  const parts = new Intl.DateTimeFormat("en", {
    timeZone: timezone,
    calendar: "gregory",
    numberingSystem: "latn",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
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
  const parts = new Intl.DateTimeFormat("en", {
    timeZone: timezone, numberingSystem: "latn", hourCycle: "h23",
    hour: "2-digit", minute: "2-digit",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  const hour = values.hour?.padStart(2, "0");
  const minute = values.minute?.padStart(2, "0");
  if (!/^\d{2}:\d{2}$/.test(`${hour}:${minute}`) || Number(hour) > 23 || Number(minute) > 59)
    throw new RangeError("clock_time_parts_unavailable");
  return `${hour}:${minute}`;
}
