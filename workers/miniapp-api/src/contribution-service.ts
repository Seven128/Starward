import { createHash, randomUUID } from "node:crypto";
import {
  type ContributionDraftRequest,
  type ContributionId,
  type ContributionMediaUpload,
  type ContributionSubmission,
  type ContributionUpdateRequest,
  type ContributionUploadCompleteRequest,
  type ContributionUploadId,
  type ContributionUploadSessionRequest,
  type UserId,
} from "@starward/miniapp-contracts";
import {
  assertContributionRelation,
  assertContributionSubmittable,
  cleanContributionText,
  CONTRIBUTION_MEDIA_MIME_TYPES,
  CONTRIBUTION_UPLOAD_TTL_MS,
  decodeContributionBase64,
  MAX_CONTRIBUTION_MEDIA,
  normalizeContributionInput,
} from "./contribution-validation.ts";
import { sanitizeContributionImage } from "./media-object-store.ts";
import type { MediaObjectStorePort, MiniappRepositoryPort } from "./ports.ts";
import type { MiniappRuntimeConfig } from "./runtime-config.ts";

export class ContributionService {
  constructor(
    private readonly repository: MiniappRepositoryPort,
    readonly mediaStore: MediaObjectStorePort,
    private readonly config: MiniappRuntimeConfig,
  ) {}

  async list(userId: UserId) {
    await this.cleanupExpiredUploads();
    return this.repository.listContributions(userId);
  }

  async createDraft(
    userId: UserId,
    input: ContributionDraftRequest,
    idempotencyKey: string,
  ) {
    const normalized = normalizeContributionInput(input);
    assertContributionRelation(normalized);
    const spot = normalized.spotId
      ? await this.repository.getSpot(normalized.spotId)
      : null;
    if (normalized.spotId && !spot)
      throw new Error("formal_spot_not_found");
    const now = new Date().toISOString();
    const submission: ContributionSubmission = {
      submissionId: `contribution:${randomUUID()}` as ContributionId,
      ...normalized,
      spotNameSnapshot: spot?.name ?? null,
      media: [],
      state: "DRAFT",
      submissionState: "DRAFT",
      mergeState: "NOT_STARTED",
      publicationImpact: "NONE",
      statusHistory: [],
      revision: 1,
      createdAt: now,
      updatedAt: now,
      review: null,
    };
    return this.repository.saveContributionDraft(
      userId,
      submission,
      null,
      idempotencyKey,
    );
  }

  async updateDraft(
    userId: UserId,
    submissionId: ContributionId,
    input: ContributionUpdateRequest,
    idempotencyKey: string,
  ) {
    const current = await this.#ownedDraft(userId, submissionId);
    const normalized = normalizeContributionInput(input);
    assertContributionRelation(normalized);
    const spot = normalized.spotId
      ? await this.repository.getSpot(normalized.spotId)
      : null;
    if (normalized.spotId && !spot)
      throw new Error("formal_spot_not_found");
    const next: ContributionSubmission = {
      ...current,
      ...normalized,
      spotNameSnapshot: spot?.name ?? null,
      revision: current.revision + 1,
      updatedAt: new Date().toISOString(),
    };
    return this.repository.saveContributionDraft(
      userId,
      next,
      input.expectedRevision,
      idempotencyKey,
    );
  }

  async createUpload(
    userId: UserId,
    submissionId: ContributionId,
    input: ContributionUploadSessionRequest,
    idempotencyKey: string,
  ) {
    if (!this.mediaStore.enabled)
      throw new Error("media_upload_capability_disabled");
    const submission = await this.#ownedDraft(userId, submissionId);
    if (!submission.rightsConfirmed)
      throw new Error("contribution_media_rights_required");
    if (submission.media.length >= MAX_CONTRIBUTION_MEDIA)
      throw new Error("contribution_media_count_invalid");
    if (!CONTRIBUTION_MEDIA_MIME_TYPES.has(input.mimeType))
      throw new Error("contribution_media_mime_invalid");
    const originalName = cleanContributionText(input.originalName, 120);
    if (!originalName || /[/\\]/u.test(originalName))
      throw new Error("contribution_media_name_invalid");
    if (
      !Number.isInteger(input.byteSize) ||
      input.byteSize <= 0 ||
      input.byteSize > this.config.mediaStorage.maxUploadBytes
    )
      throw new Error("contribution_media_size_invalid");
    const now = Date.now();
    const upload: ContributionMediaUpload = {
      uploadId: `upload:${randomUUID()}` as ContributionUploadId,
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
    return this.repository.createContributionUpload(
      userId,
      submissionId,
      upload,
      input.expectedRevision,
      idempotencyKey,
    );
  }

  async completeUpload(
    userId: UserId,
    submissionId: ContributionId,
    uploadId: ContributionUploadId,
    input: ContributionUploadCompleteRequest,
    idempotencyKey: string,
  ) {
    const submission = await this.#ownedDraft(userId, submissionId);
    const upload = submission.media.find((item) => item.uploadId === uploadId);
    if (!upload) throw new Error("contribution_upload_not_found");
    if (Date.parse(upload.expiresAt) <= Date.now()) {
      await this.cleanupExpiredUploads();
      throw new Error("contribution_upload_expired");
    }
    const raw = decodeContributionBase64(
      input.dataBase64,
      this.config.mediaStorage.maxUploadBytes,
    );
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
    const extension = upload.mimeType === "image/jpeg" ? "jpg" : "png";
    const scope = createHash("sha256").update(userId).digest("hex").slice(0, 24);
    const uploadObjectId = String(upload.uploadId).replace(/^upload:/u, "");
    if (!/^[a-zA-Z0-9_-]{10,160}$/u.test(uploadObjectId))
      throw new Error("contribution_upload_object_id_invalid");
    const objectKey = `contributions/${scope}/${uploadObjectId}.${extension}`;
    await this.mediaStore.put({
      objectKey,
      bytes: sanitized,
      mimeType: upload.mimeType,
    });
    try {
      return await this.repository.completeContributionUpload(
        userId,
        submissionId,
        uploadId,
        {
          byteSize: sanitized.length,
          sha256,
          objectKey,
          uploadedAt: new Date().toISOString(),
        },
        idempotencyKey,
      );
    } catch (error) {
      await this.mediaStore.delete(objectKey);
      throw error;
    }
  }

  async submit(
    userId: UserId,
    submissionId: ContributionId,
    expectedRevision: number,
    idempotencyKey: string,
  ) {
    const submission = await this.#ownedDraft(userId, submissionId);
    if (submission.revision !== expectedRevision)
      throw new Error("contribution_revision_conflict");
    assertContributionSubmittable(submission);
    return this.repository.submitContribution(
      userId,
      submissionId,
      expectedRevision,
      idempotencyKey,
    );
  }

  async readForAdmin(uploadId: ContributionUploadId) {
    const record = await this.repository.getContributionUploadObject(uploadId);
    if (!record) throw new Error("contribution_upload_not_found");
    const bytes = await this.mediaStore.read(record.objectKey);
    if (!bytes) throw new Error("contribution_media_object_missing");
    return {
      mimeType: record.mimeType,
      dataBase64: Buffer.from(bytes).toString("base64"),
    };
  }

  async cleanupExpiredUploads() {
    const objectKeys = await this.repository.expireContributionUploads(
      new Date().toISOString(),
    );
    await Promise.all(objectKeys.map((key) => this.mediaStore.delete(key)));
    return objectKeys.length;
  }

  async #ownedDraft(userId: UserId, submissionId: ContributionId) {
    const submission = await this.repository.getContribution(
      userId,
      submissionId,
    );
    if (!submission) throw new Error("contribution_not_found");
    if (submission.state !== "DRAFT")
      throw new Error("contribution_not_editable");
    return submission;
  }
}
