import assert from "node:assert/strict";
import test from "node:test";
import { preparedNativeOpticalFixture, preparedRegisteredNativeFixture } from "../../../../../packages/miniapp-contracts/src/test-fixtures/prepared-native-optical-publication.ts";
import { preparedDerivedRegionFixture } from "../../../../../packages/miniapp-contracts/src/test-fixtures/prepared-derived-region-optical-publication.ts";
import { preparedNativeOpticalPublicationHash, assertPreparedNativeOpticalManifest, OPTICAL_IMAGE_LEVELS,
  OBSERVATION_FRAME_FORMAT, type SkyObservationFrame } from "@starward/miniapp-contracts";
import { preparedDerivedRegionOpticalPublicationHash, assertPreparedDerivedRegionOpticalManifest } from "@starward/miniapp-contracts";
import { nativeTanDirection } from "@starward/astronomy-core/tan-optical-geometry";
import { registerSkyTanOpticalField } from "./sky-tan-optical-registration";
import { skyArtworkUvAtDirection } from "./sky-artwork-registration";
import { createSkyViewBasis } from "./sky-view-projection";
import { skyTargetOpticalFrame } from "./sky-sdss-optical-frame";
import { skyOpticalPixelMagnification } from "./sky-optical-pixel-sampling";
import { registerSkyNativeImageLifetime } from "./sky-artwork-loader";
import { submitSkySceneTargetOptical, observeSkySceneTargetOptical } from "./sky-target-optical-scene";
import { completePreparedSkyOptical } from "./sky-sdss-optical-completion";
import { skyOpticalSourceCredit } from "./sky-optical-source-credit";

const publication = (region = false, measured = false) => {
  const p = measured ? preparedRegisteredNativeFixture(region) : preparedNativeOpticalFixture(region), publicationHash = preparedNativeOpticalPublicationHash(p);
  const m = { ...p, publicationHash, levels: Object.fromEntries(OPTICAL_IMAGE_LEVELS.map(level => [level,
    { ...p.levels[level], downloadUrl: `/v2/sky/prepared-optical/${publicationHash}/${p.levels[level].file}` }])) } as any;
  assertPreparedNativeOpticalManifest(m, p.reference, publicationHash); return m;
};
const observation: SkyObservationFrame = { format: OBSERVATION_FRAME_FORMAT, at: "2026-10-05T13:00:00.000Z",
  observer: { latitude: 0, longitude: 0, elevationM: 0 }, equatorialToEnu: [1,0,0,0,1,0,0,0,1] };

test("actual native plane uses measured placement for every LOD and refuses malformed fallback", () => {
  const p = publication(false, true);
  assert(p.registration);
  for (const level of OPTICAL_IMAGE_LEVELS) {
    const registration = registerSkyTanOpticalField(p, p.levels[level], observation)!;
    assert(registration);
    for (const uv of [[0, 0], [1, 1], [.19, .71]] as const) {
      const actual: readonly [number, number] = skyArtworkUvAtDirection(registration, nativeTanDirection(p.registration.geometry, uv))!;
      assert(Math.abs(actual[0] - uv[0]) < 1e-10 && Math.abs(actual[1] - uv[1]) < 1e-10);
    }
    const old = skyArtworkUvAtDirection(registration, nativeTanDirection(p.nominalTan, [.5, .5]))!;
    assert(Math.hypot(old[0]-.5, old[1]-.5) > .004, "old nominal placement must fail this measurement");
  }
  delete p.registration;
  assert.equal(registerSkyTanOpticalField(p, p.levels.DETAIL, observation), null);
});

test("derived source alpha and nominal region retain exact Scene/completion identity", () => {
  const value = preparedDerivedRegionFixture(), hash = preparedDerivedRegionOpticalPublicationHash(value);
  const withUrl = (a: { file: string }) => ({ ...a, downloadUrl: `/v2/sky/prepared-optical/${hash}/${a.file}` });
  const p: any = { ...value, publicationHash: hash,
    levels: Object.fromEntries(Object.entries(value.levels).map(([level, a]) => [level, withUrl(a)])),
    support: Object.fromEntries(Object.entries(value.support).map(([key, a]) => [key, withUrl(a)])) };
  assertPreparedDerivedRegionOpticalManifest(p, value.reference, hash);
  const image = { width: 8, height: 6 }, retire = registerSkyNativeImageLifetime(image, () => true);
  try {
    const registration = registerSkyTanOpticalField(p, p.levels.DETAIL, observation)!;
    assert(registration);
    const uv = skyArtworkUvAtDirection(registration, nativeTanDirection(p.nominalTan, [.2, .7]))!;
    assert(Math.abs(uv[0] - .2) < 1e-10 && Math.abs(uv[1] - .7) < 1e-10);
    const frame = skyTargetOpticalFrame({ publication: p, image, renderedLevel: "DETAIL", renderedAsset: p.levels.DETAIL, coarser: null })!;
    assert(frame); assert.equal(registerSkyTanOpticalField(p, { ...p.levels.DETAIL }, observation), null);
    const draw = { submitted: true, finePrepared: true, coarsePrepared: false };
    const surface: any = { artworkLevels: () => draw, artworkLevelsQualification: () => ({ fine: "has", coarse: "empty", any: "has" }) };
    const submitted = submitSkySceneTargetOptical(surface, "prepared", { surface, reference: p.reference, publicationHash: hash }, frame,
      observation, { basis: createSkyViewBasis(90 - p.nominalTan.referenceValue[0], 90 + p.nominalTan.referenceValue[1], 0)!, verticalFovDeg: .1 })!;
    assert(submitted); assert.equal(submitted.region, null);
    const completion = completePreparedSkyOptical(frame, draw, { completed: true,
      qualification: { fine: "has", coarse: "empty", any: "has" }, finePhoto: "positive", coarsePhoto: "unknown" })!;
    const credit = skyOpticalSourceCredit(completion)!; assert(credit);
    assert.match(credit.description,/AI去星/u);
    assert(credit.sourceRoute.includes(encodeURIComponent(p.reference))); assert(credit.sourceRoute.includes(hash));
    retire(); assert.equal(skyOpticalSourceCredit(completion), null);
  } finally { retire(); }
});

test("native ready grids register the full rotated rectangle and reject borrowed descriptors", () => {
  const p = publication(), registration = registerSkyTanOpticalField(p, p.levels.DETAIL, observation)!;
  assert(registration);
  for (const uv of [[0, 0], [1, 1], [.19, .71]] as const) {
    const d = nativeTanDirection(p.nominalTan, uv), actual = skyArtworkUvAtDirection(registration, d)!;
    assert(actual); assert(Math.abs(actual[0] - uv[0]) < 1e-10 && Math.abs(actual[1] - uv[1]) < 1e-10);
  }
  assert.equal(registerSkyTanOpticalField(p, { ...p.levels.DETAIL }, observation), null);
  assert.equal(registerSkyTanOpticalField(p, p.levels.DETAIL, null), null);
  const view = { view: { basis: createSkyViewBasis(90 - p.nominalTan.referenceValue[0], 90 + p.nominalTan.referenceValue[1], 0)!, verticalFovDeg: .5 },
    report: undefined, at: undefined, width: 390, height: 844, drawingWidth: 780, drawingHeight: 1688 };
  const square = skyOpticalPixelMagnification(registration, { width: 512, height: 512 }, view)!;
  const rectangular = skyOpticalPixelMagnification(registration, { width: 512, height: 256 }, view)!;
  assert(rectangular > square * 1.5, "the source's independent height must constrain native sampling");
});

test("independent region submits to the existing group and credits only live completed source", () => {
  const p = publication(true), image = { width: 1024, height: 928 }, parentImage = { width: 512, height: 464 };
  const retire = registerSkyNativeImageLifetime(image, () => true), retireParent = registerSkyNativeImageLifetime(parentImage, () => true);
  try {
    const frame = skyTargetOpticalFrame({ publication: p, image, renderedLevel: "DETAIL", renderedAsset: p.levels.DETAIL,
      coarser: { image: parentImage, level: "MEDIUM", asset: p.levels.MEDIUM } })!;
    assert(frame && "preparedPublication" in frame);
    const calls: any[] = [];
    const draw = { submitted: true, finePrepared: true, coarsePrepared: true };
    const surface: any = { artworkLevels: (levels: unknown) => { calls.push(levels); return draw; },
      artworkLevelsQualification: () => ({ fine: "has", coarse: "has", any: "has" }) };
    const port = { surface, reference: p.reference, publicationHash: p.publicationHash };
    const view = { basis: createSkyViewBasis(90 - p.nominalTan.referenceValue[0], 90 + p.nominalTan.referenceValue[1], 0)!, verticalFovDeg: .1 };
    const submitted = submitSkySceneTargetOptical(surface, "prepared", port, frame, observation, view)!;
    assert(submitted); assert.equal(submitted.region, null); assert.equal(submitted.allowInfrared, false);
    assert.equal(observeSkySceneTargetOptical(submitted).signalRevision, null);
    assert.equal(calls[0].fine.scientificAvailability, "UNKNOWN");
    const completion = completePreparedSkyOptical(frame, draw, { completed: true,
      qualification: { fine: "has", coarse: "has", any: "has" }, finePhoto: "positive", coarsePhoto: "positive" })!;
    const credit = skyOpticalSourceCredit(completion)!;
    assert(credit); assert(credit.sourceRoute.includes(`preparedPublicationHash=${p.publicationHash}`));
    assert(credit.sourceRoute.includes(encodeURIComponent(p.reference))); assert.equal(credit.credit, p.source.credit);
    assert.doesNotMatch(credit.description,/AI/u,'an unprocessed full-source publication must not claim AI processing');
    assert.equal(skyTargetOpticalFrame({ publication: p, image, renderedLevel: "DETAIL", renderedAsset: { ...p.levels.DETAIL }, coarser: null }), null);
    retire(); assert.equal(skyOpticalSourceCredit(completion)?.credit, p.source.credit, "a live participating parent retains the same exact source");
    retireParent(); assert.equal(skyOpticalSourceCredit(completion), null);
  } finally { retire(); retireParent(); }
});
