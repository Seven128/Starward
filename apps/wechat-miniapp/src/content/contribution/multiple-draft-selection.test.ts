import assert from "node:assert/strict";
import test from "node:test";
import type { ContributionSubmission } from "@starward/miniapp-contracts";
import { findMatchingContributionDraft } from "./draft-selection.ts";

const drafts = [
  { submissionId: "contribution:first", kind: "NEW_SPOT_PROPOSAL", spotId: null, submissionState: "DRAFT" },
  { submissionId: "contribution:second", kind: "NEW_SPOT_PROPOSAL", spotId: null, submissionState: "DRAFT" },
  { submissionId: "contribution:field", kind: "FIELD_REPORT", spotId: "spot:formal", submissionState: "DRAFT" },
] as ContributionSubmission[];

test("a new-place entry is empty unless it names the exact remote draft", () => {
  assert.equal(findMatchingContributionDraft(drafts, false, "", "NEW_SPOT_PROPOSAL"), null);
  assert.equal(findMatchingContributionDraft(drafts, false, "", "NEW_SPOT_PROPOSAL", "contribution:second")?.submissionId, "contribution:second");
  assert.equal(findMatchingContributionDraft(drafts, false, "", "NEW_SPOT_PROPOSAL", "contribution:second", true), null);
});

test("an explicitly selected formal-spot draft restores from its record identity", () => {
  const selected = findMatchingContributionDraft(
    drafts,
    false,
    "",
    "NEW_SPOT_PROPOSAL",
    "contribution:field",
  );
  assert.equal(selected?.kind, "FIELD_REPORT");
  assert.equal(selected?.spotId, "spot:formal");
});
