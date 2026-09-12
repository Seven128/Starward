import assert from "node:assert/strict";
import test from "node:test";
import type { ContributionSubmission } from "@starward/miniapp-contracts";
import { contributionFrozenAttempt, contributionRecordGroup, contributionRecordStatus } from "./contribution-record-model";

function record(patch: Partial<ContributionSubmission>): ContributionSubmission {
  return {
    submissionId: "contribution:test" as ContributionSubmission["submissionId"],
    kind: "NEW_SPOT_PROPOSAL",
    spotId: null,
    spotNameSnapshot: null,
    candidateLocation: null,
    observedAt: null,
    topics: [],
    detail: "",
    rightsConfirmed: false,
    preciseLocationConsent: false,
    media: [],
    state: "DRAFT",
    submissionState: "DRAFT",
    mergeState: "NOT_STARTED",
    publicationImpact: "NONE",
    statusHistory: [],
    attempts: [],
    workingCopyFromAttemptId: null,
    revision: 1,
    createdAt: "2026-09-10T00:00:00.000Z",
    updatedAt: "2026-09-10T00:00:00.000Z",
    review: null,
    ...patch,
  };
}

test("record groups and labels preserve creation, review and publication meaning", () => {
  assert.equal(contributionRecordGroup(record({ kind: "NEW_SPOT_PROPOSAL" })), "CREATION");
  assert.equal(contributionRecordGroup(record({ kind: "FIELD_REPORT", spotId: "spot:test" as ContributionSubmission["spotId"] })), "FEEDBACK");
  assert.deepEqual(contributionRecordStatus(record({ submissionState: "DRAFT" })), { key: "DRAFT", label: "草稿", tone: "neutral" });
  assert.equal(contributionRecordStatus(record({ submissionState: "ACCEPTED", publicationImpact: "NONE" })).key, "PENDING");
  assert.equal(contributionRecordStatus(record({ submissionState: "ACCEPTED", publicationImpact: "SPOT_PUBLISHED" })).key, "ONLINE");
  assert.equal(contributionRecordStatus(record({ kind: "CORRECTION", submissionState: "ACCEPTED" })).key, "APPROVED");
  assert.equal(contributionRecordStatus(record({ kind: "FIELD_REPORT", submissionState: "CHANGES_REQUESTED" })).key, "REJECTED");
});

test("record detail selects the latest immutable submission attempt", () => {
  const item = record({
    detail: "正在修改的工作副本",
    attempts: [
      { attemptId: "attempt:1", attemptNo: 1, baseRevision: 1, submittedAt: "2026-09-01T00:00:00.000Z", snapshot: { kind: "NEW_SPOT_PROPOSAL", spotId: null, spotNameSnapshot: null, candidateLocation: null, observedAt: null, topics: ["PARKING"], detail: "第一次冻结内容", rightsConfirmed: false, preciseLocationConsent: true, media: [] }, review: { resolution: "CHANGES_REQUESTED", reason: "补充道路情况", reviewedAt: "2026-09-02T00:00:00.000Z" } },
      { attemptId: "attempt:2", attemptNo: 2, baseRevision: 4, submittedAt: "2026-09-03T00:00:00.000Z", snapshot: { kind: "NEW_SPOT_PROPOSAL", spotId: null, spotNameSnapshot: null, candidateLocation: null, observedAt: null, topics: ["PARKING", "LAST_ROAD"], detail: "第二次冻结内容", rightsConfirmed: false, preciseLocationConsent: true, media: [] }, review: null },
    ],
  });
  assert.equal(contributionFrozenAttempt(item)?.attemptNo, 2);
  assert.equal(contributionFrozenAttempt(item)?.snapshot.detail, "第二次冻结内容");
});
