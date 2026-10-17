import { zonedLocalToUtc } from "@starward/miniapp-contracts";
import {
  calendarDateInTimezone,
  clockTimeInTimezone,
} from "@/utils/zoned-date";

export const OBSERVATION_DATE_PAST_DAYS = 7;
export const OBSERVATION_DATE_FUTURE_DAYS = 15;

export function shiftCivilDate(localDate: string, days: number) {
  const [year, month, day] = localDate.split("-").map(Number);
  const value = new Date(Date.UTC(year!, month! - 1, day! + days));
  if (!Number.isFinite(value.getTime())) throw new RangeError("observation_date_invalid");
  return value.toISOString().slice(0, 10);
}

export function observationDateOptions(now: Date, timezone: string) {
  const today = calendarDateInTimezone(now, timezone);
  return Array.from(
    { length: OBSERVATION_DATE_PAST_DAYS + OBSERVATION_DATE_FUTURE_DAYS + 1 },
    (_, index) => shiftCivilDate(today, index - OBSERVATION_DATE_PAST_DAYS),
  );
}

export function civilDateForInstant(at: string, timezone: string) {
  return calendarDateInTimezone(new Date(at), timezone);
}

export function observationNightForCivilDate(localDate: string, localTime: string) {
  const hour = Number(localTime.slice(0, 2));
  if (!Number.isInteger(hour) || hour < 0 || hour > 23)
    throw new RangeError("observation_time_invalid");
  return hour < 12 ? shiftCivilDate(localDate, -1) : localDate;
}

export function observationNightForInstant(at: string, timezone: string) {
  const instant = new Date(at);
  const localDate = calendarDateInTimezone(instant, timezone);
  const localTime = clockTimeInTimezone(instant, timezone);
  return observationNightForCivilDate(localDate, localTime);
}

export function instantForCivilDate(
  localDate: string,
  currentInstant: string,
  timezone: string,
) {
  const instant = new Date(currentInstant);
  const localTime = clockTimeInTimezone(instant, timezone);
  const minuteAt = zonedLocalToUtc({ localDate, localTime, timezone });
  // The shared calendar converts the local minute. Date changes must also keep
  // the precise committed time used by sky playback and the Map consumer.
  const selectedAt = new Date(
    Date.parse(minuteAt) + instant.getUTCSeconds() * 1000 + instant.getUTCMilliseconds(),
  ).toISOString();
  return {
    localDate: observationNightForCivilDate(localDate, localTime),
    selectedAt,
  };
}
