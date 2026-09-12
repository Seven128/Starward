import assert from "node:assert/strict";
import test from "node:test";
import type { ContributionSubmission } from "@starward/miniapp-contracts";
import { privateContributionMarkerItems, privateContributionMarkers } from "./private-contribution-markers.ts";

function submission(overrides: Partial<ContributionSubmission> = {}): ContributionSubmission {
  return {
    submissionId: "contribution:draft" as ContributionSubmission["submissionId"],
    kind: "NEW_SPOT_PROPOSAL",
    spotId: null,
    spotNameSnapshot: null,
    candidateLocation: { displayName: "海边草稿", region: "深圳", wgs84: { latitude: 22.6, longitude: 114.5, system: "WGS84" } },
    observedAt: null,
    topics: [], detail: "", rightsConfirmed: false, preciseLocationConsent: true, media: [],
    state: "DRAFT", submissionState: "DRAFT", mergeState: "NOT_STARTED", publicationImpact: "NONE",
    statusHistory: [], attempts: [], workingCopyFromAttemptId: null, review: null, revision: 1, createdAt: "2026-09-10T00:00:00Z", updatedAt: "2026-09-10T00:00:00Z",
    ...overrides,
  };
}

test("private map projection keeps every valid owner draft and distinguishes pending proposals", () => {
  const entries = privateContributionMarkers([
    submission(),
    submission({ submissionId: "contribution:pending" as ContributionSubmission["submissionId"], submissionState: "PENDING_REVIEW", state: "PENDING_REVIEW" }),
    submission({ submissionId: "contribution:invalid" as ContributionSubmission["submissionId"], candidateLocation: { displayName: "无效", region: "", wgs84: { latitude: 0, longitude: 0, system: "WGS84" } } }),
    submission({ submissionId: "contribution:published" as ContributionSubmission["submissionId"], publicationImpact: "SPOT_PUBLISHED" }),
  ]);
  assert.equal(entries.length, 2);
  assert.deepEqual(entries.map((entry) => entry.state), ["DRAFT", "PENDING"]);
  assert.notEqual(entries[0]!.longitude, 114.5, "mainland WGS84 is converted for the native GCJ map");
  const markers = privateContributionMarkerItems(entries, 100_000, "DAY");
  assert.deepEqual(markers.map((item) => item.id), [100_000, 100_001]);
  assert.match(markers[0]!.ariaLabel, /我的草稿点/u);
  assert.match(markers[1]!.ariaLabel, /审核中提案/u);
});
