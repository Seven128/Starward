import assert from "node:assert/strict";
import test from "node:test";
import { zonedLocalToUtc, type ObservationPlan } from "@starward/miniapp-contracts";
import { myPlanTimeLabel, selectPlanEntry } from "./plan-entry";
const make = (id: string, date: string, time: string, endDate = date, endTime = "23:59") => ({
  planId: id, localDate: date, localTime: time,
  timing: { endLocalDate: endDate, endLocalTime: endTime },
  contextSnapshot: { timezone: "Asia/Shanghai", selectedAtUtc: zonedLocalToUtc({ localDate: date, localTime: time, timezone: "Asia/Shanghai" }) },
} as ObservationPlan);

test("My time labels use each spot's calendar and only upcoming plans show countdown", () => {
  const now = new Date("2026-09-08T16:30:00Z");
  assert.deepEqual(myPlanTimeLabel(make("ongoing", "2026-09-08", "23:00", "2026-09-09", "01:30"), now, true), { when: "今天 01:30结束", relative: null });
  assert.deepEqual(myPlanTimeLabel(make("next", "2026-09-09", "05:00"), now, false), { when: "今天 05:00", relative: "4小时30分后" });
  const otherZone = make("timezone", "2026-09-09", "01:00");
  otherZone.contextSnapshot.timezone = "UTC";
  otherZone.contextSnapshot.selectedAtUtc = "2026-09-09T01:00:00Z";
  assert.deepEqual(myPlanTimeLabel(otherZone, now, false), { when: "明天 01:00", relative: "8小时30分后" });
});

test("My keeps cross-midnight ongoing plans first and limits eligible rows to three", () => {
  const ongoing = make("ongoing", "2026-09-08", "23:00", "2026-09-09", "01:30");
  const a = make("a", "2026-09-09", "05:00"), b = make("b", "2026-09-09", "05:00");
  const far = make("far", "2026-09-10", "01:00"), boundary = make("edge", "2026-09-10", "00:30");
  const plans = [b, far, boundary, a, ongoing];
  const result = selectPlanEntry(plans, new Date("2026-09-08T16:30:00Z"));
  assert.deepEqual(result.entries.map((item) => item.plan.planId), ["ongoing", "a", "b"]);
  assert.equal(result.entries[0]?.ongoing, true);
  assert.equal(result.hasMore, true);
  assert.equal(result.title, "观星计划");
  assert.deepEqual(plans, [b, far, boundary, a, ongoing]);
  assert.equal(selectPlanEntry([ongoing], new Date("2026-09-08T17:30:00Z")).entries.length, 0);
});

test("My excludes ended, invalid and distant plans and preserves the all-plans title", () => {
  const bad = make("bad", "2026-09-09", "03:00");
  bad.timing!.endLocalDate = "2026-02-30";
  const result = selectPlanEntry([bad, make("past", "2026-09-08", "01:00"), make("far", "2026-09-11", "22:00")], new Date("2026-09-08T16:30:00Z"));
  assert.deepEqual(result, { title: "观星计划", plan: null, entries: [], hasMore: false });
});
