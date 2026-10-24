import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { nightReportMatchesRequest, type NightReport, type NightReportRequest, type PersistedNightReport } from "../../../../../packages/contracts/src/night-report";
import { commitWithReceipt } from "../../persistence/command-transaction";

export class NightReportPersistenceError extends Error {
  constructor(readonly code: string, readonly statusCode = 409) { super(code); }
}

/** Immutable snapshots and their exact replay receipt share the same Node SQLite transaction. */
export class SqliteNightReportRepository {
  private readonly database: DatabaseSync;
  private closed = false;
  constructor(path: string) {
    if (path !== ":memory:") mkdirSync(dirname(path), { recursive: true });
    this.database = new DatabaseSync(path);
    this.database.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;
      CREATE TABLE IF NOT EXISTS night_report_schema (version INTEGER NOT NULL);
      INSERT INTO night_report_schema(version) SELECT 1 WHERE NOT EXISTS (SELECT 1 FROM night_report_schema);
      CREATE TABLE IF NOT EXISTS night_report_snapshots (
        id TEXT PRIMARY KEY, actor_id TEXT NOT NULL, request_id TEXT NOT NULL, body TEXT NOT NULL,
        UNIQUE(actor_id, request_id)
      );
      CREATE TABLE IF NOT EXISTS night_report_receipts (
        actor_id TEXT NOT NULL, command_key TEXT NOT NULL, input_digest TEXT NOT NULL, body TEXT NOT NULL,
        PRIMARY KEY(actor_id, command_key)
      );`);
    const rows = this.database.prepare("SELECT version FROM night_report_schema").all() as Array<{ version: number }>;
    if (rows.length !== 1 || rows[0].version !== 1) { this.database.close(); throw new Error("night_report_storage_schema_unsupported"); }
    // Existing business_records/runtime_meta remain untouched. Their token and
    // reportId do not contain a report and cannot migrate into a real snapshot.
  }
  read(actorId: string, reportId: string): NightReport | null {
    const row = this.database.prepare("SELECT body FROM night_report_snapshots WHERE id = ? AND actor_id = ?").get(reportId, actorId) as { body: string } | undefined;
    return row ? JSON.parse(row.body) as NightReport : null;
  }
  result(actorId: string, requestId: string, digest?: string): PersistedNightReport | null {
    const row = this.database.prepare("SELECT input_digest, body FROM night_report_receipts WHERE actor_id = ? AND command_key = ?").get(actorId, requestId) as { input_digest: string; body: string } | undefined;
    if (!row) return null;
    if (digest !== undefined && row.input_digest !== digest) throw new NightReportPersistenceError("night_report_idempotency_conflict");
    return { ...JSON.parse(row.body) as PersistedNightReport, ownerId: actorId, replayed: true };
  }
  commit(actorId: string, digest: string, request: NightReportRequest, report: NightReport): PersistedNightReport {
    if (!nightReportMatchesRequest(report, request)) throw new Error("night_report_generated_context_mismatch");
    const committed = commitWithReceipt(this.database, { actorId, key: request.requestId, digest, receiptTable: "night_report_receipts", conflict: () => new NightReportPersistenceError("night_report_idempotency_conflict") }, () => {
      this.database.prepare("INSERT INTO night_report_snapshots(id, actor_id, request_id, body) VALUES (?, ?, ?, ?)").run(report.id, actorId, request.requestId, JSON.stringify(report));
      return { schemaVersion: "starward-night-report-persistence-v1", scope: "local-owner-poc", ownerId: actorId, report, receipt: { requestId: request.requestId, reportId: report.id, revision: report.revision, committedAt: new Date().toISOString() }, replayed: false } satisfies PersistedNightReport;
    });
    return { ...committed.value, ownerId: actorId, replayed: committed.replayed };
  }
  close() { if (!this.closed) { this.closed = true; this.database.close(); } }
}
