import assert from "node:assert/strict";
import test from "node:test";
import { assertPreparedNativeOpticalManifest, OPTICAL_IMAGE_LEVELS, preparedNativeOpticalPublicationHash,
  OBSERVATION_FRAME_FORMAT, type PreparedNativeOpticalManifest, type SkyObservationFrame } from "@starward/miniapp-contracts";
import { preparedNativeOpticalFixture } from "../../../../../packages/miniapp-contracts/src/test-fixtures/prepared-native-optical-publication.ts";
import { registerSkyNativeImageLifetime } from "./sky-artwork-loader";
import { skyPreparedRegionSelections } from "./sky-prepared-region-selection";
import { acceptedSkyPreparedRegionCompletions, sameSkyPreparedRegionInputs, skyPreparedRegionImages } from "./sky-prepared-region-frame";
import { skyTargetOpticalFrame, type SkyPreparedOpticalImage } from "./sky-sdss-optical-frame";
import { submitSkyScenePreparedRegions, completeSkyScenePreparedRegions, skyPreparedRegionsBlockInfrared } from "./sky-prepared-optical-scene";
import { registerSkyTanOpticalField } from "./sky-tan-optical-registration";
import { createSkyViewBasis } from "./sky-view-projection";
import { drawSkyScene } from "./sky-scene-render";
import { skyOpticalSourceCredit } from "./sky-optical-source-credit";

const at = "2026-10-05T13:00:00.000Z";
const observation: SkyObservationFrame = { format: OBSERVATION_FRAME_FORMAT, at,
  observer: { latitude: 0, longitude: 0, elevationM: 0 }, equatorialToEnu: [1,0,0,0,1,0,0,0,1] };
const report = { hourly: [{ at }], observationFrames: [observation], skyScene: { state: "UNAVAILABLE", frames: [] } } as any;
function publication(id: string, ra = 11.8902020999) {
  const p = preparedNativeOpticalFixture(true); p.reference = `REGION:${id}`; p.subject.reference = p.reference;
  p.subject.label = id; p.publicationId = id; p.nominalTan.referenceValue[0] = ra; p.source.credit = `Full credit ${id}`;
  for (const level of OPTICAL_IMAGE_LEVELS) p.levels[level].file = `${id}-${level.toLowerCase()}.jpg`;
  const hash = preparedNativeOpticalPublicationHash(p);
  const manifest = { ...p, publicationHash: hash, levels: Object.fromEntries(OPTICAL_IMAGE_LEVELS.map(level =>
    [level, { ...p.levels[level], downloadUrl: `/v2/sky/prepared-optical/${hash}/${p.levels[level].file}` }])) } as PreparedNativeOpticalManifest;
  assertPreparedNativeOpticalManifest(manifest, p.reference, hash); return manifest;
}
const first = publication("first"), second = publication("second", 91.8902020999);
const view = { basis: createSkyViewBasis(90 - first.nominalTan.referenceValue[0], 90 + first.nominalTan.referenceValue[1], 0)!, verticalFovDeg: .1 };
function frame(p: PreparedNativeOpticalManifest) {
  return skyTargetOpticalFrame({ publication: p, image: {}, renderedLevel: "DETAIL", renderedAsset: p.levels.DETAIL,
    coarser: { image: {}, level: "OVERVIEW", asset: p.levels.OVERVIEW } }) as SkyPreparedOpticalImage;
}
const selections = [first, second].map(p => ({ kind: p.imageVersion, reference: p.reference, publicationHash: p.publicationHash, tan: p.nominalTan }));

test("ordinary regions need no pick; own exact-time planes cull an independent off-field publication", () => {
  const footprint = { report, at, view, width: 390, height: 844 };
  assert.deepEqual(skyPreparedRegionSelections(selections, footprint).map(p => p.reference), [first.reference]);
  assert.deepEqual(skyPreparedRegionSelections(selections, { ...footprint, view: { ...view,
    basis: createSkyViewBasis(90 - second.nominalTan.referenceValue[0], 90 + second.nominalTan.referenceValue[1], 0)! } }).map(p => p.reference), [second.reference]);
  assert.deepEqual(skyPreparedRegionSelections(selections, { ...footprint, at: "2026-10-05T14:00:00.000Z" }), []);
  const { tan: _tan, ...unknownBounds } = selections[1]!;
  assert.deepEqual(skyPreparedRegionSelections([unknownBounds], footprint).map(p => p.reference), [second.reference],
    "unknown acquisition bounds cannot certify absence");
});

test("one Scene finishes each region's source separately and retirement preserves an independent ready parent", () => {
  const frames = [frame(first), frame(second)], retired: (() => void)[] = [];
  for (const value of skyPreparedRegionImages(frames)) retired.push(registerSkyNativeImageLifetime(value, () => true));
  let finished = false, drawCount = 0, sources: any;
  const surface: any = new Proxy({
    artworkLevels: () => ({ submitted: true, finePrepared: true, coarsePrepared: true, id: ++drawCount }),
    artworkLevelsQualification: () => ({ fine: "has", coarse: "has", any: "has" }),
    artworkLevelsContribution: () => { assert(finished, "no source may complete before this frame finishes"); return {
      completed: true, qualification: { fine: "has", coarse: "has", any: "has" }, finePhoto: "positive", coarsePhoto: "positive" }; },
    finish: () => { finished = true; },
  }, { get(target, key) { return target[key as keyof typeof target] ?? (() => undefined); } });
  const regions = frames.map(value => ({ frame: value, port: { surface, reference: value.reference, publicationHash: value.publicationHash } }));
  try {
    const args: unknown[] = Array(41).fill(undefined);
    Object.assign(args, { 0: surface, 1: report, 2: at, 3: null, 4: null, 5: 390, 6: 844, 7: "NIGHT",
      8: (_snapshot: unknown, painted: unknown) => { sources = painted; }, 10: .1, 12: view.basis, 40: regions });
    (drawSkyScene as (...values: unknown[]) => void)(...args);
    assert.equal(drawCount, 2); assert.equal(sources.sdssOptical, null);
    const accepted = acceptedSkyPreparedRegionCompletions(sources.preparedRegions, frames);
    assert.equal(accepted.length, 2);
    assert.deepEqual(accepted.map(skyOpticalSourceCredit).map(credit => credit!.credit), [first.source.credit, second.source.credit]);
    assert.equal(acceptedSkyPreparedRegionCompletions(sources.preparedRegions, [frames[0]!]).length, 1);
    assert.equal(acceptedSkyPreparedRegionCompletions([{ ...accepted[0]!, publicationHash: second.publicationHash }], frames).length, 0);
    assert.equal(sameSkyPreparedRegionInputs(frames, [...frames]), true);
    assert.equal(sameSkyPreparedRegionInputs(frames, [frames[1]!, frames[0]!]), false);
    retired[0]!(); assert.equal(acceptedSkyPreparedRegionCompletions(sources.preparedRegions, frames)[0]!.participatingFields.length, 1);
    retired[1]!(); assert.deepEqual(acceptedSkyPreparedRegionCompletions(sources.preparedRegions, frames).map(p => p.reference), [second.reference]);
  } finally { retired.forEach(retire => retire()); }
});

test("matching intent and whole-cutout spectrum precedence remain independent for each region", () => {
  const frames = [frame(first), frame(second)];
  const surface: any = { artworkLevels: () => ({ submitted: true, finePrepared: true, coarsePrepared: true }),
    artworkLevelsQualification: () => ({ fine: "has", coarse: "has", any: "has" }),
    artworkLevelsContribution: () => ({ completed: false, qualification: { fine: "has", coarse: "has", any: "has" },
      finePhoto: "unknown", coarsePhoto: "unknown" }) };
  const regions = frames.map(value => ({ frame: value, port: { surface, reference: value.reference, publicationHash: value.publicationHash } }));
  const submissions = submitSkyScenePreparedRegions(surface, regions, observation, view);
  assert.equal(submissions.length, 2); assert(submissions.every(value => value.region === null));
  assert.equal(completeSkyScenePreparedRegions(submissions).length, 0, "submission alone cannot create attribution");
  assert.equal(skyPreparedRegionsBlockInfrared([submissions[0]!], registerSkyTanOpticalField(first, first.levels.OVERVIEW, observation)!, observation), true);
  assert.equal(skyPreparedRegionsBlockInfrared([submissions[0]!], registerSkyTanOpticalField(second, second.levels.OVERVIEW, observation)!, observation), false);
  assert.equal(submitSkyScenePreparedRegions(surface, [{ ...regions[0]!, port: { ...regions[0]!.port, publicationHash: second.publicationHash } }], observation, view).length, 0);
});
