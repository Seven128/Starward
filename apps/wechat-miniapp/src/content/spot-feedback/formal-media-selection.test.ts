import assert from "node:assert/strict";
import test from "node:test";
import type { ContributionFormalBaseline } from "@starward/miniapp-contracts";
import { appendFormalMedia, createFormalMediaSelection, formalMediaProposal, removeFormalMedia } from "./formal-media-selection";

const baseline = { spotId: "spot:test", revision: 4, fields: {}, media: { parking: ["old-parking"], toilet: [], site: ["old-site"] } } as unknown as ContributionFormalBaseline;

test("rejected feedback restores the submitted replacement instead of re-adding baseline media", () => {
  const selection = createFormalMediaSelection(baseline, { fields: {}, media: { site: ["upload:new"], parking: [] } }, ["upload:new" as never]);
  assert.deepEqual(selection.site, ["upload:new"]);
  assert.deepEqual(selection.parking, []);
  assert.deepEqual(formalMediaProposal(baseline, selection), { parking: [], site: ["upload:new"] });
});

test("media selection supports explicit remove and append without mutating baseline", () => {
  const original = createFormalMediaSelection(baseline);
  const removed = removeFormalMedia(original, "site", "old-site");
  const added = appendFormalMedia(removed, "site", "upload:next" as never);
  assert.deepEqual(original.site, ["old-site"]);
  assert.deepEqual(formalMediaProposal(baseline, added), { site: ["upload:next"] });
});
