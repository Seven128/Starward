import { randomUUID } from "node:crypto";
import type {
  ContributionId,
  ContributionMediaUpload,
  ContributionSubmission,
  ContributionUploadId,
  UserId,
} from "@starward/miniapp-contracts";

export class InMemoryContributionStore {
  #records = new Map<
    UserId,
    Map<ContributionId, ContributionSubmission>
  >();
  #objects = new Map<
    ContributionUploadId,
    { objectKey: string; mimeType: ContributionMediaUpload["mimeType"] }
  >();
  #idempotency = new Map<string, unknown>();

  reset() {
    this.#records.clear();
    this.#objects.clear();
    this.#idempotency.clear();
  }

  deleteUser(userId: UserId) {
    const records = this.#records.get(userId);
    for (const submission of records?.values() ?? [])
      for (const upload of submission.media) this.#objects.delete(upload.uploadId);
    this.#records.delete(userId);
    for (const key of this.#idempotency.keys())
      if (key.startsWith(`${userId}|`)) this.#idempotency.delete(key);
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
  ) {
    this.ensureUser(userId);
    const replay = this.#replay<ContributionSubmission>(userId, idempotencyKey);
    if (replay) return structuredClone(replay);
    const records = this.#records.get(userId)!;
    const current = records.get(submissionId);
    if (!current) throw new Error("contribution_not_found");
    if (current.revision !== expectedRevision)
      throw new Error("contribution_revision_conflict");
    const next = {
      ...structuredClone(current),
      media: [
        ...current.media.map((item) => structuredClone(item)),
        structuredClone(upload),
      ],
      revision: current.revision + 1,
      updatedAt: new Date().toISOString(),
    };
    records.set(submissionId, next);
    this.#remember(userId, idempotencyKey, next);
    return structuredClone(next);
  }

  completeUpload(
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
    this.ensureUser(userId);
    const replay = this.#replay<ContributionSubmission>(userId, idempotencyKey);
    if (replay) return structuredClone(replay);
    const records = this.#records.get(userId)!;
    const current = records.get(submissionId);
    if (!current) throw new Error("contribution_not_found");
    const upload = current.media.find((item) => item.uploadId === uploadId);
    if (!upload) throw new Error("contribution_upload_not_found");
    if (upload.state !== "PENDING")
      throw new Error("contribution_upload_not_pending");
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
    const next = {
      ...structuredClone(current),
      state: "PENDING_REVIEW" as const,
      submissionState: "PENDING_REVIEW" as const,
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
    records.set(submissionId, next);
    this.#remember(userId, idempotencyKey, next);
    return structuredClone(next);
  }

  expireUploads(now: string) {
    const expiredObjects: string[] = [];
    for (const records of this.#records.values())
      for (const [submissionId, submission] of records)
        this.#expireSubmission(records, submissionId, submission, now, expiredObjects);
    return expiredObjects;
  }

  #expireSubmission(
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

  getUploadObject(uploadId: ContributionUploadId) {
    const value = this.#objects.get(uploadId);
    return value ? structuredClone(value) : null;
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
