import assert from "node:assert/strict";
import test from "node:test";
import { canAuthorizePlanReminder, planReminderStatusDetail, planReminderStatusLabel } from "./plan-reminder-status";
import type { PlanReminderNotificationStatus } from "@starward/miniapp-contracts";
import { planReminderRecoveryAction } from './plan-reminder-status';

const status = (state: PlanReminderNotificationStatus["state"], reason: PlanReminderNotificationStatus["reason"]): PlanReminderNotificationStatus => ({
  planId: "p", reminderId: "r", planRevision: 1, scheduleVersion: "v", triggerAtUtc: null,
  departureAtUtc: null, updatedAt: "2026-09-10T00:00:00Z", state, reason,
});

test("native authorization requires a matching saved revision and server capability, not intent alone", () => {
  const required = status("AUTHORIZATION_REQUIRED", "AUTHORIZATION_NOT_GRANTED");
  assert.equal(canAuthorizePlanReminder(required, 1, true), true);
  assert.equal(canAuthorizePlanReminder(required, 2, true), false);
  assert.equal(canAuthorizePlanReminder(required, 1, false), false);
  assert.equal(canAuthorizePlanReminder(undefined, 1, true), false);
  for (const state of ["NOT_REQUESTED", "CAPABILITY_UNAVAILABLE", "SCHEDULED", "SENT", "SKIPPED", "FAILED", "RESULT_UNKNOWN"] as const)
    assert.equal(canAuthorizePlanReminder({ ...required, state }, 1, true), false, state);
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

test('recovery distinguishes editable title, account identity and operator-owned spot fields without enabling subscription',()=>{
  const identity=status('CAPABILITY_UNAVAILABLE','DELIVERY_IDENTITY_REQUIRED');
  const title=status('CAPABILITY_UNAVAILABLE','REMINDER_TITLE_NOT_SUPPORTED');
  const spot=status('CAPABILITY_UNAVAILABLE','SPOT_NAME_NOT_SUPPORTED');
  assert.equal(planReminderRecoveryAction(identity,1,true),'VERIFY_IDENTITY');
  assert.equal(planReminderRecoveryAction(title,1,true),'EDIT_TITLE');
  for(const row of [spot,status('CAPABILITY_UNAVAILABLE','DELIVERY_NOT_CONFIGURED'),{...identity,state:'SENT' as const}])
    assert.equal(planReminderRecoveryAction(row,1,true),null);
  assert.equal(planReminderRecoveryAction(identity,2,true),null);
  assert.equal(planReminderRecoveryAction(identity,1,false),null);
  assert.equal(canAuthorizePlanReminder(identity,1,true),false);
  assert.match(planReminderStatusDetail(identity),/不代表已订阅或已发送/);
  assert.match(planReminderStatusDetail(title),/20个字符.*不会自动截短/);
  assert.doesNotMatch(planReminderStatusDetail(spot),/请编辑/);
});
