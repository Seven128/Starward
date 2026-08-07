import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import { DEMO_SPOTS } from "@starward/miniapp-contracts";
import { MiniappService } from "./miniapp-service.ts";
import { PostgresMiniappRepository } from "./postgres-repository.ts";
import {
  OPERATIONAL_JOB_KINDS,
  OutboxWorkerRuntime,
  runOutboxOnce,
} from "./outbox-worker.ts";

const databaseUrl = process.env.DATABASE_URL?.trim();
const redisUrl = process.env.REDIS_URL?.trim();

test(
  "PostgreSQL/PostGIS, Redis and transactional Outbox survive a service restart",
  { skip: !databaseUrl || !redisUrl },
  async () => {
    assert.ok(databaseUrl);
    assert.ok(redisUrl);
    const runId = (process.env.MINIAPP_INTEGRATION_RUN_ID ?? randomUUID()).replace(
      /[^a-zA-Z0-9_-]/gu,
      "",
    );
    const favoriteKey = `infra-favorite-${runId}`;
    const planKey = `infra-plan-${runId}`;
    const linkKey = `infra-link-${runId}`;
    const preferencesKey = `infra-preferences-${runId}`;
    const importKeys = [0, 1, 2, 3, 4].map(
      (index) => `infra-import-${runId}-${index}`,
    );
    const planId = `plan:infra:${runId}`;
    const url = `https://example.com/profile/${runId}`;

    const first = await MiniappService.createFromEnvironment();
    const map = await first.getMapScene({});
    assert.equal(map.data.spots.length, DEMO_SPOTS.length);
    const spotId = map.data.spots[0]!.spotId;
    await first.setFavorite(spotId, true, favoriteKey);
    const savedPlan = await first.savePlan(
      {
        planId: planId as never,
        spotId,
        localDate: "2026-08-06",
        localTime: "23:40",
        notes: "restart readback",
        expectedRevision: null,
      },
      planKey,
    );
    assert.equal(savedPlan.data.revision, 1);
    const link = await first.saveProfileLink(
      {
        platform: "OTHER",
        displayName: "集成验证主页",
        url,
        visibility: "PRIVATE",
        sortOrder: 0,
      },
      linkKey,
    );
    const initialPreferences = await first.getPreferences();
    const preferences = await first.savePreferences(
      {
        preferences: {
          ...initialPreferences.data.preferences,
          defaultPlace: "河源",
          requiredFacilities: ["PARKING"],
        },
        expectedRevision: initialPreferences.data.revision,
      },
      preferencesKey,
    );
    const created = await first.createImportDraft(
      { platform: "OTHER", originalUrl: `${url}/post`, rightsConfirmed: true },
      importKeys[0]!,
    );
    const edited = await first.updateImportDraft(
      created.data.importDraftId,
      {
        expectedRevision: created.data.revision,
        stage: "EDIT_DRAFT",
        title: "本人观星帖",
        body: "由本人手动导入并保留来源。",
      },
      importKeys[1]!,
    );
    const associated = await first.updateImportDraft(
      created.data.importDraftId,
      {
        expectedRevision: edited.data.revision,
        stage: "ASSOCIATE_SPOT",
        createProposal: true,
      },
      importKeys[2]!,
    );
    const preview = await first.updateImportDraft(
      created.data.importDraftId,
      { expectedRevision: associated.data.revision, stage: "PREVIEW" },
      importKeys[3]!,
    );
    const submitted = await first.updateImportDraft(
      created.data.importDraftId,
      { expectedRevision: preview.data.revision, stage: "SUBMIT" },
      importKeys[4]!,
    );
    assert.equal(submitted.data.moderationState, "PENDING");
    assert.ok(submitted.data.spotProposalId);
    await first.onModuleDestroy();

    const restarted = await MiniappService.createFromEnvironment();
    assert.ok(
      (await restarted.getFavorites()).data.favorites.some(
        (spot) => spot.spotId === spotId,
      ),
    );
    const restartedPreferences = await restarted.getPreferences();
    assert.equal(restartedPreferences.data.revision, preferences.data.revision);
    assert.equal(restartedPreferences.data.preferences.defaultPlace, "河源");
    assert.ok(
      (await restarted.getPlans()).data.plans.some(
        (plan) => plan.planId === planId && plan.notes === "restart readback",
      ),
    );
    assert.ok(
      (await restarted.listProfileLinks()).data.links.some(
        (item) =>
          item.profileLinkId === link.data.profileLinkId && item.url === url,
      ),
    );
    const imported = await restarted.repository.getImportDraft(
      created.data.importDraftId,
    );
    assert.equal(imported?.stage, "SUBMIT");
    assert.equal(imported?.proposalReviewState, "PENDING");
    const operations = (await restarted.operationsSnapshot()).data;
    assert.equal(
      (operations.repository as { repository: string }).repository,
      "postgres",
    );
    assert.equal((operations.cache as { cache: string }).cache, "redis");

    assert.ok(restarted.repository instanceof PostgresMiniappRepository);
    const postgis = await restarted.repository.pool.query<{
      version: string;
      required_tables: string;
    }>(`SELECT
      postgis_version() AS version,
      (SELECT count(*) FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = ANY($1::text[]))::text AS required_tables`, [
      [
        "spots",
        "user_preferences",
        "spot_facilities",
        "spot_media",
        "favorites",
        "observation_plans",
        "external_post_imports",
        "external_post_import_drafts",
        "spot_proposals",
        "outbox_events",
        "job_executions",
        "job_effects",
        "audit_logs",
      ],
    ]);
    assert.match(postgis.rows[0]!.version, /^3\./u);
    assert.equal(Number(postgis.rows[0]!.required_tables), 13);
    await restarted.onModuleDestroy();

    const queueName =
      process.env.MINIAPP_QUEUE_NAME ?? `starward-miniapp-infra-${runId}`;
    const worker = await runOutboxOnce({ databaseUrl, redisUrl, queueName });
    assert.equal(worker.pending, 0);
    assert.ok(worker.enqueued >= 8);
    assert.equal(worker.dispatched, 0);
    assert.equal(worker.dead_letter, 0, JSON.stringify(worker.dead_letters));
    assert.ok(worker.complete >= 8);
    assert.ok(worker.executions >= 8);
    assert.ok(worker.scheduled >= OPERATIONAL_JOB_KINDS.length);
    assert.ok(worker.effects >= OPERATIONAL_JOB_KINDS.length);
    assert.deepEqual(
      [...worker.effect_kinds].sort(),
      [...OPERATIONAL_JOB_KINDS].sort(),
    );

    const operational = new OutboxWorkerRuntime({
      databaseUrl,
      redisUrl,
      queueName,
    });
    try {
      const effects = await operational.pool.query<{
        astronomy_nights: string;
        sky_summaries: string;
        decisions: string;
        light_samples: string;
        provider_health: string;
        incomplete_results: string;
      }>(`SELECT
        (SELECT count(*) FROM astronomy_nights)::text AS astronomy_nights,
        (SELECT count(*) FROM spot_sky_summaries)::text AS sky_summaries,
        (SELECT count(*) FROM tonight_decision_snapshots)::text AS decisions,
        (SELECT count(*) FROM light_pollution_samples)::text AS light_samples,
        (SELECT count(*) FROM provider_health_checks)::text AS provider_health,
        (SELECT count(*) FROM job_executions
          WHERE state = 'COMPLETE'
            AND (result_state IS NULL OR result_payload IS NULL))::text AS incomplete_results`);
      assert.equal(Number(effects.rows[0]!.astronomy_nights), DEMO_SPOTS.length);
      assert.equal(Number(effects.rows[0]!.sky_summaries), DEMO_SPOTS.length);
      assert.equal(Number(effects.rows[0]!.decisions), DEMO_SPOTS.length);
      assert.equal(Number(effects.rows[0]!.light_samples), DEMO_SPOTS.length);
      assert.ok(Number(effects.rows[0]!.provider_health) >= 4);
      assert.equal(Number(effects.rows[0]!.incomplete_results), 0);

      const failedEventId = randomUUID();
      await operational.pool.query(
        `INSERT INTO outbox_events(
           event_id, event_type, idempotency_key, payload
         ) VALUES ($1, 'OperationalProviderHealthRequested', $2, $3)`,
        [
          failedEventId,
          `infra-dead-letter-${runId}`,
          { jobKind: "PROVIDER_HEALTH", forceFailure: true },
        ],
      );
      await operational.dispatchBatch();
      await operational.waitForIdle();
      assert.equal((await operational.snapshot()).dead_letter, 1);
      await operational.pool.query(
        `UPDATE outbox_events
            SET payload = payload - 'forceFailure'
          WHERE event_id = $1`,
        [failedEventId],
      );
      const replayed = await operational.replayDeadLetter(failedEventId);
      assert.equal(replayed.dead_letter, 0);
      assert.equal(replayed.manual_replays, 1);
      const replayRow = await operational.pool.query<{
        state: string;
        manual_replay_count: number;
        effects: string;
      }>(`SELECT state, manual_replay_count,
          (SELECT count(*) FROM job_effects WHERE event_id = $1)::text AS effects
          FROM outbox_events WHERE event_id = $1`, [failedEventId]);
      assert.equal(replayRow.rows[0]!.state, "COMPLETE");
      assert.equal(replayRow.rows[0]!.manual_replay_count, 1);
      assert.equal(Number(replayRow.rows[0]!.effects), 1);
    } finally {
      await operational.close();
    }
  },
);
