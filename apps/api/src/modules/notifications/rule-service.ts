import { randomUUID } from "node:crypto";
import { NotificationRuleValidationError, parseNotificationRuleCommand, type NotificationRule } from "../../../../../packages/domain/src/notifications/rules";
import { commandDigest } from "../../persistence/command-transaction";
import type { NotificationRuleRepository } from "./sqlite-rule-repository";

export interface NotificationRuleActor { id: string; scope: "local-owner-poc" }
export class NotificationRuleCommandError extends Error {
  constructor(readonly code: string, readonly statusCode = 400, readonly details?: Record<string, unknown>) { super(code); }
}
export function requireNotificationRuleActor(actor: NotificationRuleActor | null): NotificationRuleActor {
  if (!actor?.id || actor.scope !== "local-owner-poc") throw new NotificationRuleCommandError("notification_rule_owner_required", 403);
  return actor;
}
export class NotificationRuleService {
  constructor(private readonly repository: NotificationRuleRepository, private readonly now = () => new Date().toISOString()) {}
  private actor(actor: NotificationRuleActor | null) {
    return requireNotificationRuleActor(actor);
  }
  list(actor: NotificationRuleActor | null, cursor?: number) { return this.repository.list(this.actor(actor).id, cursor); }
  get(actor: NotificationRuleActor | null, id: string, revision?: number) {
    const rule = this.repository.read(this.actor(actor).id, id, revision);
    if (!rule) throw new NotificationRuleCommandError("notification_rule_not_found", 404);
    return rule;
  }
  command(actor: NotificationRuleActor | null, value: unknown) {
    const owner = this.actor(actor);
    let command;
    try { command = parseNotificationRuleCommand(value); } catch (error) {
      if (error instanceof NotificationRuleValidationError) throw new NotificationRuleCommandError(error.code);
      throw error;
    }
    const digest = commandDigest(command), id = command.command === "create-rule" ? randomUUID() : command.ruleId;
    return this.repository.commit({ actorId: owner.id, key: command.idempotencyKey, digest, id }, current => {
      const at = this.now();
      if (command.command === "create-rule") return { schemaVersion: "starward-notification-rule-v1", id, ownerId: owner.id, revision: 1, createdAt: at, updatedAt: at, definition: command.input, evaluation: "not-evaluated", delivery: "not-configured" };
      if (!current) throw new NotificationRuleCommandError("notification_rule_not_found", 404);
      if (current.revision !== command.baseRevision) throw new NotificationRuleCommandError("notification_rule_revision_conflict", 409, { currentRevision: current.revision });
      const definition = command.command === "set-rule-enabled" ? { ...current.definition, enabled: command.enabled } : command.input;
      const next: NotificationRule = { ...current, definition, revision: current.revision + 1, updatedAt: at };
      return next;
    });
  }
}

