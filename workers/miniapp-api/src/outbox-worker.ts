import { createHash, randomUUID } from "node:crypto";
import { Queue, Worker, type Job } from "bullmq";
import pg, { type PoolClient } from "pg";
import type { SpotId } from "@starward/miniapp-contracts";
import { AstronomyService } from "./astronomy-service.ts";

const { Pool } = pg;
const DEFAULT_QUEUE_NAME = "starward-miniapp-v1";
export const OPERATIONAL_JOB_KINDS = Object.freeze([
  "WEATHER",
  "ASTRONOMY",
  "DECISION",
  "LIGHT",
  "MEDIA",
  "FRESHNESS",
  "PROVIDER_HEALTH",
  "COST",
  "NOTIFICATION",
  "BACKUP",
] as const);
type OperationalJobKind = (typeof OPERATIONAL_JOB_KINDS)[number];

function isOperationalJobKind(value: unknown): value is OperationalJobKind {
  return (
    typeof value === "string" &&
    OPERATIONAL_JOB_KINDS.includes(value as OperationalJobKind)
  );
}

function digest(value: unknown) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function hourBucket(at = new Date()) {
  return `${at.toISOString().slice(0, 13)}:00:00.000Z`;
}

function localDate(timezone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function connectionFromUrl(redisUrl: string) {
  const parsed = new URL(redisUrl);
  if (parsed.protocol !== "redis:" && parsed.protocol !== "rediss:")
    throw new Error("redis_url_protocol_invalid");
  return {
    host: parsed.hostname,
    port: Number(parsed.port || 6379),
    username: parsed.username || undefined,
    password: parsed.password || undefined,
    tls: parsed.protocol === "rediss:" ? {} : undefined,
    maxRetriesPerRequest: null,
  };
}

function mapEventToJob(eventType: string, payload: unknown) {
  if (
    typeof payload === "object" &&
    payload !== null &&
    "jobKind" in payload &&
    isOperationalJobKind(payload.jobKind)
  )
    return payload.jobKind;
  if (/Import|FieldReport|Media/iu.test(eventType)) return "MEDIA";
  if (/Favorite|ObservationPlan/iu.test(eventType)) return "NOTIFICATION";
  if (/Preference/iu.test(eventType)) return "DECISION";
  if (/ProfileLink/iu.test(eventType)) return "FRESHNESS";
  return "PROVIDER_HEALTH";
}

interface JobOutcome {
  resultState: string;
  resultPayload: Readonly<Record<string, unknown>>;
}

export interface OutboxWorkerOptions {
  databaseUrl: string;
  redisUrl: string;
  queueName?: string;
}

export class OutboxWorkerRuntime {
  readonly pool: pg.Pool;
  readonly queue: Queue;
  readonly worker: Worker;
  readonly astronomy = new AstronomyService();

  constructor(options: OutboxWorkerOptions) {
    const connection = connectionFromUrl(options.redisUrl);
    const queueName = options.queueName ?? DEFAULT_QUEUE_NAME;
    this.pool = new Pool({
      connectionString: options.databaseUrl,
      max: 4,
      application_name: "starward-miniapp-worker",
    });
    this.queue = new Queue(queueName, {
      connection,
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: "exponential", delay: 250 },
        removeOnComplete: 100,
        removeOnFail: 100,
      },
    });
    this.worker = new Worker(
      queueName,
      async (job) => this.#process(job),
      { connection, concurrency: 1 },
    );
  }

  async enqueueOperationalSweep(bucket = hourBucket()) {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      let inserted = 0;
      for (const jobKind of OPERATIONAL_JOB_KINDS) {
        const result = await client.query(
          `INSERT INTO outbox_events(
             event_id, event_type, idempotency_key, payload
           ) VALUES ($1, $2, $3, $4)
           ON CONFLICT (idempotency_key) DO NOTHING`,
          [
            randomUUID(),
            `Operational${jobKind}Requested`,
            `operational:${bucket}:${jobKind}`,
            {
              jobKind,
              scheduleBucket: bucket,
              trigger: "BOUNDED_HOURLY_SWEEP",
            },
          ],
        );
        inserted += result.rowCount ?? 0;
      }
      await client.query("COMMIT");
      return inserted;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async dispatchBatch(limit = 50) {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const result = await client.query<{
        event_id: string;
        event_type: string;
        payload: unknown;
      }>(
        `SELECT event_id::text, event_type, payload
           FROM outbox_events
          WHERE state = 'PENDING' AND available_at <= now()
          ORDER BY created_at
          FOR UPDATE SKIP LOCKED
          LIMIT $1`,
        [limit],
      );
      for (const event of result.rows) {
        const jobKind = mapEventToJob(event.event_type, event.payload);
        await this.queue.add(
          jobKind,
          {
            eventId: event.event_id,
            eventType: event.event_type,
            payload: event.payload,
          },
          { jobId: event.event_id },
        );
        await client.query(
          `UPDATE outbox_events
              SET state = 'DISPATCHED', dispatched_at = now()
            WHERE event_id = $1`,
          [event.event_id],
        );
      }
      await client.query("COMMIT");
      return result.rows.length;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async waitForIdle(timeoutMs = 15_000) {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      const counts = await this.queue.getJobCounts(
        "active",
        "waiting",
        "delayed",
        "prioritized",
      );
      if (Object.values(counts).every((count) => count === 0)) return;
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    throw new Error("outbox_worker_idle_timeout");
  }

  async snapshot(): Promise<{
    pending: number;
    dispatched: number;
    complete: number;
    dead_letter: number;
    executions: number;
    effects: number;
    effect_kinds: OperationalJobKind[];
    manual_replays: number;
    dead_letters: Array<{
      event_id: string;
      event_type: string;
      attempts: number;
      last_error_code: string | null;
    }>;
  }> {
    const result = await this.pool.query<{
      pending: string;
      dispatched: string;
      complete: string;
      dead_letter: string;
      executions: string;
      effects: string;
      manual_replays: string;
    }>(`SELECT
      (SELECT count(*) FROM outbox_events WHERE state = 'PENDING')::text AS pending,
      (SELECT count(*) FROM outbox_events WHERE state = 'DISPATCHED')::text AS dispatched,
      (SELECT count(*) FROM outbox_events WHERE state = 'COMPLETE')::text AS complete,
      (SELECT count(*) FROM outbox_events WHERE state = 'DEAD_LETTER')::text AS dead_letter,
      (SELECT count(*) FROM job_executions)::text AS executions,
      (SELECT count(*) FROM job_effects)::text AS effects,
      (SELECT coalesce(sum(manual_replay_count), 0) FROM outbox_events)::text AS manual_replays`);
    const effectKinds = await this.pool.query<{ job_kind: OperationalJobKind }>(
      "SELECT DISTINCT job_kind FROM job_effects ORDER BY job_kind",
    );
    const deadLetters = await this.pool.query<{
      event_id: string;
      event_type: string;
      attempts: number;
      last_error_code: string | null;
    }>(`SELECT event_id::text, event_type, attempts, last_error_code
          FROM outbox_events
         WHERE state = 'DEAD_LETTER'
         ORDER BY created_at`);
    const row = result.rows[0]!;
    return {
      pending: Number(row.pending),
      dispatched: Number(row.dispatched),
      complete: Number(row.complete),
      dead_letter: Number(row.dead_letter),
      executions: Number(row.executions),
      effects: Number(row.effects),
      effect_kinds: effectKinds.rows.map((item) => item.job_kind),
      manual_replays: Number(row.manual_replays),
      dead_letters: deadLetters.rows,
    };
  }

  async replayDeadLetter(eventId: string) {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(eventId))
      throw new Error("dead_letter_event_id_invalid");
    const existingJob = await this.queue.getJob(eventId);
    if (existingJob) await existingJob.remove();
    const replay = await this.pool.query(
      `UPDATE outbox_events
          SET state = 'PENDING', available_at = now(), dispatched_at = NULL,
              completed_at = NULL, last_error_code = NULL,
              manual_replay_count = manual_replay_count + 1,
              last_replayed_at = now()
        WHERE event_id = $1 AND state = 'DEAD_LETTER'`,
      [eventId],
    );
    if (replay.rowCount !== 1) throw new Error("dead_letter_event_not_replayable");
    await this.dispatchBatch();
    await this.waitForIdle();
    return this.snapshot();
  }

  async close() {
    await this.worker.close();
    await this.queue.close();
    await this.pool.end();
  }

  async #applyEffect(
    client: PoolClient,
    input: {
      eventId: string;
      eventType: string;
      jobKind: OperationalJobKind;
      payload: unknown;
    },
  ): Promise<JobOutcome> {
    const effectKey = `${input.eventId}:${input.jobKind}:v1`;
    const prior = await client.query<{
      result_state: string;
      result_payload: Readonly<Record<string, unknown>>;
    }>(
      `SELECT result_state, result_payload
         FROM job_effects
        WHERE effect_key = $1`,
      [effectKey],
    );
    if (prior.rows[0])
      return {
        resultState: prior.rows[0].result_state,
        resultPayload: prior.rows[0].result_payload,
      };
    if (
      typeof input.payload === "object" &&
      input.payload !== null &&
      "forceFailure" in input.payload &&
      input.payload.forceFailure === true
    )
      throw new Error("forced_operational_job_failure");

    let outcome: JobOutcome;
    switch (input.jobKind) {
      case "WEATHER": {
        const resultPayload = {
          provider: "weather:unconfigured",
          capability: "WEATHER_SUMMARY",
          reason: "No licensed weather provider is configured for this Demo",
          stableFallback: "SAMPLE_DATA_WITH_EXPLICIT_NON_REALTIME_LABEL",
        } as const;
        await client.query(
          `INSERT INTO provider_health_checks(
             provider, state, failure_code, checked_at, payload
           ) VALUES ($1, 'DISABLED', 'CAPABILITY_NOT_CONFIGURED', now(), $2)
           ON CONFLICT (provider) DO UPDATE SET
             state = EXCLUDED.state,
             failure_code = EXCLUDED.failure_code,
             checked_at = EXCLUDED.checked_at,
             payload = EXCLUDED.payload`,
          [resultPayload.provider, resultPayload],
        );
        outcome = { resultState: "CAPABILITY_GATED", resultPayload };
        break;
      }
      case "ASTRONOMY": {
        const spots = await client.query<{ spot_id: string; timezone: string }>(
          "SELECT spot_id, timezone FROM spots WHERE visibility_policy <> 'HIDDEN' ORDER BY display_order",
        );
        let targetCount = 0;
        for (const spot of spots.rows) {
          const date = localDate(spot.timezone);
          const report = await this.astronomy.compute({
            spotId: spot.spot_id as SpotId,
            localDate: date,
            at: null,
            targetProfile: "BEGINNER",
          });
          const algorithm = report.data.context.algorithmVersion;
          const nightId = `night:${digest({ spotId: spot.spot_id, date, algorithm }).slice(0, 32)}`;
          const stored = await client.query<{ night_id: string }>(
            `INSERT INTO astronomy_nights(
               night_id, spot_id, local_date, algorithm_version, payload
             ) VALUES ($1, $2, $3, $4, $5)
             ON CONFLICT (spot_id, local_date, algorithm_version) DO UPDATE SET
               payload = EXCLUDED.payload,
               generated_at = now()
             RETURNING night_id`,
            [nightId, spot.spot_id, date, algorithm, report.data],
          );
          const storedNightId = stored.rows[0]!.night_id;
          await client.query(
            "DELETE FROM astronomy_targets WHERE night_id = $1",
            [storedNightId],
          );
          for (const target of report.data.targets) {
            await client.query(
              `INSERT INTO astronomy_targets(night_id, target_id, payload)
               VALUES ($1, $2, $3)`,
              [storedNightId, target.targetId, target],
            );
            targetCount += 1;
          }
          await client.query(
            `INSERT INTO spot_sky_summaries(spot_id, local_date, payload)
             VALUES ($1, $2, $3)
             ON CONFLICT (spot_id, local_date) DO UPDATE SET
               payload = EXCLUDED.payload,
               generated_at = now()`,
            [spot.spot_id, date, report.data],
          );
        }
        outcome = {
          resultState: "PRECOMPUTED",
          resultPayload: {
            spotCount: spots.rowCount ?? spots.rows.length,
            targetCount,
            engine: "Astronomy Engine",
            weatherBoundary: "SAMPLE_DATA_EXPLICIT",
          },
        };
        break;
      }
      case "DECISION": {
        const ruleVersion = "starward-tonight-decision-v1-hard-blocker-first";
        await client.query(
          `INSERT INTO rule_versions(rule_version, state, payload)
           VALUES ($1, 'ACTIVE', $2)
           ON CONFLICT (rule_version) DO UPDATE SET payload = EXCLUDED.payload`,
          [
            ruleVersion,
            {
              hardBlockersFirst: true,
              aiMayOverride: false,
              source: "Technical V2.0 section 12",
            },
          ],
        );
        const nights = await client.query<{
          night_id: string;
          spot_id: string;
          local_date: string | Date;
          payload: {
            decision?: { inputDigest?: string };
            sources?: Array<{ id?: string }>;
          };
        }>(
          "SELECT night_id, spot_id, local_date, payload FROM astronomy_nights ORDER BY spot_id, local_date",
        );
        let decisionCount = 0;
        for (const night of nights.rows) {
          const decision = night.payload.decision;
          if (!decision?.inputDigest) continue;
          const date =
            night.local_date instanceof Date
              ? night.local_date.toISOString().slice(0, 10)
              : String(night.local_date).slice(0, 10);
          const snapshotId = `decision:${digest({ night: night.night_id, ruleVersion }).slice(0, 32)}`;
          const sourceIds = (night.payload.sources ?? [])
            .map((source) => source.id)
            .filter((id): id is string => typeof id === "string");
          await client.query(
            `INSERT INTO tonight_decision_snapshots(
               snapshot_id, spot_id, local_date, rule_version, input_digest,
               source_snapshot_ids, payload
             ) VALUES ($1, $2, $3, $4, $5, $6, $7)
             ON CONFLICT (snapshot_id) DO UPDATE SET
               input_digest = EXCLUDED.input_digest,
               source_snapshot_ids = EXCLUDED.source_snapshot_ids,
               payload = EXCLUDED.payload,
               generated_at = now()`,
            [
              snapshotId,
              night.spot_id,
              date,
              ruleVersion,
              decision.inputDigest,
              JSON.stringify(sourceIds),
              decision,
            ],
          );
          decisionCount += 1;
        }
        outcome = {
          resultState: decisionCount > 0 ? "RECOMPUTED" : "NO_INPUT",
          resultPayload: { decisionCount, ruleVersion, hardBlockersFirst: true },
        };
        break;
      }
      case "LIGHT": {
        const sampled = await client.query(
          `INSERT INTO light_pollution_samples(
             spot_id, dataset_version, state, payload
           )
           SELECT spot_id,
                  coalesce(
                    payload -> 'lightPollution' ->> 'datasetVersion',
                    'demo-radial-fallback-v1'
                  ),
                  'ESTIMATED',
                  jsonb_build_object(
                    'estimate', payload -> 'lightPollution',
                    'boundedGeometry', true,
                    'runtimeClaim', false
                  )
             FROM spots
            WHERE visibility_policy <> 'HIDDEN'
           ON CONFLICT (spot_id, dataset_version) DO UPDATE SET
             state = EXCLUDED.state,
             payload = EXCLUDED.payload`,
        );
        outcome = {
          resultState: "ESTIMATED",
          resultPayload: {
            sampleCount: sampled.rowCount ?? 0,
            datasetVersion: "FROM_CANONICAL_SPOT_ESTIMATE",
            precision: "TRIAL_REGION_COARSE_ESTIMATE",
          },
        };
        break;
      }
      case "MEDIA": {
        const counts = await client.query<{
          pending_imports: string;
          uploaded_media: string;
        }>(`SELECT
          (SELECT count(*) FROM external_post_imports
            WHERE moderation_state = 'PENDING')::text AS pending_imports,
          (SELECT count(*) FROM spot_media
            WHERE payload ->> 'origin' = 'USER_UPLOAD')::text AS uploaded_media`);
        outcome = {
          resultState: "CAPABILITY_GATED",
          resultPayload: {
            pendingImports: Number(counts.rows[0]!.pending_imports),
            uploadedMedia: Number(counts.rows[0]!.uploaded_media),
            manualTextImport: true,
            uploadPipeline: "DISABLED_NO_PRIVATE_OBJECT_STORAGE_OR_REVIEW_CALLBACK",
          },
        };
        break;
      }
      case "FRESHNESS": {
        const freshness = await client.query<{
          expired_weather: string;
          computed_nights: string;
          source_snapshots: string;
        }>(`SELECT
          (SELECT count(*) FROM weather_runs WHERE valid_to <= now())::text AS expired_weather,
          (SELECT count(*) FROM astronomy_nights)::text AS computed_nights,
          (SELECT count(*) FROM data_source_snapshots)::text AS source_snapshots`);
        outcome = {
          resultState: "INSPECTED",
          resultPayload: {
            expiredWeather: Number(freshness.rows[0]!.expired_weather),
            computedNights: Number(freshness.rows[0]!.computed_nights),
            sourceSnapshots: Number(freshness.rows[0]!.source_snapshots),
            hardExpiredMayRecommend: false,
          },
        };
        break;
      }
      case "PROVIDER_HEALTH": {
        const providers = ["weather", "route", "media-upload", "external-parser"];
        for (const provider of providers)
          await client.query(
            `INSERT INTO provider_health_checks(
               provider, state, failure_code, checked_at, payload
             ) VALUES ($1, 'DISABLED', 'CAPABILITY_NOT_CONFIGURED', now(), $2)
             ON CONFLICT (provider) DO UPDATE SET
               state = EXCLUDED.state,
               failure_code = EXCLUDED.failure_code,
               checked_at = EXCLUDED.checked_at,
               payload = EXCLUDED.payload`,
            [provider, { provider, runtimeCallsAllowed: false, fallback: true }],
          );
        outcome = {
          resultState: "CHECKED",
          resultPayload: { providers, allDisabledTruthfully: true },
        };
        break;
      }
      case "COST": {
        const usage = await client.query<{
          projected: string;
          calls: string;
        }>(`SELECT
          coalesce(sum(estimated_cost_cny), 0)::text AS projected,
          count(*)::text AS calls
          FROM vendor_call_usage`);
        const projectedMonthlyCny = Number(usage.rows[0]!.projected);
        if (projectedMonthlyCny > 300)
          throw new Error("provider_budget_hard_limit_exceeded");
        outcome = {
          resultState: "WITHIN_BUDGET",
          resultPayload: {
            calls: Number(usage.rows[0]!.calls),
            projectedMonthlyCny,
            normalTargetCny: [0, 100],
            hardMaximumCny: 300,
          },
        };
        break;
      }
      case "NOTIFICATION": {
        const flag = await client.query<{ payload: { value?: unknown } }>(
          "SELECT payload FROM feature_flags WHERE flag_key = 'NOTIFICATION_ENABLED'",
        );
        const enabled = flag.rows[0]?.payload.value === true;
        outcome = {
          resultState: enabled ? "EVALUATED" : "CAPABILITY_GATED",
          resultPayload: {
            enabled,
            deliveryAttempted: false,
            reason: enabled
              ? "No due Demo notifications in this bounded sweep"
              : "Notification capability is disabled by the audited Demo flag",
          },
        };
        break;
      }
      case "BACKUP": {
        const schema = await client.query<{
          version: string | null;
          required_tables: string;
        }>(`SELECT
          (SELECT max(version) FROM schema_migrations) AS version,
          (SELECT count(*) FROM information_schema.tables
            WHERE table_schema = 'public')::text AS required_tables`);
        outcome = {
          resultState: "READY_FOR_RESTORE_VALIDATION",
          resultPayload: {
            migrationVersion: schema.rows[0]!.version,
            tableCount: Number(schema.rows[0]!.required_tables),
            restoreProofOwner: "tools/miniapp/run-infrastructure-check.mjs",
          },
        };
        break;
      }
    }

    await client.query(
      `INSERT INTO job_effects(
         effect_key, event_id, job_kind, result_state, result_payload
       ) VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (effect_key) DO NOTHING`,
      [effectKey, input.eventId, input.jobKind, outcome.resultState, outcome.resultPayload],
    );
    return outcome;
  }

  async #process(job: Job) {
    const eventId = String(job.data.eventId);
    const executionId = randomUUID();
    const client = await this.pool.connect();
    try {
      await client.query(
        `INSERT INTO job_executions(
           execution_id, event_id, job_kind, attempt, state, started_at
         ) VALUES ($1, $2, $3, $4, 'RUNNING', now())`,
        [executionId, eventId, job.name, job.attemptsMade + 1],
      );
      if (!isOperationalJobKind(job.name))
        throw new Error("outbox_job_kind_invalid");
      await client.query("BEGIN");
      const event = await client.query<{
        event_type: string;
        payload: unknown;
      }>(
        "SELECT event_type, payload FROM outbox_events WHERE event_id = $1 FOR UPDATE",
        [eventId],
      );
      if (!event.rows[0]) throw new Error("outbox_event_not_found");
      const outcome = await this.#applyEffect(client, {
        eventId,
        eventType: event.rows[0].event_type,
        jobKind: job.name,
        payload: event.rows[0].payload,
      });
      await client.query(
        `UPDATE outbox_events
            SET state = 'COMPLETE', completed_at = now(), attempts = attempts + 1,
                last_error_code = NULL
          WHERE event_id = $1`,
        [eventId],
      );
      await client.query(
        `UPDATE job_executions
            SET state = 'COMPLETE', completed_at = now(),
                result_state = $2, result_payload = $3
          WHERE execution_id = $1`,
        [executionId, outcome.resultState, outcome.resultPayload],
      );
      await client.query("COMMIT");
      return { eventId, jobKind: job.name, ...outcome };
    } catch (error) {
      try {
        await client.query("ROLLBACK");
      } catch {}
      const code = error instanceof Error ? error.message : "worker_failure";
      await client.query(
        `UPDATE job_executions
            SET state = 'FAILED', completed_at = now(), error_code = $2
          WHERE execution_id = $1`,
        [executionId, code],
      );
      const maximumAttempts = Number(job.opts.attempts ?? 3);
      if (job.attemptsMade + 1 >= maximumAttempts)
        await client.query(
          `UPDATE outbox_events
              SET state = 'DEAD_LETTER', attempts = attempts + 1,
                  last_error_code = $2
            WHERE event_id = $1`,
          [eventId, code],
        );
      else
        await client.query(
          `UPDATE outbox_events
              SET state = 'DISPATCHED', attempts = attempts + 1,
                  last_error_code = $2
            WHERE event_id = $1`,
          [eventId, code],
        );
      throw error;
    } finally {
      client.release();
    }
  }
}

export async function runOutboxOnce(options: OutboxWorkerOptions) {
  const runtime = new OutboxWorkerRuntime(options);
  try {
    const scheduled = await runtime.enqueueOperationalSweep();
    const enqueued = await runtime.dispatchBatch();
    await runtime.waitForIdle();
    return { scheduled, enqueued, ...(await runtime.snapshot()) };
  } finally {
    await runtime.close();
  }
}
