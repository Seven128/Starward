import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const migration = await readFile(
  new URL(
    "../../../database/miniapp/migrations/007_operations_revisions_receipts.sql",
    import.meta.url,
  ),
  "utf8",
);

test("operations migration preserves immutable revisions and append-only audit boundaries", () => {
  for (const table of [
    "spot_revisions",
    "contribution_revisions",
    "moderation_case_events",
    "contribution_merge_events",
    "spot_publication_assessment_events",
    "operation_receipts",
  ])
    assert.match(migration, new RegExp(`CREATE TABLE IF NOT EXISTS ${table}`, "u"));
  assert.match(migration, /active_revision_id/u);
  assert.match(migration, /miniapp_append_only_guard/u);
  assert.match(migration, /BEFORE UPDATE OR DELETE ON spot_revisions/u);
  assert.match(migration, /BEFORE UPDATE OR DELETE ON audit_logs/u);
  assert.match(migration, /BEFORE UPDATE OR DELETE ON spot_replacement_relations/u);
  assert.match(migration, /BEFORE UPDATE OR DELETE ON operation_receipts/u);
  assert.match(migration, /UNIQUE \(scope_id, idempotency_key\)/u);
  assert.match(migration, /request_digest/u);
  assert.doesNotMatch(
    migration,
    /spot_replacement_relations[\s\S]{0,500}ON CONFLICT[\s\S]{0,120}DO UPDATE/iu,
  );
  assert.doesNotMatch(
    migration,
    /UPDATE\s+spot_revisions|DELETE\s+FROM\s+spot_revisions/iu,
  );
});
