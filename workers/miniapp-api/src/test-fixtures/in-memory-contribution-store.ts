import { assertContributionUploadContent, contributionMediaObjectKey } from "../contribution-media-object.ts";
import { randomUUID } from "node:crypto";
import { assertContributionSubmittable, assertContributionUploadFits } from "../contribution-validation.ts";
import type {
  ContributionId,
  ContributionMediaUpload,
  ContributionSubmission,
  ContributionFormalBaseline,
  ContributionFormalSubmitRequest,
  ContributionFormalSubmitResult,
  ContributionUploadId,
  UserId,
} from "@starward/miniapp-contracts";
import {
  appendContributionAttempt,
  appendCandidateProfileMedia,
  isContributionEditable,
  removeCandidateProfileMedia,
  contributionMediaHasHistory,
} from "../contribution-attempts.ts";
import { buildFormalContributionResult } from "../formal-contribution-submission.ts";

export class InMemoryContributionStore {
  #records = new Map<
    UserId,
    Map<ContributionId, ContributionSubmission>
  >();
  #objects = new Map<
    ContributionUploadId,
    { objectKey: string; mimeType: ContributionMediaUpload["mimeType"]; userId: UserId; submissionId: ContributionId; attached: boolean }
  >();
  #idempotency = new Map<string, unknown>();
  #pendingDeletion = new Set<string>();

  reset() {
    this.#records.clear();
    this.#objects.clear();
    this.#idempotency.clear();
    this.#pendingDeletion.clear();
  }

  deleteUser(userId: UserId) {
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
    for (const [uploadId, object] of this.#objects) if (object.userId === userId) {
      cleanupRequired = true;
      this.#pendingDeletion.add(object.objectKey);
      this.#objects.delete(uploadId);
    }
    this.#records.delete(userId);
    for (const key of this.#idempotency.keys())
      if (key.startsWith(`${userId}|`)) this.#idempotency.delete(key);
    return cleanupRequired;
  }

  ensureUser(userId: UserId) {
    if (!this.#records.has(userId)) this.#records.set(userId, new Map());
  }

  list(userId: UserId) {
    this.ensureUser(userId);
    return [...this.#records.get(userId)!.values()]
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
      .map((submission) => structuredClone(submission));
  }

  get(userId: UserId, submissionId: ContributionId) {
    this.ensureUser(userId);
    const submission = this.#records.get(userId)!.get(submissionId);
    return submission ? structuredClone(submission) : null;
  }

  saveDraft(
    userId: UserId,
    submission: ContributionSubmission,
    expectedRevision: number | null,
    idempotencyKey: string,
  ) {
    this.ensureUser(userId);
    const replay = this.#replay<ContributionSubmission>(userId, idempotencyKey);
    if (replay) return structuredClone(replay);
    const records = this.#records.get(userId)!;
    const current = records.get(submission.submissionId);
    if (expectedRevision === null && current)
      throw new Error("contribution_already_exists");
    if (expectedRevision !== null && current?.revision !== expectedRevision)
      throw new Error("contribution_revision_conflict");
    records.set(submission.submissionId, structuredClone(submission));
    this.#remember(userId, idempotencyKey, submission);
    return structuredClone(submission);
  }

  createUpload(
    userId: UserId,
    submissionId: ContributionId,
    upload: ContributionMediaUpload,
    expectedRevision: number,
    idempotencyKey: string,
    replaceUploadId?: ContributionUploadId,
  ) {
    this.ensureUser(userId);
    const replay = this.#replay<ContributionSubmission>(userId, idempotencyKey);
    if (replay) return structuredClone(replay);
    const records = this.#records.get(userId)!;
    const current = records.get(submissionId);
    if (!current) throw new Error("contribution_not_found");
    if (current.revision !== expectedRevision)
      throw new Error("contribution_revision_conflict");
    if (!isContributionEditable(current.state)) throw new Error("contribution_not_editable");
    if (!current.rightsConfirmed) throw new Error("contribution_media_rights_required");
    const replaced = replaceUploadId ? current.media.find((item) => item.uploadId === replaceUploadId) : undefined;
    if (replaceUploadId && (!replaced || replaced.state !== "EXPIRED")) throw new Error("contribution_upload_replacement_invalid");
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

  async completeUpload(
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
    writeObject: () => Promise<void>,
  ) {
    this.ensureUser(userId);
    const replay = this.#replay<ContributionSubmission>(userId, idempotencyKey);
    if (replay) {
      assertContributionUploadContent(replay.media.find(item => item.uploadId === uploadId), completion.sha256);
      return structuredClone(replay);
    }
    const records = this.#records.get(userId)!;
    const current = records.get(submissionId);
    if (!current) throw new Error("contribution_not_found");
    const upload = current.media.find((item) => item.uploadId === uploadId);
    if (!upload) throw new Error("contribution_upload_not_found");
    if (["UPLOADED", "ATTACHED"].includes(upload.state)) {
      assertContributionUploadContent(upload, completion.sha256);
      return structuredClone(current);
    }
    if (!isContributionEditable(current.state)) throw new Error("contribution_not_editable");
    if (Date.parse(upload.expiresAt) <= Date.now()) throw new Error("contribution_upload_expired");
    if (completion.objectKey !== contributionMediaObjectKey(userId, uploadId, upload.mimeType)) throw new Error("contribution_upload_object_key_invalid");
    if (upload.state !== "PENDING")
      throw new Error("contribution_upload_not_pending");
    await writeObject();
    const next = {
      ...structuredClone(current),
      media: current.media.map((item) =>
        item.uploadId === uploadId
          ? {
              ...structuredClone(item),
              state: "UPLOADED" as const,
              byteSize: completion.byteSize,
              sha256: completion.sha256,
              uploadedAt: completion.uploadedAt,
            }
          : structuredClone(item),
      ),
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

  submit(
    userId: UserId,
    submissionId: ContributionId,
    expectedRevision: number,
    idempotencyKey: string,
  ) {
    this.ensureUser(userId);
    const replay = this.#replay<ContributionSubmission>(userId, idempotencyKey);
    if (replay) return structuredClone(replay);
    const records = this.#records.get(userId)!;
    const current = records.get(submissionId);
    if (!current) throw new Error("contribution_not_found");
    if (current.revision !== expectedRevision)
      throw new Error("contribution_revision_conflict");
    const now = new Date().toISOString();
    assertContributionSubmittable(current);
    const next = {
      ...structuredClone(current),
      ...appendContributionAttempt(current, now),
      state: "PENDING_REVIEW" as const,
      submissionState: "PENDING_REVIEW" as const,
      review: null,
      mergeState: "NOT_STARTED" as const,
      publicationImpact: "NONE" as const,
      statusHistory: [
        ...current.statusHistory,
        {
          eventId: `contribution-event:${randomUUID()}`,
          axis: "SUBMISSION" as const,
          from: current.submissionState,
          to: "PENDING_REVIEW",
          reason: null,
          actorType: "USER" as const,
          occurredAt: now,
        },
      ],
      media: current.media.map((item) => ({
        ...structuredClone(item),
        state: "ATTACHED" as const,
      })),
      revision: current.revision + 1,
      updatedAt: now,
    };
    for (const upload of next.media) {
      const object = this.#objects.get(upload.uploadId);
      if (object) object.attached = true;
    }
    records.set(submissionId, next);
    this.#remember(userId, idempotencyKey, next);
    return structuredClone(next);
  }

  removeUpload(userId: UserId, submissionId: ContributionId, uploadId: ContributionUploadId, expectedRevision: number, idempotencyKey: string) {
    this.ensureUser(userId);
    const replay = this.#replay<ContributionSubmission>(userId, idempotencyKey);
    if (replay) return structuredClone(replay);
    const records = this.#records.get(userId)!;
    const current = records.get(submissionId);
    if (!current) throw new Error("contribution_not_found");
    if (!isContributionEditable(current.state)) throw new Error("contribution_not_editable");
    if (current.revision !== expectedRevision) throw new Error("contribution_revision_conflict");
    const upload = current.media.find((item) => item.uploadId === uploadId);
    if (!upload) throw new Error("contribution_upload_not_found");
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

  withdrawDraft(
    userId: UserId,
    submissionId: ContributionId,
    expectedRevision: number,
    idempotencyKey: string,
  ) {
    this.ensureUser(userId);
    const replay = this.#replay<ContributionSubmission>(userId, idempotencyKey);
    if (replay) return structuredClone(replay);
    const records = this.#records.get(userId)!;
    const current = records.get(submissionId);
    if (!current) throw new Error("contribution_not_found");
    if (current.state !== "DRAFT") throw new Error("contribution_not_editable");
    if (current.revision !== expectedRevision)
      throw new Error("contribution_revision_conflict");
    const now = new Date().toISOString();
    for (const upload of current.media) {
      this.#queueDeletion(userId, upload);
      this.#objects.delete(upload.uploadId);
    }
    const next: ContributionSubmission = {
      ...structuredClone(current),
      state: "WITHDRAWN",
      submissionState: "WITHDRAWN",
      media: current.media.map((item) => ({ ...structuredClone(item), state: "EXPIRED" as const })),
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

  submitFormal(userId: UserId, request: ContributionFormalSubmitRequest, currentBaseline: ContributionFormalBaseline, idempotencyKey: string, uploads: readonly ContributionMediaUpload[] = []): ContributionFormalSubmitResult {
    this.ensureUser(userId);
    const replay = this.#replay<ContributionFormalSubmitResult>(userId, idempotencyKey);
    if (replay) return structuredClone(replay);
    const records = this.#records.get(userId)!;
    const existing = request.submissionId ? records.get(request.submissionId) : null;
    if (request.submissionId) {
      if (!existing) throw new Error("contribution_not_found");
      if (!isContributionEditable(existing.state)) throw new Error("contribution_not_editable");
      if (existing.revision !== request.expectedSubmissionRevision) throw new Error("contribution_revision_conflict");
      if (existing.spotId !== request.baseline.spotId || existing.kind === "NEW_SPOT_PROPOSAL") throw new Error("contribution_resubmit_identity_invalid");
    }
    const duplicate = [...records.values()].find(value =>
      value.submissionState === "PENDING_REVIEW" && value.spotId === request.baseline.spotId && value.submissionId !== request.submissionId,
    );
    if (duplicate) throw new Error("contribution_formal_pending_exists");
    const result = buildFormalContributionResult({ request, currentBaseline, existing: existing ?? null, uploads });
    if (result.state === "SUBMITTED") records.set(result.submission.submissionId, structuredClone(result.submission));
    this.#remember(userId, idempotencyKey, result);
    return structuredClone(result);
  }

  expireUploads(now: string) {
    const expiredObjects: string[] = [];
    for (const [userId, records] of this.#records)
      for (const [submissionId, submission] of records)
        this.#expireSubmission(userId, records, submissionId, submission, now, expiredObjects);
    for (const key of expiredObjects) this.#pendingDeletion.add(key);
    return [...this.#pendingDeletion];
  }

  acknowledgeMediaDeletion(objectKeys: readonly string[]) {
    for (const key of objectKeys) this.#pendingDeletion.delete(key);
  }

  #expireSubmission(
    userId: UserId,
    records: Map<ContributionId, ContributionSubmission>,
    submissionId: ContributionId,
    submission: ContributionSubmission,
    now: string,
    expiredObjects: string[],
  ) {
    let changed = false;
    const media = submission.media.map((item) => {
      if (!(["PENDING", "UPLOADED"] as const).includes(item.state as never))
        return structuredClone(item);
      if (item.expiresAt > now) return structuredClone(item);
      changed = true;
      const object = this.#objects.get(item.uploadId);
      if (object) expiredObjects.push(object.objectKey);
      else if (item.state === "PENDING") expiredObjects.push(contributionMediaObjectKey(userId, item.uploadId, item.mimeType));
      this.#objects.delete(item.uploadId);
      return { ...structuredClone(item), state: "EXPIRED" as const };
    });
    if (changed)
      records.set(submissionId, {
        ...structuredClone(submission),
        media,
        revision: submission.revision + 1,
        updatedAt: now,
      });
  }

  #queueDeletion(userId: UserId, upload: ContributionMediaUpload) {
    const object = this.#objects.get(upload.uploadId);
    if (object) this.#pendingDeletion.add(object.objectKey);
    else if (upload.state === "PENDING") this.#pendingDeletion.add(contributionMediaObjectKey(userId, upload.uploadId, upload.mimeType));
  }

  ownsUpload(userId: UserId, submissionId: ContributionId, uploadId: ContributionUploadId) {
    const object = this.#objects.get(uploadId);
    return Boolean(object?.attached && object.userId === userId && object.submissionId === submissionId);
  }

  getUploadObject(uploadId: ContributionUploadId) {
    const value = this.#objects.get(uploadId);
    return value ? { objectKey: value.objectKey, mimeType: value.mimeType } : null;
  }

  #key(userId: UserId, idempotencyKey: string) {
    return `${userId}|${idempotencyKey}`;
  }
  #replay<T>(userId: UserId, idempotencyKey: string): T | undefined {
    return this.#idempotency.get(this.#key(userId, idempotencyKey)) as
      | T
      | undefined;
  }
  #remember(userId: UserId, idempotencyKey: string, value: unknown) {
    this.#idempotency.set(
      this.#key(userId, idempotencyKey),
      structuredClone(value),
    );
  }
}
