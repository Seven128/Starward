import assert from "node:assert/strict";
import test from "node:test";
import type { SpotId } from "./types.ts";
import {
  CONTRIBUTION_FORMAL_FIELD_KEYS,
  resolveContributionFormalRebase,
  type ContributionFormalBaseline,
} from "./contribution-feedback.ts";

function baseline(revision: number, overrides: Partial<ContributionFormalBaseline["fields"]> = {}): ContributionFormalBaseline {
  const fields = Object.fromEntries(CONTRIBUTION_FORMAL_FIELD_KEYS.map((key) => [key, null])) as unknown as Record<(typeof CONTRIBUTION_FORMAL_FIELD_KEYS)[number], string | null>;
  return {
    spotId: "spot:feedback" as SpotId,
    revision,
    fields: { ...fields, name: "星湾观星点", hours: "18:00—次日06:00", parkingNote: "约20个车位", ...overrides },
    media: { parking: ["media:parking-old"], toilet: [], site: ["media:site-old"] },
  };
}

test("formal feedback rebases independent user edits onto the latest baseline", () => {
  const result = resolveContributionFormalRebase({
    baseline: baseline(4),
    current: baseline(5, { hours: "19:00—次日05:00" }),
    proposal: { fields: { parkingNote: "约12个车位" }, media: {} },
  });
  assert.equal(result.baseline.revision, 5);
  assert.deepEqual(result.proposal.fields, { parkingNote: "约12个车位" });
  assert.deepEqual(result.conflicts, []);
});

test("formal feedback exposes three values and requires an explicit conflict choice", () => {
  const input = {
    baseline: baseline(4),
    current: baseline(5, { hours: "20:00—次日04:00" }),
    proposal: { fields: { hours: "19:00—次日05:00" }, media: {} },
  } as const;
  const unresolved = resolveContributionFormalRebase(input);
  assert.deepEqual(unresolved.proposal.fields, {});
  assert.deepEqual(unresolved.conflicts, [{
    kind: "FIELD", key: "hours", baselineValue: "18:00—次日06:00",
    currentValue: "20:00—次日04:00", proposedValue: "19:00—次日05:00",
  }]);
  assert.deepEqual(resolveContributionFormalRebase({ ...input, resolutions: { fields: { hours: "CURRENT" } } }).proposal.fields, {});
  assert.deepEqual(resolveContributionFormalRebase({ ...input, resolutions: { fields: { hours: "PROPOSED" } } }).proposal.fields, { hours: "19:00—次日05:00" });
});

test("explicit clears and media replacement use the same immutable baseline rules", () => {
  const before = baseline(2, { accessNote: "提前预约" });
  const current = { ...baseline(3, { accessNote: "提前预约" }), media: { parking: ["media:parking-new"], toilet: [], site: ["media:site-old"] } };
  const result = resolveContributionFormalRebase({
    baseline: before,
    current,
    proposal: { fields: { accessNote: "" }, media: { parking: [] } },
  });
  assert.deepEqual(result.proposal.fields, { accessNote: "" });
  assert.equal(result.conflicts[0]?.kind, "MEDIA");
  assert.equal(result.conflicts[0]?.key, "parking");
});

test("a baseline cannot be rebound to another spot or an older canonical revision", () => {
  assert.throws(() => resolveContributionFormalRebase({
    baseline: baseline(3),
    current: { ...baseline(4), spotId: "spot:other" as SpotId },
    proposal: { fields: {}, media: {} },
  }), /spot_mismatch/u);
  assert.throws(() => resolveContributionFormalRebase({
    baseline: baseline(4), current: baseline(3), proposal: { fields: {}, media: {} },
  }), /current_revision_invalid/u);
});
