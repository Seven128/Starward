import { observationNightForCivilDate, shiftCivilDate, zonedLocalToUtc } from "@starward/miniapp-contracts";
export { observationNightForCivilDate, shiftCivilDate } from "@starward/miniapp-contracts";
import {
  calendarDateInTimezone,
  clockTimeInTimezone,
} from "@/utils/zoned-date";

export const OBSERVATION_DATE_PAST_DAYS = 7;
export const OBSERVATION_DATE_FUTURE_DAYS = 15;

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

export function observationNightLabel(nightDate: string, at: string, timezone: string, today: string) {
  if (civilDateForInstant(at, timezone) !== nightDate)
    return `${nightDate.slice(5, 7)}月${nightDate.slice(8, 10)}日观测夜`;
  return nightDate < today ? "历史时段" : nightDate === today ? "今晚" : "观测夜";
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
  const localTime = clockTimeInTimezone(new Date(currentInstant), timezone);
  return {
    localDate: observationNightForCivilDate(localDate, localTime),
    selectedAt: zonedLocalToUtc({ localDate, localTime, timezone }),
  };
}
