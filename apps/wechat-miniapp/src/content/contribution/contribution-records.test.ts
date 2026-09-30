import assert from "node:assert/strict";
import test from "node:test";
import type { ContributionSubmission } from "@starward/miniapp-contracts";
import { contributionFrozenAttempt, contributionRecordCover, contributionRecordGroup, contributionRecordIdentity, contributionRecordPhotos, contributionRecordPrimaryAction, contributionRecordStatus, contributionSubmittedPlaceFacts, resolveContributionRecordDetail, resolveContributionEditorRecord } from "./contribution-record-model";

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

test("frozen photos retain all authored groups and order without admitting working-copy replacements", () => {
  const original = record({ candidateProfile: { fields: {}, media: {
    parking: ["upload:park-2", "upload:park-1"], toilet: ["upload:wc"], site: ["upload:site"],
  } }, media: ["park-1", "park-2", "wc", "site"].map(id => ({ uploadId: `upload:${id}` } as never)) });
  const item = record({ submissionState: "PENDING_REVIEW", media: [{ uploadId: "upload:new" } as never],
    attempts: [{ attemptId: "attempt:frozen", snapshot: original } as never] });
  assert.deepEqual(contributionRecordPhotos(item).map(photo => [photo.kind, photo.id, photo.owned]), [
    ["parking", "upload:park-2", true], ["parking", "upload:park-1", true],
    ["toilet", "upload:wc", true], ["site", "upload:site", true],
  ]);
});

test("legacy photos use stored kinds while an explicitly empty frozen group stays empty", () => {
  const media = [{ uploadId: "upload:park", kind: "parking" }, { uploadId: "upload:old" } ] as never;
  assert.deepEqual(contributionRecordPhotos(record({ media })).map(photo => [photo.kind, photo.id]), [
    ["parking", "upload:park"], ["site", "upload:old"],
  ]);
  assert.deepEqual(contributionRecordPhotos(record({ media, candidateProfile: { fields: {}, media: { parking: [] } } })).map(photo => photo.id), ["upload:old"]);
});

test("formal photo differences use accepted rebase and preserve removed originals without granting private ownership", () => {
  const baseline = { media: { parking: ["canonical:original"], toilet: [], site: [] } };
  const item = record({ kind: "CORRECTION", media: [{ uploadId: "upload:new", kind: "parking" } as never],
    formalFeedback: { baseline, proposal: { media: { parking: ["upload:discarded"] } },
      resolvedBaseline: baseline, resolvedProposal: { media: { parking: ["upload:new"] } } } as never });
  assert.deepEqual(contributionRecordPhotos(item), [
    { id: "upload:new", kind: "parking", owned: true, change: "added" },
    { id: "canonical:original", kind: "parking", owned: false, change: "removed" },
  ]);
});

test("editor detail preserves a newer submit receipt while resolving current account, deletion and later review", () => {
  const cached = record({ revision: 2 });
  const receipt = record({ revision: 3, submissionState: "PENDING_REVIEW" });
  const selection = { owner: "owner", submissionId: cached.submissionId };
  assert.deepEqual(resolveContributionEditorRecord(selection, "owner", [cached], receipt), { state: "CURRENT", item: receipt });
  const reviewed = record({ revision: 4, submissionState: "REJECTED" });
  assert.deepEqual(resolveContributionEditorRecord(selection, "owner", [reviewed], receipt), { state: "CURRENT", item: reviewed });
  assert.equal(resolveContributionEditorRecord(selection, "other", [cached], receipt).state, "ACCOUNT_CHANGED");
  assert.equal(resolveContributionEditorRecord(selection, "owner", [], receipt).state, "MISSING");
  assert.equal(resolveContributionEditorRecord(selection, "owner", null, receipt).state, "UNAVAILABLE");
  const unrelated = record({ submissionId: "contribution:other" as ContributionSubmission["submissionId"], revision: 9 });
  assert.deepEqual(resolveContributionEditorRecord(selection, "owner", [cached], unrelated), { state: "CURRENT", item: cached });
});

test("record groups and labels preserve creation, review and publication meaning", () => {
  assert.equal(contributionRecordGroup(record({ kind: "NEW_SPOT_PROPOSAL" })), "CREATION");
  assert.equal(contributionRecordGroup(record({ kind: "FIELD_REPORT", spotId: "spot:test" as ContributionSubmission["spotId"] })), "FEEDBACK");
  assert.deepEqual(contributionRecordStatus(record({ submissionState: "DRAFT" })), { key: "DRAFT", label: "草稿", tone: "neutral" });
  assert.equal(contributionRecordStatus(record({ submissionState: "ACCEPTED", publicationImpact: "NONE" })).key, "PENDING");
  assert.equal(contributionRecordStatus(record({ submissionState: "ACCEPTED", publicationImpact: "SPOT_PUBLISHED" })).key, "ONLINE");
  assert.equal(contributionRecordStatus(record({ kind: "CORRECTION", submissionState: "ACCEPTED" })).key, "APPROVED");
  assert.equal(contributionRecordStatus(record({ kind: "FIELD_REPORT", submissionState: "CHANGES_REQUESTED" })).key, "REJECTED");
});

test("published creation opens its current formal spot while pending and approved feedback keep frozen records", () => {
  assert.equal(contributionRecordPrimaryAction(record({ submissionState: "DRAFT" })), "EDIT");
  assert.equal(contributionRecordPrimaryAction(record({ submissionState: "PENDING_REVIEW" })), "READ_SUBMISSION");
  assert.equal(contributionRecordPrimaryAction(record({ submissionState: "REJECTED" })), "REVIEW_AND_EDIT");
  assert.equal(contributionRecordPrimaryAction(record({ submissionState: "ACCEPTED", publicationImpact: "SPOT_PUBLISHED", spotId: "spot:published" as never })), "OPEN_PUBLISHED_SPOT");
  assert.equal(contributionRecordPrimaryAction(record({ submissionState: "ACCEPTED", publicationImpact: "SPOT_PUBLISHED", spotId: null })), "READ_SUBMISSION");
  assert.equal(contributionRecordPrimaryAction(record({ kind: "CORRECTION", submissionState: "ACCEPTED", publicationImpact: "ACTIVE_REVISION_UPDATED", spotId: "spot:published" as never })), "READ_SUBMISSION");
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

test("open record detail follows the current account result instead of retaining an old review snapshot", () => {
  const initial = record({ submissionState: "PENDING_REVIEW", revision: 2 });
  const reviewed = record({ submissionState: "CHANGES_REQUESTED", revision: 3,
    review: { resolution: "CHANGES_REQUESTED", reason: "请补充路况", reviewedAt: "2026-09-11T00:00:00.000Z" } });
  const selection = { owner: "account-a", submissionId: initial.submissionId };
  assert.deepEqual(resolveContributionRecordDetail(selection, "account-a", [initial]), { state: "CURRENT", item: initial });
  assert.deepEqual(resolveContributionRecordDetail(selection, "account-a", [reviewed]), { state: "CURRENT", item: reviewed });
  assert.deepEqual(resolveContributionRecordDetail(selection, "account-a", []), { state: "MISSING" });
  assert.deepEqual(resolveContributionRecordDetail(selection, "account-a", null), { state: "UNAVAILABLE" });
  assert.deepEqual(resolveContributionRecordDetail(selection, "account-b", [reviewed]), { state: "ACCOUNT_CHANGED" });
  assert.deepEqual(resolveContributionRecordDetail(selection, null, [reviewed]), { state: "ACCOUNT_CHANGED" });
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
