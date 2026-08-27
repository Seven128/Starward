import { randomUUID } from "node:crypto";
import type {
  AccountDeletionReceipt,
  ContributionId,
  ContributionMediaUpload,
  ContributionSubmission,
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

  constructor(spots: readonly SpotSummary[] = [TEST_PUBLISHED_SPOT]) {
    this.#spots = spots.map((spot) => structuredClone(spot));
  }

  resetForAcceptance() {
    this.#users.clear();
    this.#wechatUsers.clear();
    this.#sessions.clear();
    this.#library.reset();
    this.#contributions.reset();
  }

  async listSpots() {
    return this.#spots.map((spot) => structuredClone(spot));
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
    return buildTestSpotDetail(spotId);
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
    this.#users.delete(userId);
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
  async savePlan(
    userId: UserId,
    plan: ObservationPlan,
    expectedRevision: number | null,
    idempotencyKey: string,
  ) {
    if (!(await this.getSpot(plan.spotId)))
      throw new Error("formal_spot_not_found");
    return this.#library.savePlan(
      userId,
      plan,
      expectedRevision,
      idempotencyKey,
    );
  }
  async deletePlan(userId: UserId, planId: string, idempotencyKey: string) {
    this.#library.deletePlan(userId, planId, idempotencyKey);
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
  async createContributionUpload(
    userId: UserId,
    submissionId: ContributionId,
    upload: ContributionMediaUpload,
    expectedRevision: number,
    idempotencyKey: string,
  ) {
    return this.#contributions.createUpload(
      userId,
      submissionId,
      upload,
      expectedRevision,
      idempotencyKey,
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
  async expireContributionUploads(now: string) {
    return this.#contributions.expireUploads(now);
  }
  async getContributionUploadObject(uploadId: ContributionUploadId) {
    return this.#contributions.getUploadObject(uploadId);
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
