import assert from "node:assert/strict";
import test from "node:test";
import { createAdminRequest } from "./admin-operations-client.mjs";
import { runAdminCommand } from "./admin-operations-commands.mjs";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

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

test("operator refuses candidate and patch writes before dispatch when an older server cannot promise their receipt contract", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "starward-admin-contract-"));
  try {
    const input = path.join(directory, "input.json");
    await writeFile(input, JSON.stringify({ name: "Synthetic input" }));
    for (const command of ["candidate-create", "spot-patch"]) {
      const calls = [], options = { input, reason: "Original reason", revision: "1", "idempotency-key": "original-key" };
      let failure;
      try {
        await runAdminCommand(command, { positional: () => "spot:one", option: name => options[name], output() {},
          request: async (route, init) => { calls.push({ route, init });
            if (route === "/v2/admin/session") return { actorId: "admin:owner", operations: ["SPOT_CREATE", "SPOT_EDIT"] };
            return { detail: { spot: { spotId: "spot:one" } }, assessment: { complete: false }, spot: { spotId: "spot:one" } };
          } });
      } catch (error) { failure = error; }
      assert.equal(calls.filter(call => call.init?.method).length, 0, "unsupported server must never receive a write whose key it may ignore");
      assert.match(failure?.message ?? "", /admin_spot_command_contract_upgrade_required/u);
      assert.deepEqual(calls.map(call => call.route), ["/v2/admin/session"]);
    }
  } finally {
    assert.equal(path.dirname(path.resolve(directory)), path.resolve(tmpdir()));
    assert.match(path.basename(directory), /^starward-admin-contract-/u);
    await rm(directory, { recursive: true });
  }
});

test("a newer session response cannot make the operator fall through to a legacy write handler during migration", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "starward-admin-contract-"));
  try {
    const input = path.join(directory, "input.json");
    await writeFile(input, JSON.stringify({ name: "Synthetic input" }));
    const options = { input, reason: "Original reason", "idempotency-key": "original-key" };
    let legacyEffects = 0, failure;
    const routes = [];
    try {
      await runAdminCommand("candidate-create", { option: name => options[name], output() {},
        request: async route => {
          routes.push(route);
          if (route === "/v2/admin/session") return { actorId: "admin:owner", commandContracts: {
            "spot.candidate.create": { version: 1, method: "POST", path: "/v2/admin/spots/candidate-commands" } } };
          if (route === "/v2/admin/spots") { ++legacyEffects; return { detail: { spot: { spotId: "spot:one" } }, assessment: { complete: false } }; }
          throw new Error("admin_http_404:NOT_FOUND:no_request_id");
        } });
    } catch (error) { failure = error; }
    assert.equal(legacyEffects, 0, "a different server generation must reject the new route before any legacy effect");
    assert.match(failure?.message ?? "", /admin_http_404/u);
    assert.deepEqual(routes, ["/v2/admin/session", "/v2/admin/spots/candidate-commands"]);
  } finally {
    assert.equal(path.dirname(path.resolve(directory)), path.resolve(tmpdir()));
    assert.match(path.basename(directory), /^starward-admin-contract-/u);
    await rm(directory, { recursive: true });
  }
});

test("operator does not report a patch as verified when a matched receipt carries a previous or missing requested effect", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "starward-admin-contract-"));
  try {
    const input = path.join(directory, "input.json");
    for (const [patch, stale] of [
      [{ name: "Required new name" }, { spot: { spotId: "spot:one", name: "Previous name" } }],
      [{ accessTags: ["NO_HIKE"] }, { spot: { spotId: "spot:one" } }],
    ]) {
      await writeFile(input, JSON.stringify(patch));
      const options = { input, reason: "Original reason", revision: "1", "idempotency-key": "original-key" };
      const calls = [], outputs = [];
      await assert.rejects(() => runAdminCommand("spot-patch", {
        positional: () => "spot:one", option: name => options[name], output: value => outputs.push(value),
        request: async (route, init) => {
          calls.push({ route, init });
          if (route === "/v2/admin/session") return { actorId: "admin:owner", commandContracts: {
            "spot.patch": { version: 1, method: "PATCH", path: "/v2/admin/spots/:spotId/commands" } } };
          return { result: stale, readback: stale, receipt: { receiptId: "receipt:one", operation: "spot.patch",
            actorId: "admin:owner", idempotencyKey: "original-key", status: "COMMITTED", resultingRevision: 2, readback: stale } };
        },
      }), /admin_spot_command_readback_unverified_preserve_input_and_key/u);
      assert.equal(outputs.length, 0);
      assert.equal(calls.filter(call => call.init?.method).length, 1, "unverified outcome cannot trigger automatic retries");
      assert.equal(calls[1].init.headers["idempotency-key"], "original-key");
      assert.deepEqual(JSON.parse(calls[1].init.body), { ...patch, reason: "Original reason", expectedRevision: 1 });
    }
  } finally {
    assert.equal(path.dirname(path.resolve(directory)), path.resolve(tmpdir()));
    assert.match(path.basename(directory), /^starward-admin-contract-/u);
    await rm(directory, { recursive: true });
  }
});
