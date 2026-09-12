export function localParts(date: Date, timezone: string) {
  let parts: Intl.DateTimeFormatPart[];
  try {
    const formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    });
    if (typeof formatter.formatToParts !== "function")
      return fixedEastEightLocalParts(date, timezone)!;
    parts = formatter.formatToParts(date);
  } catch (error) {
    const fallback = fixedEastEightLocalParts(date, timezone, false);
    if (fallback) return fallback;
    throw error;
  }
  const values = Object.fromEntries(
    parts.map((part) => [part.type, part.value]),
  );
  const result = {
    year: Number(values.year),
    month: Number(values.month),
    day: Number(values.day),
    hour: Number(values.hour),
    minute: Number(values.minute),
    second: Number(values.second),
  };
  if (!Object.values(result).every(Number.isFinite))
    throw new Error("observation_local_parts_unavailable");
  return result;
}

/**
 * Current Mini Program location contracts admit modern Shanghai and Hong Kong
 * dates. Both are UTC+8 throughout the supported 2000–2100 range. Some Android
 * WeChat runtimes construct Intl.DateTimeFormat but omit formatToParts, so keep
 * the exact same bounded fallback used by the Mini Program presentation layer.
 */
function fixedEastEightLocalParts(
  date: Date,
  timezone: string,
  required = true,
) {
  const supported = timezone === "Asia/Shanghai" || timezone === "Asia/Hong_Kong";
  const year = date.getUTCFullYear();
  if (!supported || year < 2000 || year > 2100) {
    if (required) throw new Error("zoned_date_intl_unavailable");
    return null;
  }
  const shifted = new Date(date.getTime() + 8 * 60 * 60 * 1000);
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
    hour: shifted.getUTCHours(),
    minute: shifted.getUTCMinutes(),
    second: shifted.getUTCSeconds(),
  };
}

/** Converts a finite local wall-clock value through the platform IANA rules.
 * Two passes handle offset changes without assuming China-only fixed offsets. */
export function zonedLocalToUtc(input: {
  localDate: string;
  localTime: string;
  timezone: string;
}): string {
  if (!/^\d{4}-\d{2}-\d{2}$/u.test(input.localDate))
    throw new Error("observation_local_date_invalid");
  if (!/^\d{2}:\d{2}$/u.test(input.localTime))
    throw new Error("observation_local_time_invalid");
  const [year, month, day] = input.localDate.split("-").map(Number);
  const [hour, minute] = input.localTime.split(":").map(Number);
  const wall = Date.UTC(year!, month! - 1, day!, hour!, minute!, 0);
  let candidate = wall;
  for (let index = 0; index < 3; index += 1) {
    const seen = localParts(new Date(candidate), input.timezone);
    const seenWall = Date.UTC(
      seen.year,
      seen.month - 1,
      seen.day,
      seen.hour,
      seen.minute,
      seen.second,
    );
    candidate -= seenWall - wall;
  }
  const verified = localParts(new Date(candidate), input.timezone);
  if (
    verified.year !== year ||
    verified.month !== month ||
    verified.day !== day ||
    verified.hour !== hour ||
    verified.minute !== minute
  )
    throw new Error("observation_local_time_nonexistent_or_ambiguous");
  return new Date(candidate).toISOString();
}
