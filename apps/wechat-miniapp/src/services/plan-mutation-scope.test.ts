import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { createPlanSaveRetry } from "./plan-save-retry";

test("plan receipts update only the initiating account cache and preserve unrelated plans", async () => {
  const source = ts.createSourceFile("api.ts", readFileSync(new URL("./api-client.ts", import.meta.url), "utf8"), ts.ScriptTarget.Latest, true);
  for (const functionName of ["saveObservationPlan", "deleteObservationPlan"]) {
    const declaration = source.statements.find((node) => ts.isFunctionDeclaration(node) && node.name?.text === functionName);
    assert.ok(declaration);
    for (const switched of [false, true, "before"] as const) {
      let owner = switched === "before" ? "b" : "a";
      let requests = 0;
      let invalidations = 0;
      let writes = 0;
      let cached = { data: { plans: [{ planId: "plan:one", revision: 1 }, { planId: "plan:other", revision: 8 }] } };
      const receipt = functionName === "saveObservationPlan" ? { data: { planId: "plan:one", revision: 2 } } : { data: { plans: [cached.data.plans[1]] } };
      const local = new Map<string, unknown>();
      const operation = vm.runInNewContext(ts.transpileModule(declaration.getText(source).replace(/^export /, "") + `\n${functionName};`, { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText, {
        ensureSession: async () => ({ userId: owner }), currentDraftUserId: () => owner, idempotencyKey: () => "test-key",
        retryPlanSave: createPlanSaveRetry({ getStorageSync: key => local.get(key), setStorageSync: (key, value) => { local.set(key, value); }, removeStorageSync: key => { local.delete(key); } }, () => "test-key", () => false),
        requestOperation: async (_key: unknown, _op: unknown, _request: unknown, _retry: unknown, expected: string) => {
          requests++;
          assert.equal(expected, "a"); if (switched) owner = "b"; return receipt;
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
        assert.equal(await invoke(), receipt);
        assert.equal(writes, 1); assert.equal(invalidations, 1);
        assert.equal(cached.data.plans.find((item) => item.planId === "plan:other")?.revision, 8);
        assert.equal(cached.data.plans.find((item) => item.planId === "plan:one")?.revision, functionName === "saveObservationPlan" ? 2 : undefined);
      }
      assert.equal(requests, switched === "before" ? 0 : 1);
    }
  }
});
