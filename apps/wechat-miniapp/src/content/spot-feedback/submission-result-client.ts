import type { RequestOperationScope } from "@/services/authenticated-operation";
import { currentDraftUserId, invalidateApiCache, contributionSubmissionTransport } from "@/services/api-client";
const requestOperation = contributionSubmissionTransport.request;

export async function getFormalContributionSubmitResult(spotId: string, key: string, owner: string, scope?: RequestOperationScope) {
  contributionSubmissionTransport.assertOwner(owner, scope);
  const result = await requestOperation("formal-contribution-submit-result:" + spotId, "formalContributionSubmitResultGet", {
    auth: "REQUIRED", cache: false, pathParams: { spotId }, idempotencyKey: key, scope,
  }, false, owner);
  contributionSubmissionTransport.assertOwner(owner, scope);
  const receipt = result.data.receipt;
  if (!receipt) return { receipt, current: null, baseline: null };
  if (receipt.state === "CONFLICT") {
    const baseline = await requestOperation("formal-contribution-result-baseline:" + spotId, "spotContributionBaselineGet", { auth: "NONE", cache: false, pathParams: { spotId }, scope }, false);
    contributionSubmissionTransport.assertOwner(owner, scope);
    if (baseline.dataState !== "FRESH" || baseline.data.revision < receipt.currentBaseline.revision) throw new Error("正式资料最新版本尚未确认；请重试核验。");
    return { receipt, current: null, baseline: baseline.data };
  }
  const latest = await requestOperation("formal-contribution-submit-current:" + spotId, "contributionsGet", { auth: "REQUIRED", cache: false, scope }, false, owner);
  contributionSubmissionTransport.assertOwner(owner, scope);
  const current = latest.dataState === "FRESH" ? latest.data.submissions.find(value => value.submissionId === receipt.submission.submissionId && value.spotId === spotId && value.revision >= receipt.submission.revision) ?? null : null;
  if (current) invalidateApiCache("contributions");
  return { receipt, current, baseline: null };
}
