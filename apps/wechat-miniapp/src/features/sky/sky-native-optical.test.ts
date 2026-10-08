import assert from "node:assert/strict";
import test from "node:test";
import { preparedNativeOpticalFixture } from "../../../../../packages/miniapp-contracts/src/test-fixtures/prepared-native-optical-publication.ts";
import { preparedNativeOpticalPublicationHash, assertPreparedNativeOpticalManifest, OPTICAL_IMAGE_LEVELS,
  OBSERVATION_FRAME_FORMAT, type SkyObservationFrame } from "@starward/miniapp-contracts";
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

const publication = (region = false) => {
  const p = preparedNativeOpticalFixture(region), publicationHash = preparedNativeOpticalPublicationHash(p);
  const m = { ...p, publicationHash, levels: Object.fromEntries(OPTICAL_IMAGE_LEVELS.map(level => [level,
    { ...p.levels[level], downloadUrl: `/v2/sky/prepared-optical/${publicationHash}/${p.levels[level].file}` }])) } as any;
  assertPreparedNativeOpticalManifest(m, p.reference, publicationHash); return m;
};
const observation: SkyObservationFrame = { format: OBSERVATION_FRAME_FORMAT, at: "2026-10-05T13:00:00.000Z",
  observer: { latitude: 0, longitude: 0, elevationM: 0 }, equatorialToEnu: [1,0,0,0,1,0,0,0,1] };

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
    assert.equal(skyTargetOpticalFrame({ publication: p, image, renderedLevel: "DETAIL", renderedAsset: { ...p.levels.DETAIL }, coarser: null }), null);
    retire(); assert.equal(skyOpticalSourceCredit(completion)?.credit, p.source.credit, "a live participating parent retains the same exact source");
    retireParent(); assert.equal(skyOpticalSourceCredit(completion), null);
  } finally { retire(); retireParent(); }
});
