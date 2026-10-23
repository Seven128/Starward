import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { DatabaseSync } from "node:sqlite";
import type { NotificationRule, NotificationRuleLibrary, NotificationRuleResult } from "../../../../../packages/domain/src/notifications/rules";
import { commitWithReceipt } from "../../persistence/command-transaction";
import { NotificationRuleCommandError } from "./rule-service";

export interface NotificationRuleRepository {
  read(actorId: string, id: string, revision?: number): NotificationRule | null;
  list(actorId: string, cursor?: number): NotificationRuleLibrary;
  commit(input: { actorId: string; key: string; digest: string; id: string }, mutate: (current: NotificationRule | null) => NotificationRule): NotificationRuleResult;
  close(): void;
}
export class SqliteNotificationRuleRepository implements NotificationRuleRepository {
  private readonly database: DatabaseSync;
  constructor(path: string) {
    if (path !== ":memory:") mkdirSync(dirname(path), { recursive: true });
    this.database = new DatabaseSync(path);
    this.database.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;
      CREATE TABLE IF NOT EXISTS notification_rule_schema (version INTEGER NOT NULL);
      INSERT INTO notification_rule_schema(version) SELECT 1 WHERE NOT EXISTS (SELECT 1 FROM notification_rule_schema);
      CREATE TABLE IF NOT EXISTS notification_rules (id TEXT PRIMARY KEY, actor_id TEXT NOT NULL, revision INTEGER NOT NULL, body TEXT NOT NULL);
      CREATE INDEX IF NOT EXISTS notification_rules_actor ON notification_rules(actor_id);
      CREATE TABLE IF NOT EXISTS notification_rule_versions (id TEXT NOT NULL, actor_id TEXT NOT NULL, revision INTEGER NOT NULL, body TEXT NOT NULL, PRIMARY KEY(id, revision), FOREIGN KEY(id) REFERENCES notification_rules(id));
      CREATE TABLE IF NOT EXISTS notification_rule_receipts (actor_id TEXT NOT NULL, command_key TEXT NOT NULL, input_digest TEXT NOT NULL, body TEXT NOT NULL, PRIMARY KEY(actor_id, command_key));`);
    const versions = this.database.prepare("SELECT version FROM notification_rule_schema").all() as Array<{ version: number }>;
    if (versions.length !== 1 || versions[0].version !== 1) { this.database.close(); throw new Error("notification_rule_storage_schema_unsupported"); }
    // Old generic business_records are preserved, never interpreted as rules.
  }
  read(actorId: string, id: string, revision?: number): NotificationRule | null {
    const row = (revision === undefined
      ? this.database.prepare("SELECT body FROM notification_rules WHERE id = ? AND actor_id = ?").get(id, actorId)
      : this.database.prepare("SELECT body FROM notification_rule_versions WHERE id = ? AND actor_id = ? AND revision = ?").get(id, actorId, revision)) as { body: string } | undefined;
    return row ? JSON.parse(row.body) as NotificationRule : null;
  }
  list(actorId: string, cursor = Number.MAX_SAFE_INTEGER): NotificationRuleLibrary {
    const rows = this.database.prepare("SELECT rowid AS cursor, body FROM notification_rules WHERE actor_id = ? AND rowid < ? ORDER BY rowid DESC LIMIT 51").all(actorId, cursor) as Array<{ cursor: number; body: string }>;
    const page = rows.slice(0, 50);
    return { schemaVersion: "starward-notification-rules-v2", items: page.map(row => JSON.parse(row.body) as NotificationRule), nextCursor: rows.length > 50 ? String(page.at(-1)!.cursor) : null, scope: "local-owner-poc" };
  }
  commit(input: { actorId: string; key: string; digest: string; id: string }, mutate: (current: NotificationRule | null) => NotificationRule): NotificationRuleResult {
    const committed = commitWithReceipt(this.database, { ...input, receiptTable: "notification_rule_receipts", conflict: () => new NotificationRuleCommandError("notification_rule_idempotency_conflict", 409) }, () => {
      const current = this.read(input.actorId, input.id), next = mutate(current);
      if (next.id !== input.id || next.ownerId !== input.actorId) throw new Error("notification_rule_storage_owner_mismatch");
      const body = JSON.stringify(next);
      if (!current) this.database.prepare("INSERT INTO notification_rules(id, actor_id, revision, body) VALUES (?, ?, ?, ?)").run(next.id, input.actorId, next.revision, body);
      else {
        const update = this.database.prepare("UPDATE notification_rules SET revision = ?, body = ? WHERE id = ? AND actor_id = ? AND revision = ?").run(next.revision, body, next.id, input.actorId, current.revision);
        if (update.changes !== 1) throw new NotificationRuleCommandError("notification_rule_revision_conflict", 409);
      }
      this.database.prepare("INSERT INTO notification_rule_versions(id, actor_id, revision, body) VALUES (?, ?, ?, ?)").run(next.id, input.actorId, next.revision, body);
      const result: NotificationRuleResult = { schemaVersion: "starward-notification-rules-v2", status: "saved", replayed: false, rule: next, receipt: { idempotencyKey: input.key, ruleId: next.id, revision: next.revision, committedAt: next.updatedAt } };
      return result;
    });
    return { ...committed.value, replayed: committed.replayed };
  }
  close() { this.database.close(); }
}
