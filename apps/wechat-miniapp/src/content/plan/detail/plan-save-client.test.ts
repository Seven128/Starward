import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { createPlanSaveRetry, pendingPlanSaves, PlanSaveRecoveryError, PlanSaveReviewRequired } from "../../../services/plan-save-retry";

async function fixture() {
  const storage = new Map<string, unknown>();
  const Taro = { getStorageSync: (key: string) => storage.get(key), setStorageSync: (key: string, value: unknown) => storage.set(key, structuredClone(value)), removeStorageSync: (key: string) => storage.delete(key) };
  const input = { planId: "plan:verify", spotId: "spot:verify", observationContextId: "context:verify", localDate: "2026-10-15", localTime: "22:00", notes: "original", expectedRevision: null, contextIdentity: "same" };
  await assert.rejects(createPlanSaveRetry(Taro, () => "save:verify", () => false)("owner", input, async () => { throw new Error("receipt lost"); }));
  const source = ts.createSourceFile("client.ts", readFileSync(new URL("./plan-save-client.ts", import.meta.url), "utf8"), ts.ScriptTarget.Latest, true);
  const code = source.statements.filter(node => !ts.isImportDeclaration(node)).map(node => node.getFullText(source)).join("\n");
  let owner = "owner", active = true, receipt: unknown = { planId: input.planId, revision: 1 }, current = [{ planId: input.planId, revision: 1 }];
  const calls: string[] = [];
  const scope = { assertCurrent() { if (!active) throw new Error("retired"); } };
  const exports: Record<string, any> = {};
  vm.runInNewContext(ts.transpileModule(code, { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS } }).outputText,
    { exports, Taro, createPlanSaveRetry, pendingPlanSaves, PlanSaveRecoveryError, PlanSaveReviewRequired, idempotencyKey: () => assert.fail("verification must not create a key"),
      currentDraftUserId: () => owner,
      getObservationPlanSaveResult: async () => { calls.push("GET receipt"); return { data: { receipt } }; },
      getCurrentPlansAfterSave: async () => { calls.push("GET current"); return { data: { plans: current } }; },
      sendObservationPlanSave: () => assert.fail("verification must not dispatch PUT"),
    });
  return { verify: () => exports.verifyObservationPlanSave({ owner: "owner", key: "save:verify", planId: input.planId }, scope), input, storage, calls,
    change: (values: { owner?: string; active?: boolean; receipt?: unknown; current?: typeof current }) => {
      if (values.owner !== undefined) owner = values.owner;
      if (values.active !== undefined) active = values.active;
      if ("receipt" in values) receipt = values.receipt;
      if (values.current) current = values.current;
    } };
}

test("verification reads exact receipt and current revision without changing the pending journal", async () => {
  const f = await fixture(), before = structuredClone(f.storage);
  const result = await f.verify();
  assert.deepEqual(JSON.parse(JSON.stringify(result.input)), f.input);
  assert.equal(result.data.revision, 1);
  assert.deepEqual(f.calls, ["GET receipt", "GET current"]);
  assert.deepEqual(f.storage, before);
});

test("matching current content without this receipt stays unknown", async () => {
  const f = await fixture(); f.change({ receipt: null });
  assert.equal(await f.verify(), null);
  assert.deepEqual(f.calls, ["GET receipt", "GET current"]);
  assert.equal(f.storage.size, 1);
});

test("historical receipt never replaces a newer or deleted plan", async () => {
  const f = await fixture(); f.change({ current: [{ planId: f.input.planId, revision: 2 }] });
  await assert.rejects(f.verify(), (error: unknown) => error instanceof PlanSaveReviewRequired && error.current?.revision === 2 && error.receiptRevision === 1);
  f.change({ current: [] });
  await assert.rejects(f.verify(), (error: unknown) => error instanceof PlanSaveReviewRequired && error.current === null);
  assert.equal(f.storage.size, 1);
});

test("retired page or different account cannot begin verification", async () => {
  const f = await fixture(); f.change({ active: false });
  await assert.rejects(f.verify(), /retired/);
  f.change({ active: true, owner: "other" });
  await assert.rejects(f.verify(), /账号已变化/);
  assert.deepEqual(f.calls, []);
});
