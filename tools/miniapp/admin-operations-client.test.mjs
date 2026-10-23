import assert from "node:assert/strict";
import test from "node:test";
import { createAdminRequest } from "./admin-operations-client.mjs";
import { runAdminCommand } from "./admin-operations-commands.mjs";

test("operator credentials work without caller-selected actor and optional assertion stays explicit", async () => {
  const original = globalThis.fetch;
  const seen = [];
  globalThis.fetch = async (_url, options) => { seen.push(options.headers); return Response.json({ data: { actorId: "admin:fixed" } }); };
  try {
    const request = createAdminRequest({ baseUrl: "http://127.0.0.1:1", token: "test-only" });
    assert.deepEqual(await request("/v2/admin/session"), { actorId: "admin:fixed" });
    assert.equal(seen[0]["x-admin-actor"], undefined);
    await createAdminRequest({ baseUrl: "http://127.0.0.1:1", token: "test-only", actor: "admin:fixed" })("/v2/admin/session");
    assert.equal(seen[1]["x-admin-actor"], "admin:fixed");
  } finally { globalThis.fetch = original; }
});

test("operator resolve and merge preserve explicit revision and same-key replay inputs", async () => {
  for (const command of ["resolve", "merge"]) {
    const values = command === "resolve" ? ["case:one", "APPROVED"] : ["case:one", "spot:one"];
    const options = { reason: "verified evidence", revision: "7", "submission-revision": "7", "spot-revision": "3", "idempotency-key": "stable-operation", claims: "ACCESS_PARKING" };
    const calls = [];
    const run = () => {
      const positionals = [...values];
      return runAdminCommand(command, {
        positional: () => positionals.shift(), option: key => options[key], output() {},
        request: async (route, init) => { calls.push({ route, init }); return { receipt: { status: "COMMITTED" }, readback: { state: "APPROVED", submission: { state: "ACCEPTED" }, canonicalMergeRequired: true } }; },
      });
    };
    await run(); await run();
    assert.deepEqual(calls[0], calls[1]);
    assert.equal(calls[0].init.headers["idempotency-key"], "stable-operation");
    const body = JSON.parse(calls[0].init.body);
    assert.equal(command === "resolve" ? body.expectedRevision : body.expectedSubmissionRevision, 7);
    if (command === "merge") assert.equal(body.expectedSpotRevision, 3);
  }
});

test("operator reports a post-commit cache failure without losing the saved result or replaying a legacy write", async () => {
  const original = globalThis.fetch;
  const warnings = [];
  let calls = 0;
  globalThis.fetch = async () => { ++calls; return Response.json({ data: { spot: { name: "Saved" } }, postCommit: { cacheInvalidation: "FAILED" } }); };
  try {
    const request = createAdminRequest({ baseUrl: "http://127.0.0.1:1", token: "test-only", onPostCommitWarning: message => warnings.push(message) });
    assert.deepEqual(await request("/v2/admin/spots/spot:one", { method: "PATCH", body: "{}" }), { spot: { name: "Saved" } });
    assert.equal(calls, 1);
    assert.match(warnings[0], /变更已提交.*不要另建操作或盲目重发/u);
  } finally { globalThis.fetch = original; }
});
