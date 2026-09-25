import assert from "node:assert/strict";
import test from "node:test";
import type { ObservationPlan } from "@starward/miniapp-contracts";
import { achievementSummary, endedPlanRecords, nextPlanEndAt } from "./plan-achievements";

const plan = (id: string, end: string, spotId = "spot:1", eventOccurrenceIds: string[] = []): ObservationPlan => ({
  planId: id as ObservationPlan["planId"], spotId: spotId as ObservationPlan["spotId"],
  localDate: "2026-07-01", localTime: "21:00", notes: "PRIVATE NOTE",
  timing: { endLocalDate: end, endLocalTime: "02:00", departureLocalDate: "2026-07-01", departureLocalTime: "18:00" },
  eventOccurrenceIds, revision: 1, updatedAt: "2026-07-01T00:00:00Z",
  contextSnapshot: { schemaVersion: "observation-context-snapshot-v1", contextId: "ctx:1" as never,
    contextFingerprint: "f", contextRevision: 1, spotId: spotId as never, timezone: "Asia/Shanghai",
    localDate: "2026-07-01", selectedAtUtc: "2026-07-01T13:00:00Z", eventInstanceId: null,
    algorithmVersions: {} as never, capturedAt: "2026-07-01T00:00:00Z" },
});

test("achievements count ended plans, distinct formal places and event identities without inferring a visit", () => {
  const first = plan("plan:1", "2026-07-02", "spot:1", ["event-occurrence:one:2026"]);
  const second = plan("plan:2", "2026-08-03", "spot:1", ["event-occurrence:one:2026"]);
  const future = plan("plan:3", "2026-12-31", "spot:2", ["event-occurrence:two:2026"]);
  const records = endedPlanRecords([first, second, { ...first, revision: 2 }, future, plan("plan:bad", "invalid")], new Date("2026-09-24T00:00:00Z"));
  assert.deepEqual(records.map(record => record.plan.planId), ["plan:2", "plan:1"]);
  assert.equal(records[1]?.plan.revision, 2);
  assert.deepEqual(achievementSummary(records), { endedPlans: 2, places: 1, events: 1 });
  assert.equal(records[0]?.year, 2026);
});

test("a newer plan revision controls whether its identity has ended", () => {
  const ended = plan("plan:changed", "2026-07-02", "spot:old");
  const rescheduled = { ...plan("plan:changed", "2026-12-31", "spot:new"), revision: 2 };
  const invalid = { ...plan("plan:changed", "invalid", "spot:new"), revision: 3 };
  const now = new Date("2026-09-24T00:00:00Z");
  assert.deepEqual(endedPlanRecords([ended, rescheduled], now), []);
  assert.deepEqual(endedPlanRecords([rescheduled, ended], now), []);
  assert.deepEqual(endedPlanRecords([ended, invalid], now), []);
});

test("the next completion boundary uses the latest valid plan revision and local timezone", () => {
  const now = new Date("2026-09-24T00:00:00Z");
  const old = plan("plan:changed", "2026-12-31");
  const movedEarlier = { ...plan("plan:changed", "2026-09-25"), revision: 2 };
  const later = plan("plan:later", "2026-09-26");
  assert.equal(nextPlanEndAt([old, movedEarlier, later, plan("plan:bad", "invalid")], now), Date.parse("2026-09-24T18:00:00Z"));
  assert.equal(nextPlanEndAt([movedEarlier, later], new Date("2026-09-24T18:00:00Z")), Date.parse("2026-09-25T18:00:00Z"));
  assert.equal(nextPlanEndAt([movedEarlier], new Date("2026-09-24T18:00:00Z")), null);
  assert.equal(nextPlanEndAt([old, { ...plan("plan:changed", "invalid"), revision: 3 }], now), null);
});
