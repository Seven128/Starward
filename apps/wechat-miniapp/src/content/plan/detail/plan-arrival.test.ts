import assert from "node:assert/strict";
import test from "node:test";
import { checkPlanArrival } from "./plan-arrival";
import type { ObservationPlan } from "@starward/miniapp-contracts";

const plan = { localDate: "2026-09-10", localTime: "00:30",
  timing: { departureLocalDate: "2026-09-09", departureLocalTime: "23:00", endLocalDate: "2026-09-10", endLocalTime: "03:00" },
  contextSnapshot: { timezone: "Asia/Shanghai" } } as ObservationPlan;

test("arrival comparison respects explicit cross-midnight local times", () => {
  assert.deepEqual(checkPlanArrival(plan, 60), { arrivalLabel: "09-10 00:00", delayMinutes: 0 });
  assert.deepEqual(checkPlanArrival(plan, 120), { arrivalLabel: "09-10 01:00", delayMinutes: 30 });
  assert.equal(checkPlanArrival(plan, null), null);
});
