import Taro from "@tarojs/taro";
import type { ContributionId } from "@starward/miniapp-contracts";
import type { RequestOperationScope } from "@/services/authenticated-operation";
import { currentDraftUserId, invalidateApiCache, contributionSubmissionTransport } from "@/services/api-client";
import { readContributionSubmitKey, clearContributionSubmitIntent, ContributionSubmitStorageError } from "@/services/contribution-submit-retry";
const requestOperation = contributionSubmissionTransport.request;
const sendContributionSubmit = contributionSubmissionTransport.send;
const retryContributionSubmit = { existing: contributionSubmissionTransport.retryExisting };

export async function getContributionSubmitResult(submissionId: ContributionId, expectedRevision: number, scope?: RequestOperationScope) {
  const owner = contributionSubmissionTransport.assertOwner(undefined, scope);
  const key = readContributionSubmitKey(Taro, owner, submissionId, expectedRevision);
  if (!key) throw new ContributionSubmitStorageError("原提交标识暂不可用，请到记录中核对。");
  const result = await requestOperation("contribution-submit-result:" + submissionId, "contributionSubmitResultGet", {
    auth: "REQUIRED", cache: false, pathParams: { submissionId }, idempotencyKey: key, scope,
  }, false, owner);
  contributionSubmissionTransport.assertOwner(owner, scope);
  if (!result.data.receipt) return { receipt: null, current: null };
  const latest = await requestOperation("contribution-submit-current:" + submissionId, "contributionsGet", { auth: "REQUIRED", cache: false, scope }, false, owner);
  contributionSubmissionTransport.assertOwner(owner, scope);
  const current = latest.dataState === "FRESH" ? latest.data.submissions.find(value => value.submissionId === submissionId && value.revision >= result.data.receipt!.revision) ?? null : null;
  if (current) { invalidateApiCache("contributions"); try { clearContributionSubmitIntent(Taro, owner, submissionId, expectedRevision); } catch { /* The receipt remains authoritative. */ } }
  return { receipt: result.data.receipt, current };
}

/** Explicit replay is separate from GET verification and can only use the durable original key. */
export async function retryPendingContributionSubmit(submissionId: ContributionId, expectedRevision: number, scope?: RequestOperationScope) {
  const owner = contributionSubmissionTransport.assertOwner(undefined, scope);
  return retryContributionSubmit.existing(owner, { submissionId, expectedRevision }, async key => {
    const receipt = await sendContributionSubmit(submissionId, expectedRevision, key, owner, scope);
    const latest = await requestOperation("contribution-retry-current:" + submissionId, "contributionsGet", { auth: "REQUIRED", cache: false, scope }, false, owner);
    contributionSubmissionTransport.assertOwner(owner, scope);
    const current = latest.dataState === "FRESH" ? latest.data.submissions.find(value => value.submissionId === submissionId && value.revision >= receipt.data.revision) : null;
    if (!current) throw new Error("原提交已有回执，最新记录尚未读回。");
    return { ...receipt, data: current };
  });
}
