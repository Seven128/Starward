import { randomUUID } from "node:crypto";
import type pg from "pg";
import { snapshotReminderSubscriptionBinding, validateReminderSubscriptionChallengeId, type ReminderSubscriptionBinding } from "./reminder-subscription-binding.ts";

export interface ReminderSubscriptionChallenge {
  challengeId: string; scheduleVersion: string; templateId: string; expiresAt: string;
}
export type ReminderSubscriptionChoice = "accept" | "reject" | "ban" | "filter";

/** Records one client-reported subscription choice. This is not a verified
 * provider quota: WeChat still determines actual send eligibility. */
export class PostgresReminderSubscriptionStore {
  constructor(private readonly pool: pg.Pool) {}

  async prepare(userId: string, planId: string, reminderId: string, binding: ReminderSubscriptionBinding): Promise<ReminderSubscriptionChallenge | null> {
    binding = snapshotReminderSubscriptionBinding(binding);
    return this.transaction(async client => {
      if (!await this.lockActiveUser(client, userId)) return null;
      const selected = await client.query<{ schedule_version: string }>(`SELECT s.schedule_version
        FROM plan_reminder_schedules s JOIN observation_plans p ON p.plan_id=s.plan_id AND p.user_id=s.user_id
        WHERE s.user_id=$1 AND s.plan_id=$2 AND s.reminder_id=$3 AND s.active
          AND s.state='WAITING_AUTHORIZATION' AND s.attempt_count=0 AND s.trigger_at>clock_timestamp()
          AND p.revision=s.plan_revision
          AND EXISTS(SELECT 1 FROM wechat_identities i WHERE i.user_id=s.user_id
            AND i.delivery_app_id=$4 AND i.delivery_identity_ciphertext IS NOT NULL)
        FOR UPDATE OF s`, [userId, planId, reminderId, binding.appId]);
      const version = selected.rows[0]?.schedule_version;
      if (!version) return null;
      await client.query(`UPDATE plan_reminder_subscription_challenges SET state='EXPIRED',resolved_at=clock_timestamp()
        WHERE user_id=$1 AND schedule_version=$2 AND state='REQUESTED' AND expires_at<=clock_timestamp()`, [userId, version]);
      const existing = await client.query<{ challenge_id: string; expires_at: Date }>(`SELECT challenge_id,expires_at
        FROM plan_reminder_subscription_challenges WHERE user_id=$1 AND schedule_version=$2
          AND app_id=$3 AND template_id=$4 AND state='REQUESTED' AND expires_at>clock_timestamp()
        ORDER BY created_at LIMIT 1`, [userId, version, binding.appId, binding.templateId]);
      if (existing.rows[0]) return { challengeId: existing.rows[0].challenge_id, scheduleVersion: version,
        templateId: binding.templateId, expiresAt: existing.rows[0].expires_at.toISOString() };
      const challengeId = randomUUID();
      const inserted = await client.query<{ expires_at: Date }>(`INSERT INTO plan_reminder_subscription_challenges
        (challenge_id,user_id,schedule_version,app_id,template_id,state,expires_at)
        VALUES($1,$2,$3,$4,$5,'REQUESTED',clock_timestamp()+interval '5 minutes') RETURNING expires_at`,
        [challengeId, userId, version, binding.appId, binding.templateId]);
      return { challengeId, scheduleVersion: version, templateId: binding.templateId, expiresAt: inserted.rows[0]!.expires_at.toISOString() };
    });
  }

  async record(userId: string, challengeId: string, choice: ReminderSubscriptionChoice, binding: ReminderSubscriptionBinding): Promise<boolean> {
    binding = snapshotReminderSubscriptionBinding(binding);
    validateReminderSubscriptionChallengeId(challengeId);
    if (!["accept","reject","ban","filter"].includes(choice))
      throw new Error("reminder_subscription_choice_invalid");
    return this.transaction(async client => {
      if (!await this.lockActiveUser(client, userId)) return false;
      const selected = await client.query<{ schedule_version: string; state: string }>(`SELECT c.schedule_version,c.state
        FROM plan_reminder_subscription_challenges c JOIN plan_reminder_schedules s USING(schedule_version)
        JOIN observation_plans p ON p.plan_id=s.plan_id AND p.user_id=s.user_id
        WHERE c.challenge_id=$1 AND c.user_id=$2 AND s.user_id=$2 AND c.app_id=$3 AND c.template_id=$4
          AND c.expires_at>clock_timestamp() AND c.consumed_at IS NULL
          AND s.active AND s.attempt_count=0 AND s.trigger_at>clock_timestamp()
          AND s.state IN ('WAITING_AUTHORIZATION','SCHEDULED') AND p.revision=s.plan_revision
        FOR UPDATE OF s,c`, [challengeId, userId, binding.appId, binding.templateId]);
      const row = selected.rows[0];
      if (!row) return false;
      const state = { accept:"CLIENT_ACCEPTED",reject:"REJECTED",ban:"BANNED",filter:"FILTERED" }[choice];
      if (row.state !== "REQUESTED") return row.state === state;
      await client.query(`UPDATE plan_reminder_subscription_challenges SET state=$2,resolved_at=clock_timestamp()
        WHERE challenge_id=$1`, [challengeId, state]);
      if (choice === "accept") await client.query(`UPDATE plan_reminder_schedules
        SET state='SCHEDULED',reason='WAITING_FOR_TRIGGER',updated_at=clock_timestamp()
        WHERE schedule_version=$1`, [row.schedule_version]);
      return true;
    });
  }

  private async lockActiveUser(client: pg.PoolClient, userId: string) {
    return (await client.query("SELECT user_id FROM users WHERE user_id=$1 AND state='ACTIVE' FOR UPDATE", [userId])).rowCount === 1;
  }

  private async transaction<T>(operation: (client: pg.PoolClient) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try { await client.query("BEGIN"); const result = await operation(client); await client.query("COMMIT"); return result; }
    catch (error) { await client.query("ROLLBACK"); throw error; }
    finally { client.release(); }
  }
}
