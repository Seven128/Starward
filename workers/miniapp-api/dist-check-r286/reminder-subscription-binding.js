/** Validate before awaiting and copy only the two authoritative config fields. */
export function snapshotReminderSubscriptionBinding(binding) {
    if (typeof binding?.appId !== "string" || !/^[A-Za-z0-9_-]{1,128}$/u.test(binding.appId)
        || typeof binding?.templateId !== "string" || !/^[A-Za-z0-9_-]{1,128}$/u.test(binding.templateId))
        throw new Error("reminder_subscription_binding_invalid");
    return { appId: binding.appId, templateId: binding.templateId };
}
export function validateReminderSubscriptionChallengeId(value) {
    if (typeof value !== "string" || !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/iu.test(value))
        throw new Error("reminder_subscription_challenge_invalid");
}
//# sourceMappingURL=reminder-subscription-binding.js.map