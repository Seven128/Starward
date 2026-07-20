import type { NightReport } from "../../../../../packages/contracts/src/night-report";
import type { NightReportRepository } from "./night-report-service";

export type SqlClient = {
  query<T extends Record<string, unknown> = Record<string, unknown>>(text: string, values?: unknown[]): Promise<{ rows: T[]; rowCount?: number | null }>;
};

function reportFromRow(row: Record<string, unknown> | undefined): NightReport | null {
  if (!row) return null;
  const payload = row.payload;
  if (!payload || typeof payload !== "object") throw new Error("night_report_payload_invalid");
  return structuredClone(payload as NightReport);
}

export class PostgresNightReportRepository implements NightReportRepository {
  constructor(private readonly sql: SqlClient) {}

  async save(report: NightReport): Promise<NightReport> {
    const inserted = await this.sql.query<{ payload: NightReport }>(
      `INSERT INTO night_report_snapshots (id, request_id, revision, generated_at, expires_at, status, payload)
       VALUES ($1::uuid, $2, $3, $4::timestamptz, $5::timestamptz, $6, $7::jsonb)
       ON CONFLICT (request_id) DO NOTHING
       RETURNING payload`,
      [report.id, report.requestId, report.revision, report.generatedAt, report.expiresAt, report.status, JSON.stringify(report)],
    );
    const value = reportFromRow(inserted.rows[0]);
    if (value) return value;
    const existing = await this.findByRequestId(report.requestId);
    if (!existing) throw new Error("night_report_idempotency_race_unresolved");
    return existing;
  }

  async find(id: string): Promise<NightReport | null> {
    const result = await this.sql.query("SELECT payload FROM night_report_snapshots WHERE id = $1::uuid", [id]);
    return reportFromRow(result.rows[0]);
  }

  async findByRequestId(requestId: string): Promise<NightReport | null> {
    const result = await this.sql.query("SELECT payload FROM night_report_snapshots WHERE request_id = $1", [requestId]);
    return reportFromRow(result.rows[0]);
  }
}
