import assert from "node:assert/strict";
import { test } from "node:test";
import { contributionSavedState } from "./contribution-save-state";

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
