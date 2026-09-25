import assert from "node:assert/strict";
import test from "node:test";
import { CONTRIBUTION_FORMAL_FIELD_KEYS, type ContributionFormalBaseline, type SpotId } from "@starward/miniapp-contracts";
import { buildFormalContributionResult } from "./formal-contribution-submission.ts";

function baseline(revision: number, detail: string): ContributionFormalBaseline {
  const fields = Object.fromEntries(CONTRIBUTION_FORMAL_FIELD_KEYS.map(key => [key, null])) as unknown as ContributionFormalBaseline["fields"];
  return {
    spotId: "spot:feedback" as SpotId,
    revision,
    fields: { ...fields, name: "星湾观星点", detail },
    media: { parking: [], toilet: [], site: [] },
  };
}

test("formal feedback frozen summary excludes a detail edit abandoned during rebase", () => {
  const original = baseline(4, "原现场说明");
  const latest = baseline(5, "正式资料的新说明");
  const result = buildFormalContributionResult({
    request: {
      kind: "CORRECTION",
      baseline: original,
      proposal: { fields: { detail: "我原先的修改", hours: "19:00—次日05:00" }, media: {} },
      resolutions: { fields: { detail: "CURRENT" } },
      observedAt: null,
      rightsConfirmed: false,
    },
    currentBaseline: latest,
    now: "2026-09-25T00:00:00.000Z",
  });
  assert.equal(result.state, "SUBMITTED");
  if (result.state !== "SUBMITTED") return;
  assert.deepEqual(result.submission.formalFeedback?.resolvedProposal.fields, { hours: "19:00—次日05:00" });
  assert.equal(result.submission.detail, "");
  assert.equal(result.submission.attempts[0]?.snapshot.detail, "");
});

test("formal feedback frozen summary retains an accepted detail edit", () => {
  const result = buildFormalContributionResult({
    request: {
      kind: "CORRECTION",
      baseline: baseline(4, "原现场说明"),
      proposal: { fields: { detail: "补充现场情况" }, media: {} },
      resolutions: { fields: { detail: "PROPOSED" } },
      observedAt: null,
      rightsConfirmed: false,
    },
    currentBaseline: baseline(5, "正式资料的新说明"),
    now: "2026-09-25T00:00:00.000Z",
  });
  assert.equal(result.state, "SUBMITTED");
  if (result.state !== "SUBMITTED") return;
  assert.equal(result.submission.detail, "补充现场情况");
  assert.equal(result.submission.attempts[0]?.snapshot.detail, "补充现场情况");
});
