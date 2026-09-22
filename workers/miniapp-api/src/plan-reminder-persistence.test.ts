import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import type { PlanId } from "@starward/miniapp-contracts";
import { PostgresMiniappRepository } from "./postgres-repository.ts";
import { MiniappService } from "./miniapp-service.ts";
import { createTestRuntimeConfig } from "./runtime-config.ts";
import { createWeatherPort } from "./weather-provider.ts";
import { DisabledRouteAdapter } from "./route-provider.ts";
import { insertExplicitTestSpot } from "./test-fixtures/infrastructure-spot.ts";
import { publicReminderStatus } from "./plan-reminder-schedule.ts";

const databaseUrl = process.env.PLAN_REMINDER_TEST_DATABASE_URL;
for (const initialState of ["WAITING_AUTHORIZATION", "SENT", "RESULT_UNKNOWN"] as const) {
  test(`Postgres reminder setting roundtrip preserves ${initialState} across restart`, { skip: !databaseUrl }, async () => {
    assert.ok(databaseUrl);
    assert.match(new URL(databaseUrl).pathname, /^\/starward_reminder_[a-f0-9]+$/u);
    const config = createTestRuntimeConfig({ storageMode: "POSTGRES", databaseUrl });
    let repository = await new PostgresMiniappRepository(databaseUrl).initialize({ migrate: true });
    let service: MiniappService | null = null;
    try {
      const spot = await insertExplicitTestSpot(repository);
      const userId = await repository.findOrCreateWechatUser(`reminder-persistence:${randomUUID()}`);
      service = new MiniappService({ repository, config, weather: createWeatherPort(config), route: new DisabledRouteAdapter() });
      const localDate = new Date(Date.now() + 3 * 86_400_000).toISOString().slice(0, 10);
      const endDate = new Date(Date.now() + 4 * 86_400_000).toISOString().slice(0, 10);
      const context = (await service.resolveObservationContext({ location: { kind: "MAP_POINT", displayName: "提醒隔离地点",
        wgs84: { system: "WGS84", latitude: 22.54, longitude: 114.06 }, source: "MAP_VIEWPORT", timezoneHint: "Asia/Shanghai" }, localDate })).data;
      const planInput = { planId: `plan:${randomUUID()}` as PlanId, spotId: spot.spotId, observationContextId: context.contextId,
        localDate, localTime: "22:00", notes: "Reminder reactivation regression", timing: { departureLocalDate: localDate,
          departureLocalTime: "20:00", endLocalDate: endDate, endLocalTime: "01:00" },
        reminders: [{ reminderId: "equipment", title: "设备", hoursBeforeDeparture: 1, notifyOnWechat: true,
          items: [{ itemId: "battery", text: "电池", completed: false }] }] };
      let plan = (await service.savePlan(userId, { ...planInput, expectedRevision: null }, `save:${randomUUID()}`)).data;
      const original = (await repository.listPlanReminderSchedules(userId))[0]!;
      assert.equal(original.state, "WAITING_AUTHORIZATION");
      if (initialState !== "WAITING_AUTHORIZATION") {
        // Seed an explicit delivery-history boundary; no real notification is sent.
        await repository.pool.query("UPDATE plan_reminder_schedules SET state=$2, reason=$3, attempt_count=1 WHERE schedule_version=$1",
          [original.scheduleVersion, initialState, initialState === "SENT" ? "DELIVERED" : "PROVIDER_OUTCOME_UNKNOWN"]);
        await repository.pool.query("INSERT INTO plan_reminder_delivery_attempts(attempt_id,schedule_version,user_id,attempt_no,outcome) VALUES($1,$2,$3,1,$4)",
          [randomUUID(), original.scheduleVersion, userId, initialState === "SENT" ? "SENT" : "UNKNOWN"]);
      }
      for (const change of [{ notifyOnWechat: false, hoursBeforeDeparture: 1 }, { notifyOnWechat: true, hoursBeforeDeparture: 1 },
        { notifyOnWechat: true, hoursBeforeDeparture: 2 }, { notifyOnWechat: true, hoursBeforeDeparture: 1 }]) {
        plan = (await service.savePlan(userId, { ...planInput, reminders: [{ ...planInput.reminders[0]!, ...change }], expectedRevision: plan.revision }, `save:${randomUUID()}`)).data;
      }
      await service.onModuleDestroy(); service = null;
      repository = await new PostgresMiniappRepository(databaseUrl).initialize({ migrate: false });
      const rows = await repository.listPlanReminderSchedules(userId);
      assert.equal(rows.length, 1);
      const restored = rows[0]!;
      assert.equal(restored.scheduleVersion, original.scheduleVersion);
      assert.equal(restored.planRevision, plan.revision);
      assert.equal(restored.state, initialState);
      assert.equal(restored.attemptCount, initialState === "WAITING_AUTHORIZATION" ? 0 : 1);
      assert.equal(publicReminderStatus(restored, true).state, initialState === "WAITING_AUTHORIZATION" ? "AUTHORIZATION_REQUIRED" : initialState);
      assert.equal((await repository.listPlans(userId))[0]?.reminders?.[0]?.notifyOnWechat, true);
      const attempts = await repository.pool.query("SELECT outcome FROM plan_reminder_delivery_attempts WHERE schedule_version=$1", [original.scheduleVersion]);
      assert.deepEqual(attempts.rows.map(row => row.outcome), initialState === "WAITING_AUTHORIZATION" ? [] : [initialState === "SENT" ? "SENT" : "UNKNOWN"]);
      await repository.deletePlan(userId, plan.planId, `delete:${randomUUID()}`);
      await repository.close();
      repository = await new PostgresMiniappRepository(databaseUrl).initialize({ migrate: false });
      assert.deepEqual(await repository.listPlans(userId), []);
      assert.deepEqual(await repository.listPlanReminderSchedules(userId), []);
      const retired = await repository.pool.query("SELECT active,state,attempt_count FROM plan_reminder_schedules WHERE schedule_version=$1", [original.scheduleVersion]);
      assert.equal(retired.rows[0].active, false);
      assert.equal(retired.rows[0].state, initialState === "WAITING_AUTHORIZATION" ? "CANCELED" : initialState, "deleting a plan stops scheduling without rewriting delivery history");
      assert.equal(retired.rows[0].attempt_count, restored.attemptCount);
      await repository.deleteAccount(userId, `erase:${randomUUID()}`);
      for (const table of ["plan_reminder_schedules", "plan_reminder_delivery_attempts"])
        assert.equal((await repository.pool.query(`SELECT count(*)::int AS count FROM ${table} WHERE user_id=$1`, [userId])).rows[0].count, 0,
          "soft account deletion must clear reminder data, not rely on a physical-delete cascade");
    } finally { if (service) await service.onModuleDestroy(); else await repository.close(); }
  });
}
