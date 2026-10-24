import { NotificationRuleCommandError, requireNotificationRuleActor, type NotificationRuleActor } from "./rule-service";

/** A caller may constrain the server's principal, never supply one. Old
 * unqualified callers keep their existing server-derived owner behavior. */
export function restrictNotificationOwner(actor: NotificationRuleActor | null, expected: unknown,
  mismatchCode: "notification_rule_owner_mismatch" | "notification_controls_owner_mismatch") {
  if (expected === undefined) return actor;
  const owner = requireNotificationRuleActor(actor);
  if (typeof expected !== "string" || expected !== owner.id) throw new NotificationRuleCommandError(mismatchCode, 403);
  return owner;
}
