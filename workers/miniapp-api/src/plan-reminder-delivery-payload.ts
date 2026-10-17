import type { ObservationPlan } from "@starward/miniapp-contracts";
import type { ReminderFieldSource } from "./plan-reminder-delivery-config.ts";

export function mapReminderDeliveryFields(plan: ObservationPlan, reminderId: string, spotName: string,
  fields: Readonly<Record<string, ReminderFieldSource>>): Record<string, { value: string }> | null {
  const result = inspectReminderDeliveryFields(plan,reminderId,spotName,fields);
  return result && 'data' in result ? result.data : null;
}

/** Same field validation for API recovery and dispatch; no second UI limit. */
export function inspectReminderDeliveryFields(plan: ObservationPlan, reminderId: string, spotName: string,
  fields: Readonly<Record<string, ReminderFieldSource>>): {data:Record<string,{value:string}>}
  | {issue:'REMINDER_TITLE_NOT_SUPPORTED'|'SPOT_NAME_NOT_SUPPORTED'|'DEPARTURE_TIME_REQUIRED'} | null {
  const reminder = plan.reminders?.find(row => row.reminderId === reminderId);
  if (!reminder?.notifyOnWechat || !plan.timing) return null;
  const data: Record<string, { value: string }> = {};
  for (const [name, source] of Object.entries(fields)) {
    const value = source === "REMINDER_TITLE" ? reminder.title : source === "SPOT_NAME" ? spotName
      : `${plan.timing.departureLocalDate} ${plan.timing.departureLocalTime}`;
    // Preserve the saved local wall time (formal-spot timezone). Never trim or
    // silently truncate the user's title to make a provider field look valid.
    if (typeof value !== "string" || !value.trim() || /[\u0000-\u001f\u007f]/u.test(value)
      || (source !== "DEPARTURE_LOCAL_TIME" && Array.from(value).length > 20)
      || (source === "DEPARTURE_LOCAL_TIME" && !/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/u.test(value)))
      return {issue:source === 'REMINDER_TITLE' ? 'REMINDER_TITLE_NOT_SUPPORTED'
        : source === 'SPOT_NAME' ? 'SPOT_NAME_NOT_SUPPORTED' : 'DEPARTURE_TIME_REQUIRED'};
    data[name] = { value };
  }
  return {data};
}
