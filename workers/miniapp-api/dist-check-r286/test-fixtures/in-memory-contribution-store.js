import { assertContributionUploadContent, contributionMediaObjectKey } from "../contribution-media-object.js";
import { randomUUID } from "node:crypto";
import { assertContributionSubmittable, assertContributionUploadFits } from "../contribution-validation.js";
import { appendContributionAttempt, appendCandidateProfileMedia, isContributionEditable, removeCandidateProfileMedia, contributionMediaHasHistory, } from "../contribution-attempts.js";
import { buildFormalContributionResult } from "../formal-contribution-submission.js";
export class InMemoryContributionStore {
    #records = new Map();
    #objects = new Map();
    #idempotency = new Map();
    #pendingDeletion = new Set();
    reset() {
        this.#records.clear();
        this.#objects.clear();
        this.#idempotency.clear();
        this.#pendingDeletion.clear();
    }
    deleteUser(userId) {
        const records = this.#records.get(userId);
        let cleanupRequired = false;
        for (const submission of records?.values() ?? [])
            for (const upload of [...submission.media, ...(submission.attempts ?? []).flatMap(attempt => attempt.snapshot.media)]) {
                cleanupRequired ||= upload.state === "PENDING" || this.#objects.has(upload.uploadId);
                this.#queueDeletion(userId, upload);
                this.#objects.delete(upload.uploadId);
            }
        // Includes legacy ATTACHED media removed from the working copy before
        // explicit attempt snapshots existed.
        for (const [uploadId, object] of this.#objects)
            if (object.userId === userId) {
                cleanupRequired = true;
                this.#pendingDeletion.add(object.objectKey);
                this.#objects.delete(uploadId);
            }
        this.#records.delete(userId);
        for (const key of this.#idempotency.keys())
            if (key.startsWith(`${userId}|`))
                this.#idempotency.delete(key);
        return cleanupRequired;
    }
    ensureUser(userId) {
        if (!this.#records.has(userId))
            this.#records.set(userId, new Map());
    }
    list(userId) {
        this.ensureUser(userId);
        return [...this.#records.get(userId).values()]
            .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
            .map((submission) => structuredClone(submission));
    }
    get(userId, submissionId) {
        this.ensureUser(userId);
        const submission = this.#records.get(userId).get(submissionId);
        return submission ? structuredClone(submission) : null;
    }
    saveDraft(userId, submission, expectedRevision, idempotencyKey) {
        this.ensureUser(userId);
        const replay = this.#replay(userId, idempotencyKey);
        if (replay)
            return structuredClone(replay);
        const records = this.#records.get(userId);
        const current = records.get(submission.submissionId);
        if (expectedRevision === null && current)
            throw new Error("contribution_already_exists");
        if (expectedRevision !== null && current?.revision !== expectedRevision)
            throw new Error("contribution_revision_conflict");
        records.set(submission.submissionId, structuredClone(submission));
        this.#remember(userId, idempotencyKey, submission);
        return structuredClone(submission);
    }
    createUpload(userId, submissionId, upload, expectedRevision, idempotencyKey, replaceUploadId) {
        this.ensureUser(userId);
        const replay = this.#replay(userId, idempotencyKey);
        if (replay)
            return structuredClone(replay);
        const records = this.#records.get(userId);
        const current = records.get(submissionId);
        if (!current)
            throw new Error("contribution_not_found");
        if (current.revision !== expectedRevision)
            throw new Error("contribution_revision_conflict");
        if (!isContributionEditable(current.state))
            throw new Error("contribution_not_editable");
        if (!current.rightsConfirmed)
            throw new Error("contribution_media_rights_required");
        const replaced = replaceUploadId ? current.media.find((item) => item.uploadId === replaceUploadId) : undefined;
        if (replaceUploadId && (!replaced || replaced.state !== "EXPIRED"))
            throw new Error("contribution_upload_replacement_invalid");
        assertContributionUploadFits(current, upload, replaced);
        const candidateProfile = appendCandidateProfileMedia(current, upload, replaced);
        const next = {
            ...structuredClone(current),
            media: replaced ? current.media.map((item) => structuredClone(item.uploadId === replaceUploadId ? upload : item)) : [
                ...current.media.map((item) => structuredClone(item)),
                structuredClone(upload),
            ],
            ...(candidateProfile ? { candidateProfile } : {}),
            revision: current.revision + 1,
            updatedAt: new Date().toISOString(),
        };
        records.set(submissionId, next);
        this.#remember(userId, idempotencyKey, next);
        return structuredClone(next);
    }
    async completeUpload(userId, submissionId, uploadId, completion, idempotencyKey, writeObject) {
        this.ensureUser(userId);
        const replay = this.#replay(userId, idempotencyKey);
        if (replay) {
            assertContributionUploadContent(replay.media.find(item => item.uploadId === uploadId), completion.sha256);
            return structuredClone(replay);
        }
        const records = this.#records.get(userId);
        const current = records.get(submissionId);
        if (!current)
            throw new Error("contribution_not_found");
        const upload = current.media.find((item) => item.uploadId === uploadId);
        if (!upload)
            throw new Error("contribution_upload_not_found");
        if (["UPLOADED", "ATTACHED"].includes(upload.state)) {
            assertContributionUploadContent(upload, completion.sha256);
            return structuredClone(current);
        }
        if (!isContributionEditable(current.state))
            throw new Error("contribution_not_editable");
        if (Date.parse(upload.expiresAt) <= Date.now())
            throw new Error("contribution_upload_expired");
        if (completion.objectKey !== contributionMediaObjectKey(userId, uploadId, upload.mimeType))
            throw new Error("contribution_upload_object_key_invalid");
        if (upload.state !== "PENDING")
            throw new Error("contribution_upload_not_pending");
        await writeObject();
        const next = {
            ...structuredClone(current),
            media: current.media.map((item) => item.uploadId === uploadId
                ? {
                    ...structuredClone(item),
                    state: "UPLOADED",
                    byteSize: completion.byteSize,
                    sha256: completion.sha256,
                    uploadedAt: completion.uploadedAt,
                }
                : structuredClone(item)),
            revision: current.revision + 1,
            updatedAt: completion.uploadedAt,
        };
        records.set(submissionId, next);
        this.#objects.set(uploadId, {
            userId,
            submissionId,
            attached: false,
            objectKey: completion.objectKey,
            mimeType: upload.mimeType,
        });
        this.#remember(userId, idempotencyKey, next);
        return structuredClone(next);
    }
    submit(userId, submissionId, expectedRevision, idempotencyKey) {
        this.ensureUser(userId);
        const replay = this.#replay(userId, idempotencyKey);
        if (replay)
            return structuredClone(replay);
        const records = this.#records.get(userId);
        const current = records.get(submissionId);
        if (!current)
            throw new Error("contribution_not_found");
        if (current.revision !== expectedRevision)
            throw new Error("contribution_revision_conflict");
        const now = new Date().toISOString();
        assertContributionSubmittable(current);
        const next = {
            ...structuredClone(current),
            ...appendContributionAttempt(current, now),
            state: "PENDING_REVIEW",
            submissionState: "PENDING_REVIEW",
            review: null,
            mergeState: "NOT_STARTED",
            publicationImpact: "NONE",
            statusHistory: [
                ...current.statusHistory,
                {
                    eventId: `contribution-event:${randomUUID()}`,
                    axis: "SUBMISSION",
                    from: current.submissionState,
                    to: "PENDING_REVIEW",
                    reason: null,
                    actorType: "USER",
                    occurredAt: now,
                },
            ],
            media: current.media.map((item) => ({
                ...structuredClone(item),
                state: "ATTACHED",
            })),
            revision: current.revision + 1,
            updatedAt: now,
        };
        for (const upload of next.media) {
            const object = this.#objects.get(upload.uploadId);
            if (object)
                object.attached = true;
        }
        records.set(submissionId, next);
        this.#remember(userId, idempotencyKey, next);
        return structuredClone(next);
    }
    removeUpload(userId, submissionId, uploadId, expectedRevision, idempotencyKey) {
        this.ensureUser(userId);
        const replay = this.#replay(userId, idempotencyKey);
        if (replay)
            return structuredClone(replay);
        const records = this.#records.get(userId);
        const current = records.get(submissionId);
        if (!current)
            throw new Error("contribution_not_found");
        if (!isContributionEditable(current.state))
            throw new Error("contribution_not_editable");
        if (current.revision !== expectedRevision)
            throw new Error("contribution_revision_conflict");
        const upload = current.media.find((item) => item.uploadId === uploadId);
        if (!upload)
            throw new Error("contribution_upload_not_found");
        const retainedForHistory = contributionMediaHasHistory(current, upload);
        const candidateProfile = removeCandidateProfileMedia(current, upload);
        const next = { ...structuredClone(current), media: current.media.filter((item) => item.uploadId !== uploadId).map((item) => structuredClone(item)), ...(candidateProfile ? { candidateProfile } : {}), revision: current.revision + 1, updatedAt: new Date().toISOString() };
        if (!retainedForHistory) {
            this.#queueDeletion(userId, upload);
            this.#objects.delete(uploadId);
        }
        records.set(submissionId, next);
        this.#remember(userId, idempotencyKey, next);
        return structuredClone(next);
    }
    withdrawDraft(userId, submissionId, expectedRevision, idempotencyKey) {
        this.ensureUser(userId);
        const replay = this.#replay(userId, idempotencyKey);
        if (replay)
            return structuredClone(replay);
        const records = this.#records.get(userId);
        const current = records.get(submissionId);
        if (!current)
            throw new Error("contribution_not_found");
        if (current.state !== "DRAFT")
            throw new Error("contribution_not_editable");
        if (current.revision !== expectedRevision)
            throw new Error("contribution_revision_conflict");
        const now = new Date().toISOString();
        for (const upload of current.media) {
            this.#queueDeletion(userId, upload);
            this.#objects.delete(upload.uploadId);
        }
        const next = {
            ...structuredClone(current),
            state: "WITHDRAWN",
            submissionState: "WITHDRAWN",
            media: current.media.map((item) => ({ ...structuredClone(item), state: "EXPIRED" })),
            statusHistory: [...current.statusHistory, {
                    eventId: `contribution-event:${randomUUID()}`,
                    axis: "SUBMISSION",
                    from: "DRAFT",
                    to: "WITHDRAWN",
                    reason: "用户删除草稿",
                    actorType: "USER",
                    occurredAt: now,
                }],
            revision: current.revision + 1,
            updatedAt: now,
        };
        records.set(submissionId, next);
        this.#remember(userId, idempotencyKey, next);
        return structuredClone(next);
    }
    submitFormal(userId, request, currentBaseline, idempotencyKey, uploads = []) {
        this.ensureUser(userId);
        const replay = this.#replay(userId, idempotencyKey);
        if (replay)
            return structuredClone(replay);
        const records = this.#records.get(userId);
        const existing = request.submissionId ? records.get(request.submissionId) : null;
        if (request.submissionId) {
            if (!existing)
                throw new Error("contribution_not_found");
            if (!isContributionEditable(existing.state))
                throw new Error("contribution_not_editable");
            if (existing.revision !== request.expectedSubmissionRevision)
                throw new Error("contribution_revision_conflict");
            if (existing.spotId !== request.baseline.spotId || existing.kind === "NEW_SPOT_PROPOSAL")
                throw new Error("contribution_resubmit_identity_invalid");
        }
        const duplicate = [...records.values()].find(value => value.submissionState === "PENDING_REVIEW" && value.spotId === request.baseline.spotId && value.submissionId !== request.submissionId);
        if (duplicate)
            throw new Error("contribution_formal_pending_exists");
        const result = buildFormalContributionResult({ request, currentBaseline, existing: existing ?? null, uploads });
        if (result.state === "SUBMITTED")
            records.set(result.submission.submissionId, structuredClone(result.submission));
        this.#remember(userId, idempotencyKey, result);
        return structuredClone(result);
    }
    expireUploads(now) {
        const expiredObjects = [];
        for (const [userId, records] of this.#records)
            for (const [submissionId, submission] of records)
                this.#expireSubmission(userId, records, submissionId, submission, now, expiredObjects);
        for (const key of expiredObjects)
            this.#pendingDeletion.add(key);
        return [...this.#pendingDeletion];
    }
    acknowledgeMediaDeletion(objectKeys) {
        for (const key of objectKeys)
            this.#pendingDeletion.delete(key);
    }
    #expireSubmission(userId, records, submissionId, submission, now, expiredObjects) {
        let changed = false;
        const media = submission.media.map((item) => {
            if (!["PENDING", "UPLOADED"].includes(item.state))
                return structuredClone(item);
            if (item.expiresAt > now)
                return structuredClone(item);
            changed = true;
            const object = this.#objects.get(item.uploadId);
            if (object)
                expiredObjects.push(object.objectKey);
            else if (item.state === "PENDING")
                expiredObjects.push(contributionMediaObjectKey(userId, item.uploadId, item.mimeType));
            this.#objects.delete(item.uploadId);
            return { ...structuredClone(item), state: "EXPIRED" };
        });
        if (changed)
            records.set(submissionId, {
                ...structuredClone(submission),
                media,
                revision: submission.revision + 1,
                updatedAt: now,
            });
    }
    #queueDeletion(userId, upload) {
        const object = this.#objects.get(upload.uploadId);
        if (object)
            this.#pendingDeletion.add(object.objectKey);
        else if (upload.state === "PENDING")
            this.#pendingDeletion.add(contributionMediaObjectKey(userId, upload.uploadId, upload.mimeType));
    }
    ownsUpload(userId, submissionId, uploadId) {
        const object = this.#objects.get(uploadId);
        return Boolean(object?.attached && object.userId === userId && object.submissionId === submissionId);
    }
    getUploadObject(uploadId) {
        const value = this.#objects.get(uploadId);
        return value ? { objectKey: value.objectKey, mimeType: value.mimeType } : null;
    }
    #key(userId, idempotencyKey) {
        return `${userId}|${idempotencyKey}`;
    }
    #replay(userId, idempotencyKey) {
        return this.#idempotency.get(this.#key(userId, idempotencyKey));
    }
    #remember(userId, idempotencyKey, value) {
        this.#idempotency.set(this.#key(userId, idempotencyKey), structuredClone(value));
    }
}
//# sourceMappingURL=in-memory-contribution-store.js.map