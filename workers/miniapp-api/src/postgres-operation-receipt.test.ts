import assert from "node:assert/strict";
import test from "node:test";
import { PostgresMiniappRepository } from "./postgres-repository.ts";

const committedAt = "2026-09-27T12:33:08.471Z";
for (const createdAt of [new Date(committedAt), committedAt]) {
  test(`operation receipt preserves milliseconds from ${createdAt instanceof Date ? "PostgreSQL Date" : "ISO text"}`, async context => {
    const repository = new PostgresMiniappRepository("postgresql://unused@127.0.0.1:1/unused");
    context.mock.method(repository.pool, "query", async (sql: string, values: unknown[]) => {
      assert.match(sql, /WHERE receipt_id = \$1/u);
      assert.deepEqual(values, ["receipt:test"]);
      return { rows: [{
        receipt_id: "receipt:test", operation: "spot.publish", status: "COMMITTED",
        actor_id: "admin:test", idempotency_key: "publish:test", request_id: "request:test",
        created_at: createdAt, resulting_revision: 2, assessment_digest: null,
        result_payload: { status: "PUBLISHED" }, readback_payload: { status: "PUBLISHED" },
      }] };
    });
    try {
      const receipt = await repository.adminReadReceipt("receipt:test");
      assert.equal(receipt?.committedAt, committedAt);
      assert.equal(receipt?.status, "COMMITTED");
      assert.deepEqual(receipt?.readback, { status: "PUBLISHED" });
    } finally { await repository.close(); }
  });
}
