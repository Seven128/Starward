import assert from "node:assert/strict";
import test from "node:test";
import { classifyExceptionMessage } from "./api-exception.filter.ts";

test("catalog concurrency and retired baseline failures preserve recovery meaning", () => {
  for (const reason of ["active_changed", "candidate_changed", "source_exists", "version_exists", "candidate_duplicate", "candidate_not_reviewable", "candidate_not_publishable", "already_active"])
    assert.deepEqual(classifyExceptionMessage(`event_catalog_${reason}`), { status: 409, code: "CONFLICT", retryable: true });
  assert.deepEqual(classifyExceptionMessage("event_catalog_retired_baseline_not_restorable"), { status: 400, code: "INVALID_INPUT", retryable: false });
});

test("expired or missing sessions are permission failures that permit client re-authentication", () => {
  assert.deepEqual(classifyExceptionMessage("auth_required"), {
    status: 403,
    code: "PERMISSION_DENIED",
    retryable: false,
  });
  assert.deepEqual(classifyExceptionMessage("auth_header_invalid"), {
    status: 403,
    code: "PERMISSION_DENIED",
    retryable: false,
  });
});

test("ordinary malformed product input remains an input error", () => {
  assert.deepEqual(classifyExceptionMessage("map_viewport_invalid"), {
    status: 400,
    code: "INVALID_INPUT",
    retryable: false,
  });
});

test("erased evidence and deleted accounts cannot enter a retry loop", () => {
  for (const message of ["contribution_account_deleted", "operation_receipt_privacy_erased"])
    assert.deepEqual(classifyExceptionMessage(message), { status: 410, code: "STALE_REJECTED", retryable: false });
  assert.deepEqual(classifyExceptionMessage("account_not_active"), { status: 403, code: "PERMISSION_DENIED", retryable: false });
});
