export type ContributionState = "draft" | "queued" | "processing" | "unverified" | "review" | "published" | "needs-more" | "rejected" | "withdrawn" | "disputed";
export type ContributionKind = "spot" | "field-report" | "correction" | "media" | "review";

export interface ContributionEvidence<T = unknown> {
  id: string;
  kind: ContributionKind;
  contributorId: string;
  anonymousPublicly: boolean;
  capturedAt: string;
  receivedAt: string;
  locationAccuracyM?: number;
  source: "user-confirmed" | "device-derived" | "moderator-derived";
  value: T;
  version: number;
  state: ContributionState;
  expiresAt?: string;
  confirms: number;
  disputes: number;
}

export const MODERATION_POLICY = Object.freeze({ lowRiskSkyTtlHours: 2, crowdRoadTtlHours: 4, temporaryFacilityTtlHours: 24, unconfirmedRiskTtlHours: 6, highRiskReviewHours: 2, normalReviewHours: 24, appealDays: 7, trustedMinimumApproved: 5, trustedMaximumDisputeRate: 0.1, requiredIndependentConfirmations: 2 });

export function createContribution<T>(input: Omit<ContributionEvidence<T>, "version" | "state" | "confirms" | "disputes"> & { risk: "low" | "high"; trustedLowRiskPublisher?: boolean }): ContributionEvidence<T> {
  return Object.freeze({ ...input, value: structuredClone(input.value), version: 1, state: input.risk === "low" && input.trustedLowRiskPublisher ? "unverified" : "review", confirms: 0, disputes: 0 });
}

export function materializeCurrentReports<T>(items: ContributionEvidence<T>[], now: string) {
  const immutableHistory = items.map((item) => Object.freeze({ ...item, value: structuredClone(item.value) }));
  const current = immutableHistory.filter((item) => item.kind === "field-report" && item.state !== "disputed" && (!item.expiresAt || Date.parse(item.expiresAt) > Date.parse(now)));
  return { current, immutableHistory, longTermFactsMutated: false };
}

export function applyModeration<T>(evidence: ContributionEvidence<T>, input: { decision: "publish" | "needs-more" | "reject" | "dispute"; moderatorId: string; reason: string; decidedAt: string }) {
  const nextState: ContributionState = input.decision === "publish" ? "published" : input.decision === "dispute" ? "disputed" : input.decision === "reject" ? "rejected" : "needs-more";
  return { evidence, version: { id: `${evidence.id}:v${evidence.version + 1}`, sourceEvidenceId: evidence.id, version: evidence.version + 1, state: nextState, decidedAt: input.decidedAt }, audit: { actorId: input.moderatorId, reason: input.reason, before: evidence.state, after: nextState }, originalMutated: false };
}

export function buildSpotSubmission(input: { latitude: number; longitude: number; landStatus: "public" | "private-unknown" | "private-authorized"; requestedVisibility?: "public-exact" | "approximate" | "invite_only"; duplicateCandidates: string[] }) {
  const visibility = input.landStatus === "private-unknown" ? "invite_only" : input.requestedVisibility ?? "approximate";
  return { reviewId: `spot-review-${Math.abs(Math.round(input.latitude * 10000))}`, draftId: `spot-draft-${Math.abs(Math.round(input.longitude * 10000))}`, preciseCoordinate: { latitude: input.latitude, longitude: input.longitude, source: "user-confirmed", visibility }, publicCoordinate: visibility === "public-exact" ? { latitude: input.latitude, longitude: input.longitude } : { latitude: Number(input.latitude.toFixed(2)), longitude: Number(input.longitude.toFixed(2)) }, duplicateCandidates: input.duplicateCandidates, requiresLandReview: input.landStatus === "private-unknown", publicationState: "review" as const };
}

export function buildSafetyCorrection(input: { category: "closed-road" | "closed-site" | "wrong-coordinate" | "unsafe"; capturedAt: string; evidenceIds: string[] }) {
  const highRisk = input.category === "closed-road" || input.category === "unsafe";
  return { caseId: `safety-${input.capturedAt.replace(/\D/g, "")}`, priority: highRisk ? "P0" : "P1", state: "unverified-warning", reviewDueHours: highRisk ? MODERATION_POLICY.highRiskReviewHours : MODERATION_POLICY.normalReviewHours, expiresUnconfirmedHours: MODERATION_POLICY.unconfirmedRiskTtlHours, evidenceIds: [...input.evidenceIds], permanentClosureClaim: false };
}

export function publishReview(input: { darkness?: number; access?: number; photography?: number; safety?: number; visitedAt: string; verifiedVisit: boolean }) {
  const dimensions = Object.fromEntries(Object.entries(input).filter(([key, value]) => !["visitedAt", "verifiedVisit"].includes(key) && typeof value === "number"));
  return { dimensions, unexperiencedRemainNull: true, visitedAt: input.visitedAt, verifiedVisit: input.verifiedVisit, socialActions: [] as string[] };
}
