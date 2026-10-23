import type { ContributionFormalUploadIntent, ContributionMediaUpload, ContributionSubmission } from "@starward/miniapp-contracts";
import { isContributionEditable, normalizeContributionSubmission } from "./contribution-attempts.ts";

/** Expiry is effective at its deadline even before physical retirement runs.
 * Submitted/attached evidence has a different lifetime and never expires here. */
export function isContributionUploadExpired(upload: ContributionMediaUpload, now = Date.now()) {
  return upload.state === "EXPIRED" || ((upload.state === "PENDING" || upload.state === "UPLOADED")
    && Date.parse(upload.expiresAt) <= now);
}

function projectUpload<T extends ContributionMediaUpload>(upload: T, now: number): T {
  return isContributionUploadExpired(upload, now) ? { ...upload, state: "EXPIRED" } : upload;
}

/** A read derives validity without acquiring write locks, revising the record,
 * rewriting frozen attempts or executing another account's object cleanup. */
export function projectContributionUploadLifetime(value: ContributionSubmission, now = Date.now()): ContributionSubmission {
  const result = normalizeContributionSubmission(value);
  return isContributionEditable(result.state)
    ? { ...result, media: result.media.map(upload => projectUpload(upload, now)) }
    : result;
}

export function projectFormalUploadLifetime(value: ContributionFormalUploadIntent, now = Date.now()): ContributionFormalUploadIntent {
  const result = structuredClone(value);
  return { ...result, uploads: result.uploads.map(upload => projectUpload(upload, now)) };
}
