import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { acknowledgePlanSave, createPlanSaveRetry, PlanSaveReviewRequired, samePlanSaveIntent } from "./plan-save-retry";
import { createAccountOperationOwner } from "../hooks/account-operation";
import { createAuthenticatedOperationRequester } from "./authenticated-operation";
import type { AuthSessionData } from "@starward/miniapp-contracts";

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

function scopedRuntime(name: "saveObservationPlan" | "deleteObservationPlan") {
  let state = { userId: "a" as string | null, ownerId: "a" as string | null, reset: 0, page: {}, target: "plan" };
  let session = { userId: "a", accessToken: "RAM-a", expiresAt: "2999-01-01" } as AuthSessionData | null;
  const operations = createAccountOperationOwner(() => state, () => {});
  const setAccount = (owner: string | null) => {
    state = { ...state, userId: owner, ownerId: owner, reset: state.reset + 1 };
    operations.observe();
  };
  const resolveSession = async () => {
    if (!session) {
      session = { userId: "a", accessToken: "RAM-renewed", expiresAt: "2999-01-01" } as AuthSessionData;
      setAccount("a");
    }
    return session;
  };
  const storage = new Map<string, unknown>();
  const nativeStorage = { getStorageSync: (key: string) => storage.get(key), setStorageSync: (key: string, value: unknown) => { storage.set(key, structuredClone(value)); }, removeStorageSync: (key: string) => { storage.delete(key); } };
  const sent: Array<{ path: string; options: any }> = [];
  let keys = 0, cacheWrites = 0, invalidations = 0, denied = false, fail = false;
  let responseGate: Promise<void> | undefined;
  let retireOnCache = false;
  const plan = { planId: "plan:one", spotId: "spot:one", localDate: "2026-09-06", localTime: "22:00", notes: "exact intent", eventOccurrenceIds: ["event-occurrence:geminids:2026"], revision: 2 };
  const requestOperation = createAuthenticatedOperationRequester({
    resolveSession, readStoredSession: () => session,
    clearStoredSession: () => { session = null; setAccount(null); },
    isPermissionDenied: error => error === "permission",
    request: async (_key, path, options) => {
      sent.push({ path, options });
      assert.equal("scope" in options, false, "operation authorization must not enter HTTP payload");
      if (denied) { denied = false; throw "permission"; }
      if (fail) throw new Error("receipt unknown");
      if (options.method !== "GET" && responseGate) await responseGate;
      return { dataState: "FRESH", data: options.method === "DELETE" ? { plans: [] } : options.method === "GET" ? { plans: [plan] } : plan } as never;
    },
  });
  const api = vm.runInNewContext(ts.transpileModule(mutationCode(name), { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText, {
    ensureSession: resolveSession, currentDraftUserId: () => state.userId,
    requestOperation, idempotencyKey: () => `delete:${++keys}`,
    retryPlanSave: createPlanSaveRetry(nativeStorage, () => `save:${++keys}`, () => false),
    MiniappApiError: class extends Error {}, PlanSaveReviewRequired, samePlanSaveIntent,
    miniappQueryClient: { setQueryData() { cacheWrites++; if (retireOnCache) { setAccount("b"); setAccount("a"); } } },
    invalidateAfter: async () => { invalidations++; },
  });
  const invoke = (scope = operations.begin()!) => name === "saveObservationPlan"
    ? api(plan, "context:one", 1, "a", "context identity", scope)
    : api(plan.planId, "a", scope);
  return { operations, setAccount, sent, storage, invoke, cacheWrites: () => cacheWrites, invalidations: () => invalidations,
    deny: () => { denied = true; }, fail: (value: boolean) => { fail = value; }, gate: (value: Promise<void>) => { responseGate = value; }, retireOnCache: () => { retireOnCache = true; } };
}

for (const name of ["saveObservationPlan", "deleteObservationPlan"] as const) {
  test(`${name}: actual outer session await ABA retires dispatch and permits a fresh A intent`, async () => {
    const f = scopedRuntime(name), old = f.operations.begin()!, pending = f.invoke(old);
    assert.equal(f.sent.length, 0);
    f.setAccount("b"); f.setAccount("a");
    await assert.rejects(pending, /retired/);
    assert.equal(f.sent.length, 0); assert.equal(f.cacheWrites(), 0);
    await f.invoke();
    assert.equal(f.sent.length, name === "saveObservationPlan" ? 2 : 1);
    assert.equal(f.cacheWrites(), 1); assert.equal(f.invalidations(), 1);
    if (name === "saveObservationPlan") assert.deepEqual(f.sent[0]!.options.body.eventOccurrenceIds, ["event-occurrence:geminids:2026"]);
  });

  test(`${name}: permission renewal retains current operation and original dispatch key`, async () => {
    const f = scopedRuntime(name), operation = f.operations.begin()!; f.deny();
    await f.invoke(operation);
    assert.equal(operation.isCurrent(), true);
    assert.equal(f.sent.length, name === "saveObservationPlan" ? 3 : 2);
    assert.equal(f.sent[0]!.options.idempotencyKey, f.sent[1]!.options.idempotencyKey);
    assert.equal(f.cacheWrites(), 1); assert.equal(f.invalidations(), 1);
    f.setAccount(null); f.setAccount("a"); assert.equal(operation.isCurrent(), false);
  });

  test(`${name}: an already dispatched response cannot start retired reconciliation or invalidate`, async () => {
    const f = scopedRuntime(name); let release!: () => void;
    f.gate(new Promise<void>(resolve => { release = resolve; }));
    const operation = f.operations.begin()!, pending = f.invoke(operation);
    for (let i = 0; i < 10 && f.sent.length === 0; i++) await Promise.resolve();
    assert.equal(f.sent.length, 1, "the write was really dispatched before retirement");
    f.operations.dispose(); release();
    await assert.rejects(pending, /retired/);
    assert.equal(f.sent.length, 1); assert.equal(f.cacheWrites(), 0); assert.equal(f.invalidations(), 0);
    if (name === "saveObservationPlan") assert.equal(f.storage.size, 1, "the durable unknown write remains recoverable");
  });

  test(`${name}: synchronous cache ABA suppresses follow-on invalidation and caller acknowledgement`, async () => {
    const f = scopedRuntime(name); f.retireOnCache();
    await assert.rejects(f.invoke(), /retired/);
    assert.equal(f.cacheWrites(), 1, "the initiating current A cache effect occurred before retirement");
    assert.equal(f.invalidations(), 0);
    if (name === "saveObservationPlan") assert.equal(f.storage.size, 1);
  });
}

test("scoped unknown plan save keeps the original body/key and yields its exact recoverable receipt", async () => {
  const f = scopedRuntime("saveObservationPlan"), old = f.operations.begin()!; f.fail(true);
  await assert.rejects(f.invoke(old), /receipt unknown/); old.release();
  const original = JSON.stringify([...f.storage]);
  f.fail(false);
  const result = await f.invoke();
  assert.equal(f.sent[0]!.options.idempotencyKey, f.sent[1]!.options.idempotencyKey);
  assert.equal(JSON.stringify([...f.storage]), original, "a successful reconciliation is not author draft acknowledgement");
  assert.equal(result.data.revision, 2); assert.equal(result.saveReceipt.planId, "plan:one");
  assert.deepEqual(f.sent[0]!.options.body, f.sent[1]!.options.body);
});

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
