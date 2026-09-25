import { randomUUID } from "node:crypto";
import {
  resolveContributionFormalRebase,
  type ContributionFormalBaseline,
  type ContributionFormalSubmitRequest,
  type ContributionFormalSubmitResult,
  type ContributionId,
  type ContributionSubmission,
  type ContributionMediaUpload,
  type ContributionTopic,
} from "@starward/miniapp-contracts";

const TOPIC_BY_FIELD: Readonly<Record<string, ContributionTopic>> = {
  road: "LAST_ROAD",
  parking: "PARKING", parkingNote: "PARKING",
  toilet: "FACILITIES", toiletNote: "FACILITIES", platform: "FACILITIES", signal: "FACILITIES",
  openness: "OPENNESS", hours: "OPENNESS",
  access: "LEGAL_ACCESS", accessNote: "LEGAL_ACCESS", camping: "LEGAL_ACCESS", contact: "LEGAL_ACCESS",
  safety: "NIGHT_SAFETY",
  horizon: "HORIZON", light: "HORIZON",
  name: "OTHER", address: "OTHER", detail: "OTHER",
};

function topicsOf(proposal: ContributionFormalSubmitRequest["proposal"]) {
  const topics = new Set<ContributionTopic>();
  for (const key of Object.keys(proposal.fields)) topics.add(TOPIC_BY_FIELD[key] ?? "OTHER");
  if (Object.keys(proposal.media).length) topics.add("SITE_MEDIA");
  return [...topics];
}

export function buildFormalContributionResult(input: {
  request: ContributionFormalSubmitRequest;
  currentBaseline: ContributionFormalBaseline;
  existing?: ContributionSubmission | null;
  uploads?: readonly ContributionMediaUpload[];
  now?: string;
}): ContributionFormalSubmitResult {
  const rebased = resolveContributionFormalRebase({
    baseline: input.request.baseline,
    current: input.currentBaseline,
    proposal: input.request.proposal,
    ...(input.request.resolutions ? { resolutions: input.request.resolutions } : {}),
  });
  if (rebased.conflicts.length) return {
    state: "CONFLICT",
    currentBaseline: structuredClone(input.currentBaseline),
    conflicts: structuredClone(rebased.conflicts),
  };
  if (!Object.keys(rebased.proposal.fields).length && !Object.keys(rebased.proposal.media).length)
    throw new Error("contribution_formal_changes_obsolete");

  const now = input.now ?? new Date().toISOString();
  const existing = input.existing ?? null;
  const submissionId = existing?.submissionId ?? `contribution:${randomUUID()}` as ContributionId;
  const formalFeedback = {
    baseline: structuredClone(input.request.baseline),
    proposal: structuredClone(input.request.proposal),
    resolvedProposal: structuredClone(rebased.proposal),
  };
  const revision = existing ? existing.revision + 1 : 1;
  const attemptNo = (existing?.attempts.length ?? 0) + 1;
  const detail = rebased.proposal.fields.detail ?? "";
  const referencedUploadIds = new Set(Object.values(rebased.proposal.media).flatMap(value => value ?? []));
  const snapshot = {
    kind: input.request.kind,
    spotId: input.currentBaseline.spotId,
    spotNameSnapshot: input.currentBaseline.fields.name,
    candidateLocation: null,
    observedAt: input.request.observedAt,
    topics: topicsOf(rebased.proposal),
    detail,
    rightsConfirmed: input.request.rightsConfirmed,
    preciseLocationConsent: false,
    media: (input.uploads ?? [])
      .filter(value => referencedUploadIds.has(value.uploadId))
      .map(value => ({ ...structuredClone(value), state: "ATTACHED" as const })),
    formalFeedback,
  } as const;
  const submission: ContributionSubmission = {
    ...(existing ? structuredClone(existing) : {
      submissionId,
      createdAt: now,
      attempts: [],
      statusHistory: [],
      workingCopyFromAttemptId: null,
    }),
    ...snapshot,
    submissionId,
    state: "PENDING_REVIEW",
    submissionState: "PENDING_REVIEW",
    mergeState: "NOT_STARTED",
    publicationImpact: "NONE",
    review: null,
    workingCopyFromAttemptId: null,
    attempts: [
      ...(existing?.attempts ?? []).map(value => structuredClone(value)),
      {
        attemptId: `contribution-attempt:${randomUUID()}`,
        attemptNo,
        baseRevision: input.request.baseline.revision,
        submittedAt: now,
        snapshot: structuredClone(snapshot),
        review: null,
      },
    ],
    statusHistory: [
      ...(existing?.statusHistory ?? []).map(value => structuredClone(value)),
      {
        eventId: `contribution-event:${randomUUID()}`,
        axis: "SUBMISSION",
        from: existing?.submissionState ?? null,
        to: "PENDING_REVIEW",
        reason: null,
        actorType: "USER",
        occurredAt: now,
      },
    ],
    revision,
    updatedAt: now,
  };
  return { state: "SUBMITTED", submission };
}
