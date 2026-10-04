import assert from "node:assert/strict";
import test from "node:test";
import type { ContributionDraftRequest, ContributionSubmission, ContributionCandidateIntake, AccessAndSafetyState } from "@starward/miniapp-contracts";
import { normalizeContributionInput, assertContributionRelation, assertContributionSubmittable } from "./contribution-validation.ts";
import { appendContributionAttempt, appendCandidateProfileMedia, removeCandidateProfileMedia, reviewLatestContributionAttempt, assertCandidateAttemptCurrent } from "./contribution-attempts.ts";
import { contributionAllowedMergeClaims, applyReviewedCandidateNightSafety } from "./postgres-repository.ts";

function unknownIntake(): ContributionCandidateIntake {
  return { version: 1, openness: "UNKNOWN", legalEntry: "UNKNOWN", nightSafety: "UNKNOWN",
    contact: { kind: "UNKNOWN", number: "", purpose: "", publicPermissionConfirmed: false, source: "" } };
}
function draft(intake?: ContributionCandidateIntake): ContributionDraftRequest {
  return { kind: "NEW_SPOT_PROPOSAL", spotId: null,
    candidateLocation: { displayName: "测试候选点", region: "测试地区", wgs84: { system: "WGS84", latitude: 22.6, longitude: 114.2 } },
    observedAt: null, topics: [], detail: "", rightsConfirmed: false, preciseLocationConsent: true,
    candidateProfile: { fields: { name: "测试候选点", address: "测试选点地址" }, media: {}, ...(intake === undefined ? {} : { intake }) },
  };
}
function submission(input: ContributionDraftRequest): ContributionSubmission {
  const normalized = normalizeContributionInput(input);
  assertContributionRelation(normalized);
  return { ...normalized, submissionId: "contribution:intake-regression" as ContributionSubmission["submissionId"], spotNameSnapshot: null,
    media: [], state: "DRAFT", submissionState: "DRAFT", mergeState: "NOT_STARTED", publicationImpact: "NONE",
    statusHistory: [], attempts: [], workingCopyFromAttemptId: null, revision: 1,
    createdAt: "2026-10-05T00:00:00Z", updatedAt: "2026-10-05T00:00:00Z", review: null } as ContributionSubmission;
}
test("explicit unknown survives real normalization, submit and an immutable attempt without invented safe/access/contact answers", () => {
  const value = submission(draft(unknownIntake()));
  assertContributionSubmittable(value);
  assert.deepEqual((value.candidateProfile as unknown as { intake: unknown }).intake, unknownIntake());
  const frozen = appendContributionAttempt(value, "2026-10-05T01:00:00Z");
  assert.deepEqual((frozen.attempts[0]?.snapshot.candidateProfile as unknown as { intake: unknown }).intake, unknownIntake());
  assert.equal(value.candidateProfile?.fields.openness, undefined);
  assert.equal(value.candidateProfile?.fields.access, undefined);
  assert.equal(value.candidateProfile?.fields.contact, undefined);
});
test("an explicitly reviewed known night rating replaces the actual rating and its guidance, never refreshes an old safety basis", () => {
  const intake = unknownIntake(); intake.nightSafety = "DANGER";
  const input = draft(intake); input.candidateProfile = { ...input.candidateProfile!, fields: { ...input.candidateProfile!.fields, safety: "夜间落石危险" } };
  const value = submission(input);
  const original: AccessAndSafetyState = { openness: "UNKNOWN", legalAccess: "UNKNOWN", nightSafety: "NO_KNOWN_HAZARD", explicitDanger: false, restrictions: [], guidance: ["旧安全说明"] };
  assert.ok(contributionAllowedMergeClaims(value).includes("SAFETY_NIGHT"));
  assert.equal(applyReviewedCandidateNightSafety(value, ["SPOT_DETAILS"], original), original);
  assert.deepEqual(applyReviewedCandidateNightSafety(value, ["SAFETY_NIGHT"], original), { ...original, nightSafety: "DANGER", guidance: ["夜间落石危险"] });
  const safe = unknownIntake(); safe.nightSafety = "NO_KNOWN_HAZARD";
  assert.deepEqual(applyReviewedCandidateNightSafety(submission(draft(safe)), ["SAFETY_NIGHT"], original).guidance, []);
  assert.equal(applyReviewedCandidateNightSafety(submission(draft(unknownIntake())), ["SAFETY_NIGHT"], original), original);
});
test("public number purpose, permission and provenance freeze with the exact reviewed attempt without certifying unknown legal entry", () => {
  const intake = unknownIntake(); intake.contact = { kind: "PUBLIC_NUMBER", number: "0755-12345678", purpose: "场地入场咨询", publicPermissionConfirmed: true, source: "场地方公开告示" };
  const value = submission(draft(intake)); assertContributionSubmittable(value);
  const frozen = appendContributionAttempt(value, "2026-10-05T01:00:00Z").attempts[0]!.snapshot.candidateProfile!;
  intake.contact.publicPermissionConfirmed = false;
  assert.equal(frozen.intake?.contact.publicPermissionConfirmed, true);
  assert.equal(frozen.intake?.contact.source, "场地方公开告示");
  assert.equal(frozen.fields.contact, "0755-12345678（场地入场咨询）");
  assert.deepEqual(contributionAllowedMergeClaims(value), ["SPOT_DETAILS"]);
});
test("a legacy draft remains readable/saveable but cannot become a new submitted attempt with unanswered core intake", () => {
  const value = submission(draft());
  assert.equal(value.candidateProfile?.fields.name, "测试候选点");
  assert.throws(() => assertContributionSubmittable(value), /contribution_candidate_intake_incomplete/);
  assert.deepEqual(value.attempts, []);
});
test("a purported public number without public permission/source cannot pass the real submission boundary", () => {
  const intake = unknownIntake();
  intake.contact = { kind: "PUBLIC_NUMBER", number: "0755-12345678", purpose: "场地入场咨询", publicPermissionConfirmed: false, source: "" };
  assert.throws(() => assertContributionSubmittable(submission(draft(intake))), /contribution_candidate_intake_incomplete/);
});
test("categorized media append/remove preserves the same core intake rather than dropping it from the working profile", () => {
  const value = submission(draft(unknownIntake()));
  const upload = { uploadId: "upload:intake-photo", kind: "site", state: "UPLOADED" } as ContributionSubmission["media"][number];
  const added = appendCandidateProfileMedia(value, upload);
  assert.deepEqual((added as unknown as { intake: unknown }).intake, unknownIntake());
  value.candidateProfile = added!;
  const removed = removeCandidateProfileMedia(value, upload);
  assert.deepEqual((removed as unknown as { intake: unknown }).intake, unknownIntake());
  assert.deepEqual(removed?.media.site, []);
});
test("typed closed/prohibited/no-public-contact cannot coexist with legacy positive facts at the HTTP normalization boundary", () => {
  const intake = unknownIntake();
  intake.openness = "CLOSED"; intake.legalEntry = "PROHIBITED"; intake.contact.kind = "NO_PUBLIC_NUMBER";
  const input = draft(intake);
  input.candidateProfile = { ...input.candidateProfile!, fields: { ...input.candidateProfile!.fields,
    openness: "开放", access: "允许进入", contact: "0755-12345678" } };
  assert.throws(() => normalizeContributionInput(input), /contribution_candidate_intake_conflict/);
});
test("non-public contact cannot smuggle unused phone/permission/source fields through normalization", () => {
  const intake = unknownIntake();
  intake.contact.kind = "NO_PUBLIC_NUMBER"; intake.contact.number = "0755-12345678";
  assert.throws(() => normalizeContributionInput(draft(intake)), /contribution_candidate_contact_invalid/);
});
test("unknown core answers with retained notes do not offer verified openness, legal-entry or night-safety merge claims", () => {
  const input = draft(unknownIntake());
  input.candidateProfile = { ...input.candidateProfile!, fields: { ...input.candidateProfile!.fields,
    hours: "开放时间待了解", accessNote: "暂不清楚进入条件", camping: "帐篷情况待了解", safety: "暂不清楚夜间安全，保留原说明" } };
  const value = submission(input);
  assertContributionSubmittable(value);
  assert.deepEqual(contributionAllowedMergeClaims(value), ["SPOT_DETAILS"]);
  assert.equal(appendContributionAttempt(value, "2026-10-05T01:00:00Z").attempts[0]?.snapshot.candidateProfile?.fields.safety, input.candidateProfile!.fields.safety);
});
test("changed new-point working input cannot be approved as the earlier frozen attempt before resubmission", () => {
  const value = submission(draft(unknownIntake()));
  Object.assign(value, appendContributionAttempt(value, "2026-10-05T01:00:00Z"));
  value.state = "CHANGES_REQUESTED"; value.submissionState = "CHANGES_REQUESTED";
  value.candidateProfile!.intake!.nightSafety = "NO_KNOWN_HAZARD";
  assert.throws(() => reviewLatestContributionAttempt(value, { resolution: "APPROVED", reason: "核验", reviewedAt: "2026-10-05T02:00:00Z" }), /contribution_review_attempt_mismatch/);
});
test("approval and merge accept the same frozen submit but reject changed content, removed intake and an unapproved attempt", () => {
  const value = submission(draft(unknownIntake()));
  Object.assign(value, appendContributionAttempt(value, "2026-10-05T01:00:00Z"));
  value.state = "PENDING_REVIEW"; value.submissionState = "PENDING_REVIEW";
  assert.throws(() => assertCandidateAttemptCurrent(value, true), /contribution_review_attempt_mismatch/);
  Object.assign(value, reviewLatestContributionAttempt(value, { resolution: "APPROVED", reason: "核验", reviewedAt: "2026-10-05T02:00:00Z" }));
  assert.doesNotThrow(() => assertCandidateAttemptCurrent(value, true));
  value.candidateProfile!.intake!.nightSafety = "DANGER";
  assert.throws(() => assertCandidateAttemptCurrent(value, true), /contribution_review_attempt_mismatch/);
  delete value.candidateProfile!.intake;
  assert.throws(() => assertCandidateAttemptCurrent(value, true), /contribution_review_attempt_mismatch/);
  assert.throws(() => reviewLatestContributionAttempt(value, { resolution: "APPROVED", reason: "再次核验", reviewedAt: "2026-10-05T03:00:00Z" }), /contribution_review_attempt_mismatch/);
});
test("ACCEPTED preserves the approved-result protocol and cannot approve an unresubmitted working copy", () => {
  const value = submission(draft(unknownIntake())); Object.assign(value, appendContributionAttempt(value, "2026-10-05T01:00:00Z"));
  value.state = "PENDING_REVIEW"; value.submissionState = "PENDING_REVIEW";
  Object.assign(value, reviewLatestContributionAttempt(value, { resolution: "ACCEPTED", reason: "核验", reviewedAt: "2026-10-05T02:00:00Z" }));
  assert.doesNotThrow(() => assertCandidateAttemptCurrent(value, true));
  value.state = "CHANGES_REQUESTED"; value.candidateProfile!.intake!.nightSafety = "DANGER";
  assert.throws(() => reviewLatestContributionAttempt(value, { resolution: "ACCEPTED", reason: "核验", reviewedAt: "2026-10-05T03:00:00Z" }), /contribution_review_attempt_mismatch/);
});
test("frozen media comparison permits the actual submit attachment transition and rejects its reverse", () => {
  const value = submission(draft(unknownIntake()));
  value.media = [{ uploadId: "upload:attachment", state: "UPLOADED" } as ContributionSubmission["media"][number]];
  Object.assign(value, appendContributionAttempt(value, "2026-10-05T01:00:00Z"));
  value.state = "PENDING_REVIEW"; value.media = [{ ...value.media[0]!, state: "ATTACHED" }];
  assert.doesNotThrow(() => assertCandidateAttemptCurrent(value, false));
  value.attempts[0]!.snapshot.media[0]!.state = "ATTACHED";
  value.media = [{ ...value.media[0]!, state: "UPLOADED" }];
  assert.throws(() => assertCandidateAttemptCurrent(value, false), /contribution_review_attempt_mismatch/);
});
test("a named valid coordinate with explicitly answered intake remains submittable when platform address/region metadata is unavailable", () => {
  const input = draft(unknownIntake()); input.candidateLocation!.region = "";
  input.candidateProfile = { ...input.candidateProfile!, fields: { name: "测试候选点" } };
  const value = submission(input);
  assertContributionSubmittable(value);
  assert.equal(value.candidateLocation?.region, "");
  assert.equal(value.candidateProfile?.fields.address, undefined);
});
