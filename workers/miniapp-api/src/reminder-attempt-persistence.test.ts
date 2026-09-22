import assert from "node:assert/strict";
import test from "node:test";
import { randomBytes, randomUUID } from "node:crypto";
import type { ObservationPlan } from "@starward/miniapp-contracts";
import { PostgresMiniappRepository } from "./postgres-repository.ts";
import { PostgresReminderAttemptStore } from "./postgres-reminder-attempt-store.ts";
import { insertExplicitTestSpot } from "./test-fixtures/infrastructure-spot.ts";

import { PostgresReminderSubscriptionStore } from "./postgres-reminder-subscription-store.ts";
import { encryptWechatDeliveryIdentity } from "./wechat-delivery-identity.ts";

const databaseUrl = process.env.PLAN_REMINDER_TEST_DATABASE_URL;
test("durable reminder attempts serialize, survive restart and respect cancellation and account erasure", { skip: !databaseUrl }, async () => {
  assert.ok(databaseUrl);
  assert.match(new URL(databaseUrl).pathname, /^\/starward_reminder_[a-f0-9]+$/u);
  let repository: PostgresMiniappRepository | undefined;
  try {
    repository = await new PostgresMiniappRepository(databaseUrl).initialize({ migrate: true });

  const spot = await insertExplicitTestSpot(repository);
  const userId = await repository.findOrCreateWechatUser('synthetic-reminder-account');
  const otherId = await repository.findOrCreateWechatUser('synthetic-other-account');
  const binding = { appId: 'synthetic-app', templateId: 'synthetic-template' };
  await repository.saveWechatDeliveryIdentity({ userId, identityDigest: 'synthetic-reminder-account', appId: binding.appId,
    ciphertext: encryptWechatDeliveryIdentity('synthetic-recipient', userId, binding.appId, randomBytes(32).toString('hex')) });
  // Explicit controlled dispatcher time; real subscription calls remain absent.
  const dispatchNow = new Date(Date.now() + 3660_000);
  const departure = new Date(Date.now() + 7200_000);
  const date = departure.toISOString().slice(0, 10);
  const time = departure.toISOString().slice(11, 16);
  const makePlan = async (authorize = true) => {
    const plan = { planId: `plan:${randomUUID()}`, spotId: spot.spotId, localDate: date, localTime: time, notes: '',
      timing: { departureLocalDate: date, departureLocalTime: time, endLocalDate: date, endLocalTime: '23:59' },
      contextSnapshot: { schemaVersion: 'observation-context-snapshot-v1', spotId: spot.spotId, timezone: 'UTC', localDate: date },
      reminders: [{ reminderId: 'equipment', title: '设备', hoursBeforeDeparture: 1, notifyOnWechat: true, items: [] }],
      revision: 0, updatedAt: new Date().toISOString() } as unknown as ObservationPlan;
    const saved = await repository!.savePlan(userId, plan, null, `create:${randomUUID()}`);
    const row = (await repository!.listPlanReminderSchedules(userId)).find(row => row.planId === saved.planId)!;
    const subscriptions = new PostgresReminderSubscriptionStore(repository!.pool);
    const prepared = await Promise.all(Array.from({length: 4}, () => subscriptions.prepare(userId, saved.planId, 'equipment', binding)));
    assert.ok(prepared.every(Boolean));
    assert.equal(new Set(prepared.map(item => item!.challengeId)).size, 1, 'duplicate preparations share one pending challenge');
    const challenge = prepared[0]!;
    if (authorize) {
      assert.equal(await subscriptions.record(userId, challenge.challengeId, 'accept', binding), true);
      assert.equal(await subscriptions.record(userId, challenge.challengeId, 'accept', binding), true);
    }
    return { plan: saved, version: row.scheduleVersion, challenge };
  };
  let store = new PostgresReminderAttemptStore(repository.pool, () => dispatchNow);
  const subscriptions = new PostgresReminderSubscriptionStore(repository.pool);
  const waiting = await makePlan(false);
  assert.equal(await store.reserve(userId, waiting.version, binding), null);
  assert.equal(await subscriptions.record(otherId, waiting.challenge.challengeId, 'accept', binding), false);
  assert.equal(await subscriptions.record(userId, waiting.challenge.challengeId, 'accept', { ...binding, templateId:'other-template' }), false);
  for (const choice of ['reject','ban','filter'] as const) {
    const declined = await makePlan(false);
    assert.equal(await subscriptions.record(userId, declined.challenge.challengeId, choice, binding), true);
    assert.equal(await subscriptions.record(userId, declined.challenge.challengeId, 'accept', binding), false);
    assert.equal(await store.reserve(userId, declined.version, binding), null);
  }
  const expired = await makePlan(false);
  await repository.pool.query("UPDATE plan_reminder_subscription_challenges SET expires_at=now()-interval '1 second' WHERE challenge_id=$1", [expired.challenge.challengeId]);
  assert.equal(await subscriptions.record(userId, expired.challenge.challengeId, 'accept', binding), false);
  const changed = await makePlan(false);
  await repository.savePlan(userId, {...changed.plan, reminders:[{...changed.plan.reminders![0]!,notifyOnWechat:false}]}, changed.plan.revision, 'supersede-before-choice');
  assert.equal(await subscriptions.record(userId, changed.challenge.challengeId, 'accept', binding), false);
  const first = await makePlan();
  await assert.rejects(store.reserve(userId,first.version,{appId:123,templateId:binding.templateId} as unknown as typeof binding),/binding_invalid/);
  const snapshotCase = await makePlan();
  const mutableBinding = { ...binding, attemptId:'forged', userId:'forged', scheduleVersion:'forged' };
  const snapshotPending = store.reserve(userId,snapshotCase.version,mutableBinding);
  mutableBinding.appId='changed-after-call';
  const snapshotAttempt = await snapshotPending;
  assert.ok(snapshotAttempt); assert.equal(snapshotAttempt.appId,binding.appId);
  assert.equal(snapshotAttempt.userId,userId); assert.equal(snapshotAttempt.scheduleVersion,snapshotCase.version);
  assert.notEqual(snapshotAttempt.attemptId,'forged');
  const toggled = await makePlan();
  const off = await repository.savePlan(userId, {...toggled.plan, reminders:[{...toggled.plan.reminders![0]!,notifyOnWechat:false}]}, toggled.plan.revision, 'toggle-off');
  await repository.savePlan(userId, {...toggled.plan,revision:off.revision}, off.revision, 'toggle-on');
  assert.equal(await subscriptions.record(userId,toggled.challenge.challengeId,'accept',binding),false, 'a canceled authorization challenge cannot be replayed after restoring the same schedule');
  assert.equal(await store.reserve(userId,toggled.version,binding),null);
  assert.equal((await repository.pool.query('SELECT state FROM plan_reminder_subscription_challenges WHERE challenge_id=$1',[toggled.challenge.challengeId])).rows[0].state,'CANCELED');
  assert.equal(await store.reserve(userId, first.version, { ...binding, templateId:'other-template' }), null);
  assert.equal(await store.reserve(otherId, first.version, binding), null);
  const contenders = await Promise.all(Array.from({length: 8}, () => store.reserve(userId, first.version, binding)));
  const won = contenders.filter(Boolean);
  assert.equal(won.length, 1);
  const attempt = won[0]!;
  const grants = await repository.pool.query("SELECT state,consumed_at FROM plan_reminder_subscription_challenges WHERE schedule_version=$1", [first.version]);
  assert.equal(grants.rowCount,1); assert.equal(grants.rows[0].state,'CLIENT_ACCEPTED'); assert.ok(grants.rows[0].consumed_at);
  await repository.close();
  repository = await new PostgresMiniappRepository(databaseUrl).initialize({ migrate: false });
  store = new PostgresReminderAttemptStore(repository.pool, () => dispatchNow);
  assert.equal(await store.reserve(userId, first.version, binding), null, 'crash/restart cannot retry the reserved attempt');
  const unknown = (await repository.listPlanReminderSchedules(userId)).find(row => row.scheduleVersion === first.version)!;
  assert.equal(unknown.state, 'RESULT_UNKNOWN');
  assert.equal(unknown.attemptCount, 1);
  assert.equal(await store.finish(attempt, {state:'ACCEPTED'}), true);
  assert.equal(await store.finish(attempt, {state:'UNKNOWN'}), false, 'late callback cannot overwrite accepted result');
  const receipt = (await repository.pool.query('SELECT outcome,provider_receipt FROM plan_reminder_delivery_attempts WHERE attempt_id=$1', [attempt.attemptId])).rows[0];
  assert.equal(receipt.outcome, 'SENT'); assert.equal(receipt.provider_receipt, null);
  for (const result of [{state:'REJECTED',errorCode:43101}, {state:'UNKNOWN'}, {state:'NOT_ATTEMPTED',reason:'TOKEN_UNAVAILABLE'}] as const) {
    const next = await makePlan();
    const reserved = await store.reserve(userId, next.version, binding); assert.ok(reserved);
    assert.equal(await store.finish(reserved, result), true);
    assert.equal(await store.reserve(userId, next.version, binding), null);
    const persisted: { state: string; reason: string; outcome: string; error_code: string } = (await repository!.pool.query(`SELECT s.state,s.reason,a.outcome,a.error_code
      FROM plan_reminder_schedules s JOIN plan_reminder_delivery_attempts a USING(schedule_version)
      WHERE a.attempt_id=$1`, [reserved.attemptId])).rows[0];
    assert.deepEqual(persisted, result.state === 'UNKNOWN'
      ? { state:'RESULT_UNKNOWN',reason:'PROVIDER_OUTCOME_UNKNOWN',outcome:'UNKNOWN',error_code:'PROVIDER_OUTCOME_UNKNOWN' }
      : result.state === 'REJECTED'
        ? { state:'FAILED',reason:'PROVIDER_REJECTED',outcome:'KNOWN_FAILURE',error_code:'43101' }
        : { state:'FAILED',reason:'PROVIDER_NOT_ATTEMPTED',outcome:'KNOWN_FAILURE',error_code:'TOKEN_UNAVAILABLE' });
  }
  const canceled = await makePlan();
  await repository.deletePlan(userId, canceled.plan.planId, `delete:${randomUUID()}`);
  assert.equal(await store.reserve(userId, canceled.version, binding), null);
  const superseded = await makePlan();
  await repository.savePlan(userId, { ...superseded.plan, reminders: [{ ...superseded.plan.reminders![0]!, notifyOnWechat: false }] }, superseded.plan.revision, `change:${randomUUID()}`);
  assert.equal(await store.reserve(userId, superseded.version, binding), null);
  const deletedWhilePending = await makePlan();
  const pending = await store.reserve(userId, deletedWhilePending.version, binding); assert.ok(pending);
  await repository.deletePlan(userId, deletedWhilePending.plan.planId, `delete:${randomUUID()}`);
  assert.equal(await store.finish(pending, {state:'UNKNOWN'}), true);
  assert.equal((await repository.pool.query('SELECT active FROM plan_reminder_schedules WHERE schedule_version=$1', [pending.scheduleVersion])).rows[0].active, false);
  await repository.deleteAccount(userId, 'erase:synthetic');
  assert.equal(await store.finish(pending, {state:'ACCEPTED'}), false);
  await repository.close();
  repository = await new PostgresMiniappRepository(databaseUrl).initialize({ migrate: false });
  await assert.rejects(repository.savePlan(userId, { ...first.plan, planId: `plan:${randomUUID()}` as ObservationPlan['planId'] }, null, 'late-new-plan'), /account_not_active/,
    'a request authenticated before erasure must not recreate private plans or schedules afterward');
  await assert.rejects(repository.deletePlan(userId, first.plan.planId, 'late-delete'), /account_not_active/);
  for (const table of ['plan_reminder_schedules', 'plan_reminder_delivery_attempts', 'plan_reminder_subscription_challenges'])
    assert.equal((await repository.pool.query(`SELECT count(*)::int AS count FROM ${table} WHERE user_id=$1`, [userId])).rows[0].count, 0, `${table} must be erased on soft account deletion`);

  } finally { await repository?.close(); }
});
