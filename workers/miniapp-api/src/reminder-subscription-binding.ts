export interface ReminderSubscriptionBinding { appId: string; templateId: string }

/** Validate before awaiting and copy only the two authoritative config fields. */
export function snapshotReminderSubscriptionBinding(binding: ReminderSubscriptionBinding): ReminderSubscriptionBinding {
  if (typeof binding?.appId !== "string" || !/^[A-Za-z0-9_-]{1,128}$/u.test(binding.appId)
    || typeof binding?.templateId !== "string" || !/^[A-Za-z0-9_-]{1,128}$/u.test(binding.templateId))
    throw new Error("reminder_subscription_binding_invalid");
  return { appId: binding.appId, templateId: binding.templateId };
}
export function validateReminderSubscriptionChallengeId(value: unknown): asserts value is string {
  if (typeof value !== "string" || !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/iu.test(value))
    throw new Error("reminder_subscription_challenge_invalid");
}
