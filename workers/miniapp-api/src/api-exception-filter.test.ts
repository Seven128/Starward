import assert from "node:assert/strict";
import test from "node:test";
import { classifyExceptionMessage } from "./api-exception.filter.ts";

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
