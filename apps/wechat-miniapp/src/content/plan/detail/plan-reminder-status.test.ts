import assert from "node:assert/strict";
import test from "node:test";
import { planReminderStatusDetail, planReminderStatusLabel } from "./plan-reminder-status";

test("renders server-owned reminder states without treating intent as authorization", () => {
  const base = { planId: "p", reminderId: "r", planRevision: 1, scheduleVersion: "v", triggerAtUtc: null,
    departureAtUtc: null, updatedAt: "2026-09-10T00:00:00Z" } as const;
  assert.equal(planReminderStatusLabel({ ...base, state: "CAPABILITY_UNAVAILABLE", reason: "TEMPLATE_NOT_CONFIGURED" }), "通知当前不可开通");
  assert.match(planReminderStatusDetail({ ...base, state: "CAPABILITY_UNAVAILABLE", reason: "TEMPLATE_NOT_CONFIGURED" }), /清单仍可保存和勾选/u);
  assert.doesNotMatch(planReminderStatusDetail({ ...base, state: "CAPABILITY_UNAVAILABLE", reason: "TEMPLATE_NOT_CONFIGURED" }), /AppID|模板/u, "legacy server status must not imply current platform inventory was checked");
  assert.equal(planReminderStatusLabel({ ...base, state: "RESULT_UNKNOWN", reason: "PROVIDER_OUTCOME_UNKNOWN" }), "结果待确认");
});
