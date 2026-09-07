import { calendarDateInTimezone, clockTimeInTimezone } from "../../../utils/zoned-date";

/** A route duration is elapsed time, evaluated against the saved observing instant. */
export function departureTimeLabel(selectedAtUtc: string, minutes: number, timezone: string): string | null {
  const arrival = new Date(selectedAtUtc);
  if (!Number.isFinite(arrival.getTime()) || !Number.isFinite(minutes) || minutes < 0) return null;
  const departure = new Date(arrival.getTime() - minutes * 60_000);
  try {
    const date = calendarDateInTimezone(departure, timezone);
    const clock = clockTimeInTimezone(departure, timezone);
    return date === calendarDateInTimezone(arrival, timezone) ? clock : `${date} ${clock}`;
  } catch { return null; }
}

export function observingWindowLabel(window: { start: string; end: string } | null | undefined, timezone: string): string | null {
  if (!window) return null;
  const start = new Date(window.start), end = new Date(window.end);
  if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || end <= start) return null;
  try {
    const startDate = calendarDateInTimezone(start, timezone), endDate = calendarDateInTimezone(end, timezone);
    const startClock = clockTimeInTimezone(start, timezone), endClock = clockTimeInTimezone(end, timezone);
    return startDate === endDate ? `${startClock}–${endClock}` : `${startDate} ${startClock}–${endDate} ${endClock}`;
  } catch { return null; }
}
