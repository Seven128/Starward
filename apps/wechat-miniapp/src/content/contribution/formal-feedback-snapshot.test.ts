import assert from "node:assert/strict";
import test from "node:test";
import { CONTRIBUTION_FORMAL_FIELD_KEYS, type ContributionFormalBaseline, type ContributionFormalFeedbackSnapshot, type SpotId } from "@starward/miniapp-contracts";
import { formalFeedbackFrozenView } from "./formal-feedback-snapshot.ts";

function baseline(revision: number, detail: string): ContributionFormalBaseline {
  const fields = Object.fromEntries(CONTRIBUTION_FORMAL_FIELD_KEYS.map(key => [key, null])) as unknown as ContributionFormalBaseline["fields"];
  return { spotId: "spot:feedback" as SpotId, revision, fields: { ...fields, name: "星湾观星点", detail }, media: { parking: [], toilet: [], site: [] } };
}

test("frozen feedback shows accepted differences on the verified canonical version", () => {
  const original = baseline(4, "原现场说明");
  const current = baseline(5, "正式资料的新说明");
  const snapshot: ContributionFormalFeedbackSnapshot = {
    baseline: original,
    proposal: { fields: { detail: "我原先的修改", hours: "19:00—次日05:00" }, media: {} },
    resolvedBaseline: current,
    resolvedProposal: { fields: { hours: "19:00—次日05:00" }, media: {} },
  };
  assert.deepEqual(formalFeedbackFrozenView(snapshot), { baseline: current, proposal: snapshot.resolvedProposal });
  assert.equal(formalFeedbackFrozenView(snapshot).baseline.fields.detail, "正式资料的新说明");
});

test("old frozen feedback retains its original authored snapshot without guessing a missing canonical version", () => {
  const original = baseline(4, "原现场说明");
  const snapshot: ContributionFormalFeedbackSnapshot = {
    baseline: original,
    proposal: { fields: { detail: "我原先的修改" }, media: {} },
    resolvedProposal: { fields: {}, media: {} },
  };
  assert.deepEqual(formalFeedbackFrozenView(snapshot), { baseline: original, proposal: snapshot.proposal });
});
