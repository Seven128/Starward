import assert from "node:assert/strict";
import test from "node:test";
import type { ObservationPlan } from "@starward/miniapp-contracts";
import { nextPlanListBoundary, planEndLabel, planListEmptyState, planListEntries } from "./plan-list-model";

const plan = (id: string, date: string, start: string, endDate = date, end = "23:59") => ({
  planId: id, localDate: date, localTime: start,
  contextSnapshot: { selectedAtUtc: `${date}T${start}:00Z`, timezone: "UTC" },
  timing: { endLocalDate: endDate, endLocalTime: end },
} as ObservationPlan);

test("an empty time partition points to existing plans, while a wholly empty list offers creation", () => {
  assert.deepEqual(planListEmptyState("upcoming", true), {
    title: "接下来暂无计划", detail: "已结束的计划可在“过往”查看。", actionLabel: "查看过往", action: "switch",
  });
  assert.deepEqual(planListEmptyState("past", true), {
    title: "暂无过往计划", detail: "接下来的计划可在“接下来”查看。", actionLabel: "查看接下来", action: "switch",
  });
  assert.equal(planListEmptyState("upcoming", false).action, "create");
  assert.equal(planListEmptyState("past", false).action, "create");
});

test("all-plan partitions retain distant and cross-midnight ongoing plans and use ending boundary", () => {
  const current = plan("current", "2026-09-09", "23:00", "2026-09-10", "02:00");
  const far = plan("far", "2026-12-10", "21:00");
  const past = plan("past", "2026-09-08", "21:00");
  const now = new Date("2026-09-10T01:00:00Z");
  assert.deepEqual(planListEntries([far, past, current], now, "upcoming").map(x => [x.plan.planId, x.ongoing]), [["current", true], ["far", false]]);
  assert.deepEqual(planListEntries([far, past, current], now, "past").map(x => x.plan.planId), ["past"]);
  assert.deepEqual(planListEntries([current], new Date("2026-09-10T02:00:00Z"), "past").map(x => x.plan.planId), ["current"]);
  assert.equal(planEndLabel(current), "次日 02:00");
});

test("invalid times remain reachable for correction and multiple-day endings retain their dates", () => {
  const invalid = plan("invalid", "2026-02-30", "23:00");
  assert.equal(planListEntries([invalid], new Date(), "upcoming")[0]?.invalid, true);
  assert.equal(planEndLabel(plan("long", "2026-09-09", "23:00", "2026-09-12", "02:00")), "2026-09-12 02:00");
});

test("plans from different timezones sort by actual instant across New Year", () => {
  const shanghai = { ...plan("shanghai", "2026-12-31", "23:30", "2027-01-01", "02:00"),
    contextSnapshot: { selectedAtUtc: "2026-12-31T15:30:00Z", timezone: "Asia/Shanghai" } } as ObservationPlan;
  const nextYear = { ...plan("next-year", "2027-01-01", "01:00", "2027-01-01", "03:00"),
    contextSnapshot: { selectedAtUtc: "2026-12-31T17:00:00Z", timezone: "Asia/Shanghai" } } as ObservationPlan;
  const utc = plan("utc", "2026-12-31", "18:00", "2026-12-31", "20:00");
  const now = new Date("2026-12-31T16:00:00Z");
  assert.deepEqual(planListEntries([utc, nextYear, shanghai], now, "upcoming").map(entry =>
    [entry.plan.planId, entry.ongoing, entry.invalid]),
  [["shanghai", true, false], ["next-year", false, false], ["utc", false, false]]);
  assert.equal(planEndLabel(shanghai), "次日 02:00");
});

test("the list refreshes at the next valid start and end, including a spot-timezone boundary", () => {
  const current = plan("current", "2026-09-09", "23:00", "2026-09-10", "02:00");
  const next = plan("next", "2026-09-10", "03:00", "2026-09-10", "05:00");
  const invalid = { ...plan("invalid", "2026-09-10", "01:00"), contextSnapshot: {
    timezone: "UTC", selectedAtUtc: "2026-09-10T02:00:00Z",
  } } as ObservationPlan;
  assert.equal(nextPlanListBoundary([current, next, invalid], new Date("2026-09-10T01:00:00Z")), Date.parse("2026-09-10T02:00:00Z"));
  assert.equal(nextPlanListBoundary([current, next, invalid], new Date("2026-09-10T02:00:00Z")), Date.parse("2026-09-10T03:00:00Z"));
  assert.equal(nextPlanListBoundary([current], new Date("2026-09-10T02:00:00Z")), null);
});
