import pg from "pg";
import type { VendorUsageAttempt, VendorUsageOutcome, VendorUsageStore } from "./vendor-usage.ts";
import { MINIAPP_VENDOR_BUDGET_CNY } from "./vendor-usage.ts";

export const CURRENT_USAGE_MONTH = `product = 'MINIAPP'
  AND occurred_at >= (date_trunc('month', now() AT TIME ZONE 'Asia/Shanghai') AT TIME ZONE 'Asia/Shanghai')
  AND occurred_at < ((date_trunc('month', now() AT TIME ZONE 'Asia/Shanghai') + interval '1 month') AT TIME ZONE 'Asia/Shanghai')`;

/** A Pool, never the worker's transactional PoolClient: an external attempt
 * must remain committed even when the calling business transaction rolls back. */
export class PostgresVendorUsageStore implements VendorUsageStore {
  private readonly pool: pg.Pool;
  constructor(databaseUrl: string) {
    this.pool = new pg.Pool({ connectionString: databaseUrl, max: 2,
      application_name: "starward-miniapp-vendor-usage", connectionTimeoutMillis: 900,
      statement_timeout: 900, query_timeout: 900 });
    // pg removes the broken idle client before emitting this event. An idle
    // socket failure is not a rejected query promise; never let its raw error
    // terminate the API or expose connection details. The next begin must
    // still acquire a working connection and commit, or fail without sending.
    this.pool.on("error", () => {});
  }
  async close() { await this.pool.end(); }
  async begin(attempt: VendorUsageAttempt): Promise<void> {
    await this.pool.query({ text: `INSERT INTO vendor_call_usage
      (request_id, provider, operation, capability, status, latency_ms, estimated_cost_cny, cost_basis,
       estimated_request_units, unit_basis, request_dimensions)
      VALUES ($1,$2,$3,$4,'PENDING',0,NULL,'UNPRICED',$5,$6,$7::jsonb)`,
      values: [attempt.requestId, attempt.provider, attempt.operation, attempt.capability,
        attempt.estimatedRequestUnits, attempt.unitBasis, JSON.stringify(attempt.dimensions)] });
  }
  async finish(requestId: string, outcome: VendorUsageOutcome): Promise<void> {
    await this.pool.query({ text: `UPDATE vendor_call_usage SET status=$2, http_status=$3, latency_ms=$4 WHERE request_id=$1`,
      values: [requestId, outcome.status, outcome.httpStatus, outcome.latencyMs] });
  }
}

export async function readVendorUsageCosts(pool: pg.Pool) {
  return (await pool.query(`SELECT provider, capability,
    count(*)::integer AS recorded_attempts,
    count(*) FILTER (WHERE status='HTTP_RESPONSE')::integer AS http_responses,
    count(*) FILTER (WHERE status='NOT_SENT')::integer AS not_sent,
    count(*) FILTER (WHERE status='TRANSPORT_FAILURE')::integer AS transport_failures,
    count(*) FILTER (WHERE status='ABORTED')::integer AS aborted,
    count(*) FILTER (WHERE status='PENDING' OR request_id IS NULL)::integer AS unknown_outcomes,
    'RECORDED_ATTEMPT_ESTIMATE_NOT_BILLED_UNITS'::text AS unit_estimate_scope,
    array_agg(DISTINCT unit_basis) AS unit_bases,
    sum(estimated_request_units) FILTER (WHERE status<>'NOT_SENT')::text AS estimated_request_units,
    count(*) FILTER (WHERE estimated_request_units IS NULL)::integer AS unknown_unit_attempts,
    sum(estimated_cost_cny) FILTER (WHERE cost_basis='VERIFIED_ESTIMATE')::text AS estimated_cost_cny,
    count(*) FILTER (WHERE estimated_cost_cny IS NULL OR cost_basis<>'VERIFIED_ESTIMATE')::integer AS unpriced_attempts
    FROM vendor_call_usage WHERE ${CURRENT_USAGE_MONTH}
    GROUP BY provider, capability ORDER BY provider, capability`)).rows;
}

export async function readVendorUsageBudget(pool: pg.Pool) {
  const result = await pool.query(`SELECT
    to_char(now() AT TIME ZONE 'Asia/Shanghai','YYYY-MM') AS month,
    count(*)::integer AS recorded_attempts,
    count(*) FILTER (WHERE status='HTTP_RESPONSE')::integer AS http_responses,
    count(*) FILTER (WHERE status='PENDING' OR request_id IS NULL)::integer AS unknown_outcomes,
    count(*) FILTER (WHERE estimated_cost_cny IS NULL OR cost_basis<>'VERIFIED_ESTIMATE')::integer AS unpriced_attempts,
    sum(estimated_cost_cny) FILTER (WHERE cost_basis='VERIFIED_ESTIMATE')::text AS known_estimated_cost_cny,
    min(occurred_at) FILTER (WHERE request_id IS NOT NULL) AS first_recorded_at
    FROM vendor_call_usage WHERE ${CURRENT_USAGE_MONTH}`);
  const row = result.rows[0]!;
  return { product: "MINIAPP", currency: "CNY", month: row.month, timezone: "Asia/Shanghai",
    hardMonthlyMax: MINIAPP_VENDOR_BUDGET_CNY, state: "UNASSESSED", coverage: "SELECTED_RUNTIME_HTTP_ATTEMPTS",
    projectedMonthlyCny: null, knownEstimatedCostCny: row.known_estimated_cost_cny === null ? null : Number(row.known_estimated_cost_cny),
    recordedAttempts: row.recorded_attempts, httpResponses: row.http_responses, unknownOutcomes: row.unknown_outcomes,
    unpricedAttempts: row.unpriced_attempts, firstRecordedAt: row.first_recorded_at,
    limitations: ["Not a reconciled invoice or proof of complete monthly account usage.", "PENDING may not have been sent; HTTP_RESPONSE describes headers, not product success or redirect hops.", "Native App and IaaS have separate budgets."] };
}
