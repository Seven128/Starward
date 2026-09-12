import assert from "node:assert/strict";
import test from "node:test";
import type { ObservationPlan, PlanId } from "@starward/miniapp-contracts";
import { initialPlanSelection, planIdFromRoute } from "./plan-selection";

test("encoded My plan links resolve the saved identity without falling back to another plan", () => {
  const saved = { planId: "plan:123-a" } as ObservationPlan;
  for (const input of [saved.planId, encodeURIComponent(saved.planId)])
    assert.equal(initialPlanSelection(planIdFromRoute(input), [saved]).plan, saved);
  assert.equal(initialPlanSelection(planIdFromRoute("%broken"), [saved]).plan, null);
  assert.equal(planIdFromRoute(undefined), null);
});

test("a requested uncached plan keeps its identity until fetched", () => {
  const first = { planId: "first", notes: "unrelated" } as ObservationPlan;
  const wanted = "wanted" as PlanId;
  assert.deepEqual(initialPlanSelection(wanted, [first]), { planId: wanted, plan: null });
  const fetched = { planId: wanted, notes: "requested" } as ObservationPlan;
  assert.equal(initialPlanSelection(wanted, [first, fetched]).plan, fetched);
  assert.equal(initialPlanSelection(null, [first]).plan, first);
  assert.deepEqual(initialPlanSelection(null, []), { planId: null, plan: null });
});

test("explicit new intent stays independent from cached plans and an obsolete plan-id parameter", () => {
  const saved = { planId: "saved", revision: 7 } as ObservationPlan;
  assert.deepEqual(initialPlanSelection(null, [saved], true), { planId: null, plan: null });
  assert.deepEqual(initialPlanSelection(saved.planId, [saved], true), { planId: null, plan: null });
  assert.deepEqual(initialPlanSelection(saved.planId, [], true), { planId: null, plan: null });
});
