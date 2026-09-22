import { randomUUID } from "node:crypto";
import type pg from "pg";
import type { ObservationPlan } from "@starward/miniapp-contracts";
import { derivePlanReminderSchedules } from "./plan-reminder-schedule.ts";
import type { WechatSubscriptionSendResult } from "./wechat-subscription-sender.ts";
import { snapshotReminderSubscriptionBinding, type ReminderSubscriptionBinding } from "./reminder-subscription-binding.ts";

export interface ReservedReminderAttempt {
  attemptId: string;
  userId: string;
  scheduleVersion: string;
  planId: string;
  reminderId: string;
  subscriptionChallengeId: string;
  appId: string;
  templateId: string;
}

/** Durable attempt ownership only; this store does not grant subscriptions.
 * A dispatcher must first establish authorization and missed-trigger policy,
 * then reserve, revalidate eligibility immediately before send, and finish.
 * No production dispatcher is connected yet. */
export class PostgresReminderAttemptStore {
  constructor(private readonly pool: pg.Pool, private readonly clock: () => Date = () => new Date()) {}

  async reserve(userId: string, scheduleVersion: string, binding: ReminderSubscriptionBinding): Promise<ReservedReminderAttempt | null> {
    binding = snapshotReminderSubscriptionBinding(binding);
    return this.transaction(async client => {
      const user = await client.query("SELECT user_id FROM users WHERE user_id=$1 AND state='ACTIVE' FOR UPDATE", [userId]);
      if (!user.rowCount) return null;
      const selected = await client.query<{
        payload: ObservationPlan; reminder_id: string; trigger_at: Date; departure_at: Date;
      }>(`SELECT p.payload, s.reminder_id, s.trigger_at, s.departure_at
          FROM plan_reminder_schedules s JOIN observation_plans p ON p.plan_id=s.plan_id AND p.user_id=s.user_id
          WHERE s.user_id=$1 AND s.schedule_version=$2 AND s.active AND s.state='SCHEDULED'
            AND s.attempt_count=0 AND s.trigger_at<=$3 AND s.departure_at>$3
            AND p.revision=s.plan_revision
            AND NOT EXISTS (SELECT 1 FROM plan_reminder_delivery_attempts a WHERE a.schedule_version=s.schedule_version)
          FOR UPDATE OF s`, [userId, scheduleVersion, this.clock().toISOString()]);
      const row = selected.rows[0];
      if (!row) return null;
      const derived = derivePlanReminderSchedules(userId, row.payload).find(item => item.reminderId === row.reminder_id);
      const reminder = row.payload.reminders?.find(item => item.reminderId === row.reminder_id);
      if (!reminder?.notifyOnWechat || derived?.scheduleVersion !== scheduleVersion
        || derived.triggerAtUtc !== row.trigger_at.toISOString() || derived.departureAtUtc !== row.departure_at.toISOString()) return null;
      const subscription = await client.query<{ challenge_id: string }>(`SELECT c.challenge_id
        FROM plan_reminder_subscription_challenges c
        WHERE c.user_id=$1 AND c.schedule_version=$2 AND c.app_id=$3 AND c.template_id=$4
          AND c.state='CLIENT_ACCEPTED' AND c.consumed_at IS NULL
          AND EXISTS(SELECT 1 FROM wechat_identities i WHERE i.user_id=c.user_id
            AND i.delivery_app_id=c.app_id AND i.delivery_identity_ciphertext IS NOT NULL)
        ORDER BY c.created_at LIMIT 1 FOR UPDATE`, [userId,scheduleVersion,binding.appId,binding.templateId]);
      const subscriptionChallengeId = subscription.rows[0]?.challenge_id;
      if (!subscriptionChallengeId) return null;
      const attemptId = randomUUID();
      // Commit UNKNOWN *before* any HTTP call. A crash cannot make this version
      // eligible again, even if it happened before the provider received it.
      await client.query(`INSERT INTO plan_reminder_delivery_attempts
        (attempt_id,schedule_version,user_id,attempt_no,outcome,error_code,subscription_challenge_id)
        VALUES($1,$2,$3,1,'UNKNOWN','ATTEMPT_RESERVED',$4)`, [attemptId, scheduleVersion, userId,subscriptionChallengeId]);
      await client.query("UPDATE plan_reminder_subscription_challenges SET consumed_at=clock_timestamp() WHERE challenge_id=$1", [subscriptionChallengeId]);
      await client.query(`UPDATE plan_reminder_schedules SET state='RESULT_UNKNOWN',
        reason='PROVIDER_OUTCOME_UNKNOWN',attempt_count=1,updated_at=clock_timestamp()
        WHERE schedule_version=$1 AND user_id=$2`, [scheduleVersion, userId]);
      return { attemptId, userId, scheduleVersion, planId: row.payload.planId, reminderId: row.reminder_id,
        subscriptionChallengeId, appId: binding.appId, templateId: binding.templateId };
    });
  }

  /** One terminal result per reservation. Late/conflicting callbacks do nothing;
   * deletion may remove the attempt entirely and must never resurrect it. */
  async finish(attempt: ReservedReminderAttempt, result: WechatSubscriptionSendResult): Promise<boolean> {
    return this.transaction(async client => {
      const user = await client.query("SELECT user_id FROM users WHERE user_id=$1 AND state='ACTIVE' FOR UPDATE", [attempt.userId]);
      if (!user.rowCount) return false;
      const state = result.state === "ACCEPTED" ? "SENT" : result.state === "UNKNOWN" ? "RESULT_UNKNOWN" : "FAILED";
      const reason = result.state === "ACCEPTED" ? "PROVIDER_ACCEPTED" : result.state === "UNKNOWN" ? "PROVIDER_OUTCOME_UNKNOWN"
        : result.state === "NOT_ATTEMPTED" ? "PROVIDER_NOT_ATTEMPTED" : "PROVIDER_REJECTED";
      const outcome = result.state === "ACCEPTED" ? "SENT" : result.state === "UNKNOWN" ? "UNKNOWN" : "KNOWN_FAILURE";
      const errorCode = result.state === "REJECTED" ? String(result.errorCode) : result.state === "NOT_ATTEMPTED" ? result.reason : reason;
      // Serialize with plan edits/deletion using the existing account lock and
      // schedule row; preserve active=false and all historical scope bindings.
      const schedule = await client.query(`SELECT 1 FROM plan_reminder_schedules
        WHERE schedule_version=$1 AND user_id=$2 AND plan_id=$3 AND reminder_id=$4 FOR UPDATE`,
        [attempt.scheduleVersion, attempt.userId, attempt.planId, attempt.reminderId]);
      if (!schedule.rowCount) return false;
      const updated = await client.query(`UPDATE plan_reminder_delivery_attempts
        SET outcome=$4,error_code=$5 WHERE attempt_id=$1 AND schedule_version=$2 AND user_id=$3
          AND outcome='UNKNOWN' AND error_code='ATTEMPT_RESERVED' RETURNING attempt_id`,
        [attempt.attemptId, attempt.scheduleVersion, attempt.userId, outcome, errorCode]);
      if (!updated.rowCount) return false;
      await client.query(`UPDATE plan_reminder_schedules SET state=$3,reason=$4,updated_at=clock_timestamp()
        WHERE schedule_version=$1 AND user_id=$2`, [attempt.scheduleVersion, attempt.userId, state, reason]);
      return true;
    });
  }

  private async transaction<T>(operation: (client: pg.PoolClient) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const result = await operation(client);
      await client.query("COMMIT");
      return result;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally { client.release(); }
  }
}
