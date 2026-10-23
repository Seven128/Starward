import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { DatabaseSync } from "node:sqlite";
import type { FieldReportDraft, FieldReportLibrary, FieldReportResult } from "../../../../../packages/domain/src/offline/field-reports";
import { commitWithReceipt } from "../../persistence/command-transaction";
import { FieldReportCommandError } from "./report-service";

export interface FieldReportRepository {
  read(actorId: string, id: string, revision?: number): FieldReportDraft | null;
  list(actorId: string, cursor?: number): FieldReportLibrary;
  commit(input: { actorId: string; key: string; digest: string; id: string }, mutate: (current: FieldReportDraft | null) => FieldReportDraft): FieldReportResult;
  close(): void;
}
export class SqliteFieldReportRepository implements FieldReportRepository {
  private readonly database: DatabaseSync;
  constructor(path: string) {
    if (path !== ":memory:") mkdirSync(dirname(path), { recursive: true });
    this.database = new DatabaseSync(path);
    this.database.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;
      CREATE TABLE IF NOT EXISTS field_report_schema (version INTEGER NOT NULL);
      INSERT INTO field_report_schema(version) SELECT 1 WHERE NOT EXISTS (SELECT 1 FROM field_report_schema);
      CREATE TABLE IF NOT EXISTS field_report_drafts (id TEXT PRIMARY KEY, actor_id TEXT NOT NULL, revision INTEGER NOT NULL, body TEXT NOT NULL);
      CREATE INDEX IF NOT EXISTS field_report_actor ON field_report_drafts(actor_id);
      CREATE TABLE IF NOT EXISTS field_report_versions (id TEXT NOT NULL, actor_id TEXT NOT NULL, revision INTEGER NOT NULL, body TEXT NOT NULL, PRIMARY KEY(id, revision), FOREIGN KEY(id) REFERENCES field_report_drafts(id));
      CREATE TABLE IF NOT EXISTS field_report_receipts (actor_id TEXT NOT NULL, command_key TEXT NOT NULL, input_digest TEXT NOT NULL, body TEXT NOT NULL, PRIMARY KEY(actor_id, command_key));`);
    const versions = this.database.prepare("SELECT version FROM field_report_schema").all() as Array<{ version: number }>;
    if (versions.length !== 1 || versions[0].version !== 1) { this.database.close(); throw new Error("field_report_storage_schema_unsupported"); }
    // Old generic command/artifact records are retained, never promoted to notes.
  }
  read(actorId: string, id: string, revision?: number): FieldReportDraft | null {
    const row = (revision === undefined
      ? this.database.prepare("SELECT body FROM field_report_drafts WHERE id = ? AND actor_id = ?").get(id, actorId)
      : this.database.prepare("SELECT body FROM field_report_versions WHERE id = ? AND actor_id = ? AND revision = ?").get(id, actorId, revision)) as { body: string } | undefined;
    return row ? JSON.parse(row.body) as FieldReportDraft : null;
  }
  list(actorId: string, cursor = Number.MAX_SAFE_INTEGER): FieldReportLibrary {
    const rows = this.database.prepare("SELECT rowid AS cursor, body FROM field_report_drafts WHERE actor_id = ? AND rowid < ? ORDER BY rowid DESC LIMIT 51").all(actorId, cursor) as Array<{ cursor: number; body: string }>;
    const page = rows.slice(0, 50);
    return { schemaVersion: "starward-field-reports-v2", items: page.map(row => JSON.parse(row.body) as FieldReportDraft), nextCursor: rows.length > 50 ? String(page.at(-1)!.cursor) : null, scope: "local-owner-poc" };
  }
  commit(input: { actorId: string; key: string; digest: string; id: string }, mutate: (current: FieldReportDraft | null) => FieldReportDraft): FieldReportResult {
    const committed = commitWithReceipt(this.database, { ...input, receiptTable: "field_report_receipts", conflict: () => new FieldReportCommandError("field_report_idempotency_conflict", 409) }, () => {
      const current = this.read(input.actorId, input.id), next = mutate(current);
      if (next.id !== input.id || next.ownerId !== input.actorId) throw new Error("field_report_storage_owner_mismatch");
      const body = JSON.stringify(next);
      if (!current) this.database.prepare("INSERT INTO field_report_drafts(id, actor_id, revision, body) VALUES (?, ?, ?, ?)").run(next.id, input.actorId, next.revision, body);
      else {
        const update = this.database.prepare("UPDATE field_report_drafts SET revision = ?, body = ? WHERE id = ? AND actor_id = ? AND revision = ?").run(next.revision, body, next.id, input.actorId, current.revision);
        if (update.changes !== 1) throw new FieldReportCommandError("field_report_revision_conflict", 409);
      }
      this.database.prepare("INSERT INTO field_report_versions(id, actor_id, revision, body) VALUES (?, ?, ?, ?)").run(next.id, input.actorId, next.revision, body);
      const result: FieldReportResult = { schemaVersion: "starward-field-reports-v2", status: "saved", replayed: false, report: next, receipt: { idempotencyKey: input.key, reportId: next.id, revision: next.revision, committedAt: next.updatedAt } };
      return result;
    });
    return { ...committed.value, replayed: committed.replayed };
  }
  close() { this.database.close(); }
}
