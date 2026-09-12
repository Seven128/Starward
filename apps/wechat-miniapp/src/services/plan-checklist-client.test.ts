import assert from "node:assert/strict";
import test from "node:test";
import { createPlanChecklistClient } from "./plan-checklist-client";

test("checklist completion retries its explicit intent and fences late account responses", async () => {
  let owner = "a", sequence = 0, fail = true, switchDuringRequest = false, confirmations = 0;
  const sent: string[] = [];
  const save = createPlanChecklistClient({ currentUser: () => owner, makeKey: () => `key:${++sequence}`,
    confirmed: async () => { confirmations++; },
    request: (async (_resource: string, operation: string, options: { idempotencyKey: string; body: unknown }, _retry: boolean, expected: string) => {
      assert.equal(operation, "planChecklistCompletionPut"); assert.equal(expected, "a");
      assert.deepEqual(options.body, { reminderId: "r", itemId: "i", completed: true, expectedRevision: 1 });
      sent.push(options.idempotencyKey);
      if (fail) throw new Error("lost_receipt");
      if (switchDuringRequest) owner = "b";
      return { data: { planId: "plan:one", revision: 2 } };
    }) as any,
  });
  const input = { reminderId: "r", itemId: "i", completed: true, expectedRevision: 1 };
  await assert.rejects(save("a", "plan:one", input), /lost_receipt/);
  assert.equal(confirmations, 0);
  fail = false;
  await save("a", "plan:one", input);
  assert.deepEqual(sent, ["key:1", "key:1"]); assert.equal(confirmations, 1);
  switchDuringRequest = true;
  await assert.rejects(save("a", "plan:one", input), /账户已变化/);
  assert.equal(confirmations, 1);
  await assert.rejects(save("a", "plan:one", input), /账户已变化/);
  assert.equal(sent.length, 3);
});
