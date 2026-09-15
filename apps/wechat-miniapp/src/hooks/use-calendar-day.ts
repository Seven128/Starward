import { useEffect, useState } from "react";
import { zonedLocalToUtc } from "@starward/miniapp-contracts";
import { calendarDateInTimezone } from "@/utils/zoned-date";

/** Calendar arithmetic keeps 23/25-hour days separate from elapsed durations. */
export function nextCalendarDayDelay(now: number, timezone: string) {
  const today = calendarDateInTimezone(new Date(now), timezone);
  const tomorrow = new Date(Date.parse(`${today}T12:00:00Z`) + 86_400_000).toISOString().slice(0, 10);
  try {
    return Math.max(1, Date.parse(zonedLocalToUtc({ localDate: tomorrow, localTime: "00:00", timezone })) - now + 20);
  } catch {
    // Some timezones skip midnight; recheck the calendar without inventing an instant.
    return 60_000;
  }
}

export function useCalendarDay(timezone: string, active: boolean) {
  const [clock, setClock] = useState(() => ({ timezone, day: calendarDateInTimezone(new Date(), timezone) }));
  useEffect(() => {
    if (!active) return;
    let timer: ReturnType<typeof setTimeout>;
    const update = () => {
      const now = Date.now();
      const day = calendarDateInTimezone(new Date(now), timezone);
      setClock(previous => previous.timezone === timezone && previous.day === day ? previous : { timezone, day });
      timer = setTimeout(update, nextCalendarDayDelay(now, timezone));
    };
    update();
    return () => clearTimeout(timer);
  }, [timezone, active]);
  return clock.timezone === timezone ? clock.day : calendarDateInTimezone(new Date(), timezone);
}
