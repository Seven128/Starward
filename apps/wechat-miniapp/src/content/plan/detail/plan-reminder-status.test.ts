import assert from "node:assert/strict";
import test from "node:test";
import { planReminderStatusDetail, planReminderStatusLabel } from "./plan-reminder-status";
import type { PlanReminderNotificationStatus } from "@starward/miniapp-contracts";

const status = (state: PlanReminderNotificationStatus["state"], reason: PlanReminderNotificationStatus["reason"]): PlanReminderNotificationStatus => ({
  planId: "p", reminderId: "r", planRevision: 1, scheduleVersion: "v", triggerAtUtc: null,
  departureAtUtc: null, updatedAt: "2026-09-10T00:00:00Z", state, reason,
});

test("missing departure is not a missed trigger and completed outcomes have actionable meaning", () => {
  assert.equal(planReminderStatusLabel(status("SKIPPED", "DEPARTURE_TIME_REQUIRED")), "需补充出发时间");
  assert.match(planReminderStatusDetail(status("SKIPPED", "DEPARTURE_TIME_REQUIRED")), /编辑计划.*出发时间/u);
  assert.match(planReminderStatusDetail(status("SKIPPED", "DEPARTURE_EXPIRED")), /出发时间已过.*不补发/u);
  assert.match(planReminderStatusDetail(status("SKIPPED", "TRIGGER_MISSED")), /错过.*不补发/u);
  assert.match(planReminderStatusDetail(status("SENT", "PROVIDER_ACCEPTED")), /微信.*接受.*不代表.*阅读/u);
  assert.match(planReminderStatusDetail(status("FAILED", "PROVIDER_NOT_ATTEMPTED")), /未能发起发送/u);
  assert.match(planReminderStatusDetail(status("FAILED", "PROVIDER_REJECTED")), /发送失败/u);
  assert.match(planReminderStatusDetail(status("NOT_REQUESTED", "USER_DID_NOT_REQUEST")), /未开启.*清单/u);
});

test("scheduled time uses the saved plan timezone across midnight and reports missing facts", () => {
  const scheduled = { ...status("SCHEDULED", "WAITING_FOR_TRIGGER"), triggerAtUtc: "2026-09-26T18:30:00Z" };
  assert.match(planReminderStatusDetail(scheduled, "Asia/Hong_Kong"), /2026-09-27 02:30（Asia\/Hong_Kong）/u);
  assert.match(planReminderStatusDetail(scheduled, "America/New_York"), /2026-09-26 14:30（America\/New_York）/u);
  for (const [triggerAtUtc, timezone] of [[null, "Asia/Shanghai"], ["bad", "Asia/Shanghai"], [scheduled.triggerAtUtc, "Bad/Zone"], [scheduled.triggerAtUtc, undefined]] as const) {
    assert.match(planReminderStatusDetail({ ...scheduled, triggerAtUtc }, timezone), /触发时间暂不可用/u);
  }
});

test("renders server-owned reminder states without treating intent as authorization", () => {
  const base = { planId: "p", reminderId: "r", planRevision: 1, scheduleVersion: "v", triggerAtUtc: null,
    departureAtUtc: null, updatedAt: "2026-09-10T00:00:00Z" } as const;
  assert.equal(planReminderStatusLabel({ ...base, state: "CAPABILITY_UNAVAILABLE", reason: "TEMPLATE_NOT_CONFIGURED" }), "通知当前不可开通");
  assert.match(planReminderStatusDetail({ ...base, state: "CAPABILITY_UNAVAILABLE", reason: "TEMPLATE_NOT_CONFIGURED" }), /清单仍可保存和勾选/u);
  assert.doesNotMatch(planReminderStatusDetail({ ...base, state: "CAPABILITY_UNAVAILABLE", reason: "TEMPLATE_NOT_CONFIGURED" }), /AppID|模板/u, "legacy server status must not imply current platform inventory was checked");
  assert.equal(planReminderStatusLabel({ ...base, state: "RESULT_UNKNOWN", reason: "PROVIDER_OUTCOME_UNKNOWN" }), "结果待确认");
});
