import { assertContributionUploadContent, contributionMediaObjectKey } from "../contribution-media-object.js";
import { randomUUID } from "node:crypto";
import { TEST_PUBLISHED_SPOT, buildTestSpotDetail, } from "@starward/miniapp-contracts/test-fixtures";
import { distanceMeters } from "@starward/coordinate-system";
import { InMemoryContributionStore } from "./in-memory-contribution-store.js";
import { InMemoryLibraryStore } from "./in-memory-library-store.js";
import { contributionFormalBaseline } from "../contribution-formal-baseline.js";
import { assertContributionBaselineMatches } from "../contribution-validation.js";
import { derivePlanReminderSchedules } from "../plan-reminder-schedule.js";
/** Explicit test/acceptance repository. Runtime configuration never selects
 * this class outside NODE_ENV=test or MINIAPP_ACCEPTANCE_MODE=1. */
export class InMemoryTestRepository {
    kind = "memory";
    async readinessSnapshot() {
        return {
            ready: true,
            repository: this.kind,
            schema: "explicit-test-memory",
        };
    }
    #spots;
    #users = new Set();
    #wechatUsers = new Map();
    #deliveryIdentities = new Map();
    #sessions = new Map();
    #library = new InMemoryLibraryStore();
    #contributions = new InMemoryContributionStore();
    #formalUploadIntents = new Map();
    #formalUploadReceipts = new Map();
    #formalBaselines = new Map();
    #formalCurrentRevisions = new Map();
    #formalPendingDeletion = new Set();
    #reminderSchedules = new Map();
    #avatarObjects = new Map();
    constructor(spots = [TEST_PUBLISHED_SPOT]) {
        this.#spots = spots.map((spot) => structuredClone(spot));
    }
    resetForAcceptance() {
        this.#users.clear();
        this.#wechatUsers.clear();
        this.#deliveryIdentities.clear();
        this.#sessions.clear();
        this.#library.reset();
        this.#contributions.reset();
        this.#formalUploadIntents.clear();
        this.#formalUploadReceipts.clear();
        this.#formalBaselines.clear();
        this.#formalCurrentRevisions.clear();
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
    async listSpotsInRadius(center, radiusKm) {
        return this.#spots
            .filter((spot) => distanceMeters({ lat: center.latitude, lon: center.longitude }, { lat: spot.wgs84.latitude, lon: spot.wgs84.longitude }) <=
            radiusKm * 1_000)
            .map((spot) => structuredClone(spot));
    }
    async listDarkSkyGridCells() {
        return [];
    }
    async searchSpotCandidates() {
        return [];
    }
    async getSpot(spotId) {
        const spot = this.#spots.find((item) => item.spotId === spotId);
        return spot ? structuredClone(spot) : null;
    }
    async getDetail(spotId) {
        const spot = await this.getSpot(spotId);
        const detail = buildTestSpotDetail(spotId);
        return spot && detail ? { ...detail, spot } : null;
    }
    async getContributionFormalBaseline(spotId) {
        const revision = this.#formalCurrentRevisions.get(spotId);
        if (revision !== undefined)
            return structuredClone(this.#formalBaselines.get(spotId).get(revision));
        const detail = await this.getDetail(spotId);
        if (!detail)
            return null;
        const baseline = contributionFormalBaseline(detail, 1);
        this.#formalBaselines.set(spotId, new Map([[1, baseline]]));
        this.#formalCurrentRevisions.set(spotId, 1);
        return structuredClone(baseline);
    }
    /** Test-only revision transition: preserve the old snapshot as Postgres spot_revisions does. */
    setFormalBaselineForAcceptance(next) {
        const previous = this.#formalCurrentRevisions.get(next.spotId);
        const history = this.#formalBaselines.get(next.spotId);
        if (previous === undefined || !history || next.revision !== previous + 1)
            throw new Error("acceptance_formal_baseline_sequence_invalid");
        history.set(next.revision, structuredClone(next));
        this.#formalCurrentRevisions.set(next.spotId, next.revision);
    }
    async ensureUser(userId) {
        if (this.#users.has(userId))
            return;
        this.#users.add(userId);
        this.#library.ensureUser(userId);
        this.#contributions.ensureUser(userId);
    }
    async findWechatUser(identityDigest) {
        return this.#wechatUsers.get(identityDigest) ?? null;
    }
    async findOrCreateWechatUser(identityDigest) {
        const existing = this.#wechatUsers.get(identityDigest);
        if (existing)
            return existing;
        const userId = `user:${randomUUID()}`;
        await this.ensureUser(userId);
        this.#wechatUsers.set(identityDigest, userId);
        return userId;
    }
    async saveWechatDeliveryIdentity(input) {
        if (!this.#users.has(input.userId) || this.#wechatUsers.get(input.identityDigest) !== input.userId)
            throw new Error("wechat_delivery_identity_account_unavailable");
        this.#deliveryIdentities.set(input.userId, { appId: input.appId, ciphertext: input.ciphertext });
    }
    async getWechatDeliveryIdentity(userId, appId) {
        const stored = this.#deliveryIdentities.get(userId);
        return stored?.appId === appId ? stored.ciphertext : null;
    }
    async createSession(input) {
        await this.ensureUser(input.userId);
        this.#sessions.set(input.tokenDigest, {
            userId: input.userId,
            expiresAt: input.expiresAt,
        });
    }
    async resolveSession(tokenDigest) {
        const session = this.#sessions.get(tokenDigest);
        return session && Date.parse(session.expiresAt) > Date.now()
            ? session.userId
            : null;
    }
    async deleteAccount(userId, _idempotencyKey) {
        return this.#withContributionMutation(async () => {
            const deletedAt = new Date().toISOString();
            this.#library.deleteUser(userId);
            let cleanupRequired = this.#contributions.deleteUser(userId);
            for (const [intentId, item] of this.#formalUploadIntents)
                if (item.userId === userId) {
                    for (const upload of item.value.uploads) {
                        cleanupRequired ||= upload.state === "PENDING" || item.objects.has(upload.uploadId);
                        this.#queueFormalDeletion(userId, upload, item.objects.get(upload.uploadId));
                    }
                    this.#formalUploadIntents.delete(intentId);
                }
            for (const key of this.#formalUploadReceipts.keys())
                if (key.startsWith(`${userId}|`))
                    this.#formalUploadReceipts.delete(key);
            this.#users.delete(userId);
            this.#deliveryIdentities.delete(userId);
            this.#reminderSchedules.delete(userId);
            this.#avatarObjects.delete(userId);
            for (const [identity, value] of this.#wechatUsers)
                if (value === userId)
                    this.#wechatUsers.delete(identity);
            for (const [token, session] of this.#sessions)
                if (session.userId === userId)
                    this.#sessions.delete(token);
            return {
                schemaVersion: "starward-account-deletion-receipt-v1",
                userId,
                accountState: "DELETED",
                deletedAt,
                sessionsRevoked: true,
                externalIdentityUnlinked: true,
                mediaCleanupState: cleanupRequired ? "QUEUED" : "NOT_REQUIRED",
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
            };
        });
    }
    async getAccountProfile(userId) { return this.#library.getAccountProfile(userId); }
    async saveAccountNickname(userId, nickname, expectedRevision, idempotencyKey) {
        return this.#library.saveAccountNickname(userId, nickname, expectedRevision, idempotencyKey);
    }
    async getAccountAvatarObject(userId) {
        const value = this.#avatarObjects.get(userId);
        return value ? structuredClone(value) : null;
    }
    async saveAccountAvatar(userId, avatar, expectedRevision, idempotencyKey) {
        const previous = this.#avatarObjects.get(userId)?.objectKey ?? null;
        const result = this.#library.saveAccountAvatar(userId, avatar, expectedRevision, idempotencyKey);
        this.#avatarObjects.set(userId, { objectKey: avatar.objectKey, version: avatar.version, mimeType: avatar.mimeType, zoom: avatar.zoom });
        return { ...result, previousObjectKey: previous };
    }
    async getPreferences(userId) {
        return this.#library.getPreferences(userId);
    }
    async savePreferences(userId, preferences, expectedRevision, idempotencyKey) {
        return this.#library.savePreferences(userId, preferences, expectedRevision, idempotencyKey);
    }
    async listFavoriteIds(userId) {
        return this.#library.listFavoriteIds(userId);
    }
    async setFavorite(userId, spotId, favorite, idempotencyKey) {
        if (!(await this.getSpot(spotId)))
            throw new Error("formal_spot_not_found");
        this.#library.setFavorite(userId, spotId, favorite, idempotencyKey);
    }
    async listPlans(userId) {
        return this.#library.listPlans(userId);
    }
    async listPlanReminderSchedules(userId) {
        return structuredClone(this.#reminderSchedules.get(userId) ?? []);
    }
    async getPlanSaveReceipt(userId, planId, idempotencyKey) {
        return this.#library.getPlanSaveReceipt(userId, planId, idempotencyKey);
    }
    async savePlan(userId, plan, expectedRevision, idempotencyKey) {
        if (!(await this.getSpot(plan.spotId)))
            throw new Error("formal_spot_not_found");
        const saved = this.#library.savePlan(userId, plan, expectedRevision, idempotencyKey);
        const current = this.#reminderSchedules.get(userId) ?? [];
        this.#reminderSchedules.set(userId, [
            ...current.filter(row => row.planId !== saved.planId),
            ...derivePlanReminderSchedules(userId, saved),
        ]);
        return saved;
    }
    async deletePlan(userId, planId, idempotencyKey) {
        this.#library.deletePlan(userId, planId, idempotencyKey);
        this.#reminderSchedules.set(userId, (this.#reminderSchedules.get(userId) ?? []).filter(row => row.planId !== planId));
    }
    async listProfileLinks(userId) {
        return this.#library.listProfileLinks(userId);
    }
    async saveProfileLink(userId, link, idempotencyKey) {
        return this.#library.saveProfileLink(userId, link, idempotencyKey);
    }
    async deleteProfileLink(userId, id, idempotencyKey) {
        this.#library.deleteProfileLink(userId, id, idempotencyKey);
    }
    async saveImportDraft(userId, draft, expectedRevision, idempotencyKey) {
        return this.#library.saveImportDraft(userId, draft, expectedRevision, idempotencyKey);
    }
    async getImportSaveReceipt(userId, id, idempotencyKey) {
        return this.#library.getImportSaveReceipt(userId, id, idempotencyKey);
    }
    async listImportDrafts(userId) {
        return this.#library.listImportDrafts(userId);
    }
    async getImportDraft(userId, id) {
        return this.#library.getImportDraft(userId, id);
    }
    async listContributions(userId) {
        return this.#contributions.list(userId);
    }
    async getContribution(userId, submissionId) {
        return this.#contributions.get(userId, submissionId);
    }
    async saveContributionDraft(userId, submission, expectedRevision, idempotencyKey) {
        return this.#withContributionMutation(async () => {
            return this.#contributions.saveDraft(userId, submission, expectedRevision, idempotencyKey);
        });
    }
    async withdrawContributionDraft(userId, submissionId, expectedRevision, idempotencyKey) {
        return this.#withContributionMutation(async () => {
            return this.#contributions.withdrawDraft(userId, submissionId, expectedRevision, idempotencyKey);
        });
    }
    async createContributionUpload(userId, submissionId, upload, expectedRevision, idempotencyKey, replaceUploadId) {
        return this.#withContributionMutation(async () => {
            return this.#contributions.createUpload(userId, submissionId, upload, expectedRevision, idempotencyKey, replaceUploadId);
        });
    }
    async completeContributionUpload(userId, submissionId, uploadId, completion, idempotencyKey, writeObject) {
        return this.#withContributionMutation(async () => {
            return this.#contributions.completeUpload(userId, submissionId, uploadId, completion, idempotencyKey, writeObject);
        });
    }
    async submitContribution(userId, submissionId, expectedRevision, idempotencyKey) {
        return this.#withContributionMutation(async () => {
            return this.#contributions.submit(userId, submissionId, expectedRevision, idempotencyKey);
        });
    }
    async submitFormalContribution(userId, input, idempotencyKey) {
        return this.#withContributionMutation(async () => {
            const baseline = await this.getContributionFormalBaseline(input.baseline.spotId);
            if (!baseline)
                throw new Error("formal_spot_not_found");
            const historical = this.#formalBaselines.get(input.baseline.spotId)?.get(input.baseline.revision);
            if (!historical)
                throw new Error("contribution_baseline_revision_not_found");
            assertContributionBaselineMatches(input.baseline, historical);
            const existing = input.submissionId ? this.#contributions.get(userId, input.submissionId) : null;
            const existingMedia = existing?.media ?? [];
            const intent = input.uploadIntentId ? this.#formalUploadIntents.get(input.uploadIntentId) : undefined;
            if (input.uploadIntentId) {
                if (!intent || intent.userId !== userId)
                    throw new Error("formal_upload_intent_not_found");
                if (intent.value.revision !== input.expectedUploadIntentRevision)
                    throw new Error("formal_upload_intent_revision_conflict");
                if (intent.value.spotId !== input.baseline.spotId || intent.value.baselineRevision !== input.baseline.revision)
                    throw new Error("formal_upload_intent_scope_invalid");
                if (intent.value.uploads.some(value => value.state !== "UPLOADED"))
                    throw new Error("formal_upload_incomplete");
                const allowed = new Set([...Object.values(input.baseline.media).flat(), ...existingMedia.map(value => value.uploadId), ...intent.value.uploads.map(value => value.uploadId)]);
                if (Object.values(input.proposal.media).flatMap(value => value ?? []).some(id => !allowed.has(id)))
                    throw new Error("contribution_formal_media_unknown");
            }
            else if (Object.keys(input.proposal.media).length) {
                const allowed = new Set([...Object.values(input.baseline.media).flat(), ...existingMedia.map(value => value.uploadId)]);
                if (Object.values(input.proposal.media).flatMap(value => value ?? []).some(id => !allowed.has(id)))
                    throw new Error("formal_upload_intent_required");
            }
            const result = this.#contributions.submitFormal(userId, input, baseline, idempotencyKey, [...existingMedia, ...(intent?.value.uploads ?? [])]);
            if (result.state === "SUBMITTED" && intent) {
                const acceptedIds = new Set(result.submission.media.map(upload => upload.uploadId));
                intent.value = {
                    ...intent.value, uploads: intent.value.uploads.map(upload => {
                        if (acceptedIds.has(upload.uploadId)) {
                            const object = intent.objects.get(upload.uploadId);
                            if (object)
                                object.submissionId = result.submission.submissionId;
                            return { ...upload, state: "ATTACHED" };
                        }
                        this.#queueFormalDeletion(userId, upload, intent.objects.get(upload.uploadId));
                        intent.objects.delete(upload.uploadId);
                        return { ...upload, state: "EXPIRED" };
                    }), revision: intent.value.revision + 1
                };
            }
            return result;
        });
    }
    async saveFormalUploadIntent(userId, intent, idempotencyKey) {
        return this.#withContributionMutation(async () => {
            const key = `${userId}|${idempotencyKey}`;
            const replay = this.#formalUploadReceipts.get(key);
            if (replay)
                return structuredClone(replay);
            this.#formalUploadIntents.set(intent.intentId, { userId, value: structuredClone(intent), objects: new Map() });
            this.#formalUploadReceipts.set(key, structuredClone(intent));
            return structuredClone(intent);
        });
    }
    async getFormalUploadIntent(userId, intentId) { const item = this.#formalUploadIntents.get(intentId); return item?.userId === userId ? structuredClone(item.value) : null; }
    async createFormalContributionUpload(userId, intentId, upload, expectedRevision, idempotencyKey) {
        return this.#withContributionMutation(async () => {
            const key = `${userId}|${idempotencyKey}`;
            const replay = this.#formalUploadReceipts.get(key);
            if (replay)
                return structuredClone(replay);
            const item = this.#formalUploadIntents.get(intentId);
            if (!item || item.userId !== userId)
                throw new Error("formal_upload_intent_not_found");
            if (item.value.revision !== expectedRevision)
                throw new Error("formal_upload_intent_revision_conflict");
            if (Date.parse(item.value.expiresAt) <= Date.now())
                throw new Error("formal_upload_intent_expired");
            if (item.value.uploads.length >= 9)
                throw new Error("contribution_media_count_invalid");
            item.value = { ...item.value, uploads: [...item.value.uploads, structuredClone(upload)], revision: item.value.revision + 1 };
            this.#formalUploadReceipts.set(key, structuredClone(item.value));
            return structuredClone(item.value);
        });
    }
    async completeFormalContributionUpload(userId, intentId, uploadId, completion, idempotencyKey, writeObject) {
        return this.#withContributionMutation(async () => {
            const key = `${userId}|${idempotencyKey}`;
            const item = this.#formalUploadIntents.get(intentId);
            if (!item || item.userId !== userId)
                throw new Error("formal_upload_intent_not_found");
            const upload = item.value.uploads.find(value => value.uploadId === uploadId);
            if (!upload)
                throw new Error("contribution_upload_not_found");
            const replay = this.#formalUploadReceipts.get(key);
            if (replay) {
                assertContributionUploadContent(replay.uploads.find(value => value.uploadId === uploadId), completion.sha256);
                return structuredClone(replay);
            }
            if (["UPLOADED", "ATTACHED"].includes(upload.state)) {
                assertContributionUploadContent(upload, completion.sha256);
                return structuredClone(item.value);
            }
            if (upload.state !== "PENDING")
                throw new Error("contribution_upload_not_pending");
            if (Date.parse(item.value.expiresAt) <= Date.now())
                throw new Error("formal_upload_intent_expired");
            if (completion.objectKey !== contributionMediaObjectKey(userId, uploadId, upload.mimeType))
                throw new Error("contribution_upload_object_key_invalid");
            await writeObject();
            item.value = { ...item.value, uploads: item.value.uploads.map(value => value.uploadId === uploadId ? { ...value, state: "UPLOADED", byteSize: completion.byteSize, sha256: completion.sha256, uploadedAt: completion.uploadedAt } : value), revision: item.value.revision + 1 };
            item.objects.set(uploadId, { objectKey: completion.objectKey, mimeType: upload.mimeType });
            this.#formalUploadReceipts.set(key, structuredClone(item.value));
            return structuredClone(item.value);
        });
    }
    async removeFormalContributionUpload(userId, intentId, uploadId, expectedRevision, idempotencyKey) {
        return this.#withContributionMutation(async () => {
            const key = `${userId}|${idempotencyKey}`;
            const replay = this.#formalUploadReceipts.get(key);
            if (replay)
                return structuredClone(replay);
            const item = this.#formalUploadIntents.get(intentId);
            if (!item || item.userId !== userId)
                throw new Error("formal_upload_intent_not_found");
            if (item.value.revision !== expectedRevision)
                throw new Error("formal_upload_intent_revision_conflict");
            const upload = item.value.uploads.find(value => value.uploadId === uploadId);
            if (!upload)
                throw new Error("contribution_upload_not_found");
            if (upload.state === "ATTACHED")
                throw new Error("contribution_upload_not_editable");
            this.#queueFormalDeletion(userId, upload, item.objects.get(uploadId));
            item.value = { ...item.value, uploads: item.value.uploads.filter(value => value.uploadId !== uploadId), revision: item.value.revision + 1 };
            item.objects.delete(uploadId);
            this.#formalUploadReceipts.set(key, structuredClone(item.value));
            return structuredClone(item.value);
        });
    }
    async expireContributionUploads(now) {
        return this.#withContributionMutation(async () => {
            const objectKeys = new Set(await this.#contributions.expireUploads(now));
            for (const item of this.#formalUploadIntents.values()) {
                if (Date.parse(item.value.expiresAt) > Date.parse(now))
                    continue;
                const expired = item.value.uploads
                    .filter(upload => upload.state === "PENDING" || upload.state === "UPLOADED")
                    .map(upload => upload.uploadId);
                if (!expired.length)
                    continue;
                for (const upload of item.value.uploads)
                    if (expired.includes(upload.uploadId))
                        this.#queueFormalDeletion(item.userId, upload, item.objects.get(upload.uploadId));
                const expiredIds = new Set(expired);
                item.value = {
                    ...item.value,
                    uploads: item.value.uploads.map(upload => expiredIds.has(upload.uploadId) ? { ...upload, state: "EXPIRED" } : upload),
                    revision: item.value.revision + 1,
                };
                for (const uploadId of expired) {
                    const object = item.objects.get(uploadId);
                    if (object)
                        this.#formalPendingDeletion.add(object.objectKey);
                }
            }
            for (const key of this.#formalPendingDeletion)
                objectKeys.add(key);
            return [...objectKeys];
        });
    }
    async removeContributionUpload(userId, submissionId, uploadId, expectedRevision, idempotencyKey) {
        return this.#withContributionMutation(async () => {
            return this.#contributions.removeUpload(userId, submissionId, uploadId, expectedRevision, idempotencyKey);
        });
    }
    async acknowledgeContributionMediaDeletion(objectKeys) {
        return this.#withContributionMutation(async () => {
            this.#contributions.acknowledgeMediaDeletion(objectKeys);
            for (const key of objectKeys) {
                this.#formalPendingDeletion.delete(key);
                for (const item of this.#formalUploadIntents.values()) {
                    for (const [uploadId, object] of item.objects) {
                        if (object.objectKey === key)
                            item.objects.delete(uploadId);
                    }
                }
            }
        });
    }
    async getOwnedContributionUploadObject(userId, submissionId, uploadId) {
        if (this.#contributions.ownsUpload(userId, submissionId, uploadId))
            return this.#contributions.getUploadObject(uploadId);
        for (const intent of this.#formalUploadIntents.values()) {
            const object = intent.objects.get(uploadId);
            if (intent.userId === userId && object?.submissionId === submissionId)
                return { objectKey: object.objectKey, mimeType: object.mimeType };
        }
        return null;
    }
    async getContributionUploadObject(uploadId) {
        const legacy = this.#contributions.getUploadObject(uploadId);
        if (legacy)
            return legacy;
        for (const item of this.#formalUploadIntents.values()) {
            const object = item.objects.get(uploadId);
            if (object)
                return { objectKey: object.objectKey, mimeType: object.mimeType };
        }
        return null;
    }
    #queueFormalDeletion(userId, upload, object) {
        if (object)
            this.#formalPendingDeletion.add(object.objectKey);
        else if (upload.state === "PENDING")
            this.#formalPendingDeletion.add(contributionMediaObjectKey(userId, upload.uploadId, upload.mimeType));
    }
    // Fixture serialization mirrors transaction exclusion, not PostgreSQL throughput.
    #contributionMutation = Promise.resolve();
    #withContributionMutation(operation) {
        const result = this.#contributionMutation.then(operation);
        this.#contributionMutation = result.catch(() => undefined);
        return result;
    }
    async operationsSnapshot() {
        return {
            repository: this.kind,
            users: this.#users.size,
            sessions: this.#sessions.size,
            persistence: "explicit_test_or_acceptance_only",
        };
    }
    async close() { }
}
//# sourceMappingURL=in-memory-repository.js.map