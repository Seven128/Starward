import { CONTRIBUTION_FORMAL_FIELD_KEYS, type ContributionSubmission } from "@starward/miniapp-contracts";

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

function present(value: string | null | undefined) {
  return value?.trim() || null;
}

function recordSource(item: ContributionSubmission) {
  return item.submissionState === "DRAFT" ? item : contributionFrozenAttempt(item)?.snapshot ?? item;
}

/** A creation record names the authored place, not the map picker label. */
export function contributionRecordIdentity(item: ContributionSubmission) {
  const submitted = recordSource(item);
  const candidate = submitted.candidateLocation ?? item.candidateLocation;
  const profile = submitted.candidateProfile ?? item.candidateProfile;
  return {
    name: item.kind === "NEW_SPOT_PROPOSAL"
      ? present(profile?.fields.name) ?? present(candidate?.displayName) ?? "地点待定"
      : present(item.spotNameSnapshot) ?? present(candidate?.displayName) ?? "地点待定",
    region: candidate?.region ?? (item.spotId ? "正式观星点" : "地区资料未提供"),
    address: item.kind === "NEW_SPOT_PROPOSAL" ? present(profile?.fields.address) : null,
  };
}

/** A submitted creation record shows its structured frozen proposal, not legacy report text. */
export function contributionSubmittedPlaceFacts(item: ContributionSubmission) {
  if (item.kind !== "NEW_SPOT_PROPOSAL") return null;
  const submitted = recordSource(item);
  const location = submitted.candidateLocation ?? item.candidateLocation;
  const profile = submitted.candidateProfile ?? item.candidateProfile;
  return {
    selectedLocation: location ? `${location.displayName} · ${location.region}` : null,
    fields: CONTRIBUTION_FORMAL_FIELD_KEYS.filter(key =>
      Object.prototype.hasOwnProperty.call(profile?.fields ?? {}, key)).map(key => ({
      key, value: profile?.fields[key] ?? "",
    })),
  };
}

/** Use a completed upload from this draft or frozen attempt; never borrow nearby-spot media. */
export function contributionRecordCover(item: ContributionSubmission) {
  const media = recordSource(item).media;
  const ready = media.filter(value => value.state === "ATTACHED" || value.state === "UPLOADED");
  return ready.find(value => value.kind === "site") ?? ready[0] ?? null;
}
