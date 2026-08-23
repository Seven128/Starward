import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import test from "node:test";
import {
  TEST_PUBLISHED_SPOT,
  buildTestSpotDetail,
} from "@starward/miniapp-contracts/test-fixtures";
import type { SourceSummary } from "@starward/miniapp-contracts";
import { MiniappService } from "./miniapp-service.ts";
import {
  OPERATIONAL_JOB_KINDS,
  OutboxWorkerRuntime,
  runOutboxOnce,
} from "./outbox-worker.ts";
import { PostgresMiniappRepository } from "./postgres-repository.ts";
import { createTestRuntimeConfig } from "./runtime-config.ts";
import { evaluateSpotCompleteness } from "./spot-completeness-policy.ts";
import { DeterministicWeatherTestAdapter } from "./test-fixtures/deterministic-weather-adapter.ts";

const databaseUrl = process.env.DATABASE_URL?.trim();
const redisUrl = process.env.REDIS_URL?.trim();

function digest(value: unknown) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

async function insertExplicitTestSpot(repository: PostgresMiniappRepository) {
  const verifiedAt = new Date().toISOString();
  const source: SourceSummary = {
    id: "source:integration:field-verification",
    kind: "OFFICIAL_VERIFICATION",
    provider: "隔离数据库集成测试",
    title: "生产形状的自动化核验记录",
    sourceUrl: "",
    license: "Project-owned automated integration record",
    licenseUrl: "",
    publishedAt: verifiedAt,
    retrievedAt: verifiedAt,
    validFrom: verifiedAt,
    validTo: null,
    state: "FRESH",
    confidence: 1,
    precision: "仅验证正式数据门禁、事务和恢复；不陈述真实地点事实",
    limitations: ["只存在于每次创建并销毁的隔离测试数据库"],
  };
  const fixtureDetail = buildTestSpotDetail(TEST_PUBLISHED_SPOT.spotId)!;
  const detail = structuredClone(fixtureDetail);
  const spot = detail.spot;
  spot.source = source;
  spot.lastVerifiedAt = verifiedAt;
  spot.lightPollution.source = source;
  spot.facilities = spot.facilities.map((facility) => ({
    ...facility,
    verifiedAt,
    source,
  }));
  spot.media = spot.media.map((media) => ({
    ...media,
    state: "FRESH",
    capturedAt: verifiedAt,
    sourceUrl: "https://example.com/integration-field-media.jpg",
    direction: "南",
  }));
  detail.route = {
    ...detail.route,
    state: "FRESH",
    source,
    lastRoad: "省道转两车道硬化支路，末段 1.2 公里无路灯",
    parkingGuidance: "入口东侧测试停车区；保持消防通道",
  };
  detail.evidence = detail.evidence.map((evidence) => ({
    ...evidence,
    sourceId: source.id,
    observedAt: verifiedAt,
    verifiedAt,
  }));
  detail.dataDisclosure = [source];
  const assessment = evaluateSpotCompleteness({
    detail,
    review: {
      actorId: "admin:integration",
      reason: "验证当前正式点发布门禁和状态往返",
    },
  });
  assert.equal(assessment.complete, true, JSON.stringify(assessment.issues));
  await repository.pool.query(
    `INSERT INTO data_source_registry(
       source_id, provider, license, license_url, payload
     ) VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (source_id) DO UPDATE SET payload = EXCLUDED.payload`,
    [
      source.id,
      source.provider,
      source.license,
      source.licenseUrl,
      source,
    ],
  );
  await repository.pool.query(
    `INSERT INTO spots(
       spot_id, name, region, timezone, geom_wgs84, gcj02_lat, gcj02_lng,
       status, visibility_policy, source_id, payload, display_order
     ) VALUES (
       $1, $2, $3, $4,
       ST_SetSRID(ST_MakePoint($5, $6), 4326)::geography,
       $7, $8, $9, $10, $11, $12, 0
     )
     ON CONFLICT (spot_id) DO UPDATE SET payload = EXCLUDED.payload`,
    [
      spot.spotId,
      spot.name,
      spot.region,
      spot.timezone,
      spot.wgs84.longitude,
      spot.wgs84.latitude,
      spot.gcj02.latitude,
      spot.gcj02.longitude,
      spot.status,
      spot.visibilityPolicy,
      spot.source.id,
      spot,
    ],
  );
  await repository.pool.query(
    `INSERT INTO spot_overview_read_models(
       spot_id, payload, dependency_digest
     ) VALUES ($1, $2, $3)
     ON CONFLICT (spot_id) DO UPDATE SET
       payload = EXCLUDED.payload,
       dependency_digest = EXCLUDED.dependency_digest,
       generated_at = now()`,
    [spot.spotId, detail, digest(detail)],
  );
  await repository.pool.query(
    `INSERT INTO spot_publication_assessments(
       spot_id, spot_revision, assessment_digest, complete, payload,
       reviewed_by, review_reason, assessed_at
     ) VALUES (
       $1, (SELECT version FROM spots WHERE spot_id = $1), $2, true, $3,
       'admin:integration', '显式隔离集成测试种子', now()
     )
     ON CONFLICT (spot_id) DO UPDATE SET
       spot_revision = EXCLUDED.spot_revision,
       assessment_digest = EXCLUDED.assessment_digest,
       complete = EXCLUDED.complete,
       payload = EXCLUDED.payload,
       reviewed_by = EXCLUDED.reviewed_by,
       review_reason = EXCLUDED.review_reason,
       assessed_at = EXCLUDED.assessed_at`,
    [spot.spotId, assessment.assessmentDigest, assessment],
  );
  return spot;
}

test(
  "PostgreSQL/PostGIS, Redis, identity isolation and Outbox survive restart",
  { skip: !databaseUrl || !redisUrl },
  async () => {
    assert.ok(databaseUrl);
    assert.ok(redisUrl);
    const runId = (
      process.env.MINIAPP_INTEGRATION_RUN_ID ?? randomUUID()
    ).replace(/[^a-zA-Z0-9_-]/gu, "");
    const config = createTestRuntimeConfig({
      storageMode: "POSTGRES",
      databaseUrl,
      redisUrl,
      cachePrefix: "starward:miniapp:integration:" + runId + ":",
      autoMigrate: true,
    });
    const firstRepository =
      await new PostgresMiniappRepository(databaseUrl).initialize({
        migrate: true,
      });
    const candidate = await firstRepository.adminCreateSpotCandidate({
      actorId: "admin:integration",
      requestId: `candidate:${runId}`,
      candidate: {
        spotId: `spot:integration-candidate-${runId}`,
        name: "集成测试待核验点",
        region: "测试区域",
        address: "仅用于隔离数据库验证",
        timezone: "Asia/Shanghai",
        latitude: 22.54,
        longitude: 114.06,
        altitudeM: null,
        visibilityPolicy: "PUBLIC_EXACT",
        source: {
          id: `source:integration-candidate-${runId}`,
          kind: "USER_FIELD_REPORT",
          provider: "隔离数据库集成测试",
          title: "候选点录入测试来源",
          sourceUrl: "",
          license: "测试数据，不可发布",
          licenseUrl: "",
          publishedAt: null,
          retrievedAt: new Date().toISOString(),
          validFrom: null,
          validTo: null,
          state: "FRESH",
          confidence: null,
          precision: "只验证候选记录与发布门禁",
          limitations: ["不构成真实地点事实"],
        },
        reason: "验证候选记录不会进入正式读模型",
      },
    });
    assert.equal(candidate.detail.spot.status, "DATA_INSUFFICIENT");
    assert.equal(candidate.assessment.complete, false);
    assert.ok(candidate.assessment.issues.length > 0);
    assert.equal(
      await firstRepository.getSpot(candidate.detail.spot.spotId),
      null,
    );
    await assert.rejects(
      firstRepository.adminPatchSpot({
        spotId: candidate.detail.spot.spotId,
        patch: {
          status: "PUBLISHED",
          reason: "验证资料不足时发布失败",
        },
        actorId: "admin:integration",
        requestId: `candidate-publish:${runId}`,
      }),
      /spot_publication_completeness_invalid/u,
    );
    const spot = await insertExplicitTestSpot(firstRepository);
    await firstRepository.close();

    const first = await MiniappService.createFromEnvironment();
    const firstRun = await (async () => {
      try {
        const firstIdentity = (
          await first.login({ code: "local:integration-first-" + runId })
        ).data;
        const secondIdentity = (
          await first.login({ code: "local:integration-second-" + runId })
        ).data;
        await first.setFavorite(
          firstIdentity.userId,
          spot.spotId,
          true,
          "infra:favorite:" + runId,
        );
        const initial = await first.getPreferences(firstIdentity.userId);
        const saved = await first.savePreferences(
          firstIdentity.userId,
          {
            preferences: {
              ...initial.data.preferences,
              defaultPlace: "河源",
              requiredFacilities: ["PARKING"],
            },
            expectedRevision: initial.data.revision,
          },
          "infra:preferences:" + runId,
        );
        await first.savePlan(
          firstIdentity.userId,
          {
            planId: ("plan:" + runId) as never,
            spotId: spot.spotId,
            localDate: "2026-08-06",
            localTime: "23:40",
            notes: "restart readback",
            expectedRevision: null,
          },
          "infra:plan:" + runId,
        );
        const draft = await first.createContributionDraft(
          firstIdentity.userId,
          {
            kind: "FIELD_REPORT",
            spotId: spot.spotId,
            candidateLocation: null,
            observedAt: new Date().toISOString(),
            topics: ["NIGHT_SAFETY"],
            detail:
              "隔离数据库现场反馈：夜间入口照明不足，管理员需要复核并更新安全指引。",
            rightsConfirmed: false,
            preciseLocationConsent: false,
          },
          "infra:contribution-draft:" + runId,
        );
        const submitted = await first.submitContribution(
          firstIdentity.userId,
          draft.data.submissionId,
          draft.data.revision,
          "infra:contribution-submit:" + runId,
        );
        assert.equal(submitted.data.state, "PENDING_REVIEW");
        assert.deepEqual(
          (await first.listContributions(secondIdentity.userId)).data
            .submissions,
          [],
        );
        assert.ok(first.repository instanceof PostgresMiniappRepository);
        const beforeReview = await first.repository.getSpot(spot.spotId);
        assert.equal(beforeReview?.status, "PUBLISHED");
        const caseId = `moderation:${submitted.data.submissionId}`;
        await first.repository.adminResolveModeration({
          caseId,
          resolution: "APPROVED",
          reason: "集成测试管理员确认该现场材料可进入规范事实合并",
          actorId: "admin:integration",
          requestId: `contribution-review:${runId}`,
        });
        assert.equal(
          (await first.repository.getSpot(spot.spotId))?.status,
          "PUBLISHED",
          "审核本身不能改变正式点",
        );
        const merged = await first.repository.adminMergeContributionEvidence({
          caseId,
          spotId: spot.spotId,
          confirmedClaims: ["SAFETY_NIGHT"],
          reason: "把已审核的夜间安全证据合并到规范记录并重新执行发布门",
          actorId: "admin:integration",
          requestId: `contribution-merge:${runId}`,
        });
        assert.equal(merged.detail.spot.status, "DATA_INSUFFICIENT");
        assert.equal(
          merged.assessment.complete,
          true,
          JSON.stringify(merged.assessment.issues),
        );
        assert.ok(
          merged.detail.evidence.some(
            (item) =>
              item.claim === "SAFETY_NIGHT" &&
              item.sourceId ===
                `contribution-source:${submitted.data.submissionId}`,
          ),
        );
        await assert.rejects(
          first.repository.adminMergeContributionEvidence({
            caseId,
            spotId: spot.spotId,
            confirmedClaims: ["SAFETY_NIGHT"],
            reason: "重复合并必须失败",
            actorId: "admin:integration",
            requestId: `contribution-merge-replay:${runId}`,
          }),
          /contribution_already_merged/u,
        );
        const republished = await first.repository.adminPatchSpot({
          spotId: spot.spotId,
          patch: {
            status: "PUBLISHED",
            reason: "集成测试显式发布；证明合并审核没有自动替代发布动作",
          },
          actorId: "admin:integration",
          requestId: `contribution-republish:${runId}`,
        });
        assert.equal(republished.spot.status, "PUBLISHED");
        return {
          firstIdentity,
          secondIdentity,
          saved,
          contributionId: submitted.data.submissionId,
        };
      } finally {
        await first.onModuleDestroy();
      }
    })();
    const { firstIdentity, secondIdentity, saved, contributionId } = firstRun;

    const restarted = await MiniappService.createFromEnvironment();
    try {
      assert.deepEqual(
        (await restarted.getFavorites(firstIdentity.userId)).data.favorites.map(
          (item) => item.spotId,
        ),
        [spot.spotId],
      );
      assert.deepEqual(
        (await restarted.getFavorites(secondIdentity.userId)).data.favorites,
        [],
      );
      assert.equal(
        (await restarted.getPreferences(firstIdentity.userId)).data.revision,
        saved.data.revision,
      );
      assert.equal(
        (await restarted.getPlans(firstIdentity.userId)).data.plans[0]?.notes,
        "restart readback",
      );
      const contributions = await restarted.listContributions(
        firstIdentity.userId,
      );
      assert.equal(contributions.data.submissions[0]?.submissionId, contributionId);
      assert.equal(contributions.data.submissions[0]?.state, "APPROVED");
      assert.ok(restarted.repository instanceof PostgresMiniappRepository);
      const postgis = await restarted.repository.pool.query<{
        version: string;
      }>("SELECT postgis_version() AS version");
      assert.match(postgis.rows[0]!.version, /^3\./u);
    } finally {
      await restarted.onModuleDestroy();
    }

    const queueName =
      process.env.MINIAPP_QUEUE_NAME ??
      "starward-miniapp-integration-" + runId;
    const options = {
      databaseUrl,
      redisUrl,
      queueName,
      runtimeConfig: config,
      weather: new DeterministicWeatherTestAdapter(),
    };
    const snapshot = await runOutboxOnce(options);
    assert.equal(snapshot.pending, 0);
    assert.equal(snapshot.dead_letter, 0, JSON.stringify(snapshot.dead_letters));
    assert.ok(snapshot.scheduled >= OPERATIONAL_JOB_KINDS.length);
    assert.ok(snapshot.effects >= OPERATIONAL_JOB_KINDS.length);

    const runtime = new OutboxWorkerRuntime(options);
    try {
      const effects = await runtime.pool.query<{
        weather_runs: string;
        astronomy_nights: string;
        opportunities: string;
        decisions: string;
        incomplete_results: string;
      }>(`SELECT
        (SELECT count(*) FROM weather_runs)::text AS weather_runs,
        (SELECT count(*) FROM astronomy_nights)::text AS astronomy_nights,
        (SELECT count(*) FROM sky_opportunity_snapshots)::text AS opportunities,
        (SELECT count(*) FROM tonight_decision_snapshots)::text AS decisions,
        (SELECT count(*) FROM job_executions
          WHERE state = 'COMPLETE'
            AND (result_state IS NULL OR result_payload IS NULL))::text
          AS incomplete_results`);
      assert.ok(Number(effects.rows[0]!.weather_runs) >= 1);
      assert.ok(Number(effects.rows[0]!.astronomy_nights) >= 1);
      assert.ok(Number(effects.rows[0]!.opportunities) >= 1);
      assert.ok(Number(effects.rows[0]!.decisions) >= 1);
      assert.equal(Number(effects.rows[0]!.incomplete_results), 0);
    } finally {
      await runtime.close();
    }
  },
);
