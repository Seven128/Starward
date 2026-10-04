import type pg from "pg";
import type { ObservationPlan } from "@starward/miniapp-contracts";
import type { MiniappRuntimeConfig } from "./runtime-config.ts";
import { configuredReminderDelivery, reminderDeliveryEnabled } from "./plan-reminder-delivery-config.ts";
import { mapReminderDeliveryFields } from "./plan-reminder-delivery-payload.ts";
import { PostgresReminderAttemptStore } from "./postgres-reminder-attempt-store.ts";
import { decryptWechatDeliveryIdentity } from "./wechat-delivery-identity.ts";
import { WechatAccessTokenProvider } from "./wechat-access-token.ts";
import { WechatSubscriptionSender } from "./wechat-subscription-sender.ts";

const BATCH_SIZE = 20;
interface Candidate {
  user_id: string; schedule_version: string; reminder_id: string; trigger_at: Date;
  payload: ObservationPlan; name: string; delivery_identity_ciphertext: string;
}

/** Existing NOTIFICATION jobs invoke this owner outside the outbox transaction.
 * It owns no second schedule/authorization store and never retries a consumed grant. */
export class PlanReminderDispatcher {
  private readonly delivery;
  private readonly attempts: PostgresReminderAttemptStore;
  private readonly tokens: WechatAccessTokenProvider | null;
  private cursor: { trigger: string; version: string } | null = null;

  constructor(private readonly pool: pg.Pool, config: MiniappRuntimeConfig,
    private readonly transport: typeof fetch = fetch, private readonly clock: () => Date = () => new Date()) {
    this.delivery = configuredReminderDelivery(config);
    this.attempts = new PostgresReminderAttemptStore(pool, clock);
    this.tokens = this.delivery ? new WechatAccessTokenProvider(this.delivery.appId, this.delivery.appSecret, transport, () => clock().getTime()) : null;
  }

  async run() {
    const enabled = await reminderDeliveryEnabled(this.pool);
    const delivery = enabled ? this.delivery : null;
    const now = this.clock();
    await this.pool.query(`UPDATE plan_reminder_schedules SET state='SKIPPED',reason=CASE
      WHEN departure_at<=$1 THEN 'DEPARTURE_EXPIRED' ELSE 'TRIGGER_MISSED' END,updated_at=clock_timestamp()
      WHERE active AND state IN ('WAITING_AUTHORIZATION','SCHEDULED') AND trigger_at<=$1
        AND (state='WAITING_AUTHORIZATION' OR $2::double precision IS NULL
          OR trigger_at < $1::timestamptz - ($2::double precision * interval '1 millisecond') OR departure_at<=$1)`,
      [now.toISOString(),delivery?.maxLatenessMs ?? null]);
    const counts = { checked: 0, invalidContent: 0, tokenUnavailable: 0, reserved: 0, submitted: 0,
      accepted: 0, rejected: 0, unknown: 0, invalidated: 0 };
    if (delivery) {
      // Rotating keyset pagination keeps an invalid first page from starving
      // later valid reminders, and leaves invalid content editable/recoverable.
      const candidates = await this.pool.query<Candidate>(`SELECT s.user_id,s.schedule_version,s.reminder_id,s.trigger_at,
        p.payload,sp.name,i.delivery_identity_ciphertext
        FROM plan_reminder_schedules s JOIN observation_plans p ON p.plan_id=s.plan_id AND p.user_id=s.user_id
        JOIN users u ON u.user_id=s.user_id JOIN spots sp ON sp.spot_id=p.spot_id
        JOIN wechat_identities i ON i.user_id=s.user_id AND i.delivery_app_id=$2
        WHERE s.active AND s.state='SCHEDULED' AND s.attempt_count=0 AND s.trigger_at<=$1 AND s.departure_at>$1
          AND u.state='ACTIVE' AND p.revision=s.plan_revision AND i.delivery_identity_ciphertext IS NOT NULL
          AND ($3::timestamptz IS NULL OR (s.trigger_at,s.schedule_version)>($3::timestamptz,$4::text))
          AND EXISTS (SELECT 1 FROM plan_reminder_subscription_challenges c WHERE c.user_id=s.user_id
            AND c.schedule_version=s.schedule_version AND c.app_id=$2 AND c.template_id=$5
            AND c.state='CLIENT_ACCEPTED' AND c.consumed_at IS NULL)
        ORDER BY s.trigger_at,s.schedule_version LIMIT $6`,
        [now.toISOString(),delivery.appId,this.cursor?.trigger ?? null,this.cursor?.version ?? null,delivery.templateId,BATCH_SIZE]);
      let completedPage = true;
      for (const candidate of candidates.rows) {
        const advance = () => { this.cursor = { trigger:candidate.trigger_at.toISOString(),version:candidate.schedule_version }; };
        counts.checked++;
        // Reject invalid content before token acquisition or grant consumption.
        if (!mapReminderDeliveryFields(candidate.payload,candidate.reminder_id,candidate.name,delivery.fields)) {
          counts.invalidContent++; advance(); continue;
        }
        const token = await this.getToken();
        if (!token) { counts.tokenUnavailable++; completedPage=false; break; }
        // Reload actual content after the awaited token. Queue/candidate payloads
        // are navigation hints, never the authoritative send snapshot.
        const fresh = await this.pool.query<Candidate>(`SELECT s.user_id,s.schedule_version,s.reminder_id,s.trigger_at,
          p.payload,sp.name,i.delivery_identity_ciphertext FROM plan_reminder_schedules s
          JOIN observation_plans p ON p.plan_id=s.plan_id AND p.user_id=s.user_id
          JOIN spots sp ON sp.spot_id=p.spot_id JOIN users u ON u.user_id=s.user_id
          JOIN wechat_identities i ON i.user_id=s.user_id AND i.delivery_app_id=$3
          WHERE s.user_id=$1 AND s.schedule_version=$2 AND s.active AND s.state='SCHEDULED'
            AND u.state='ACTIVE' AND p.revision=s.plan_revision`, [candidate.user_id,candidate.schedule_version,delivery.appId]);
        const row = fresh.rows[0];
        if (!row || !await reminderDeliveryEnabled(this.pool)) { counts.invalidated++; advance(); continue; }
        const data = mapReminderDeliveryFields(row.payload,row.reminder_id,row.name,delivery.fields);
        let recipient: string;
        try {
          recipient = decryptWechatDeliveryIdentity(row.delivery_identity_ciphertext,row.user_id,delivery.appId,delivery.identityKey);
          if (!/^[A-Za-z0-9_-]{1,128}$/u.test(recipient)) throw new Error();
        } catch { counts.invalidContent++; advance(); continue; }
        if (!data) { counts.invalidContent++; advance(); continue; }
        const qualification = { planRevision: row.payload.revision, identityCiphertext: row.delivery_identity_ciphertext,
          maxLatenessMs: delivery.maxLatenessMs };
        const attempt = await this.attempts.reserve(row.user_id,row.schedule_version,delivery,qualification);
        if (!attempt) { counts.invalidated++; advance(); continue; }
        counts.reserved++;
        const sender = new WechatSubscriptionSender({ enabled:true,templateId:delivery.templateId,
          fieldNames:Object.keys(delivery.fields),miniprogramState:delivery.miniprogramState },async () => token,this.transport);
        const result = await sender.send({ recipient, data,
          page:`content/plan/detail/index?planId=${encodeURIComponent(row.payload.planId)}` },
          async signal => !signal.aborted && await this.attempts.eligibleBeforeSend(attempt,qualification));
        if (result.state === 'NOT_ATTEMPTED') counts.invalidated++;
        else {
          counts.submitted++;
          if (result.state === 'ACCEPTED') counts.accepted++;
          else if (result.state === 'REJECTED') counts.rejected++;
          else counts.unknown++;
        }
        // Token errors only retire the cache for the next independent schedule;
        // template/quota errors must not trigger repeated token acquisition.
        // Never force-refresh WeChat or retry this consumed authorization.
        if (result.state === 'REJECTED' && [40001,40014,42001].includes(result.errorCode)) this.tokens!.invalidate(token);
        // Persistence failure propagates to the existing job retry; durable
        // UNKNOWN/consumed authorization prevents a second network submission.
        await this.attempts.finish(attempt,result);
        advance();
      }
      if (completedPage && candidates.rows.length < BATCH_SIZE) this.cursor=null;
    }
    return { resultState: delivery ? 'CHECKED' : 'CAPABILITY_GATED', resultPayload: {
      enabled, schedulingConnected:true, authorizationConnected:true, dispatchConnected:true,
      capabilityConfigured:!!delivery, deliveryAttempted:counts.submitted>0, ...counts,
      batchLimit:BATCH_SIZE, reason:delivery ? 'Bounded authorized reminder dispatch checked'
        : 'Approved template mapping, delivery configuration or notification feature flag unavailable',
    } };
  }

  private async getToken(): Promise<string | null> {
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      return await Promise.race([this.tokens!.get(controller.signal),new Promise<null>(resolve => {
        timer = setTimeout(() => { controller.abort(); resolve(null); },4000);
      })]);
    } catch { return null; }
    finally { if (timer) clearTimeout(timer); controller.abort(); }
  }
}
