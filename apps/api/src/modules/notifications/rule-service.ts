export interface NotificationRule { id: string; userId: string; grid: string; category: "pretrip" | "intrip" | "long-term"; target: string; threshold: { metric: string; direction: "above" | "below"; value: number; unit: string }; leadMinutes: number; quietHours: { start: string; end: string; timezone: string }; cooldownMinutes: number; channel: "local" | "inbox" | "apns" | "fcm" | "vendor" | "expo-poc"; enabled: boolean; revision: number }
export interface RuleRepository { save(rule: NotificationRule, idempotencyKey: string): Promise<NotificationRule>; list(userId: string): Promise<NotificationRule[]> }
export class NotificationRuleService {
  constructor(private readonly repository: RuleRepository) {}
  async save(rule: NotificationRule, idempotencyKey: string) { if (!idempotencyKey) throw new TypeError("idempotency_key_required"); if (!Number.isFinite(rule.threshold.value) || rule.cooldownMinutes < 0) throw new RangeError("invalid_notification_rule"); return this.repository.save(rule, idempotencyKey); }
  async settings(userId: string, systemPermission: "granted" | "denied" | "undetermined") { return { rules: await this.repository.list(userId), systemPermission, defaultOptIn: false, defaultQuietHours: "22:00–08:00", localAndInboxAuthoritative: true }; }
}

