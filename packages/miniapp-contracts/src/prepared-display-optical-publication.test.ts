import assert from "node:assert/strict";
import test from "node:test";
import { OPTICAL_IMAGE_LEVELS } from "./optical-publication-content.ts";
import { assertPreparedOpticalPublication } from "./prepared-optical-publication.ts";
import { assertPreparedDisplayOpticalPublication, assertPreparedDisplayOpticalManifest,
  preparedDisplayOpticalPublicationHash,
  type PreparedDisplayOpticalManifest } from "./prepared-display-optical-publication.ts";
import { assertPreparedRenderedOpticalPublication } from "./prepared-rendered-optical-publication.ts";

import { preparedDisplayOpticalFixture as fixture } from "./test-fixtures/prepared-display-optical-publication.ts";

test("processed display has separate meaning while valid black and raw ancestry survive", () => {
  const p = fixture();
  assertPreparedDisplayOpticalPublication(p, "M:51");
  assertPreparedRenderedOpticalPublication(p, "M:51");
  assertPreparedRenderedOpticalPublication(p.parent.publication, "M:51");
  assert.throws(() => assertPreparedOpticalPublication(p, "M:51"), /prepared_optical_publication_invalid/);
  assert.equal(p.master.geometricBlackPixels, 2048 ** 2);
  assert.equal(p.levels.DETAIL.alphaPixels.opaque, 512 ** 2);
});

test("fresh hashes cannot rewrite raw ancestry alpha geometry units or processing semantics", () => {
  const original = fixture();
  for (const change of [
    (p: any) => { p.parent.publication.source.credit += " changed"; },
    (p: any) => { p.parent.publication.master.unit = "background-subtracted-display-sRGB"; },
    (p: any) => { p.source.encodedJpeg.sha256 = "4".repeat(64); },
    (p: any) => { p.levels.DETAIL.alphaPixels = { opaque: 512 ** 2 - 1, partial: 0, zero: 1 }; p.levels.DETAIL.geometricMasterSupportPixels--; },
    (p: any) => { p.master.unit = "published-encoded-RGB"; },
    (p: any) => { p.master.scientificAvailability = "COMPLETE"; },
    (p: any) => { p.processing.alpha = "brightness-feathered"; },
    (p: any) => { p.processing.estimationMask.role = "scientific-availability"; },
    (p: any) => { p.processing.estimationMask.pixels++; },
    (p: any) => { p.processing.negativeChannelPixels[0]++; },
    (p: any) => { p.processing.background.member = "../background.npy"; },
    (p: any) => { p.processing.sourceIcc.colourSpace = "UNKNOWN"; },
    (p: any) => { p.processing.estimate.detectNSigma = 5; },
  ]) {
    const p = structuredClone(original); change(p);
    assert.throws(() => assertPreparedDisplayOpticalPublication(p, "M:51", preparedDisplayOpticalPublicationHash(p)));
  }
});

test("display hash binds estimation evidence and source credit while manifest URLs stay transport only", () => {
  const p = fixture(), hash = preparedDisplayOpticalPublicationHash(p);
  for (const change of [
    (p: any) => { p.processing.generationReceipt.sha256 = "4".repeat(64); },
    (p: any) => { p.processing.background.payload.sha256 = "4".repeat(64); },
    (p: any) => { p.processing.geometryExclusion.credit += " changed"; },
    (p: any) => { p.processing.modification += " changed"; },
    (p: any) => { p.processing.negativeChannelPixels[1]++; },
  ]) {
    const changed = structuredClone(p); change(changed);
    assert.notEqual(preparedDisplayOpticalPublicationHash(changed), hash);
    assert.throws(() => assertPreparedDisplayOpticalPublication(changed, "M:51", hash));
  }
  const manifest: PreparedDisplayOpticalManifest = { ...p, publicationHash: hash,
    levels: Object.fromEntries(OPTICAL_IMAGE_LEVELS.map(level => [level,
      { ...p.levels[level], downloadUrl: `/v2/sky/prepared-optical/${hash}/${p.levels[level].file}` }])) as PreparedDisplayOpticalManifest["levels"] };
  assertPreparedDisplayOpticalManifest(manifest, "M:51", hash);
  manifest.levels.DETAIL.downloadUrl = "/unbound.png";
  assert.equal(preparedDisplayOpticalPublicationHash(manifest), hash);
  assert.throws(() => assertPreparedDisplayOpticalManifest(manifest, "M:51", hash));
});
