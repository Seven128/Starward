import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { createServer } from "node:http";
import test from "node:test";
import type { ContributionSubmission, ImportDraft } from "@starward/miniapp-contracts";
import { eraseContributionContent } from "./account-data-erasure.ts";
import { MiniappService } from "./miniapp-service.ts";
import {
  OPERATIONAL_JOB_KINDS,
  OutboxWorkerRuntime,
  runOutboxOnce,
} from "./outbox-worker.ts";
import { PostgresMiniappRepository } from "./postgres-repository.ts";
import { createTestRuntimeConfig } from "./runtime-config.ts";
import { insertExplicitTestSpot } from "./test-fixtures/infrastructure-spot.ts";
import { DeterministicWeatherTestAdapter } from "./test-fixtures/deterministic-weather-adapter.ts";
import type { WeatherPort } from "./ports.ts";
import {
  AstronomicalEventCatalogOwner,
  EVENT_CATALOG_SCHEMA_VERSION,
} from "./astronomical-event-catalog-owner.ts";
import { PostgresAstronomicalEventCatalogStore } from "./postgres-astronomical-event-catalog-store.ts";
import { PostgresVendorUsageStore, readVendorUsageBudget, readVendorUsageCosts } from "./postgres-vendor-usage.ts";
import { createVendorUsageTransport } from "./vendor-usage.ts";

const databaseUrl = process.env.DATABASE_URL?.trim();
const redisUrl = process.env.REDIS_URL?.trim();

function digest(value: unknown) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
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
      mediaStorage: {
        mode: "LOCAL_FILESYSTEM",
        root: process.env.MINIAPP_MEDIA_STORAGE_ROOT ?? null,
        maxUploadBytes: 1_200_000,
      },
      cachePrefix: "starward:miniapp:integration:" + runId + ":",
      autoMigrate: true,
    });
    const firstRepository =
      await new PostgresMiniappRepository(databaseUrl).initialize({
        migrate: true,
      });
    const eventSourceId = `source:integration-events-${runId}`;
    const eventCatalogVersion = `integration-events-${runId}`;
    const eventStore = new PostgresAstronomicalEventCatalogStore(firstRepository.pool);
    await eventStore.upsertSourceConfig({
      sourceId: eventSourceId,
      provider: "隔离事件目录集成测试",
      endpoint: "https://example.com/starward-event-catalog.json",
      enabled: true,
      parserVersion: "integration-parser-1",
      schemaVersion: EVENT_CATALOG_SCHEMA_VERSION,
      autoPublishEligible: true,
      approvedBaselineVersion: "builtin-reviewed-2026.1",
      termsUrl: "https://example.com/terms",
      coverage: "隔离数据库事务测试，不构成生产天象资料",
    }, "admin:integration");
    const eventOwner = await new AstronomicalEventCatalogOwner(eventStore).initialize();
    const eventBaseline = eventOwner.snapshot();
    const firstEvent = eventBaseline.events[0]!;
    const integratedEventName = `${firstEvent.displayName}（数据库集成）`;
    const eventImport = await eventOwner.importCandidate({
      sourceId: eventSourceId,
      trigger: "SCHEDULED",
      actorId: "admin:scheduled-ingestion",
      package: {
        ...eventBaseline,
        catalogVersion: eventCatalogVersion,
        parserVersion: "integration-parser-1",
        events: eventBaseline.events.map(event => event.occurrenceId === firstEvent.occurrenceId
          ? { ...event, displayName: integratedEventName }
          : event),
      },
    });
    assert.equal(eventImport.state, "AUTO_PUBLISH_ELIGIBLE");
    const eventPublication = await eventOwner.publishCandidate({
      candidateId: eventImport.candidate!.candidateId,
      actorId: "admin:integration",
      reason: "验证事件目录原子发布与重启读回",
    });
    assert.equal(eventPublication.catalogVersion, eventCatalogVersion);
    const reloadedEventOwner = await new AstronomicalEventCatalogOwner(eventStore).initialize();
    assert.equal(reloadedEventOwner.find(firstEvent.occurrenceId)?.displayName, integratedEventName);
    const eventAudit = await firstRepository.pool.query<{ action: string }>(
      `SELECT action FROM audit_logs
        WHERE subject_type='ASTRONOMICAL_EVENT_CATALOG' AND subject_id=$1
        ORDER BY occurred_at DESC LIMIT 1`,
      [eventCatalogVersion],
    );
    assert.equal(eventAudit.rows[0]?.action, "EVENT_CATALOG_PUBLISH");
    const eventRollback = await reloadedEventOwner.rollback({
      catalogVersion: eventBaseline.catalogVersion,
      actorId: "admin:integration",
      reason: "验证内置基线回滚创建追加版本",
    });
    assert.match(eventRollback.catalogVersion, new RegExp(`^${eventBaseline.catalogVersion.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&")}\\.rollback\\.`));
    assert.equal(reloadedEventOwner.find(firstEvent.occurrenceId)?.displayName, firstEvent.displayName);
    await assert.rejects(
      firstRepository.pool.query(
        "UPDATE astronomical_event_catalog_publications SET reason='tampered' WHERE catalog_version=$1",
        [eventCatalogVersion],
      ),
      /event_catalog_publication_immutable/u,
    );
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
    const candidateRow = (await firstRepository.adminListSpots()).find(
      (row) => row.spot_id === candidate.detail.spot.spotId,
    );
    assert.ok(candidateRow);
    await assert.rejects(
      firstRepository.adminChangeSpotLifecycle({
        spotId: candidate.detail.spot.spotId,
        action: "PUBLISH",
        expectedSpotRevision: candidateRow.version,
        reason: "验证资料不足时正式发布命令失败",
        actorId: "admin:integration",
        requestId: `candidate-publish:${runId}`,
        idempotencyKey: `candidate-publish:${runId}`,
      }),
      /spot_publication_completeness_invalid/u,
    );
    const spot = await insertExplicitTestSpot(firstRepository);
    const newPlaceTarget = await insertExplicitTestSpot(firstRepository, {
      spotId: `spot:integration-new-place-${runId}`,
      status: "DATA_INSUFFICIENT",
    });
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
        const nicknameInput = { nickname: "数据库昵称", expectedRevision: 1 };
        const nicknameSaves = await Promise.all([0, 1].map(() => first.saveAccountNickname(firstIdentity.userId, nicknameInput, "infra:nickname:" + runId)));
        assert.deepEqual(nicknameSaves[0]!.data, nicknameSaves[1]!.data);
        assert.equal(nicknameSaves[0]!.data.revision, 2);
        await assert.rejects(first.saveAccountNickname(firstIdentity.userId, { ...nicknameInput, nickname: "过期修改" }, "infra:nickname:stale:" + runId), /revision_conflict/);
        assert.equal((await first.getAccountProfile(secondIdentity.userId)).data.nickname, null);
        const profileInput = { platform: "OTHER" as const, displayName: "Isolated profile replay", url: "https://example.com/profile-replay", visibility: "PRIVATE" as const, sortOrder: 0 };
        const profile = await first.saveProfileLink(firstIdentity.userId, profileInput, `infra:profile:${runId}`);
        const replayedProfile = await first.saveProfileLink(firstIdentity.userId, profileInput, `infra:profile:${runId}`);
        assert.deepEqual(replayedProfile.data, profile.data);
        const competing = await Promise.allSettled(["a", "b"].map(suffix => first.saveProfileLink(
          firstIdentity.userId, { ...profileInput, url: "https://example.com/profile-concurrent" }, `infra:profile:concurrent:${suffix}:${runId}`,
        )));
        assert.equal(competing.filter(result => result.status === "fulfilled").length, 1);
        const duplicate = competing.find(result => result.status === "rejected");
        assert.ok(duplicate?.status === "rejected" && /profile_link_duplicate/.test(String(duplicate.reason)));
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
        const planOrigin = await first.resolveObservationContext({
          location: {
            kind: "MAP_POINT",
            displayName: "集成验收地图中心",
            wgs84: {
              latitude: 22.5431,
              longitude: 114.0579,
              system: "WGS84",
            },
            source: "MAP_VIEWPORT",
            timezoneHint: "Asia/Shanghai",
          },
          localDate: "2026-08-06",
        });
        const planInput = {
            reminders: [{ reminderId: "r-one", title: "设备", hoursBeforeDeparture: 0.5, notifyOnWechat: false, items: [{ itemId: "battery", text: "备用电池", completed: true }] }],
            planId: ("plan:" + runId) as never,
            spotId: spot.spotId,
            observationContextId: planOrigin.data.contextId,
            localDate: "2026-08-06",
            localTime: "23:40",
            timing: { endLocalDate: "2026-08-07", endLocalTime: "03:00", departureLocalDate: "2026-08-06", departureLocalTime: "20:00" },
            eventOccurrenceIds: ["event-occurrence:007-per:2026"],
            notes: "restart readback",
            travel: { origin: "平台所选出发地", mode: "TRANSIT" as const, originLocation: {
              source: "WECHAT_CHOOSE_LOCATION" as const, address: "隔离测试地址",
              wgs84: { system: "WGS84" as const, latitude: 22.54, longitude: 114.05 } } },
            expectedRevision: null,
          };
        const planSaves = await Promise.all(Array.from({ length: 3 }, () =>
          first.savePlan(firstIdentity.userId, planInput, "infra:plan:" + runId)));
        for (const result of planSaves) assert.deepEqual(result.data, planSaves[0]!.data);
        assert.deepEqual(planSaves[0]!.data.eventOccurrenceIds, ["event-occurrence:007-per:2026"]);
        assert.deepEqual(planSaves[0]!.data.travel, planInput.travel);
        await assert.rejects(first.savePlan(firstIdentity.userId,
          { ...planInput, notes: "must not overwrite an existing plan" }, "infra:plan:duplicate-create:" + runId), /plan_revision_conflict/);
        assert.deepEqual((await first.repository.listPlans(firstIdentity.userId))[0], planSaves[0]!.data);
        const completionInput = { reminderId: "r-one", itemId: "battery", completed: false, expectedRevision: planSaves[0]!.data.revision };
        const completionSaves = await Promise.all(Array.from({ length: 3 }, () => first.setPlanChecklistCompletion(firstIdentity.userId, planInput.planId, completionInput, "infra:checklist:" + runId)));
        for (const result of completionSaves) assert.deepEqual(result.data, completionSaves[0]!.data);
        assert.equal(completionSaves[0]!.data.revision, completionInput.expectedRevision + 1);
        assert.equal(completionSaves[0]!.data.reminders?.[0]?.items[0]?.completed, false);
        assert.deepEqual(completionSaves[0]!.data.contextSnapshot, planSaves[0]!.data.contextSnapshot);
        await assert.rejects(first.setPlanChecklistCompletion(firstIdentity.userId, planInput.planId, { ...completionInput, completed: true }, "infra:checklist:" + runId), /idempotency_conflict/);
        assert.ok(first.repository instanceof PostgresMiniappRepository);
        const newPlaceRepository = first.repository;
        const newPlaceDraft = await first.createContributionDraft(firstIdentity.userId, {
          kind: "NEW_SPOT_PROPOSAL",
          spotId: null,
          candidateLocation: {
            displayName: "隔离新地点候选",
            region: "隔离测试区域",
            wgs84: newPlaceTarget.wgs84,
          },
          observedAt: null,
          topics: [],
          detail: "隔离数据库新地点审核、合并和发布事务测试。",
          rightsConfirmed: false,
          preciseLocationConsent: true,
          candidateProfile: {
            fields: {
              name: "隔离新地点正式名称",
              address: "隔离测试区域的结构化地址",
              openness: "开放",
              access: "允许进入",
              road: "隔离测试末段道路说明",
              safety: "隔离测试夜间安全说明",
            },
            media: {},
          },
        }, `infra:new-place-draft:${runId}`);
        const newPlaceSubmitted = await first.submitContribution(
          firstIdentity.userId,
          newPlaceDraft.data.submissionId,
          newPlaceDraft.data.revision,
          `infra:new-place-submit:${runId}`,
        );
        const newPlaceCaseId = `moderation:${newPlaceSubmitted.data.submissionId}`;
        await newPlaceRepository.adminResolveModeration({
          caseId: newPlaceCaseId,
          resolution: "APPROVED",
          reason: "隔离测试核对新地点结构化字段与坐标",
          actorId: "admin:integration",
          requestId: `new-place-review:${runId}`,
          expectedRevision: newPlaceSubmitted.data.revision,
        });
        const targetBeforeMerge = (await newPlaceRepository.adminListSpots()).find(row => row.spot_id === newPlaceTarget.spotId);
        assert.ok(targetBeforeMerge);
        const newPlaceMerged = await newPlaceRepository.adminMergeContributionEvidence({
          caseId: newPlaceCaseId,
          spotId: newPlaceTarget.spotId,
          confirmedClaims: ["SPOT_DETAILS", "ACCESS_OPENNESS", "ACCESS_LEGAL_ENTRY", "ACCESS_LAST_ROAD", "SAFETY_NIGHT"],
          reason: "隔离测试把已核对的新地点资料合并到同坐标规范候选",
          actorId: "admin:integration",
          requestId: `new-place-merge:${runId}`,
          expectedSubmissionRevision: newPlaceSubmitted.data.revision + 1,
          expectedSpotRevision: targetBeforeMerge.version,
          idempotencyKey: `new-place-merge:${runId}`,
        });
        assert.equal(newPlaceMerged.contribution.spotId, newPlaceTarget.spotId);
        assert.equal(newPlaceMerged.contribution.mergeState, "MERGED");
        const targetAfterMerge = (await newPlaceRepository.adminListSpots()).find(row => row.spot_id === newPlaceTarget.spotId);
        assert.ok(targetAfterMerge);
        const newPlaceAssessment = await newPlaceRepository.adminAssessPublication({
          spotId: newPlaceTarget.spotId,
          expectedSpotRevision: targetAfterMerge.version,
          reason: "隔离测试新地点发布前独立重评估",
          actorId: "admin:integration",
          requestId: `new-place-assess:${runId}`,
          idempotencyKey: `new-place-assess:${runId}`,
        });
        assert.equal(newPlaceAssessment.result.complete, true);
        await newPlaceRepository.adminChangeSpotLifecycle({
          spotId: newPlaceTarget.spotId,
          action: "PUBLISH",
          expectedSpotRevision: targetAfterMerge.version,
          assessmentDigest: newPlaceAssessment.result.assessmentDigest,
          reason: "隔离测试显式发布新地点并推进贡献状态",
          actorId: "admin:integration",
          requestId: `new-place-publish:${runId}`,
          idempotencyKey: `new-place-publish:${runId}`,
        });
        const newPlacePublished = (await first.listContributions(firstIdentity.userId)).data.submissions.find(item => item.submissionId === newPlaceSubmitted.data.submissionId);
        assert.equal(newPlacePublished?.publicationImpact, "SPOT_PUBLISHED");
        assert.equal(newPlacePublished?.spotId, newPlaceTarget.spotId);
        assert.equal((await first.repository.getSpot(newPlaceTarget.spotId))?.name, "隔离新地点正式名称");
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
            rightsConfirmed: true,
            preciseLocationConsent: false,
          },
          "infra:contribution-draft:" + runId,
        );
        const recoveryDraft = await first.createContributionDraft(firstIdentity.userId, {
          kind: "CORRECTION", spotId: spot.spotId, candidateLocation: null,
          observedAt: null, topics: ["NIGHT_SAFETY"],
          detail: "隔离数据库上传恢复测试，不构成真实地点事实或发布证据。",
          rightsConfirmed: true, preciseLocationConsent: false,
        }, `infra:recovery-draft:${runId}`);
        let recovery = recoveryDraft.data;
        for (let slot = 0; slot < 3; slot++) {
          const input = { originalName: "recovery.png", mimeType: "image/png" as const, byteSize: 32, expectedRevision: recovery.revision };
          recovery = (await first.createContributionUpload(firstIdentity.userId, recovery.submissionId, input, `infra:recovery:${runId}:${slot}`)).data;
          if (slot === 2) assert.deepEqual((await first.createContributionUpload(firstIdentity.userId, recovery.submissionId, input, `infra:recovery:${runId}:${slot}`)).data, recovery);
        }
        await first.repository.expireContributionUploads(new Date(Date.parse(recovery.media[2]!.expiresAt) + 1000).toISOString());
        recovery = (await first.repository.getContribution(firstIdentity.userId, recovery.submissionId))!;
        const replaceInput = { originalName: "replacement.png", mimeType: "image/png" as const, byteSize: 32, expectedRevision: recovery.revision, replaceUploadId: recovery.media[1]!.uploadId };
        const replacement = (await first.createContributionUpload(firstIdentity.userId, recovery.submissionId, replaceInput, `infra:replacement:${runId}`)).data;
        assert.equal(replacement.media.length, 3);
        assert.deepEqual(replacement.media[0], recovery.media[0]);
        assert.deepEqual(replacement.media[2], recovery.media[2]);
        assert.notEqual(replacement.media[1]!.uploadId, recovery.media[1]!.uploadId);
        assert.deepEqual((await first.createContributionUpload(firstIdentity.userId, recovery.submissionId, replaceInput, `infra:replacement:${runId}`)).data, replacement);
        const cleanupKey = `contributions/${"c".repeat(24)}/${String(replacement.media[1]!.uploadId).replace(/^upload:/u, "")}.png`;
        const readyRecovery = await first.repository.completeContributionUpload(firstIdentity.userId, replacement.submissionId, replacement.media[1]!.uploadId, {
          byteSize: 32, sha256: "c".repeat(64), objectKey: cleanupKey, uploadedAt: new Date().toISOString(),
        }, `infra:ready-remove:${runId}`);
        const removedRecovery = { data: await first.repository.removeContributionUpload(firstIdentity.userId, replacement.submissionId, replacement.media[1]!.uploadId, readyRecovery.revision, `infra:remove:${runId}`) };
        assert.deepEqual(removedRecovery.data.media, [replacement.media[0], replacement.media[2]]);
        assert.ok((await first.repository.expireContributionUploads(new Date().toISOString())).includes(cleanupKey));
        assert.ok((await first.repository.expireContributionUploads(new Date().toISOString())).includes(cleanupKey), "unacknowledged deletion remains retryable");
        await first.repository.acknowledgeContributionMediaDeletion([cleanupKey]);
        assert.equal((await first.repository.expireContributionUploads(new Date().toISOString())).includes(cleanupKey), false);
        assert.deepEqual((await first.removeContributionUpload(firstIdentity.userId, replacement.submissionId, replacement.media[1]!.uploadId, readyRecovery.revision, `infra:remove:${runId}`)).data, removedRecovery.data);
        await assert.rejects(first.removeContributionUpload(secondIdentity.userId, replacement.submissionId, replacement.media[0]!.uploadId, removedRecovery.data.revision, `infra:remove-other:${runId}`), /contribution_not_found/);
        const uploadSession = await first.createContributionUpload(
          firstIdentity.userId,
          draft.data.submissionId,
          {
            originalName: "integration-field.png",
            mimeType: "image/png",
            byteSize: 32,
            expectedRevision: draft.data.revision,
          },
          "infra:contribution-upload:" + runId,
        );
        const upload = uploadSession.data.media[0]!;
        assert.ok(first.repository instanceof PostgresMiniappRepository);
        const importInput = {
          platform: "OTHER" as const,
          originalUrl: "https://example.com/integration-proposal-identity",
          rightsConfirmed: true,
        };
        const concurrentImports = await Promise.all(Array.from({ length: 3 }, () =>
          first.createImportDraft(firstIdentity.userId, importInput, `infra:import:${runId}`)));
        let imported = concurrentImports[0]!.data;
        for (const result of concurrentImports) assert.deepEqual(result.data, imported);
        const importCount = await first.repository.pool.query(
          "SELECT count(*)::int AS count FROM external_post_imports WHERE user_id = $1 AND original_url = $2",
          [firstIdentity.userId, importInput.originalUrl],
        );
        assert.equal(importCount.rows[0].count, 1);
        let proposalId: string | null = null;
        const importReceipts: ImportDraft[] = [];
        for (const [index, stage] of ([
          "EDIT_DRAFT", "EDIT_DRAFT", "ASSOCIATE_SPOT", "PREVIEW",
        ] as const).entries()) {
          const updateInput = {
              expectedRevision: imported.revision,
              stage,
              title: "隔离测试提案身份",
              body: "验证连续保存不创建重复提案，不陈述真实地点事实。",
              spotId: null,
              createProposal: true,
            };
          const concurrentUpdates = await Promise.all(Array.from({ length: 3 }, () =>
            first.updateImportDraft(firstIdentity.userId, imported.importDraftId,
              updateInput, `infra:import-save:${runId}:${index}`)));
          imported = concurrentUpdates[0]!.data;
          importReceipts.push(imported);
          for (const result of concurrentUpdates) assert.deepEqual(result.data, imported);
          proposalId ??= imported.spotProposalId;
          assert.equal(imported.spotProposalId, proposalId);
          const proposals: { rows: { proposal_id: string }[] } = await first.repository.pool.query(
            "SELECT proposal_id FROM spot_proposals WHERE payload->>'sourceImportId' = $1",
            [imported.importDraftId],
          );
          assert.deepEqual(proposals.rows, [{ proposal_id: proposalId }]);
        }
        const completed = await first.repository.completeContributionUpload(
          firstIdentity.userId,
          draft.data.submissionId,
          upload.uploadId,
          {
            byteSize: 32,
            sha256: "a".repeat(64),
            objectKey: `contributions/${"b".repeat(24)}/${String(upload.uploadId).replace(/^upload:/u, "")}.png`,
            uploadedAt: new Date().toISOString(),
          },
          "infra:contribution-upload-complete:" + runId,
        );
        const submitted = await first.submitContribution(
          firstIdentity.userId,
          draft.data.submissionId,
          completed.revision,
          "infra:contribution-submit:" + runId,
        );
        assert.equal(submitted.data.state, "PENDING_REVIEW");
        assert.equal(submitted.data.attempts.length, 1);
        assert.deepEqual((await first.submitContribution(firstIdentity.userId, draft.data.submissionId, completed.revision, "infra:contribution-submit:" + runId)).data, submitted.data);
        const caseId = `moderation:${submitted.data.submissionId}`;
        const requested = await first.repository.adminRequestContributionChanges({
          caseId,
          reason: "请补充复核后的返程道路情况",
          expectedRevision: submitted.data.revision,
          actorId: "admin:integration",
          requestId: `contribution-request-changes:${runId}`,
          idempotencyKey: `contribution-request-changes:${runId}`,
        });
        const rejected = requested.readback.submission!;
        assert.equal(rejected.attempts[0]?.review?.resolution, "CHANGES_REQUESTED");
        const revised = await first.updateContributionDraft(firstIdentity.userId, submitted.data.submissionId, {
          kind: "FIELD_REPORT", spotId: spot.spotId, candidateLocation: null,
          observedAt: draft.data.observedAt, topics: ["NIGHT_SAFETY", "LAST_ROAD"],
          detail: "隔离数据库现场反馈已补充：返程道路可以通行，但末段没有照明，需要结伴并携带头灯。",
          rightsConfirmed: true, preciseLocationConsent: false,
          expectedRevision: rejected.revision,
        }, `infra:contribution-revise:${runId}`);
        const resubmitted = await first.submitContribution(firstIdentity.userId, submitted.data.submissionId, revised.data.revision, `infra:contribution-resubmit:${runId}`);
        assert.equal(resubmitted.data.attempts.length, 2);
        assert.equal(resubmitted.data.attempts[0]?.snapshot.detail, submitted.data.detail);
        assert.equal(resubmitted.data.attempts[1]?.snapshot.detail, revised.data.detail);
        assert.equal(resubmitted.data.review, null);
        assert.deepEqual(
          (await first.listContributions(secondIdentity.userId)).data
            .submissions,
          [],
        );
        const beforeReview = await first.repository.getSpot(spot.spotId);
        assert.equal(beforeReview?.status, "PUBLISHED");
        await first.repository.adminResolveModeration({
          caseId,
          resolution: "APPROVED",
          reason: "集成测试管理员确认该现场材料可进入规范事实合并",
          actorId: "admin:integration",
          requestId: `contribution-review:${runId}`,
          expectedRevision: resubmitted.data.revision,
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
        const mergedRow = (await first.repository.adminListSpots()).find(
          (row) => row.spot_id === spot.spotId,
        );
        assert.ok(mergedRow);
        const reassessment = await first.repository.adminAssessPublication({
          spotId: spot.spotId,
          expectedSpotRevision: mergedRow.version,
          reason: "合并后由正式发布门重新评估规范记录",
          actorId: "admin:integration",
          requestId: `contribution-reassess:${runId}`,
          idempotencyKey: `contribution-reassess:${runId}`,
        });
        assert.equal(reassessment.result.complete, true);
        const republished = await first.repository.adminChangeSpotLifecycle({
          spotId: spot.spotId,
          action: "PUBLISH",
          expectedSpotRevision: mergedRow.version,
          assessmentDigest: reassessment.result.assessmentDigest,
          reason: "集成测试显式发布；证明合并审核没有自动替代发布动作",
          actorId: "admin:integration",
          requestId: `contribution-republish:${runId}`,
          idempotencyKey: `contribution-republish:${runId}`,
        });
        assert.equal(republished.result.status, "PUBLISHED");
        const formalBaseline = (await first.getContributionFormalBaseline(spot.spotId)).data;
        const formalIntent = await first.repository.saveFormalUploadIntent(secondIdentity.userId, {
          intentId: `formal-upload-intent:${randomUUID()}`, spotId: spot.spotId,
          baselineRevision: formalBaseline.revision, uploads: [], revision: 1,
          createdAt: new Date().toISOString(), expiresAt: new Date(Date.now()+20*60_000).toISOString(),
        }, `infra:formal-intent:${runId}`);
        const formalUpload = {
          uploadId: `upload:${randomUUID()}` as never, kind: "site" as const, state: "PENDING" as const,
          originalName: "formal-site.png", mimeType: "image/png" as const, declaredByteSize: 32,
          byteSize: null, sha256: null, createdAt: new Date().toISOString(), expiresAt: formalIntent.expiresAt, uploadedAt: null,
        };
        const formalWithSlot = await first.repository.createFormalContributionUpload(secondIdentity.userId, formalIntent.intentId, formalUpload, formalIntent.revision, `infra:formal-upload:${runId}`);
        const formalObjectKey = `contributions/${"d".repeat(24)}/${String(formalUpload.uploadId).replace(/^upload:/u, "")}.png`;
        const formalReady = await first.repository.completeFormalContributionUpload(secondIdentity.userId, formalIntent.intentId, formalUpload.uploadId, {
          byteSize: 32, sha256: "d".repeat(64), objectKey: formalObjectKey, uploadedAt: new Date().toISOString(),
        }, `infra:formal-complete:${runId}`);
        const formalSubmitted = await first.submitFormalContribution(secondIdentity.userId, {
          kind: "CORRECTION", baseline: formalBaseline,
          proposal: { fields: {
            hours: "19:00—次日05:00",
            road: "北侧停车区进入，末段步行 80 米",
            accessNote: "",
            safety: "临水边缘无护栏，夜间需要结伴",
            parking: "季节性开放",
            parkingNote: "入口外 80 米，雨季关闭",
            toilet: "季节性开放",
            toiletNote: "冬季关闭",
            platform: "硬化平台，可摆放三脚架",
            signal: "4G 信号较弱",
            camping: "仅可临时停留，不可过夜",
          }, media: { site: [...formalBaseline.media.site, formalUpload.uploadId] } },
          observedAt: null, rightsConfirmed: true, uploadIntentId: formalReady.intentId, expectedUploadIntentRevision: formalReady.revision,
        }, `infra:formal-submit:${runId}`);
        assert.equal(formalSubmitted.data.state, "SUBMITTED");
        const formalContributionId = formalSubmitted.data.state === "SUBMITTED" ? formalSubmitted.data.submission.submissionId : null;
        if (formalSubmitted.data.state !== "SUBMITTED") throw new Error("formal_submission_missing");
        const formalCaseId = `moderation:${formalSubmitted.data.submission.submissionId}`;
        assert.equal((await first.repository.adminGetMediaReview(formalUpload.uploadId))?.submissionId, formalContributionId);
        const formalMediaReviewed = await first.repository.adminReviewContributionMedia({
          uploadId: formalUpload.uploadId, caseId: formalCaseId, decision: "ACCEPTED",
          reason: "正式反馈现场照片内容与授权均已核验",
          expectedRevision: formalSubmitted.data.submission.revision,
          actorId: "admin:integration", requestId: `formal-media-review:${runId}`,
          idempotencyKey: `formal-media-review:${runId}`,
        });
        assert.equal(formalMediaReviewed.result.decision, "ACCEPTED");
        const formalApproved = await first.repository.adminResolveModeration({
          caseId: formalCaseId, resolution: "APPROVED",
          reason: "集成测试核准开放时段纠错",
          actorId: "admin:integration", requestId: `formal-review:${runId}`,
          expectedRevision: formalMediaReviewed.receipt.resultingRevision!,
        });
        const formalMerged = await first.repository.adminMergeContributionEvidence({
          caseId: formalCaseId, spotId: spot.spotId,
          confirmedClaims: ["ACCESS_OPENNESS", "ACCESS_LAST_ROAD", "ACCESS_LEGAL_ENTRY", "SAFETY_NIGHT", "ACCESS_PARKING", "FACILITY_STATUS", "SITE_MEDIA_PROVENANCE"],
          reason: "将审核通过的正式字段写入规范地点修订",
          actorId: "admin:integration", requestId: `formal-merge:${runId}`,
          expectedSubmissionRevision: formalApproved.result.submission!.revision,
          expectedSpotRevision: formalBaseline.revision,
          idempotencyKey: `formal-merge:${runId}`,
        });
        assert.equal(formalMerged.detail.formalFacts?.hours, "19:00—次日05:00");
        assert.equal(formalMerged.detail.route.lastRoad, "北侧停车区进入，末段步行 80 米");
        assert.deepEqual(formalMerged.detail.accessAndSafety.restrictions, []);
        assert.deepEqual(formalMerged.detail.accessAndSafety.guidance, ["临水边缘无护栏，夜间需要结伴"]);
        assert.equal(formalMerged.detail.spot.facilities.find(item => item.type === "PARKING")?.status, "SEASONAL");
        assert.equal(formalMerged.detail.spot.facilities.find(item => item.type === "TOILET")?.detail, "冬季关闭");
        assert.equal(formalMerged.detail.spot.facilities.find(item => item.type === "SIGNAL")?.detail, "4G 信号较弱");
        assert.equal(formalMerged.detail.spot.facilities.find(item => item.type === "CAMPING")?.detail, "仅可临时停留，不可过夜");
        assert.equal(formalMerged.detail.formalMedia?.site?.includes(formalUpload.uploadId), true);
        const formalMergedRow = (await first.repository.adminListSpots()).find(row => row.spot_id === spot.spotId)!;
        const formalAssessment = await first.repository.adminAssessPublication({
          spotId: spot.spotId, expectedSpotRevision: formalMergedRow.version,
          reason: "正式字段合并后重新评估",
          actorId: "admin:integration", requestId: `formal-assess:${runId}`, idempotencyKey: `formal-assess:${runId}`,
        });
        await first.repository.adminChangeSpotLifecycle({
          spotId: spot.spotId, action: "PUBLISH", expectedSpotRevision: formalMergedRow.version,
          assessmentDigest: formalAssessment.result.assessmentDigest,
          reason: "正式字段合并后重新发布测试点",
          actorId: "admin:integration", requestId: `formal-republish:${runId}`, idempotencyKey: `formal-republish:${runId}`,
        });
        const mergedFormalBaseline = (await first.getContributionFormalBaseline(spot.spotId)).data;
        assert.equal(mergedFormalBaseline.fields.hours, "19:00—次日05:00");
        assert.equal(mergedFormalBaseline.media.site.includes(formalUpload.uploadId), true);
        const expiryIntent = await first.repository.saveFormalUploadIntent(firstIdentity.userId, {
          intentId: `formal-upload-intent:${randomUUID()}`, spotId: spot.spotId,
          baselineRevision: formalBaseline.revision, uploads: [], revision: 1,
          createdAt: new Date().toISOString(), expiresAt: new Date(Date.now()+20*60_000).toISOString(),
        }, `infra:formal-expiry-intent:${runId}`);
        const expiryUpload = {
          ...formalUpload,
          uploadId: `upload:${randomUUID()}` as never,
          expiresAt: expiryIntent.expiresAt,
        };
        const expirySlot = await first.repository.createFormalContributionUpload(firstIdentity.userId, expiryIntent.intentId, expiryUpload, expiryIntent.revision, `infra:formal-expiry-upload:${runId}`);
        const expiryObjectKey = `contributions/${"e".repeat(24)}/${String(expiryUpload.uploadId).replace(/^upload:/u, "")}.png`;
        await first.repository.completeFormalContributionUpload(firstIdentity.userId, expiryIntent.intentId, expiryUpload.uploadId, {
          byteSize: 32, sha256: "e".repeat(64), objectKey: expiryObjectKey, uploadedAt: new Date().toISOString(),
        }, `infra:formal-expiry-complete:${runId}`);
        assert.deepEqual(await first.repository.expireContributionUploads(new Date(Date.parse(expirySlot.expiresAt)+1).toISOString()), [expiryObjectKey]);
        assert.equal((await first.repository.getFormalUploadIntent(firstIdentity.userId, expiryIntent.intentId))?.uploads[0]?.state, "EXPIRED");
        await first.repository.acknowledgeContributionMediaDeletion([expiryObjectKey]);
        assert.deepEqual(await first.repository.expireContributionUploads(new Date(Date.parse(expirySlot.expiresAt)+2).toISOString()), []);
        return {
          firstIdentity,
          secondIdentity,
          profileInput,
          profile: profile.data,
          planInput,
          planReceipt: planSaves[0]!.data,
          completionInput,
          completionReceipt: completionSaves[0]!.data,
          saved,
          contributionId: submitted.data.submissionId,
          importId: imported.importDraftId,
          firstImportReceipt: importReceipts[0]!,
          proposalId,
          formalContributionId,
          formalUploadId: formalUpload.uploadId,
          formalObjectKey,
        };
      } finally {
        await first.onModuleDestroy();
      }
    })();
    const { firstIdentity, secondIdentity, saved, contributionId } = firstRun;

    const restarted = await MiniappService.createFromEnvironment();
    try {
      const persistedNickname = (await restarted.getAccountProfile(firstIdentity.userId)).data;
      assert.equal(persistedNickname.nickname, "数据库昵称");
      assert.equal(persistedNickname.revision, 2);
      assert.deepEqual((await restarted.saveAccountNickname(firstIdentity.userId,
        { nickname: "数据库昵称", expectedRevision: 1 }, "infra:nickname:" + runId)).data, persistedNickname);
      const originalContextGet = restarted.observationContexts.get;
      restarted.observationContexts.get = async () => { throw new Error("context_unavailable_for_replay_test"); };
      try {
        const replay = await restarted.savePlan(firstIdentity.userId, firstRun.planInput, "infra:plan:" + runId);
        assert.deepEqual(replay.data, firstRun.planReceipt);
        assert.deepEqual((await restarted.repository.listPlans(firstIdentity.userId))[0], firstRun.completionReceipt);
        assert.deepEqual(firstRun.completionReceipt.eventOccurrenceIds, ["event-occurrence:007-per:2026"]);
        assert.deepEqual((await restarted.setPlanChecklistCompletion(firstIdentity.userId, firstRun.planInput.planId, firstRun.completionInput, "infra:checklist:" + runId)).data, firstRun.completionReceipt);
        assert.equal((await restarted.repository.listPlans(firstIdentity.userId)).length, 1);
        await assert.rejects(restarted.savePlan(secondIdentity.userId, firstRun.planInput, "infra:plan:" + runId), /context_unavailable_for_replay_test/);
        await assert.rejects(restarted.savePlan(firstIdentity.userId, firstRun.planInput, "infra:plan:new:" + runId), /context_unavailable_for_replay_test/);
      } finally { restarted.observationContexts.get = originalContextGet; }
      const restartedProfile = await restarted.saveProfileLink(firstIdentity.userId, firstRun.profileInput, `infra:profile:${runId}`);
      assert.deepEqual(restartedProfile.data, firstRun.profile);
      const restoredImport = (await restarted.getImportDraft(
        firstIdentity.userId, firstRun.importId,
      )).data;
      assert.equal(restoredImport.spotProposalId, firstRun.proposalId);
      assert.equal(restoredImport.stage, "PREVIEW");
      const oldImportInput = {
        expectedRevision: 1, stage: "EDIT_DRAFT" as const,
        title: "隔离测试提案身份",
        body: "验证连续保存不创建重复提案，不陈述真实地点事实。",
        spotId: null, createProposal: true,
      };
      const lateImportReplay = await restarted.updateImportDraft(firstIdentity.userId,
        firstRun.importId, oldImportInput, `infra:import-save:${runId}:0`);
      assert.deepEqual(lateImportReplay.data, firstRun.firstImportReceipt);
      assert.deepEqual((await restarted.getImportDraft(firstIdentity.userId, firstRun.importId)).data, restoredImport);
      await assert.rejects(restarted.updateImportDraft(secondIdentity.userId,
        firstRun.importId, oldImportInput, `infra:import-save:${runId}:0`), /import_draft_not_found/);
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
      assert.deepEqual(
        (await restarted.getPlans(firstIdentity.userId)).data.plans[0]?.eventOccurrenceIds,
        ["event-occurrence:007-per:2026"],
      );
      const contributions = await restarted.listContributions(
        firstIdentity.userId,
      );
      assert.equal(contributions.data.submissions[0]?.submissionId, contributionId);
      assert.equal(contributions.data.submissions[0]?.state, "APPROVED");
      const formalContributions = await restarted.listContributions(secondIdentity.userId);
      assert.equal(formalContributions.data.submissions[0]?.submissionId, firstRun.formalContributionId);
      assert.equal(formalContributions.data.submissions[0]?.attempts[0]?.snapshot.media[0]?.state, "ATTACHED");
      const exported = await restarted.exportAccountData(firstIdentity.userId);
      assert.equal(
        exported.data.schemaVersion,
        "starward-account-data-export-v1",
      );
      assert.equal(exported.data.account.userId, firstIdentity.userId);
      assert.equal(exported.data.contributions[0]?.submissionId, contributionId);
      const deletion = await restarted.deleteAccount(
        firstIdentity.userId,
        { confirmation: "DELETE_ACCOUNT" },
        "infra:account-delete:" + runId,
      );
      assert.equal(deletion.data.accountState, "DELETED");
      assert.equal(deletion.data.sessionsRevoked, true);
      await assert.rejects(
        restarted.auth.requirePrincipal(`Bearer ${firstIdentity.accessToken}`),
        /auth_required/u,
      );
      assert.deepEqual(
        (await restarted.getFavorites(secondIdentity.userId)).data.favorites,
        [],
      );
      assert.ok(restarted.repository instanceof PostgresMiniappRepository);
      const pool = restarted.repository.pool;
      const retained = await pool.query<{ user_id: string; payload: Record<string, unknown> }>(
        "SELECT user_id, payload FROM user_submissions WHERE submission_id = $1", [contributionId]);
      assert.equal(retained.rowCount, 1, "audit relationships must survive erasure");
      assert.match(retained.rows[0]!.user_id, /^erased:/u);
      assert.notEqual(retained.rows[0]!.user_id, firstIdentity.userId);
      assert.equal(retained.rows[0]!.payload.detail, "");
      assert.equal(retained.rows[0]!.payload.candidateLocation, null);
      assert.equal(retained.rows[0]!.payload.observedAt, null);
      assert.deepEqual(retained.rows[0]!.payload.media, []);
      const revisionRows = await pool.query<{ payload: Record<string, unknown>; payload_digest: string }>(
        "SELECT payload, payload_digest FROM contribution_revisions WHERE submission_id = $1", [contributionId]);
      assert.ok(revisionRows.rows.length > 0);
      for (const revision of revisionRows.rows) {
        assert.equal(revision.payload.detail, "");
        assert.equal(revision.payload.candidateLocation, null);
        // PostgreSQL jsonb key ordering differs from JS serialization: compare
        // against the same explicit deletion projection, not database text.
        assert.equal(revision.payload_digest, digest(eraseContributionContent(
          revision.payload as unknown as ContributionSubmission, String(revision.payload.privacyErasedAt))));
      }
      const caseId = `moderation:${contributionId}`;
      await assert.rejects(pool.query(
        "UPDATE contribution_revisions SET payload_digest = 'forbidden' WHERE submission_id = $1", [contributionId]),
        /append_only_record_immutable/u);
      await assert.rejects(pool.query(
        "DELETE FROM contribution_revisions WHERE submission_id = $1", [contributionId]), /append_only_record_immutable/u);
      const erasedCase = await pool.query<{ payload: Record<string, unknown> }>(
        "SELECT payload FROM moderation_cases WHERE case_id = $1", [caseId]);
      assert.equal(erasedCase.rows[0]!.payload.canonicalMergeRequired, false);
      assert.doesNotMatch(JSON.stringify(erasedCase.rows), /隔离数据库现场反馈|contributorDigest|integration-field\.png/u);
      const audits = await pool.query(
        "SELECT before_payload, after_payload FROM audit_logs WHERE subject_id = $1", [caseId]);
      assert.ok(audits.rows.length > 0);
      assert.doesNotMatch(JSON.stringify(audits.rows), /隔离数据库现场反馈|integration-field\.png/u);
      const receipts = await pool.query<{ receipt_id: string }>(
        "SELECT receipt_id FROM operation_receipts WHERE readback_payload ? 'privacyErasedAt'");
      assert.ok(receipts.rows.length > 0);
      await assert.rejects(restarted.repository.adminReadReceipt(receipts.rows[0]!.receipt_id), /operation_receipt_privacy_erased/u);
      await assert.rejects(pool.query(
        "UPDATE user_submissions SET payload = payload || '{\"detail\":\"resurrected\"}'::jsonb WHERE submission_id = $1", [contributionId]),
        /contribution_account_deleted/u);
      await assert.rejects(pool.query(
        "UPDATE moderation_cases SET state = 'PENDING' WHERE case_id = $1", [caseId]), /contribution_account_deleted/u);
      assert.deepEqual((await restarted.repository.getSpot(spot.spotId))?.status, "PUBLISHED");
      const replay = await restarted.deleteAccount(firstIdentity.userId,
        { confirmation: "DELETE_ACCOUNT" }, "infra:account-delete:" + runId);
      assert.deepEqual(replay.data, deletion.data);
      const formalOwnerDeletion = await restarted.deleteAccount(secondIdentity.userId,
        { confirmation: "DELETE_ACCOUNT" }, "infra:account-delete:formal-owner:" + runId);
      assert.equal(formalOwnerDeletion.data.accountState, "DELETED");
      const canonicalFormalMedia = await pool.query<{ object_key: string }>(
        "SELECT object_key FROM spot_formal_reference_media WHERE upload_id=$1 AND spot_id=$2",
        [firstRun.formalUploadId, spot.spotId]);
      assert.equal(canonicalFormalMedia.rows[0]?.object_key, firstRun.formalObjectKey);
      const wronglyQueuedCanonicalMedia = await pool.query(
        "SELECT 1 FROM account_deletion_media_queue WHERE object_key=$1",
        [firstRun.formalObjectKey]);
      assert.equal(wronglyQueuedCanonicalMedia.rowCount, 0);
      await assert.rejects(
        restarted.getSpotContributionMedia(spot.spotId, firstRun.formalUploadId),
        /contribution_media_object_missing/,
      );
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
    const publicationWindows: { start: string; end: string }[] = [];
    const fixtureWeather = new DeterministicWeatherTestAdapter();
    const publicationWeather: WeatherPort = {
      key: "rolling-publication-fixture",
      async getHourly(input) {
        const result = await fixtureWeather.getHourly(input);
        if (!input.windowUtc) return result; // unrelated astronomy job
        publicationWindows.push(input.windowUtc);
        const start = Date.parse(input.windowUtc.start);
        assert.equal(Date.parse(input.windowUtc.end) - start, 24 * 3_600_000);
        assert.equal(start % 3_600_000, 0);
        assert.ok(Math.abs(Date.now() - start) < 3_600_000);
        return { ...result, value: Array.from({ length: 24 }, (_, index) => ({
          ...result.value![0]!, at: new Date(start + index * 3_600_000).toISOString(), cloudPercent: 70 + index,
        })) };
      },
    };
    const options = {
      databaseUrl,
      redisUrl,
      queueName,
      runtimeConfig: config,
      weather: publicationWeather,
    };
    // An explicit priced fixture above the retired ceiling must still produce
    // a durable COST result. Null must not be coerced to a zero-dollar limit.
    const costLedger = new PostgresMiniappRepository(databaseUrl);
    try {
      await costLedger.pool.query(`INSERT INTO vendor_call_usage
        (provider, operation, capability, status, latency_ms, estimated_cost_cny, cost_basis)
        VALUES ($1, 'BUDGET_REMOVAL', 'TEST', 'HTTP_RESPONSE', 0, 401, 'VERIFIED_ESTIMATE')`,
      [`TEST_BUDGET_${runId}`]);
    } finally { await costLedger.close(); }
    const snapshot = await runOutboxOnce(options);
    assert.equal(snapshot.pending, 0);
    assert.equal(snapshot.dead_letter, 0, JSON.stringify(snapshot.dead_letters));
    assert.ok(snapshot.scheduled >= OPERATIONAL_JOB_KINDS.length);
    assert.ok(snapshot.effects >= OPERATIONAL_JOB_KINDS.length);
    assert.ok(publicationWindows.length > 0, "WEATHER must supply its rolling window instead of borrowing the selected-night default");

    const runtime = new OutboxWorkerRuntime(options);
    try {
      const costOutcome = await runtime.pool.query<{ result_state: string; result_payload: { projectedMonthlyCny: number | null; hardMonthlyMax: number | null; knownEstimatedCostCny: number | null } }>(
        "SELECT result_state, result_payload FROM job_executions WHERE job_kind='COST' AND state='COMPLETE' ORDER BY completed_at DESC LIMIT 1");
      assert.equal(costOutcome.rows[0]?.result_state, "UNASSESSED", "a completed COST job cannot certify an unpriced or empty ledger as within budget");
      assert.equal(costOutcome.rows[0]?.result_payload.projectedMonthlyCny, null);
      assert.equal(costOutcome.rows[0]?.result_payload.hardMonthlyMax, null);
      assert.ok((costOutcome.rows[0]?.result_payload.knownEstimatedCostCny ?? 0) >= 401);
      const published = await runtime.pool.query<{ run_id: string; payload: { windowUtc: { start: string; end: string } } }>(
        "SELECT run_id, payload FROM weather_runs WHERE payload->>'providerKey' = $1 ORDER BY valid_from DESC LIMIT 1",
        [publicationWeather.key]);
      assert.deepEqual(published.rows[0]?.payload.windowUtc, publicationWindows[0]);
      const publishedHours = await runtime.pool.query<{ observed_at: Date; payload: { cloudPercent: number } }>(
        "SELECT observed_at, payload FROM weather_hourly WHERE run_id = $1 ORDER BY observed_at", [published.rows[0]!.run_id]);
      assert.equal(publishedHours.rows.length, 24);
      assert.equal(publishedHours.rows[0]!.observed_at.toISOString(), publicationWindows[0]!.start);
      assert.equal(publishedHours.rows.at(-1)!.observed_at.toISOString(),
        new Date(Date.parse(publicationWindows[0]!.end) - 3_600_000).toISOString());
      assert.deepEqual(publishedHours.rows.map(row => row.payload.cloudPercent), Array.from({ length: 24 }, (_, index) => 70 + index));
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
      const deletionQueue = await runtime.pool.query<{ count: string }>(
        "SELECT count(*)::text AS count FROM account_deletion_media_queue",
      );
      assert.equal(Number(deletionQueue.rows[0]!.count), 0);
      assert.ok(Number(effects.rows[0]!.opportunities) >= 1);
      assert.ok(Number(effects.rows[0]!.decisions) >= 1);
      assert.equal(Number(effects.rows[0]!.incomplete_results), 0);
    } finally {
      await runtime.close();
    }
  },
);

test("provider attempts commit before HTTP, survive caller rollback and use the Shanghai calendar month", { skip: !databaseUrl }, async () => {
  assert.ok(databaseUrl);
  const repository = await new PostgresMiniappRepository(databaseUrl).initialize({ migrate: true });
  const store = new PostgresVendorUsageStore(databaseUrl);
  const requestIds: string[] = [];
  const server = createServer(async (_request, response) => {
    const recorded = await repository.pool.query("SELECT status FROM vendor_call_usage WHERE request_id=$1", [requestIds.at(-1)]);
    response.writeHead(recorded.rows[0]?.status === "PENDING" ? 200 : 500, { "content-type": "application/json" });
    response.end(JSON.stringify({ value: 42 }));
  });
  await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
  const business = await repository.pool.connect();
  try {
    const address = server.address();
    assert.ok(address && typeof address !== "string");
    const fetchMetered = createVendorUsageTransport({
      async begin(attempt) { requestIds.push(attempt.requestId); await store.begin(attempt); },
      finish: (id, outcome) => store.finish(id, outcome),
    }, (_url, init) => fetch(`http://127.0.0.1:${address.port}/fixture`, init));
    await business.query("BEGIN");
    const response = await fetchMetered("https://test.qweatherapi.com/weather/v1/hourly/23.13/113.26?hours=24", {
      headers: { authorization: "Bearer fixture-not-a-user-credential" },
    });
    assert.equal(response.status, 200, "the independent connection must see a committed PENDING row before the request");
    assert.deepEqual(await response.json(), { value: 42 });
    await business.query("ROLLBACK");
    const persisted = await repository.pool.query("SELECT * FROM vendor_call_usage WHERE request_id=$1", [requestIds[0]]);
    assert.equal(persisted.rows[0]?.status, "HTTP_RESPONSE");
    assert.equal(persisted.rows[0]?.http_status, 200);
    assert.equal(persisted.rows[0]?.estimated_cost_cny, null);
    assert.doesNotMatch(JSON.stringify(persisted.rows), /23\.13|113\.26|fixture-not-a-user-credential/);

    // Break only this isolated test database's idle meter connection. The API
    // process must survive the asynchronous pg pool error and reconnect.
    const terminated = await repository.pool.query(`SELECT pg_terminate_backend(pid) AS terminated FROM pg_stat_activity
      WHERE datname=current_database() AND application_name='starward-miniapp-vendor-usage' AND state='idle'`);
    assert.ok(terminated.rows.some(row => row.terminated === true));
    await new Promise(resolve => setTimeout(resolve, 50));
    assert.equal((await fetchMetered("https://test.qweatherapi.com/weather/v1/hourly/23.13/113.26")).status, 200);
    const reconnected = await repository.pool.query("SELECT status FROM vendor_call_usage WHERE request_id=$1", [requestIds.at(-1)]);
    assert.equal(reconnected.rows[0]?.status, "HTTP_RESPONSE");

    // The source of these four synthetic rows is explicit and confined to the
    // runner-owned test DB. Legacy zero or any legacy estimate remains unverified.
    const provider = `TEST_MONTH_${randomUUID()}`;
    await repository.pool.query(`INSERT INTO vendor_call_usage
      (provider,operation,capability,status,latency_ms,estimated_cost_cny,occurred_at)
      SELECT $1,'BOUNDARY','TEST','LEGACY',0,amount,at FROM (VALUES
        ((date_trunc('month',now() AT TIME ZONE 'Asia/Shanghai') AT TIME ZONE 'Asia/Shanghai') - interval '1 millisecond',987),
        ((date_trunc('month',now() AT TIME ZONE 'Asia/Shanghai') AT TIME ZONE 'Asia/Shanghai'),0),
        (((date_trunc('month',now() AT TIME ZONE 'Asia/Shanghai') + interval '1 month') AT TIME ZONE 'Asia/Shanghai') - interval '1 millisecond',2),
        (((date_trunc('month',now() AT TIME ZONE 'Asia/Shanghai') + interval '1 month') AT TIME ZONE 'Asia/Shanghai'),654)
      ) AS boundary(at,amount)`, [provider]);
    const costs = (await readVendorUsageCosts(repository.pool)).find(row => row.provider === provider)!;
    assert.equal(costs.recorded_attempts, 2);
    assert.equal(costs.unpriced_attempts, 2);
    assert.equal(costs.unknown_outcomes, 2);
    assert.equal(costs.estimated_cost_cny, null);
    const adminCosts = (await repository.adminOperations()).costs.find(row => row.provider === provider)!;
    assert.equal(adminCosts.recorded_attempts, 2);
    const budget = await readVendorUsageBudget(repository.pool);
    assert.equal(budget.state, "UNASSESSED");
    assert.equal(budget.projectedMonthlyCny, null);
    assert.equal(budget.hardMonthlyMax, null);

    // A blocked INSERT must time out without allowing a late external send.
    await business.query("BEGIN");
    await business.query("LOCK TABLE vendor_call_usage IN ACCESS EXCLUSIVE MODE");
    let sent = false;
    const blocked = createVendorUsageTransport(store, async () => { sent = true; return new Response("{}"); });
    const before = Date.now();
    await assert.rejects(blocked("https://test.qweatherapi.com/weather/v1/hourly/23.13/113.26"), /record_unavailable/);
    assert.ok(Date.now() - before < 2_000);
    assert.equal(sent, false);
    await business.query("ROLLBACK");
    await new Promise(resolve => setTimeout(resolve, 30));
    assert.equal(sent, false);
  } finally {
    await business.query("ROLLBACK");
    business.release();
    server.closeAllConnections();
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
    await store.close();
    await repository.close();
  }
});
