import assert from "node:assert/strict";
import test from "node:test";
import { CONTRIBUTION_FORMAL_FIELD_KEYS, type ContributionFormalBaseline, type SpotId } from "@starward/miniapp-contracts";
import { assessFormalFeedbackConflict } from "./formal-feedback-conflict-state";

function baseline(revision: number, parkingNote: string): ContributionFormalBaseline {
  return {
    spotId: "spot:feedback" as SpotId,
    revision,
    fields: Object.fromEntries(CONTRIBUTION_FORMAL_FIELD_KEYS.map(key => [key, key === "parkingNote" ? parkingNote : null])) as unknown as ContributionFormalBaseline["fields"],
    media: { parking: [], toilet: [], site: [] },
  };
}

test("selecting current for the sole conflict leaves no submit-worthy difference", () => {
  const input = {
    baseline: baseline(1, "原停车说明"), current: baseline(2, "当前停车说明"),
    proposal: { fields: { parkingNote: "用户停车说明" }, media: {} },
  } as const;
  assert.deepEqual(assessFormalFeedbackConflict(input).unresolved, 1);
  const current = assessFormalFeedbackConflict({ ...input, choices: { "FIELD:parkingNote": "CURRENT" } });
  assert.equal(current.unresolved, 0);
  assert.equal(current.noRemainingChanges, true);
  assert.deepEqual(current.resolutions.fields, { parkingNote: "CURRENT" });
  const proposed = assessFormalFeedbackConflict({ ...input, choices: { "FIELD:parkingNote": "PROPOSED" } });
  assert.equal(proposed.noRemainingChanges, false);
  assert.deepEqual(proposed.proposal.fields, { parkingNote: "用户停车说明" });
});

test("choosing current preserves an independent edit and media choices", () => {
  const input = {
    baseline: baseline(1, "原停车说明"), current: baseline(2, "当前停车说明"),
    proposal: { fields: { parkingNote: "用户停车说明", detail: "补充现场信息" }, media: { site: ["media:new"] } },
    choices: { "FIELD:parkingNote": "CURRENT", "MEDIA:site": "PROPOSED" },
  } as const;
  const result = assessFormalFeedbackConflict(input);
  assert.equal(result.unresolved, 0);
  assert.equal(result.noRemainingChanges, false);
  assert.deepEqual(result.proposal.fields, { detail: "补充现场信息" });
  assert.deepEqual(result.proposal.media, { site: ["media:new"] });
  assert.deepEqual(result.resolutions.media, { site: "PROPOSED" });
});
