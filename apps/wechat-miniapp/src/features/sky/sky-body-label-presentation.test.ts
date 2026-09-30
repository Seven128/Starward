import assert from "node:assert/strict";
import test from "node:test";
import { resolvedSkyBodyReferences, skyTargetLabelSuppressed } from "./sky-body-label-presentation";
import type { SkyPickSnapshot } from "./sky-object-picking";

test("resolved label replacement is identity- and rendered-size-bound, not brightness or display name", () => {
  const snapshot: SkyPickSnapshot = { frameAt: "t", catalogVersion: "v", catalogHash: "h", width: 750, height: 1500,
    objects: [{ reference: "PLANET:VENUS", displayName: "Venus", kind: "PLANET", magnitude: -4, x: 100, y: 100 }] };
  assert.deepEqual(resolvedSkyBodyReferences(null), []);
  assert.deepEqual(resolvedSkyBodyReferences(snapshot), []);
  const sized = (radius: number) => ({ ...snapshot, objects: snapshot.objects.map(object => ({ ...object,
    hitDisc: { majorRadiusPx: radius, minorRadiusPx: radius, minorDirection: [0, 1] as const } })) });
  assert.deepEqual(resolvedSkyBodyReferences(sized(11.99)), []);
  assert.deepEqual(resolvedSkyBodyReferences(sized(Number.NaN)), []);
  const references = resolvedSkyBodyReferences(sized(12));
  assert.deepEqual(references, ["PLANET:VENUS"]);
  assert.equal(skyTargetLabelSuppressed({ type: "PLANET", targetId: "target:venus" }, references), true);
  assert.equal(skyTargetLabelSuppressed({ type: "PLANET", targetId: "target:mars" }, references), false);
  assert.equal(skyTargetLabelSuppressed({ type: "STAR", targetId: "target:venus" }, references), false);
  assert.equal(skyTargetLabelSuppressed({ type: "PLANET", targetId: "venus" }, references), false);
  assert.deepEqual(resolvedSkyBodyReferences({ ...sized(12), width: 0 }), []);
});

test("an intentionally suppressed point withdraws only its own label, retaining legacy failure guides", () => {
  const target = { type: "PLANET", targetId: "target:jupiter" };
  assert.equal(skyTargetLabelSuppressed(target), false);
  assert.equal(skyTargetLabelSuppressed(target, [], ["PLANET:JUPITER"]), true);
  assert.equal(skyTargetLabelSuppressed(target, [], ["PLANET:MARS"]), false);
  assert.equal(skyTargetLabelSuppressed({ type:"STAR", targetId:"target:jupiter" }, [], ["PLANET:JUPITER"]), false);
  assert.equal(skyTargetLabelSuppressed({ type:"PLANET", targetId:"jupiter" }, [], ["PLANET:JUPITER"]), false);
});
