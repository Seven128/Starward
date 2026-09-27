import assert from "node:assert/strict";
import test from "node:test";
import type { ContributionFormalBaseline } from "@starward/miniapp-contracts";
import { formalPhotoGroups, photoGroupEntries } from "./photo-groups";

const baseline = { media: { parking: ["old-parking", "kept-parking"], toilet: ["old-toilet"], site: [] } } as unknown as ContributionFormalBaseline;
test("photo comparison preserves full ordered identities, explicit removal and absent groups", () => {
  const groups = formalPhotoGroups(baseline, { fields: {}, media: { parking: ["kept-parking", "new-parking"], toilet: [], site: ["new-site"] } });
  assert.deepEqual(groups, [
    { kind: "parking", before: ["old-parking", "kept-parking"], after: ["kept-parking", "new-parking"] },
    { kind: "toilet", before: ["old-toilet"], after: [] },
    { kind: "site", before: [], after: ["new-site"] },
  ]);
  assert.deepEqual(photoGroupEntries(groups).map(entry => `${entry.kind}:${entry.side}:${entry.id}`), [
    "parking:before:old-parking", "parking:before:kept-parking", "parking:after:kept-parking", "parking:after:new-parking",
    "toilet:before:old-toilet", "site:after:new-site",
  ]);
});
test("reordering is a real difference while unchanged photos remain ordinary frozen groups", () => {
  assert.deepEqual(formalPhotoGroups(baseline, { fields: {}, media: {} }), []);
  assert.deepEqual(formalPhotoGroups(baseline, { fields: {}, media: {} }, true), [
    { kind: "parking", after: ["old-parking", "kept-parking"] }, { kind: "toilet", after: ["old-toilet"] },
  ]);
  assert.deepEqual(formalPhotoGroups(baseline, { fields: {}, media: { parking: ["kept-parking", "old-parking"] } })[0]?.before, baseline.media.parking);
  assert.deepEqual(photoGroupEntries([{ kind: "site", after: ["ordinary"] }]), [{ kind: "site", side: "current", id: "ordinary" }]);
});
