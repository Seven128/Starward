import assert from "node:assert/strict";
import { test } from "node:test";
import { contributionEditorSaveState, contributionSavedState } from "./contribution-save-state";

test("saved state shows time only for the current Beijing date", () => {
  assert.equal(
    contributionSavedState(
      "2026-09-10T09:08:00.000Z",
      new Date("2026-09-10T15:00:00.000Z"),
    ),
    "17:08 已保存",
  );
});

test("saved state adds the date outside today and the year across years", () => {
  const now = new Date("2026-09-10T15:00:00.000Z");
  assert.equal(
    contributionSavedState("2026-08-31T16:30:00.000Z", now),
    "09-01 00:30 已保存",
  );
  assert.equal(
    contributionSavedState("2024-12-31T16:30:00.000Z", now),
    "2025-01-01 00:30 已保存",
  );
});

test("invalid saved timestamps do not break the editor header", () => {
  assert.equal(contributionSavedState("not-a-time"), "已保存");
});

test("review timestamps identify the review result rather than a draft save", () => {
  const reviewedAt = "2026-10-09T05:05:28.460Z";
  assert.deepEqual(contributionEditorSaveState({ updatedAt: reviewedAt,
    review: { resolution: "REJECTED", reviewedAt, reason: "测试审核意见" } }, false),
  { label: "审核未通过", reviewed: true });
  assert.deepEqual(contributionEditorSaveState({ updatedAt: "2026-10-09T13:05:28.460+08:00",
    review: { resolution: "CHANGES_REQUESTED", reviewedAt, reason: "测试补充意见" } }, false),
  { label: "需补充", reviewed: true });
});

test("saving a reviewed working copy replaces the header label with its save time", () => {
  const draft = { updatedAt: "2026-10-09T05:06:00.000Z",
    review: { resolution: "REJECTED" as const, reviewedAt: "2026-10-09T05:05:28.460Z", reason: "测试审核意见" } };
  assert.deepEqual(contributionEditorSaveState(draft, true), { label: "保存中…", reviewed: true });
  assert.deepEqual(contributionEditorSaveState(draft, false, new Date("2026-10-09T06:00:00.000Z")),
    { label: "13:06 已保存", reviewed: true });
});

test("a new editor does not claim a server save before one exists", () => {
  assert.deepEqual(contributionEditorSaveState(null, false), { label: "尚未保存", reviewed: false });
  assert.deepEqual(contributionEditorSaveState(null, true), { label: "保存中…", reviewed: false });
});

test("a media receipt does not claim that concurrent field edits were saved", () => {
  const draft = { updatedAt: "2026-10-09T12:01:00.000Z",
    review: { resolution: "CHANGES_REQUESTED" as const,
      reviewedAt: "2026-10-09T11:58:00.000Z", reason: "补充说明并移除照片" } };
  const now = new Date("2026-10-09T12:02:00.000Z");
  assert.deepEqual(contributionEditorSaveState(draft, false, now, true),
    { label: "有未保存修改", reviewed: true });
  assert.deepEqual(contributionEditorSaveState(draft, true, now, true),
    { label: "保存中…", reviewed: true });
  assert.deepEqual(contributionEditorSaveState(null, false, now, true),
    { label: "尚未保存", reviewed: false });
  assert.deepEqual(contributionEditorSaveState(draft, false, now, false),
    { label: "20:01 已保存", reviewed: true });
});

test("clean media receipts and reverted fields keep the preceding complete save status", () => {
  const reviewedAt = "2026-10-09T11:58:00.000Z";
  const draft = { updatedAt: "2026-10-09T12:01:00.000Z",
    review: { resolution: "CHANGES_REQUESTED" as const, reviewedAt, reason: "补充说明" } };
  const now = new Date("2026-10-09T12:02:00.000Z");
  assert.deepEqual(contributionEditorSaveState(draft, false, now, false, reviewedAt),
    { label: "需补充", reviewed: true });
  assert.deepEqual(contributionEditorSaveState(draft, false, now, false, "2026-10-09T11:59:00.000Z"),
    { label: "19:59 已保存", reviewed: true });
  assert.deepEqual(contributionEditorSaveState(draft, false, now, true, reviewedAt),
    { label: "有未保存修改", reviewed: true });
  assert.deepEqual(contributionEditorSaveState(draft, false, now, false, draft.updatedAt),
    { label: "20:01 已保存", reviewed: true });
});
