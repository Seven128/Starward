import type { ContributionSubmission } from "@starward/miniapp-contracts";

export type ContributionRecordGroup = "CREATION" | "FEEDBACK";

export function contributionRecordGroup(item: ContributionSubmission): ContributionRecordGroup {
  return item.kind === "NEW_SPOT_PROPOSAL" ? "CREATION" : "FEEDBACK";
}

export function contributionRecordStatus(item: ContributionSubmission) {
  const state = item.submissionState;
  if (contributionRecordGroup(item) === "CREATION") {
    if (state === "DRAFT") return { key: "DRAFT", label: "草稿", tone: "neutral" } as const;
    if (state === "ACCEPTED" && item.publicationImpact === "SPOT_PUBLISHED") return { key: "ONLINE", label: "已上线", tone: "success" } as const;
    if (state === "REJECTED" || state === "CHANGES_REQUESTED") return { key: "REJECTED", label: "审核未通过", tone: "warning" } as const;
    if (state === "WITHDRAWN") return { key: "WITHDRAWN", label: "已撤回", tone: "neutral" } as const;
    return { key: "PENDING", label: "审核中", tone: "neutral" } as const;
  }
  if (state === "ACCEPTED") return { key: "APPROVED", label: "已通过", tone: "success" } as const;
  if (state === "REJECTED" || state === "CHANGES_REQUESTED") return { key: "REJECTED", label: "审核未通过", tone: "warning" } as const;
  if (state === "WITHDRAWN") return { key: "WITHDRAWN", label: "已撤回", tone: "neutral" } as const;
  return { key: "PENDING", label: "审核中", tone: "neutral" } as const;
}

export function contributionFrozenAttempt(item: ContributionSubmission) {
  return item.attempts?.at(-1) ?? null;
}
