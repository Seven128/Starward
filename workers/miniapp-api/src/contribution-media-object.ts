import { createHash } from "node:crypto";
import type { ContributionMediaUpload, ContributionUploadId, UserId } from "@starward/miniapp-contracts";

/** A persisted upload owns one object even while its completion is unconfirmed. */
export function contributionMediaObjectKey(userId: UserId, uploadId: ContributionUploadId, mimeType: ContributionMediaUpload["mimeType"]) {
  const id = String(uploadId).replace(/^upload:/u, "");
  if (!/^[a-zA-Z0-9_-]{10,160}$/u.test(id)) throw new Error("contribution_upload_object_id_invalid");
  const scope = createHash("sha256").update(userId).digest("hex").slice(0, 24);
  return `contributions/${scope}/${id}.${mimeType === "image/jpeg" ? "jpg" : "png"}`;
}

export function assertContributionUploadContent(upload: ContributionMediaUpload | undefined, sha256: string) {
  if (!upload || !["UPLOADED", "ATTACHED"].includes(upload.state) || upload.sha256 !== sha256)
    throw new Error("contribution_upload_content_conflict");
}
