import assert from "node:assert/strict";
import test from "node:test";
import type { ContributionSubmission, SpotId } from "@starward/miniapp-contracts";
import {
  contributionAllowedMergeClaims,
  contributionResolvedProposal,
  publishMergedNewSpotContribution,
  assertNewSpotContributionTarget,
} from "./postgres-repository.ts";

function proposal(
  patch: Partial<ContributionSubmission> = {},
): ContributionSubmission {
  return {
    submissionId: "contribution:new-spot" as ContributionSubmission["submissionId"],
    kind: "NEW_SPOT_PROPOSAL",
    spotId: null,
    spotNameSnapshot: null,
    candidateLocation: {
      displayName: "东岸观景台",
      region: "深圳市大鹏新区",
      wgs84: { system: "WGS84", latitude: 22.56, longitude: 114.59 },
    },
    observedAt: null,
    topics: ["OTHER"],
    detail: "候选地点",
    rightsConfirmed: true,
    preciseLocationConsent: true,
    media: [],
    candidateProfile: {
      fields: {
        name: "东岸观星台",
        address: "深圳市大鹏新区东岸观景台",
        openness: "开放",
        road: "末段道路平整",
        parking: "有",
        toilet: "无",
        horizon: "东南方向开阔",
      },
      media: { parking: ["upload:parking"], site: ["upload:site"] },
    },
    state: "APPROVED",
    submissionState: "ACCEPTED",
    mergeState: "NOT_STARTED",
    publicationImpact: "NONE",
    statusHistory: [],
    attempts: [],
    workingCopyFromAttemptId: null,
    revision: 3,
    createdAt: "2026-09-10T01:00:00.000Z",
    updatedAt: "2026-09-10T02:00:00.000Z",
    review: {
      resolution: "APPROVED",
      reason: "资料可信",
      reviewedAt: "2026-09-10T02:00:00.000Z",
    },
    ...patch,
  };
}

test("new-place merge claims come from the structured proposal and its media", () => {
  const submission = proposal();
  assert.equal(contributionResolvedProposal(submission), submission.candidateProfile);
  assert.deepEqual(contributionAllowedMergeClaims(submission), [
    "SPOT_DETAILS",
    "ACCESS_OPENNESS",
    "ACCESS_LAST_ROAD",
    "ACCESS_PARKING",
    "FACILITY_STATUS",
    "HORIZON_PROFILE",
    "SITE_MEDIA_PROVENANCE",
  ]);
});

test("publishing a merged new place binds the owner record to the public spot", () => {
  const spotId = "spot:east-coast" as SpotId;
  const merged = proposal({
    spotId,
    mergeState: "MERGED",
    publicationImpact: "CANDIDATE_UPDATED",
    revision: 4,
  });
  const published = publishMergedNewSpotContribution(
    merged,
    spotId,
    "2026-09-10T03:00:00.000Z",
    "发布门通过",
  );
  assert.ok(published);
  assert.equal(published.spotId, spotId);
  assert.equal(published.publicationImpact, "SPOT_PUBLISHED");
  assert.equal(published.revision, 5);
  assert.deepEqual(published.statusHistory.at(-1), {
    eventId: published.statusHistory.at(-1)?.eventId,
    axis: "PUBLICATION",
    from: "CANDIDATE_UPDATED",
    to: "SPOT_PUBLISHED",
    reason: "发布门通过",
    actorType: "OPERATOR",
    occurredAt: "2026-09-10T03:00:00.000Z",
  });
  assert.equal(publishMergedNewSpotContribution(published, spotId, "later", "重复发布"), null);
});

test("publishing refuses a contribution bound to another canonical spot", () => {
  const submission = proposal({
    spotId: "spot:a" as SpotId,
    mergeState: "MERGED",
    publicationImpact: "CANDIDATE_UPDATED",
  });
  assert.throws(
    () => publishMergedNewSpotContribution(submission, "spot:b" as SpotId, "2026-09-10T03:00:00.000Z", "发布"),
    /contribution_publication_spot_mismatch/u,
  );
});

test("new-place merge binds the exact submitted WGS84 candidate to its canonical target", () => {
  const submission = proposal();
  const matching = {
    spotId: "spot:east-coast",
    wgs84: submission.candidateLocation!.wgs84,
  } as unknown as import("@starward/miniapp-contracts").SpotSummary;
  assert.doesNotThrow(() => assertNewSpotContributionTarget(submission, matching));
  assert.throws(
    () => assertNewSpotContributionTarget(submission, { ...matching, wgs84: { ...matching.wgs84, longitude: matching.wgs84.longitude + 0.001 } }),
    /contribution_candidate_location_mismatch/u,
  );
});
