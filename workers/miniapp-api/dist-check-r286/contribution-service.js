import { createHash, randomUUID } from "node:crypto";
import { assertContributionRelation, cleanContributionText, CONTRIBUTION_MEDIA_MIME_TYPES, CONTRIBUTION_UPLOAD_TTL_MS, decodeContributionBase64, normalizeContributionInput, normalizeFormalContributionInput, } from "./contribution-validation.js";
import { sanitizeContributionImage } from "./media-object-store.js";
import { isContributionEditable } from "./contribution-attempts.js";
import { contributionMediaObjectKey } from "./contribution-media-object.js";
export class ContributionService {
    repository;
    mediaStore;
    config;
    constructor(repository, mediaStore, config) {
        this.repository = repository;
        this.mediaStore = mediaStore;
        this.config = config;
    }
    async list(userId) {
        await this.cleanupExpiredUploads();
        return this.repository.listContributions(userId);
    }
    async createDraft(userId, input, idempotencyKey) {
        const normalized = normalizeContributionInput(input);
        assertContributionRelation(normalized);
        const spot = normalized.spotId
            ? await this.repository.getSpot(normalized.spotId)
            : null;
        if (normalized.spotId && !spot)
            throw new Error("formal_spot_not_found");
        const now = new Date().toISOString();
        const submission = {
            submissionId: `contribution:${randomUUID()}`,
            ...normalized,
            spotNameSnapshot: spot?.name ?? null,
            media: [],
            state: "DRAFT",
            submissionState: "DRAFT",
            mergeState: "NOT_STARTED",
            publicationImpact: "NONE",
            statusHistory: [],
            attempts: [],
            workingCopyFromAttemptId: null,
            revision: 1,
            createdAt: now,
            updatedAt: now,
            review: null,
        };
        return this.repository.saveContributionDraft(userId, submission, null, idempotencyKey);
    }
    async updateDraft(userId, submissionId, input, idempotencyKey) {
        const current = await this.#ownedDraft(userId, submissionId);
        const normalized = normalizeContributionInput(input);
        assertContributionRelation(normalized);
        const spot = normalized.spotId
            ? await this.repository.getSpot(normalized.spotId)
            : null;
        if (normalized.spotId && !spot)
            throw new Error("formal_spot_not_found");
        const next = {
            ...current,
            ...normalized,
            spotNameSnapshot: spot?.name ?? null,
            revision: current.revision + 1,
            updatedAt: new Date().toISOString(),
        };
        return this.repository.saveContributionDraft(userId, next, input.expectedRevision, idempotencyKey);
    }
    async createUpload(userId, submissionId, input, idempotencyKey) {
        if (!this.mediaStore.enabled)
            throw new Error("media_upload_capability_disabled");
        // Mutable draft constraints are checked under the repository lock after replay.
        if (!CONTRIBUTION_MEDIA_MIME_TYPES.has(input.mimeType))
            throw new Error("contribution_media_mime_invalid");
        const originalName = cleanContributionText(input.originalName, 120);
        if (!originalName || /[/\\]/u.test(originalName))
            throw new Error("contribution_media_name_invalid");
        if (!Number.isInteger(input.byteSize) ||
            input.byteSize <= 0 ||
            input.byteSize > this.config.mediaStorage.maxUploadBytes)
            throw new Error("contribution_media_size_invalid");
        if (input.kind !== undefined && !["parking", "toilet", "site"].includes(input.kind))
            throw new Error("contribution_media_kind_invalid");
        const now = Date.now();
        const upload = {
            uploadId: `upload:${randomUUID()}`,
            ...(input.kind ? { kind: input.kind } : {}),
            state: "PENDING",
            originalName,
            mimeType: input.mimeType,
            declaredByteSize: input.byteSize,
            byteSize: null,
            sha256: null,
            createdAt: new Date(now).toISOString(),
            expiresAt: new Date(now + CONTRIBUTION_UPLOAD_TTL_MS).toISOString(),
            uploadedAt: null,
        };
        return this.repository.createContributionUpload(userId, submissionId, upload, input.expectedRevision, idempotencyKey, input.replaceUploadId);
    }
    async completeUpload(userId, submissionId, uploadId, input, idempotencyKey) {
        const submission = await this.#ownedDraft(userId, submissionId);
        const upload = submission.media.find((item) => item.uploadId === uploadId);
        if (!upload)
            throw new Error("contribution_upload_not_found");
        if (Date.parse(upload.expiresAt) <= Date.now()) {
            await this.cleanupExpiredUploads();
            throw new Error("contribution_upload_expired");
        }
        const raw = decodeContributionBase64(input.dataBase64, this.config.mediaStorage.maxUploadBytes);
        if (raw.length !== upload.declaredByteSize)
            throw new Error("contribution_media_size_mismatch");
        const sanitized = sanitizeContributionImage(raw, upload.mimeType);
        const sha256 = createHash("sha256").update(sanitized).digest("hex");
        if (upload.state === "UPLOADED" || upload.state === "ATTACHED") {
            if (upload.sha256 !== sha256)
                throw new Error("contribution_upload_content_conflict");
            return submission;
        }
        if (upload.state !== "PENDING")
            throw new Error("contribution_upload_not_pending");
        const objectKey = contributionMediaObjectKey(userId, uploadId, upload.mimeType);
        return this.repository.completeContributionUpload(userId, submissionId, uploadId, {
            byteSize: sanitized.length,
            sha256,
            objectKey,
            uploadedAt: new Date().toISOString(),
        }, idempotencyKey, () => this.mediaStore.put({ objectKey, bytes: sanitized, mimeType: upload.mimeType }));
    }
    async submit(userId, submissionId, expectedRevision, idempotencyKey) {
        // The repository checks replay before validating the locked current draft.
        // A completed submission must remain replayable after its response is lost.
        return this.repository.submitContribution(userId, submissionId, expectedRevision, idempotencyKey);
    }
    async readForAdmin(uploadId) {
        const record = await this.repository.getContributionUploadObject(uploadId);
        if (!record)
            throw new Error("contribution_upload_not_found");
        return this.#readObject(record);
    }
    async #readObject(record) {
        const result = await this.#readObjectBytes(record);
        return { mimeType: result.mimeType, dataBase64: Buffer.from(result.bytes).toString("base64") };
    }
    async #readObjectBytes(record) {
        const bytes = await this.mediaStore.read(record.objectKey);
        if (!bytes)
            throw new Error("contribution_media_object_missing");
        return { mimeType: record.mimeType, bytes };
    }
    async removeUpload(userId, submissionId, uploadId, expectedRevision, idempotencyKey) {
        const submission = await this.repository.removeContributionUpload(userId, submissionId, uploadId, expectedRevision, idempotencyKey);
        await this.cleanupExpiredUploads();
        return submission;
    }
    async withdrawDraft(userId, submissionId, expectedRevision, idempotencyKey) {
        const submission = await this.repository.withdrawContributionDraft(userId, submissionId, expectedRevision, idempotencyKey);
        await this.cleanupExpiredUploads();
        return submission;
    }
    async getForOwner(userId, submissionId) {
        const submission = await this.repository.getContribution(userId, submissionId);
        if (!submission)
            throw new Error("contribution_not_found");
        return submission;
    }
    async readForOwner(userId, submissionId, uploadId) {
        const submission = await this.repository.getContribution(userId, submissionId);
        const ownsUpload = submission && (submission.media.some(media => media.uploadId === uploadId) ||
            submission.attempts.some(attempt => attempt.snapshot.media.some(media => media.uploadId === uploadId)));
        // Legacy attached uploads may lack an attempt snapshot. Their registered
        // account + submission identity remains the authorization boundary.
        const record = ownsUpload ? await this.repository.getContributionUploadObject(uploadId)
            : submission ? await this.repository.getOwnedContributionUploadObject(userId, submissionId, uploadId) : null;
        if (!record)
            throw new Error("contribution_upload_not_found");
        return this.#readObject(record);
    }
    async readForPublishedSpot(spotId, uploadId) {
        const result = await this.readBytesForPublishedSpot(spotId, uploadId);
        return { mimeType: result.mimeType, dataBase64: Buffer.from(result.bytes).toString("base64") };
    }
    async readBytesForPublishedSpot(spotId, uploadId) {
        const detail = await this.repository.getDetail(spotId);
        const formalMediaIds = detail
            ? Object.values(detail.formalMedia ?? {}).flatMap((ids) => ids ?? [])
            : [];
        if (!detail || (!detail.spot.media.some((media) => media.id === uploadId) && !formalMediaIds.includes(uploadId)))
            throw new Error("contribution_upload_not_found");
        const record = await this.repository.getContributionUploadObject(uploadId);
        if (!record)
            throw new Error("contribution_upload_not_found");
        return this.#readObjectBytes(record);
    }
    async submitFormal(userId, input, idempotencyKey) {
        return this.repository.submitFormalContribution(userId, normalizeFormalContributionInput(input), idempotencyKey);
    }
    async createFormalUploadIntent(userId, input, idempotencyKey) {
        const baseline = await this.repository.getContributionFormalBaseline(input.spotId);
        if (!baseline)
            throw new Error("formal_spot_not_found");
        if (baseline.revision !== input.baselineRevision)
            throw new Error("contribution_baseline_revision_conflict");
        const now = Date.now();
        const intent = {
            intentId: `formal-upload-intent:${randomUUID()}`,
            spotId: baseline.spotId,
            baselineRevision: baseline.revision,
            uploads: [], revision: 1,
            createdAt: new Date(now).toISOString(),
            expiresAt: new Date(now + CONTRIBUTION_UPLOAD_TTL_MS).toISOString(),
        };
        return this.repository.saveFormalUploadIntent(userId, intent, idempotencyKey);
    }
    async createFormalUpload(userId, intentId, input, idempotencyKey) {
        if (!this.mediaStore.enabled)
            throw new Error("media_upload_capability_disabled");
        if (!CONTRIBUTION_MEDIA_MIME_TYPES.has(input.mimeType))
            throw new Error("contribution_media_mime_invalid");
        const originalName = cleanContributionText(input.originalName, 120);
        if (!originalName || /[/\\]/u.test(originalName))
            throw new Error("contribution_media_name_invalid");
        if (!Number.isInteger(input.byteSize) || input.byteSize <= 0 || input.byteSize > this.config.mediaStorage.maxUploadBytes)
            throw new Error("contribution_media_size_invalid");
        const intent = await this.repository.getFormalUploadIntent(userId, intentId);
        if (!intent)
            throw new Error("formal_upload_intent_not_found");
        const now = Date.now();
        const upload = {
            uploadId: `upload:${randomUUID()}`,
            ...(input.kind ? { kind: input.kind } : {}),
            kind: input.kind, state: "PENDING", originalName, mimeType: input.mimeType,
            declaredByteSize: input.byteSize, byteSize: null, sha256: null,
            createdAt: new Date(now).toISOString(), expiresAt: intent.expiresAt, uploadedAt: null,
        };
        return this.repository.createFormalContributionUpload(userId, intentId, upload, input.expectedRevision, idempotencyKey);
    }
    async completeFormalUpload(userId, intentId, uploadId, input, idempotencyKey) {
        const intent = await this.repository.getFormalUploadIntent(userId, intentId);
        const upload = intent?.uploads.find(value => value.uploadId === uploadId);
        if (!intent || !upload)
            throw new Error("contribution_upload_not_found");
        if (Date.parse(intent.expiresAt) <= Date.now())
            throw new Error("formal_upload_intent_expired");
        const raw = decodeContributionBase64(input.dataBase64, this.config.mediaStorage.maxUploadBytes);
        if (raw.length !== upload.declaredByteSize)
            throw new Error("contribution_media_size_mismatch");
        const sanitized = sanitizeContributionImage(raw, upload.mimeType);
        const sha256 = createHash("sha256").update(sanitized).digest("hex");
        if (upload.state === "UPLOADED" || upload.state === "ATTACHED") {
            if (upload.sha256 !== sha256)
                throw new Error("contribution_upload_content_conflict");
            return intent;
        }
        const objectKey = contributionMediaObjectKey(userId, uploadId, upload.mimeType);
        return this.repository.completeFormalContributionUpload(userId, intentId, uploadId, { byteSize: sanitized.length, sha256, objectKey, uploadedAt: new Date().toISOString() }, idempotencyKey, () => this.mediaStore.put({ objectKey, bytes: sanitized, mimeType: upload.mimeType }));
    }
    async removeFormalUpload(userId, intentId, uploadId, expectedRevision, idempotencyKey) {
        const intent = await this.repository.removeFormalContributionUpload(userId, intentId, uploadId, expectedRevision, idempotencyKey);
        await this.cleanupExpiredUploads();
        return intent;
    }
    async cleanupExpiredUploads() {
        const objectKeys = await this.repository.expireContributionUploads(new Date().toISOString());
        await Promise.all(objectKeys.map(async (key) => {
            await this.mediaStore.delete(key);
            await this.repository.acknowledgeContributionMediaDeletion([key]);
        }));
        return objectKeys.length;
    }
    async #ownedDraft(userId, submissionId) {
        const submission = await this.repository.getContribution(userId, submissionId);
        if (!submission)
            throw new Error("contribution_not_found");
        if (!isContributionEditable(submission.state))
            throw new Error("contribution_not_editable");
        return submission;
    }
}
//# sourceMappingURL=contribution-service.js.map