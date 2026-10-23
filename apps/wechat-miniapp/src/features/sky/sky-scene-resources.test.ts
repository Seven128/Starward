import assert from "node:assert/strict";
import test from "node:test";
import type { GalacticImageManifestData } from "@starward/miniapp-contracts";
import { registerSkyNativeImageLifetime } from "./sky-artwork-loader";
import { completeLegacySkyOptical } from "./sky-sdss-optical-completion";
import { skySceneTestBodyImages, skySceneTestFrame } from "./sky-scene-test-support";
import { completeSkySceneResources, liveSkySceneResources, resolveSkyCanvasResources, sameSkyCanvasResources,
  sameSkyCompletedSceneResources, skySceneResourceInputs, type SkyCanvasResourceFrame } from "./sky-scene-resources";
import type { SkyHipsCanvasTile } from "./sky-scene-frame";

function candidates(input: Partial<SkyCanvasResourceFrame> = {}): SkyCanvasResourceFrame {
  return { nativeImageGeneration: 3, deepSkyImage: null, sdssOpticalImage: null, preparedRegionImages: [],
    constellationImages: new Map(), hipsTiles: [], bodyImageBindings: [], galacticImage: null, galacticPublication: null,
    constellationsEnabled: true, landscapeEnabled: true, landscapePanorama: null, landscapeMask: null,
    landscapeOpacity: 0, landscapePending: false, landscapeFailed: false, ...input };
}
const surface = {} as Parameters<typeof skySceneResourceInputs>[1]["surface"];

test("one native admission fences all queued families while IR and late HiPS retain their actual owners", () => {
  const optical = { image: {}, reference: "M:51", publicationHash: "optical-A", fieldDegrees: 1, level: "DETAIL" as const };
  const tile: SkyHipsCanvasTile = { image: {}, layer: "WIDE_FIELD_W3", order: 0, pixel: 1 };
  let reads = 0, infraredCurrent = true;
  const infrared = { image: {}, reference: "M:51", publicationHash: "IR-A", fieldDegrees: 1, level: "DETAIL" as const,
    canvasGeneration: 4, isCurrent: () => infraredCurrent, coarser: null, fallback: null };
  const frame = candidates({ sdssOpticalImage: optical, deepSkyImage: infrared,
    constellationImages: new Map([["Ori", {}]]), bodyImageBindings: skySceneTestBodyImages({ "SOLAR:MOON": {} }),
    readHipsTiles: () => { reads++; return [tile]; }, landscapeFailed: true });
  assert.strictEqual(resolveSkyCanvasResources(frame, 4), frame); assert.equal(reads, 0);
  const resolved = resolveSkyCanvasResources(frame, 3); assert.equal(reads, 1); assert.strictEqual(resolved.hipsTiles[0], tile);
  assert.equal(sameSkyCanvasResources(frame, resolved), false, "an actual late native arrival is observable");
  const current = skySceneResourceInputs(resolved, { generation: 3, surface, previousLandscape: null });
  assert.strictEqual(current.imagery?.targetOptical?.image, optical);
  assert.strictEqual(current.layers?.constellations?.images, frame.constellationImages);
  assert.equal(current.imagery?.bodyImages?.length, 1); assert.strictEqual(current.imagery?.hipsTiles?.[0], tile);
  assert.equal(current.imagery?.infrared, null, "IR carries its own native Canvas admission");
  const retired = skySceneResourceInputs(resolved, { generation: 4, surface, previousLandscape: null });
  assert.equal(retired.imagery?.targetOptical?.image, null); assert.deepEqual(retired.imagery?.hipsTiles, []);
  assert.deepEqual(retired.imagery?.bodyImages, []); assert.equal(retired.layers?.constellations?.images.size, 0);
  assert.equal(retired.layers?.landscape?.pending, true); assert.equal(retired.layers?.landscape?.failed, false);
  assert.strictEqual(retired.imagery?.infrared, infrared);
  infraredCurrent = false;
  assert.equal(skySceneResourceInputs(resolved, { generation: 4, surface, previousLandscape: null }).imagery?.infrared, null);
});

test("actual completion and live source readers keep A while candidate B, missing receipts and independent retirement occur", () => {
  // Explicit controlled bitmap/submission ports. Body uses its checked-in
  // publication; this test grants no GPU pixels or imagery-admission evidence.
  const optical = { image: {}, reference: "M:51", publicationHash: "optical-A", fieldDegrees: 1, level: "DETAIL" as const };
  const coarse = { image: {}, reference: "M:51", publicationHash: "IR-A", sourceId: "W3", fieldDegrees: 2, level: "OVERVIEW" as const };
  const infrared = { image: {}, reference: "M:51", publicationHash: "IR-A", sourceId: "W3", fieldDegrees: .25,
    level: "DETAIL" as const, sourceMissingPixels: 9, canvasGeneration: 3, isCurrent: () => true, coarser: coarse, fallback: null };
  const galacticImage = {}, galacticPublication = { publicationHash: "galactic-A" } as GalacticImageManifestData;
  const bodyImages = skySceneTestBodyImages({ "SOLAR:MOON": {} });
  const tile: SkyHipsCanvasTile = { image: {}, layer: "OPTICAL", order: 1, pixel: 2 };
  const frame = candidates({ sdssOpticalImage: optical, deepSkyImage: infrared, bodyImageBindings: bodyImages,
    hipsTiles: [tile], galacticImage, galacticPublication });
  const input = { ...skySceneTestFrame({ canvas: { generation: 3 } }),
    ...skySceneResourceInputs(frame, { generation: 3, surface, previousLandscape: null }) };
  const landscape = { kind: "procedural" as const };
  const sources = { sdssOptical: completeLegacySkyOptical(optical, optical.image), deepSkyImage: coarse.image,
    bodyImages: [{ reference: "SOLAR:MOON" as const, image: bodyImages[0]!.image }], opticalHips: [tile],
    galacticImage: { image: galacticImage, publication: galacticPublication } };
  const retireCoarse = registerSkyNativeImageLifetime(coarse.image, () => true);
  const retireMoon = registerSkyNativeImageLifetime(bodyImages[0]!.image, () => true);
  try {
    const completed = completeSkySceneResources({ frame, input, sources, landscape });
    const accepted = { ...completed, nativeCanvasGeneration: 3 };
    assert.strictEqual(completed.sdssOptical, sources.sdssOptical);
    assert.strictEqual(completed.deepSkyImage?.image, coarse.image); assert.equal(completed.deepSkyImage?.sourceMissingPixels, undefined);
    assert.equal(completed.deepSkyImage?.coarser, null); assert.equal(completed.deepSkyImage?.fallback, null);
    assert.strictEqual(completed.bodyImages[0], bodyImages[0]); assert.strictEqual(completed.opticalHips[0], tile);
    assert.strictEqual(completed.galacticImage?.publication, galacticPublication); assert.strictEqual(completed.landscape, landscape);
    assert(Object.isFrozen(completed)); assert(Object.isFrozen(completed.opticalHips)); assert(Object.isFrozen(completed.preparedRegions));
    assert(sameSkyCompletedSceneResources(completed, completeSkySceneResources({ frame, input, sources, landscape })));
    const candidateB = { ...frame, sdssOpticalImage: { ...optical, image: {}, publicationHash: "optical-B" },
      galacticPublication: { ...galacticPublication } };
    assert.equal(sameSkyCanvasResources(frame, candidateB), false);
    const bInput = { ...input, ...skySceneResourceInputs(candidateB, { generation: 3, surface, previousLandscape: landscape }) };
    const foreign = completeSkySceneResources({ frame: candidateB, input: bInput, sources, landscape });
    assert.equal(foreign.sdssOptical, null); assert.equal(foreign.galacticImage, null, "equal-looking metadata cannot relabel A's actual source");
    const missing = completeSkySceneResources({ frame, input, sources: { sdssOptical: null, deepSkyImage: null }, landscape: null });
    assert.equal(missing.sdssOptical, null); assert.equal(missing.deepSkyImage, null); assert.deepEqual(missing.bodyImages, []);
    assert.strictEqual(accepted.sdssOptical, completed.sdssOptical); assert.strictEqual(accepted.deepSkyImage?.image, coarse.image);
    retireCoarse(); retireMoon();
    const live = liveSkySceneResources(accepted, 3);
    assert.equal(live.deepSkyImage, null); assert.deepEqual(live.bodyImages, []);
    assert.strictEqual(live.sdssOptical, sources.sdssOptical); assert.strictEqual(live.opticalHips[0], tile);
    assert.strictEqual(live.galacticImage?.publication, galacticPublication); assert.strictEqual(live.landscape, landscape);
    assert.strictEqual(accepted.deepSkyImage?.image, coarse.image); assert.equal(accepted.bodyImages.length, 1, "live reads never mutate historical A");
    const oldGeneration = liveSkySceneResources(accepted, 4);
    assert.equal(oldGeneration.sdssOptical, null); assert.equal(oldGeneration.galacticImage, null); assert.deepEqual(oldGeneration.opticalHips, []);
  } finally { retireCoarse(); retireMoon(); }
});
