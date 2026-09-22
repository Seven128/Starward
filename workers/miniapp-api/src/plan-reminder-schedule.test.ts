import assert from "node:assert/strict";
import test from "node:test";
import type { ObservationPlan } from "@starward/miniapp-contracts";
import { derivePlanReminderSchedules, publicReminderStatus } from "./plan-reminder-schedule.ts";

const plan = {
  planId: "plan:one",
  spotId: "spot:one",
  localDate: "2026-09-11",
  localTime: "22:00",
  notes: "",
  timing: { departureLocalDate: "2026-09-11", departureLocalTime: "20:00", endLocalDate: "2026-09-12", endLocalTime: "02:00" },
  reminders: [{ reminderId: "reminder:one", title: "装备", hoursBeforeDeparture: 2, notifyOnWechat: true, items: [] }],
  contextSnapshot: { schemaVersion: "observation-context-snapshot-v1", contextId: "ctx:one", contextFingerprint: "x", contextRevision: 1,
    spotId: "spot:one", timezone: "Asia/Shanghai", localDate: "2026-09-11", selectedAtUtc: "2026-09-11T14:00:00.000Z",
    eventInstanceId: null, algorithmVersions: {}, capturedAt: "2026-09-10T00:00:00.000Z" },
  revision: 3,
  updatedAt: "2026-09-10T00:00:00.000Z",
} as unknown as ObservationPlan;

test("derives a stable departure-relative UTC trigger and keeps checklist-only revisions on the same schedule", () => {
  const first = derivePlanReminderSchedules("user:one", plan, new Date("2026-09-10T00:00:00.000Z"))[0]!;
  const second = derivePlanReminderSchedules("user:one", { ...plan, revision: 4, reminders: [{ ...plan.reminders![0]!, items: [{ itemId: "i", text: "相机", completed: true }] }] }, new Date("2026-09-10T00:00:00.000Z"))[0]!;
  assert.equal(first.departureAtUtc, "2026-09-11T12:00:00.000Z");
  assert.equal(first.triggerAtUtc, "2026-09-11T10:00:00.000Z");
  assert.equal(first.scheduleVersion, second.scheduleVersion);
  assert.equal(second.planRevision, 4);
});

test("classifies missing, missed and expired triggers without inventing delivery", () => {
  const { timing: _timing, ...withoutTiming } = plan;
  const missing = derivePlanReminderSchedules("user:one", withoutTiming, new Date("2026-09-10T00:00:00Z"))[0]!;
  const missed = derivePlanReminderSchedules("user:one", plan, new Date("2026-09-11T11:00:00Z"))[0]!;
  const expired = derivePlanReminderSchedules("user:one", plan, new Date("2026-09-11T13:00:00Z"))[0]!;
  assert.deepEqual([missing.state, missed.reason, expired.reason], ["UNSCHEDULABLE", "TRIGGER_MISSED", "DEPARTURE_EXPIRED"]);
  assert.equal(publicReminderStatus(derivePlanReminderSchedules("user:one", plan, new Date("2026-09-10T00:00:00Z"))[0]!, false, new Date("2026-09-10T00:00:00Z")).state, "CAPABILITY_UNAVAILABLE");
  assert.equal(publicReminderStatus(derivePlanReminderSchedules("user:one", plan, new Date("2026-09-10T00:00:00Z"))[0]!, false, new Date("2026-09-10T00:00:00Z")).reason, "DELIVERY_NOT_CONFIGURED", "an unconnected delivery pipeline does not prove the platform account has no template");
});
