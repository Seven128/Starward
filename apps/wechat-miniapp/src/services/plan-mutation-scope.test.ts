import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { acknowledgePlanSave, createPlanSaveRetry, PlanSaveReviewRequired, samePlanSaveIntent } from "./plan-save-retry";

function mutationCode(name: string) {
  const api = ts.createSourceFile("api.ts", readFileSync(new URL("./api-client.ts", import.meta.url), "utf8"), ts.ScriptTarget.Latest, true);
  const client = ts.createSourceFile("client.ts", readFileSync(new URL("../content/plan/detail/plan-save-client.ts", import.meta.url), "utf8"), ts.ScriptTarget.Latest, true);
  const functions = name === "saveObservationPlan"
    ? [[api, "sendObservationPlanSave"], [api, "getCurrentPlansAfterSave"], [client, name]] as const
    : [[api, name]] as const;
  return functions.map(([source, functionName]) => {
    const declaration = source.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === functionName);
    assert.ok(declaration); return declaration.getText(source).replace(/^export /, "");
  }).join("\n") + `\n${name};`;
}

test("an unknown save rejected on replay can be reconciled and confirmed before a new revision is submitted", async () => {
  class MiniappApiError extends Error { statusCode = 409; }
  const values = new Map<string, unknown>();
  const storage = { getStorageSync: (key: string) => values.get(key), setStorageSync: (key: string, value: unknown) => { values.set(key, structuredClone(value)); }, removeStorageSync: (key: string) => { values.delete(key); } };
  let puts = 0, reads = 0, keys = 0;
  const current = { planId: "plan:one", spotId: "spot:one", localDate: "2026-09-06", localTime: "22:00", notes: "external", revision: 2 };
  const operation = vm.runInNewContext(ts.transpileModule(mutationCode("saveObservationPlan"), { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText, {
    ensureSession: async () => ({ userId: "a" }), currentDraftUserId: () => "a",
    retryPlanSave: createPlanSaveRetry(storage, () => `key:${++keys}`, error => error instanceof MiniappApiError), MiniappApiError, PlanSaveReviewRequired, samePlanSaveIntent,
    requestOperation: async (_key: unknown, op: string, request: { body: { notes: string; expectedRevision: number }; cache?: boolean }) => {
      if (op === "plansGet") { reads++; assert.equal(request.cache, false); return { dataState: "FRESH", data: { plans: [current] } }; }
      puts++;
      if (puts === 1) throw Error("network lost before commit");
      if (puts === 2) { assert.equal(request.body.expectedRevision, 1); throw new MiniappApiError("conflict"); }
      assert.equal(request.body.expectedRevision, 2); assert.equal(request.body.notes, "local edit");
      current.notes = request.body.notes; current.revision = 3;
      return { dataState: "FRESH", data: { ...current } };
    }, miniappQueryClient: { setQueryData() {} }, invalidateAfter: async () => {},
  });
  await assert.rejects(operation({ ...current, notes: "initial" }, "context:one", 1, "a"), /network lost/);
  await assert.rejects(operation({ ...current, notes: "local edit" }, "context:one", 1, "a"), error => {
    assert.ok(error instanceof PlanSaveReviewRequired);
    assert.equal(error.current?.revision, 2); assert.equal(values.size, 1);
    acknowledgePlanSave(storage, error.receipt); return true;
  });
  const saved = await operation({ ...current, notes: "local edit" }, "context:one", 2, "a");
  assert.equal(saved.data.revision, 3); assert.equal(keys, 2); assert.equal(puts, 3); assert.equal(reads, 2);
});

test("plan receipts update only the initiating account cache and preserve unrelated plans", async () => {
  for (const functionName of ["saveObservationPlan", "deleteObservationPlan"]) {
    for (const switched of [false, true, "before"] as const) {
      let owner = switched === "before" ? "b" : "a";
      let requests = 0;
      let invalidations = 0;
      let writes = 0;
      let cached = { data: { plans: [{ planId: "plan:one", revision: 1 }, { planId: "plan:other", revision: 8 }] } };
      const receipt = functionName === "saveObservationPlan" ? { data: { planId: "plan:one", revision: 2 } } : { data: { plans: [cached.data.plans[1]] } };
      const local = new Map<string, unknown>();
      const operation = vm.runInNewContext(ts.transpileModule(mutationCode(functionName), { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText, {
        ensureSession: async () => ({ userId: owner }), currentDraftUserId: () => owner, idempotencyKey: () => "test-key",
        MiniappApiError: class extends Error {}, PlanSaveReviewRequired, samePlanSaveIntent,
        retryPlanSave: createPlanSaveRetry({ getStorageSync: key => local.get(key), setStorageSync: (key, value) => { local.set(key, value); }, removeStorageSync: key => { local.delete(key); } }, () => "test-key", () => false),
        requestOperation: async (_key: unknown, op: string, request: { cache?: boolean }, _retry: unknown, expected: string) => {
          requests++;
          assert.equal(expected, "a"); if (switched) owner = "b";
          if (op === "plansGet") {
            assert.equal(request.cache, false);
            return { dataState: "FRESH", data: { plans: [receipt.data, cached.data.plans[1]] } };
          }
          return receipt;
        },
        miniappQueryClient: { setQueryData: (key: string[], update: unknown) => {
          assert.equal(key[1], "a"); writes++;
          cached = typeof update === "function" ? update(cached) : update;
        } },
        invalidateAfter: async () => { invalidations++; },
      });
      const invoke = () => functionName === "saveObservationPlan" ? operation({ planId: "plan:one", spotId: "spot:one", localDate: "2026-09-06", localTime: "22:00", notes: "test" }, "context:one", 1, "a") : operation("plan:one", "a");
      if (switched) { await assert.rejects(invoke(), /账号已变化/); assert.equal(writes, 0); assert.equal(invalidations, 0); }
      else {
        assert.deepEqual((await invoke()).data, receipt.data);
        assert.equal(writes, 1); assert.equal(invalidations, 1);
        assert.equal(cached.data.plans.find((item) => item.planId === "plan:other")?.revision, 8);
        assert.equal(cached.data.plans.find((item) => item.planId === "plan:one")?.revision, functionName === "saveObservationPlan" ? 2 : undefined);
      }
      assert.equal(requests, switched === "before" ? 0 : !switched && functionName === "saveObservationPlan" ? 2 : 1);
    }
  }
});

test("replayed save receipts are reconciled with fresh current state, including deletion and account changes", async () => {
  for (const scenario of ["changed-input", "newer", "deleted", "stale", "offline", "switched-read"] as const) {
    let owner = "a", readCount = 0, putCount = 0, writes = 0;
    const local = new Map<string, unknown>();
    const original = { planId: "plan:one", spotId: "spot:one", localDate: "2026-09-06", localTime: "22:00", notes: "original", revision: 1 };
    const latest = { ...original, notes: scenario === "newer" ? "external change" : original.notes, revision: scenario === "newer" ? 2 : 1 };
    let cached: unknown;
    const retryPlanSave = createPlanSaveRetry({ getStorageSync: key => local.get(key), setStorageSync: (key, value) => { local.set(key, structuredClone(value)); }, removeStorageSync: key => { local.delete(key); } }, () => "one:key", () => false);
    const operation = vm.runInNewContext(ts.transpileModule(mutationCode("saveObservationPlan"), { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText, {
      ensureSession: async () => ({ userId: owner }), currentDraftUserId: () => owner,
      retryPlanSave, MiniappApiError: class extends Error {}, PlanSaveReviewRequired, samePlanSaveIntent,
      requestOperation: async (_key: unknown, op: string, request: { body?: unknown; cache?: boolean; idempotencyKey?: string }, _retry: unknown, expected: string) => {
        assert.equal(expected, "a");
        if (op === "planPut") {
          putCount++;
          assert.equal(request.idempotencyKey, "one:key");
          assert.equal((request.body as { notes: string }).notes, original.notes);
          if (putCount === 1) throw Error("committed; receipt lost");
          return { dataState: "FRESH", data: original };
        }
        assert.equal(op, "plansGet"); assert.equal(request.cache, false); readCount++;
        if (scenario === "offline") throw Error("offline read");
        if (scenario === "switched-read") owner = "b";
        return { dataState: scenario === "stale" ? "STALE_USABLE" : "FRESH", data: { plans: scenario === "deleted" ? [] : [latest] } };
      },
      miniappQueryClient: { setQueryData: (key: string[], value: unknown) => { assert.equal(key[1], "a"); cached = value; writes++; } },
      invalidateAfter: async () => {},
    });
    const invoke = (notes: string) => operation({ ...original, notes }, "context:one", null, "a");
    await assert.rejects(invoke(original.notes), /receipt lost/);
    await assert.rejects(invoke(scenario === "changed-input" ? "new notes" : original.notes), error => {
      if (["changed-input", "newer", "deleted"].includes(scenario)) {
        assert.ok(error instanceof PlanSaveReviewRequired);
        assert.equal(error.current?.revision ?? null, scenario === "deleted" ? null : latest.revision);
        assert.equal(error.receiptRevision, 1);
      } else assert.ok(error instanceof Error || String(error));
      return true;
    });
    assert.equal(putCount, 2); assert.equal(readCount, 1);
    assert.equal(local.size, 1, "a failed reconciliation must not lose its original journal");
    if (["offline", "stale", "switched-read"].includes(scenario)) assert.equal(writes, 0);
    else assert.deepEqual(JSON.parse(JSON.stringify(cached)), { dataState: "FRESH", data: { plans: scenario === "deleted" ? [] : [latest] } });
  }
});
