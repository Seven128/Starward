import {
  calendarDateInTimezone,
  clockTimeInTimezone,
} from "@/utils/zoned-date";

const SAVE_TIMEZONE = "Asia/Shanghai";

export function contributionSavedState(
  updatedAt: string,
  now = new Date(),
): string {
  try {
    const updated = new Date(updatedAt);
    const savedDate = calendarDateInTimezone(updated, SAVE_TIMEZONE);
    const today = calendarDateInTimezone(now, SAVE_TIMEZONE);
    const time = clockTimeInTimezone(updated, SAVE_TIMEZONE);
    if (savedDate === today) return `${time} 已保存`;
    const date = savedDate.slice(0, 4) === today.slice(0, 4)
      ? savedDate.slice(5)
      : savedDate;
    return `${date} ${time} 已保存`;
  } catch {
    return "已保存";
  }
}
