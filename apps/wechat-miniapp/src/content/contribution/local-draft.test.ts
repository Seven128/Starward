import assert from "node:assert/strict";
import test from "node:test";
import { parseLocalContributionDraft } from "./local-draft";
import { contributionDraftBelongsTo, contributionDraftKey } from "../../services/local-draft-keys";

test("local feedback drafts retain incomplete input without copying private response fields", () => {
  const draft = {
    schema: 1, baseSubmissionId: null, baseRevision: null,
    spotId: "", spotName: "", kind: "NEW_SPOT_PROPOSAL", topics: ["OTHER"],
    date: "2026-02-31", time: "", detail: "尚未完成的现场说明", candidateName: "", candidateRegion: "",
    latitude: "22.", longitude: "", rightsConfirmed: false, preciseLocationConsent: false,
  };
  assert.deepEqual(parseLocalContributionDraft({ ...draft, accessToken: "do-not-copy", media: ["private-object"] }), draft);
  assert.equal(parseLocalContributionDraft({ ...draft, schema: 2 }), null);
  assert.equal(parseLocalContributionDraft({ ...draft, topics: ["UNKNOWN"] }), null);
  assert.equal(parseLocalContributionDraft({ ...draft, detail: "x".repeat(2001) }), null);
  assert.equal(parseLocalContributionDraft({ ...draft, baseSubmissionId: "contribution:a", baseRevision: null }), null);
  assert.equal(parseLocalContributionDraft({ ...draft, baseSubmissionId: "contribution:a", baseRevision: 3 })?.baseRevision, 3);
});

test("feedback draft storage is isolated by exact account and entry location", () => {
  const key = contributionDraftKey("a", "spot:one")!;
  assert.equal(contributionDraftKey(null, null), null);
  assert.notEqual(key, contributionDraftKey("a", "spot:two"));
  assert.notEqual(key, contributionDraftKey("a", null));
  assert.equal(contributionDraftBelongsTo(key, "a"), true);
  assert.equal(contributionDraftBelongsTo(key, "ab"), false);
  assert.equal(contributionDraftBelongsTo("starward.contribution-draft.v1:broken", "a"), false);
});
