import { NotificationRuleCommandError, type NotificationRuleActor } from "./rule-service";
import { restrictLocalPocOwner } from "../../local-poc-owner";

/** A caller may constrain the server's principal, never supply one. Old
 * unqualified callers keep their existing server-derived owner behavior. */
export function restrictNotificationOwner(actor: NotificationRuleActor | null, expected: unknown,
  mismatchCode: "notification_rule_owner_mismatch" | "notification_controls_owner_mismatch") {
  return restrictLocalPocOwner(actor, expected, reason => new NotificationRuleCommandError(reason === "required" ? "notification_rule_owner_required" : mismatchCode, 403));
}
