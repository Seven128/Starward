import type { ContributionFormalSubmitRequest, ContributionFormalUploadCompleteRequest, ContributionFormalUploadIntentRequest, ContributionFormalUploadSessionRequest } from "@starward/miniapp-contracts";
import { completeFormalContributionUpload as sendCompleted, createFormalContributionUpload as sendSession, createFormalUploadIntent as sendIntent, currentDraftUserId, ensureContributionOwner, idempotencyKey, removeFormalContributionUpload as sendRemoval, submitFormalContribution as sendSubmission } from "@/services/api-client";
import { createMutationRetry } from "@/services/mutation-retry";

const retryFormalUpload = createMutationRetry(() => idempotencyKey("formal-upload"));
const retryFormalSubmit = createMutationRetry(() => idempotencyKey("formal-contribution-submit"));

async function ownedFormalUpload<T>(identity: unknown, send: (key: string, owner: string) => Promise<T>): Promise<T> {
  const owner = await ensureContributionOwner();
  return retryFormalUpload(owner, identity, async key => {
    const result = await send(key, owner);
    if (currentDraftUserId() !== owner) throw new Error("账号已变化，请回到原账号核对反馈照片结果。");
    return result;
  });
}

export function createFormalUploadIntent(input: ContributionFormalUploadIntentRequest) {
  return ownedFormalUpload(["intent", input], (key, owner) => sendIntent(input, key, owner));
}

export function createFormalContributionUpload(intentId: string, input: ContributionFormalUploadSessionRequest) {
  return ownedFormalUpload(["session", intentId, input], (key, owner) => sendSession(intentId, input, key, owner));
}

export function completeFormalContributionUpload(intentId: string, uploadId: string, input: ContributionFormalUploadCompleteRequest) {
  return ownedFormalUpload(["complete", intentId, uploadId, input], (key, owner) => sendCompleted(intentId, uploadId, input, key, owner));
}

export function removeFormalContributionUpload(intentId: string, uploadId: string, expectedRevision: number) {
  return ownedFormalUpload(["remove", intentId, uploadId, expectedRevision], (key, owner) => sendRemoval(intentId, uploadId, expectedRevision, key, owner));
}

export async function submitFormalContribution(input: ContributionFormalSubmitRequest) {
  const owner = await ensureContributionOwner();
  return retryFormalSubmit(owner, input, async key => {
    const result = await sendSubmission(input, key, owner);
    if (currentDraftUserId() !== owner) throw new Error("账号已变化，请回到原账号核对反馈结果。");
    return result;
  });
}
