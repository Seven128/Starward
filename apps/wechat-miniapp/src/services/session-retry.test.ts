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

test("an old permission rejection cannot revoke the same account's newer token", async () => {
  let resolutions = 0, requests = 0;
  const first = { userId: "a", accessToken: "synthetic:old", expiresAt: "2999-01-01" };
  const current = { ...first, accessToken: "synthetic:new" };
  class ApiError extends Error {}
  const run = createAuthenticatedOperationRequester({
    resolveSession: async () => ++resolutions === 1 ? first : current,
    readStoredSession: () => current,
    clearStoredSession: () => assert.fail("an older rejection must preserve the newer session"),
    request: async (_key: string, _path: string, options: { session: typeof first }) => {
      if (++requests === 1) throw new ApiError();
      assert.equal(options.session, current);
      return "saved";
    },
    isPermissionDenied: (error: unknown) => error instanceof ApiError,
  } as any);
  assert.equal(await run("plan", "plansGet", { auth: "REQUIRED" }), "saved");
  assert.equal(requests, 2);
});

test("an anonymous optional rejection cannot clear a successor login", async () => {
  let resolutions = 0, requests = 0;
  const current = { userId: "a", accessToken: "synthetic:new", expiresAt: "2999-01-01" };
  class ApiError extends Error {}
  const run = createAuthenticatedOperationRequester({
    resolveSession: async () => ++resolutions === 1 ? null : current,
    readStoredSession: () => null,
    clearStoredSession: () => assert.fail("an anonymous rejection owns no session to invalidate"),
    request: async (_key: string, _path: string, options: { session?: typeof current }) => {
      if (++requests === 1) { assert.equal(options.session, undefined); throw new ApiError(); }
      assert.equal(options.session, current);
      return "loaded";
    },
    isPermissionDenied: (error: unknown) => error instanceof ApiError,
  } as any);
  assert.equal(await run("scene", "mapSceneGet", { auth: "OPTIONAL" }), "loaded");
  assert.equal(requests, 2);
});
