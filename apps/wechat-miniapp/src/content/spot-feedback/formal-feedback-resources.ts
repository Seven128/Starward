import type { ContributionSubmission } from "@starward/miniapp-contracts";

type RecoverableResource = {
  isError?: boolean;
  refreshError?: unknown;
  dataState?: string | undefined;
  refetch(): Promise<unknown>;
};

type FeedbackHistory = {
  data?: { dataState?: string; data?: { submissions: readonly ContributionSubmission[] } } | undefined;
  isError?: boolean;
  isFetching?: boolean;
  refreshError?: unknown;
};

export function resolveRequestedFormalFeedback(history: FeedbackHistory, spotId: string, submissionId: string) {
  if (!submissionId) return { status: "UNREQUESTED" } as const;
  if (!history.data?.data || history.isError || history.isFetching || history.refreshError ||
    history.data.dataState === "STALE_USABLE") return { status: "UNCONFIRMED" } as const;
  const record = history.data.data.submissions.find(item => item.submissionId === submissionId && item.spotId === spotId);
  if (record?.formalFeedback && (record.submissionState === "REJECTED" || record.submissionState === "CHANGES_REQUESTED"))
    return { status: "READY", record: { ...record, formalFeedback: record.formalFeedback } } as const;
  return { status: "UNAVAILABLE" } as const;
}

export async function retryFailedFormalResources(...resources: readonly RecoverableResource[]) {
  await Promise.allSettled(resources
    .filter(resource => resource.isError || resource.refreshError || resource.dataState === "STALE_USABLE")
    .map(resource => resource.refetch()));
}
