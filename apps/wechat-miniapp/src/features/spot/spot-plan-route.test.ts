import assert from "node:assert/strict";
import test from "node:test";
import type { ObservationPlan, SpotId } from "@starward/miniapp-contracts";
import { spotPlanRoute, spotIdFromPlanRoute } from "./spot-plan-route";
import { planDraftKey, planDraftBelongsTo } from "../../services/local-draft-keys";

test("formal spot plan entry preserves zero, one and multiple associated plans", () => {
  const spotId = "spot:one" as SpotId;
  const plan = { planId: "plan:one", spotId } as ObservationPlan;
  const other = { planId: "plan:other", spotId: "spot:other" } as ObservationPlan;
  assert.deepEqual(spotPlanRoute(spotId, [other]), { count: 0, label: "去这观星", url: "/content/plan/edit/index?new=1&spotId=spot%3Aone" });
  assert.equal(spotPlanRoute(spotId, [other, plan]).url, "/content/plan/detail/index?planId=plan%3Aone");
  assert.equal(spotPlanRoute(spotId, [plan, { ...plan, planId: "plan:two" as never }]).url, "/content/plan/list/index?spotId=spot%3Aone");
  assert.equal(spotIdFromPlanRoute("spot%3Aone"), spotId);
  assert.equal(spotIdFromPlanRoute("%broken"), null);
});

test("new drafts for different spot openers cannot overwrite each other or a generic draft", () => {
  const keys = [planDraftKey("a", null), planDraftKey("a", null, "spot:one"), planDraftKey("a", null, "spot:two")];
  assert.equal(new Set(keys).size, 3);
  for (const key of keys) { assert.ok(key); assert.equal(planDraftBelongsTo(key, "a"), true); assert.equal(planDraftBelongsTo(key, "b"), false); }
  assert.equal(planDraftKey("a", "plan:one", "spot:one"), planDraftKey("a", "plan:one"));
});
