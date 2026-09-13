import { randomUUID } from "node:crypto";
import type {
  AccountDeletionReceipt,
  ContributionId,
  ContributionMediaUpload,
  ContributionSubmission,
  ContributionFormalSubmitRequest,
  ContributionFormalUploadIntent,
  ContributionFormalMediaUpload,
  ContributionUploadId,
  ImportDraft,
  ObservationPlan,
  ProfileLink,
  SpotId,
  SpotSummary,
  UserId,
  UserPreferences,
} from "@starward/miniapp-contracts";
import {
  TEST_PUBLISHED_SPOT,
  buildTestSpotDetail,
} from "@starward/miniapp-contracts/test-fixtures";
import { distanceMeters } from "@starward/coordinate-system";
import type { MiniappRepositoryPort } from "../ports.ts";
import { InMemoryContributionStore } from "./in-memory-contribution-store.ts";
import { InMemoryLibraryStore } from "./in-memory-library-store.ts";
import { contributionFormalBaseline } from "../contribution-formal-baseline.ts";
import { assertContributionBaselineMatches } from "../contribution-validation.ts";
import { derivePlanReminderSchedules, type StoredPlanReminderSchedule } from "../plan-reminder-schedule.ts";

/** Explicit test/acceptance repository. Runtime configuration never selects
 * this class outside NODE_ENV=test or MINIAPP_ACCEPTANCE_MODE=1. */
export class InMemoryTestRepository implements MiniappRepositoryPort {
  readonly kind = "memory" as const;

  async readinessSnapshot() {
    return {
      ready: true,
      repository: this.kind,
      schema: "explicit-test-memory",
    };
  }
  #spots: readonly SpotSummary[];
  #users = new Set<UserId>();
  #wechatUsers = new Map<string, UserId>();
  #sessions = new Map<string, { userId: UserId; expiresAt: string }>();
  #library = new InMemoryLibraryStore();
  #contributions = new InMemoryContributionStore();
  #formalUploadIntents = new Map<string, { userId: UserId; value: ContributionFormalUploadIntent; objects: Map<ContributionUploadId, { objectKey: string; mimeType: ContributionMediaUpload["mimeType"] }> }>();
  #formalUploadReceipts = new Map<string, ContributionFormalUploadIntent>();
  #formalPendingDeletion = new Set<string>();
  #reminderSchedules = new Map<string, StoredPlanReminderSchedule[]>();
  #avatarObjects = new Map<UserId, { objectKey: string; version: string; mimeType: "image/jpeg" | "image/png" | "image/webp"; zoom: number }>();

  constructor(spots: readonly SpotSummary[] = [TEST_PUBLISHED_SPOT]) {
    this.#spots = spots.map((spot) => structuredClone(spot));
  }

  resetForAcceptance() {
    this.#users.clear();
    this.#wechatUsers.clear();
    this.#sessions.clear();
    this.#library.reset();
    this.#contributions.reset();
    this.#formalUploadIntents.clear();
    this.#formalUploadReceipts.clear();
    this.#formalPendingDeletion.clear();
    this.#reminderSchedules.clear();
    this.#avatarObjects.clear();
  }

  async listSpots() {
    return this.#spots.map((spot) => structuredClone(spot));
  }

  async listSpotPopulation() {
    return this.#spots
      .filter((spot) => spot.status === "PUBLISHED" || spot.status === "TEMPORARILY_CLOSED")
      .map((spot) => ({ spotId: spot.spotId, source: structuredClone(spot.source) }));
  }

  async listSpotsInRadius(
    center: { system: "WGS84"; latitude: number; longitude: number },
    radiusKm: number,
  ) {
    return this.#spots
      .filter(
        (spot) =>
          distanceMeters(
            { lat: center.latitude, lon: center.longitude },
            { lat: spot.wgs84.latitude, lon: spot.wgs84.longitude },
          ) <=
          radiusKm * 1_000,
      )
      .map((spot) => structuredClone(spot));
  }

  async listDarkSkyGridCells() {
    return [];
  }
  async searchSpotCandidates() {
    return [];
  }
  async getSpot(spotId: SpotId) {
    const spot = this.#spots.find((item) => item.spotId === spotId);
    return spot ? structuredClone(spot) : null;
  }
  async getDetail(spotId: SpotId) {
    const spot = await this.getSpot(spotId);
    const detail = buildTestSpotDetail(spotId);
    return spot && detail ? { ...detail, spot } : null;
  }
  async getContributionFormalBaseline(spotId: SpotId) {
    const detail = await this.getDetail(spotId);
    return detail ? contributionFormalBaseline(detail, 1) : null;
  }

  async ensureUser(userId: UserId) {
    if (this.#users.has(userId)) return;
    this.#users.add(userId);
    this.#library.ensureUser(userId);
    this.#contributions.ensureUser(userId);
  }

  async findOrCreateWechatUser(identityDigest: string) {
    const existing = this.#wechatUsers.get(identityDigest);
    if (existing) return existing;
    const userId = `user:${randomUUID()}` as UserId;
    await this.ensureUser(userId);
    this.#wechatUsers.set(identityDigest, userId);
    return userId;
  }

  async createSession(input: {
    userId: UserId;
    tokenDigest: string;
    expiresAt: string;
  }) {
    await this.ensureUser(input.userId);
    this.#sessions.set(input.tokenDigest, {
      userId: input.userId,
      expiresAt: input.expiresAt,
    });
  }

  async resolveSession(tokenDigest: string) {
    const session = this.#sessions.get(tokenDigest);
    return session && Date.parse(session.expiresAt) > Date.now()
      ? session.userId
      : null;
  }

  async deleteAccount(userId: UserId, _idempotencyKey: string) {
    const deletedAt = new Date().toISOString();
    this.#library.deleteUser(userId);
    this.#contributions.deleteUser(userId);
    for (const [intentId, item] of this.#formalUploadIntents) if (item.userId === userId) this.#formalUploadIntents.delete(intentId);
    for (const key of this.#formalUploadReceipts.keys()) if (key.startsWith(`${userId}|`)) this.#formalUploadReceipts.delete(key);
    this.#users.delete(userId);
    this.#reminderSchedules.delete(userId);
    this.#avatarObjects.delete(userId);
    for (const [identity, value] of this.#wechatUsers)
      if (value === userId) this.#wechatUsers.delete(identity);
    for (const [token, session] of this.#sessions)
      if (session.userId === userId) this.#sessions.delete(token);
    return {
      schemaVersion: "starward-account-deletion-receipt-v1",
      userId,
      accountState: "DELETED",
      deletedAt,
      sessionsRevoked: true,
      externalIdentityUnlinked: true,
      mediaCleanupState: "NOT_REQUIRED",
      mutableDataDeleted: [
        "preferences",
        "favorites",
        "plans",
        "notification-schedules",
        "profile-links",
        "imports",
        "media",
      ],
      retainedDeidentifiedEvidence: [
        "moderation-history",
        "merge-publication-audit",
      ],
    } satisfies AccountDeletionReceipt;
  }

  async getAccountProfile(userId: UserId) { return this.#library.getAccountProfile(userId); }
  async saveAccountNickname(userId: UserId, nickname: string, expectedRevision: number, idempotencyKey: string) {
    return this.#library.saveAccountNickname(userId, nickname, expectedRevision, idempotencyKey);
  }
  async getAccountAvatarObject(userId: UserId) {
    const value = this.#avatarObjects.get(userId);
    return value ? structuredClone(value) : null;
  }
  async saveAccountAvatar(userId: UserId, avatar: { objectKey: string; version: string; mimeType: "image/jpeg" | "image/png" | "image/webp"; zoom: number; byteSize: number; sha256: string }, expectedRevision: number, idempotencyKey: string) {
    const previous = this.#avatarObjects.get(userId)?.objectKey ?? null;
    const result = this.#library.saveAccountAvatar(userId, avatar, expectedRevision, idempotencyKey);
    this.#avatarObjects.set(userId, { objectKey: avatar.objectKey, version: avatar.version, mimeType: avatar.mimeType, zoom: avatar.zoom });
    return { ...result, previousObjectKey: previous };
  }
  async getPreferences(userId: UserId) {
    return this.#library.getPreferences(userId);
  }
  async savePreferences(
    userId: UserId,
    preferences: UserPreferences,
    expectedRevision: number,
    idempotencyKey: string,
  ) {
    return this.#library.savePreferences(
      userId,
      preferences,
      expectedRevision,
      idempotencyKey,
    );
  }
  async listFavoriteIds(userId: UserId) {
    return this.#library.listFavoriteIds(userId);
  }
  async setFavorite(
    userId: UserId,
    spotId: SpotId,
    favorite: boolean,
    idempotencyKey: string,
  ) {
    if (!(await this.getSpot(spotId))) throw new Error("formal_spot_not_found");
    this.#library.setFavorite(userId, spotId, favorite, idempotencyKey);
  }
  async listPlans(userId: UserId) {
    return this.#library.listPlans(userId);
  }
  async listPlanReminderSchedules(userId: UserId) {
    return structuredClone(this.#reminderSchedules.get(userId) ?? []);
  }
  async getPlanSaveReceipt(userId: UserId, planId: string, idempotencyKey: string) {
    return this.#library.getPlanSaveReceipt(userId, planId, idempotencyKey);
  }
  async savePlan(
    userId: UserId,
    plan: ObservationPlan,
    expectedRevision: number | null,
    idempotencyKey: string,
  ) {
    if (!(await this.getSpot(plan.spotId)))
      throw new Error("formal_spot_not_found");
    const saved = this.#library.savePlan(
      userId,
      plan,
      expectedRevision,
      idempotencyKey,
    );
    const current = this.#reminderSchedules.get(userId) ?? [];
    this.#reminderSchedules.set(userId, [
      ...current.filter(row => row.planId !== saved.planId),
      ...derivePlanReminderSchedules(userId, saved),
    ]);
    return saved;
  }
  async deletePlan(userId: UserId, planId: string, idempotencyKey: string) {
    this.#library.deletePlan(userId, planId, idempotencyKey);
    this.#reminderSchedules.set(userId, (this.#reminderSchedules.get(userId) ?? []).filter(row => row.planId !== planId));
  }
  async listProfileLinks(userId: UserId) {
    return this.#library.listProfileLinks(userId);
  }
  async saveProfileLink(
    userId: UserId,
    link: ProfileLink,
    idempotencyKey: string,
  ) {
    return this.#library.saveProfileLink(userId, link, idempotencyKey);
  }
  async deleteProfileLink(
    userId: UserId,
    id: string,
    idempotencyKey: string,
  ) {
    this.#library.deleteProfileLink(userId, id, idempotencyKey);
  }
  async saveImportDraft(
    userId: UserId,
    draft: ImportDraft,
    expectedRevision: number | null,
    idempotencyKey: string,
  ) {
    return this.#library.saveImportDraft(
      userId,
      draft,
      expectedRevision,
      idempotencyKey,
    );
  }
  async getImportSaveReceipt(userId: UserId, id: string, idempotencyKey: string) {
    return this.#library.getImportSaveReceipt(userId, id, idempotencyKey);
  }
  async listImportDrafts(userId: UserId) {
    return this.#library.listImportDrafts(userId);
  }
  async getImportDraft(userId: UserId, id: string) {
    return this.#library.getImportDraft(userId, id);
  }

  async listContributions(userId: UserId) {
    return this.#contributions.list(userId);
  }
  async getContribution(userId: UserId, submissionId: ContributionId) {
    return this.#contributions.get(userId, submissionId);
  }
  async saveContributionDraft(
    userId: UserId,
    submission: ContributionSubmission,
    expectedRevision: number | null,
    idempotencyKey: string,
  ) {
    return this.#contributions.saveDraft(
      userId,
      submission,
      expectedRevision,
      idempotencyKey,
    );
  }
  async withdrawContributionDraft(
    userId: UserId,
    submissionId: ContributionId,
    expectedRevision: number,
    idempotencyKey: string,
  ) {
    return this.#contributions.withdrawDraft(
      userId,
      submissionId,
      expectedRevision,
      idempotencyKey,
    );
  }
  async createContributionUpload(
    userId: UserId,
    submissionId: ContributionId,
    upload: ContributionMediaUpload,
    expectedRevision: number,
    idempotencyKey: string,
    replaceUploadId?: ContributionUploadId,
  ) {
    return this.#contributions.createUpload(
      userId,
      submissionId,
      upload,
      expectedRevision,
      idempotencyKey,
      replaceUploadId,
    );
  }
  async completeContributionUpload(
    userId: UserId,
    submissionId: ContributionId,
    uploadId: ContributionUploadId,
    completion: {
      byteSize: number;
      sha256: string;
      objectKey: string;
      uploadedAt: string;
    },
    idempotencyKey: string,
  ) {
    return this.#contributions.completeUpload(
      userId,
      submissionId,
      uploadId,
      completion,
      idempotencyKey,
    );
  }
  async submitContribution(
    userId: UserId,
    submissionId: ContributionId,
    expectedRevision: number,
    idempotencyKey: string,
  ) {
    return this.#contributions.submit(
      userId,
      submissionId,
      expectedRevision,
      idempotencyKey,
    );
  }
  async submitFormalContribution(userId: UserId, input: ContributionFormalSubmitRequest, idempotencyKey: string) {
    const baseline = await this.getContributionFormalBaseline(input.baseline.spotId);
    if (!baseline) throw new Error("formal_spot_not_found");
    if (input.baseline.revision !== baseline.revision) throw new Error("contribution_baseline_revision_not_found");
    assertContributionBaselineMatches(input.baseline, baseline);
    const existing = input.submissionId ? this.#contributions.get(userId, input.submissionId) : null;
    const existingMedia = existing?.media ?? [];
    const intent = input.uploadIntentId ? this.#formalUploadIntents.get(input.uploadIntentId) : undefined;
    if (input.uploadIntentId) {
      if (!intent || intent.userId !== userId) throw new Error("formal_upload_intent_not_found");
      if (intent.value.revision !== input.expectedUploadIntentRevision) throw new Error("formal_upload_intent_revision_conflict");
      if (intent.value.spotId !== input.baseline.spotId || intent.value.baselineRevision !== input.baseline.revision) throw new Error("formal_upload_intent_scope_invalid");
      if (intent.value.uploads.some(value => value.state !== "UPLOADED")) throw new Error("formal_upload_incomplete");
      const allowed = new Set([...Object.values(baseline.media).flat(), ...existingMedia.map(value => value.uploadId), ...intent.value.uploads.map(value => value.uploadId)]);
      if (Object.values(input.proposal.media).flatMap(value => value ?? []).some(id => !allowed.has(id as never))) throw new Error("contribution_formal_media_unknown");
    } else if (Object.keys(input.proposal.media).length) {
      const allowed = new Set([...Object.values(baseline.media).flat(), ...existingMedia.map(value => value.uploadId)]);
      if (Object.values(input.proposal.media).flatMap(value => value ?? []).some(id => !allowed.has(id as never))) throw new Error("formal_upload_intent_required");
    }
    const result = this.#contributions.submitFormal(userId, input, baseline, idempotencyKey, [...existingMedia, ...(intent?.value.uploads ?? [])]);
    if (result.state === "SUBMITTED" && intent) intent.value = { ...intent.value, uploads: intent.value.uploads.map(value => ({ ...value, state: "ATTACHED" as const })), revision: intent.value.revision + 1 };
    return result;
  }
  async saveFormalUploadIntent(userId: UserId, intent: ContributionFormalUploadIntent, idempotencyKey: string) {
    const key = `${userId}|${idempotencyKey}`; const replay = this.#formalUploadReceipts.get(key); if (replay) return structuredClone(replay);
    this.#formalUploadIntents.set(intent.intentId, { userId, value: structuredClone(intent), objects: new Map() }); this.#formalUploadReceipts.set(key, structuredClone(intent)); return structuredClone(intent);
  }
  async getFormalUploadIntent(userId: UserId, intentId: string) { const item=this.#formalUploadIntents.get(intentId); return item?.userId===userId ? structuredClone(item.value) : null; }
  async createFormalContributionUpload(userId: UserId, intentId: string, upload: ContributionFormalMediaUpload, expectedRevision: number, idempotencyKey: string) {
    const key=`${userId}|${idempotencyKey}`; const replay=this.#formalUploadReceipts.get(key); if(replay)return structuredClone(replay);
    const item=this.#formalUploadIntents.get(intentId); if(!item||item.userId!==userId)throw new Error("formal_upload_intent_not_found"); if(item.value.revision!==expectedRevision)throw new Error("formal_upload_intent_revision_conflict"); if(Date.parse(item.value.expiresAt)<=Date.now())throw new Error("formal_upload_intent_expired"); if(item.value.uploads.length>=9)throw new Error("contribution_media_count_invalid");
    item.value={...item.value,uploads:[...item.value.uploads,structuredClone(upload)],revision:item.value.revision+1}; this.#formalUploadReceipts.set(key,structuredClone(item.value)); return structuredClone(item.value);
  }
  async completeFormalContributionUpload(userId: UserId, intentId: string, uploadId: ContributionUploadId, completion: { byteSize: number; sha256: string; objectKey: string; uploadedAt: string }, idempotencyKey: string) {
    const key=`${userId}|${idempotencyKey}`; const replay=this.#formalUploadReceipts.get(key); if(replay)return structuredClone(replay);
    const item=this.#formalUploadIntents.get(intentId); if(!item||item.userId!==userId)throw new Error("formal_upload_intent_not_found"); const upload=item.value.uploads.find(value=>value.uploadId===uploadId); if(!upload)throw new Error("contribution_upload_not_found"); if(upload.state!=="PENDING")throw new Error("contribution_upload_not_pending");
    item.value={...item.value,uploads:item.value.uploads.map(value=>value.uploadId===uploadId?{...value,state:"UPLOADED" as const,byteSize:completion.byteSize,sha256:completion.sha256,uploadedAt:completion.uploadedAt}:value),revision:item.value.revision+1}; item.objects.set(uploadId,{objectKey:completion.objectKey,mimeType:upload.mimeType}); this.#formalUploadReceipts.set(key,structuredClone(item.value)); return structuredClone(item.value);
  }
  async removeFormalContributionUpload(userId: UserId, intentId: string, uploadId: ContributionUploadId, expectedRevision: number, idempotencyKey: string) {
    const key=`${userId}|${idempotencyKey}`; const replay=this.#formalUploadReceipts.get(key); if(replay)return structuredClone(replay); const item=this.#formalUploadIntents.get(intentId); if(!item||item.userId!==userId)throw new Error("formal_upload_intent_not_found"); if(item.value.revision!==expectedRevision)throw new Error("formal_upload_intent_revision_conflict"); if(!item.value.uploads.some(value=>value.uploadId===uploadId))throw new Error("contribution_upload_not_found"); item.value={...item.value,uploads:item.value.uploads.filter(value=>value.uploadId!==uploadId),revision:item.value.revision+1}; item.objects.delete(uploadId); this.#formalUploadReceipts.set(key,structuredClone(item.value)); return structuredClone(item.value);
  }
  async expireContributionUploads(now: string) {
    const objectKeys = new Set(await this.#contributions.expireUploads(now));
    for (const item of this.#formalUploadIntents.values()) {
      if (Date.parse(item.value.expiresAt) > Date.parse(now)) continue;
      const expired = item.value.uploads
        .filter(upload => upload.state === "PENDING" || upload.state === "UPLOADED")
        .map(upload => upload.uploadId);
      if (!expired.length) continue;
      const expiredIds = new Set(expired);
      item.value = {
        ...item.value,
        uploads: item.value.uploads.map(upload =>
          expiredIds.has(upload.uploadId) ? { ...upload, state: "EXPIRED" as const } : upload),
        revision: item.value.revision + 1,
      };
      for (const uploadId of expired) {
        const object = item.objects.get(uploadId);
        if (object) this.#formalPendingDeletion.add(object.objectKey);
      }
    }
    for (const key of this.#formalPendingDeletion) objectKeys.add(key);
    return [...objectKeys];
  }
  async removeContributionUpload(userId: UserId, submissionId: ContributionId, uploadId: ContributionUploadId, expectedRevision: number, idempotencyKey: string) {
    return this.#contributions.removeUpload(userId, submissionId, uploadId, expectedRevision, idempotencyKey);
  }
  async acknowledgeContributionMediaDeletion(objectKeys: readonly string[]) {
    this.#contributions.acknowledgeMediaDeletion(objectKeys);
    for (const key of objectKeys) {
      this.#formalPendingDeletion.delete(key);
      for (const item of this.#formalUploadIntents.values()) {
        for (const [uploadId, object] of item.objects) {
          if (object.objectKey === key) item.objects.delete(uploadId);
        }
      }
    }
  }
  async getContributionUploadObject(uploadId: ContributionUploadId) {
    const legacy = this.#contributions.getUploadObject(uploadId);
    if (legacy) return legacy;
    for (const item of this.#formalUploadIntents.values()) { const object=item.objects.get(uploadId); if(object)return structuredClone(object); }
    return null;
  }

  async operationsSnapshot() {
    return {
      repository: this.kind,
      users: this.#users.size,
      sessions: this.#sessions.size,
      persistence: "explicit_test_or_acceptance_only",
    };
  }
  async close() {}
}
