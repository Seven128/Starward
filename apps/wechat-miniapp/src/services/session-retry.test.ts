import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { createAuthenticatedOperationRequester } from "./authenticated-operation";

test("authenticated retries preserve their original account and do not clear a newer login", async () => {
  for (const scenario of ["same", "changed-before-retry", "changed-during-refresh"]) {
    let requests = 0, clears = 0, resolutions = 0;
    class ApiError extends Error { code = "PERMISSION_DENIED"; }
    const run = createAuthenticatedOperationRequester({
      resolveSession: async () => ({ userId: ++resolutions > 1 && scenario === "changed-during-refresh" ? "b" : "a" }),
      readStoredSession: () => ({ userId: scenario === "changed-before-retry" ? "b" : "a" }),
      clearStoredSession: () => { clears++; },
      request: async () => { if (++requests === 1) throw new ApiError(); return "saved"; },
      isPermissionDenied: (error: unknown) => error instanceof ApiError,
    } as any);
    if (scenario === "same") {
      assert.equal(await run("plan", "planPut", { auth: "REQUIRED", pathParams: { planId: "test-plan" } }), "saved");
      assert.equal(requests, 2);
    } else {
      await assert.rejects(run("plan", "planPut", { auth: "REQUIRED", pathParams: { planId: "test-plan" } }));
      assert.equal(requests, 1);
    }
    assert.equal(clears, scenario === "changed-before-retry" ? 0 : 1);
  }
});
