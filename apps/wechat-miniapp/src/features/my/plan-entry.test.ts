import assert from "node:assert/strict";
import test from "node:test";
import { selectPlanEntry } from "./plan-entry";

test("plan entry prioritizes the local day, upcoming plans and then recent history", () => {
  const make = (localDate: string, localTime = "22:00") => ({ localDate, localTime, contextSnapshot: { timezone: "Asia/Shanghai" } });
  const old = make("2026-09-01"), recent = make("2026-09-05"), today = make("2026-09-06"), future = make("2026-09-07");
  const now = new Date("2026-09-05T16:30:00Z");
  const plans = [old, future, recent, today];
  assert.deepEqual(selectPlanEntry(plans, now), { plan: today, title: "今晚计划" });
  assert.deepEqual(selectPlanEntry([old, future], now), { plan: future, title: "观星计划" });
  assert.deepEqual(selectPlanEntry([recent, old], now), { plan: recent, title: "已保存计划" });
  assert.deepEqual(selectPlanEntry([], now), { plan: null, title: "今晚计划" });
  assert.deepEqual(plans, [old, future, recent, today]);
  assert.equal(selectPlanEntry(plans, new Date("2026-09-06T16:01:00Z")).plan, future);
});
