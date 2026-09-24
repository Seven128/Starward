import assert from "node:assert/strict";
import test from "node:test";
import type { ContributionSubmission } from "@starward/miniapp-contracts";
import { contributionFrozenAttempt, contributionRecordCover, contributionRecordGroup, contributionRecordIdentity, contributionRecordStatus, contributionSubmittedPlaceFacts } from "./contribution-record-model";

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

test("new-spot record identity keeps submitted fields, including a literal missing-value phrase", () => {
  const candidateLocation = { displayName: "位置原名", region: "广东省深圳市盐田区",
    wgs84: { system: "WGS84" as const, latitude: 22.588, longitude: 114.302 } };
  const submission = record({ submissionState: "PENDING_REVIEW", candidateLocation,
    candidateProfile: { fields: { name: "未保存的新名称", address: "未保存的新地址" }, media: {} },
    attempts: [{ attemptId: "attempt:1", attemptNo: 1, baseRevision: 1,
      submittedAt: "2026-09-24T00:00:00.000Z", review: null,
      snapshot: { kind: "NEW_SPOT_PROPOSAL", spotId: null, spotNameSnapshot: null,
        candidateLocation, observedAt: null, topics: [], detail: "", rightsConfirmed: false,
        preciseLocationConsent: true, media: [],
        candidateProfile: { fields: { name: " 暂无数据 ", address: "暂无数据" }, media: {} } } }],
  });
  assert.deepEqual(contributionRecordIdentity(submission), {
    name: "暂无数据", region: "广东省深圳市盐田区", address: "暂无数据",
  });
  assert.deepEqual(contributionRecordIdentity(record({ candidateLocation,
    candidateProfile: { fields: { name: " ", address: " " }, media: {} } })), {
    name: "位置原名", region: "广东省深圳市盐田区", address: null,
  });
  assert.equal(contributionRecordIdentity(record({ kind: "CORRECTION", spotNameSnapshot: "正式观星点",
    candidateProfile: { fields: { name: "用户建议的新名" }, media: {} } })).name, "正式观星点");
});

test("new-spot read-only record presents frozen structured submission rather than legacy report text", () => {
  const candidateLocation = { displayName: "选点原名", region: "广东省深圳市盐田区",
    wgs84: { system: "WGS84" as const, latitude: 22.588, longitude: 114.302 } };
  const item = record({ submissionState: "PENDING_REVIEW", candidateLocation,
    candidateProfile: { fields: { name: "未保存名称", detail: "未保存说明" }, media: {} },
    attempts: [{ attemptId: "attempt:1", attemptNo: 1, baseRevision: 1,
      submittedAt: "2026-09-24T00:00:00.000Z", review: null,
      snapshot: { kind: "NEW_SPOT_PROPOSAL", spotId: null, spotNameSnapshot: null,
        candidateLocation, observedAt: null, topics: [], detail: "", rightsConfirmed: false,
        preciseLocationConsent: true, media: [], candidateProfile: { fields: {
          name: "暂无数据", address: "暂无数据", openness: "有条件开放",
          detail: "东南方向视野较开阔。" }, media: {} } } }],
  });
  assert.deepEqual(contributionSubmittedPlaceFacts(item), {
    selectedLocation: "选点原名 · 广东省深圳市盐田区",
    fields: [{ key: "address", value: "暂无数据" }, { key: "name", value: "暂无数据" },
      { key: "openness", value: "有条件开放" }, { key: "detail", value: "东南方向视野较开阔。" }],
  });
  assert.equal(contributionSubmittedPlaceFacts(record({ kind: "CORRECTION" })), null);
});

test("record cover belongs to the frozen submission and prefers an attached site photo", () => {
  const photo = (id: string, state: "ATTACHED" | "UPLOADED", kind: "site" | "parking") => ({
    uploadId: id as never, kind, state, originalName: `${id}.png`, mimeType: "image/png" as const,
    declaredByteSize: 80, byteSize: 80, sha256: "hash", createdAt: "2026-09-24T00:00:00.000Z",
    expiresAt: "2026-09-25T00:00:00.000Z", uploadedAt: "2026-09-24T00:00:00.000Z",
  });
  const frozen = record({ submissionState: "PENDING_REVIEW", media: [photo("new", "ATTACHED", "site")],
    attempts: [{ attemptId: "attempt:1", attemptNo: 1, baseRevision: 1,
      submittedAt: "2026-09-24T00:00:00.000Z", review: null,
      snapshot: { kind: "NEW_SPOT_PROPOSAL", spotId: null, spotNameSnapshot: null,
        candidateLocation: null, observedAt: null, topics: [], detail: "", rightsConfirmed: true,
        preciseLocationConsent: true, media: [photo("parking", "UPLOADED", "parking"), photo("site", "UPLOADED", "site")],
      } }],
  });
  assert.equal(contributionRecordCover(frozen)?.uploadId, "site");
  assert.equal(contributionRecordCover(record({ media: [] })), null);
  assert.equal(contributionRecordCover(record({ media: [photo("draft", "UPLOADED", "site")] }))?.uploadId, "draft");
});
