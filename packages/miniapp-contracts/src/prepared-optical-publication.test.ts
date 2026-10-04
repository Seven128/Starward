import assert from "node:assert/strict";
import test from "node:test";
import { OPTICAL_IMAGE_LEVELS } from "./optical-publication-content.ts";
import { assertPreparedOpticalPublication, assertPreparedOpticalManifest, preparedOpticalPublicationHash,
  type PreparedOpticalPublication, type PreparedOpticalManifest } from "./prepared-optical-publication.ts";
import { assertSdssScienceOpticalPublication } from "./sdss-science-optical-publication.ts";

import { preparedOpticalFixture as fixture } from "./test-fixtures/prepared-optical-publication.ts";

function envelope(publication: PreparedOpticalPublication): PreparedOpticalManifest {
  const publicationHash = preparedOpticalPublicationHash(publication);
  return { ...publication, publicationHash, levels: Object.fromEntries(OPTICAL_IMAGE_LEVELS.map(level => [level,
    { ...publication.levels[level], downloadUrl: `/v2/sky/prepared-optical/${publicationHash}/${publication.levels[level].file}` }])) as PreparedOpticalManifest["levels"] };
}

test("prepared source colour and geometry remain independent of science even for valid black", () => {
  const publication = fixture();
  assertPreparedOpticalPublication(publication, "M:51");
  assert.equal(publication.master.geometricBlackPixels, publication.master.geometricSupportPixels);
  assert.throws(() => assertSdssScienceOpticalPublication(publication, "M:51"), /sdss_science_optical_publication_invalid/);
  for (const change of [
    (p: any) => { p.master.scientificAvailability = "COMPLETE"; },
    (p: any) => { p.master.scientificValidity = "VALID"; },
    (p: any) => { p.master.unit = "nanomaggies/pixel"; },
    (p: any) => { p.levels.DETAIL.displayAlpha = "joint-area-alpha"; },
    (p: any) => { p.levels.DETAIL.scientificAvailability = "HAS_DATA"; },
  ]) {
    const changed = structuredClone(publication); change(changed);
    assert.throws(() => assertPreparedOpticalPublication(changed, "M:51", preparedOpticalPublicationHash(changed)), /prepared_optical_publication_invalid/);
  }
});

test("prepared immutable pin binds full credit source bytes uncertainty and every level without wire URLs", () => {
  const publication = fixture(), manifest = envelope(publication), pin = manifest.publicationHash;
  assertPreparedOpticalManifest(manifest, "M:51", pin);
  assert.equal(preparedOpticalPublicationHash(publication), pin);
  for (const change of [
    (p: any) => { p.source.credit += " changed"; }, (p: any) => { p.source.rawXmp.sha256 = "2".repeat(64); },
    (p: any) => { p.source.nominalAvm.spatialNotes += " changed"; },
    (p: any) => { p.processing.producerReceipt.sha256 = "2".repeat(64); },
    (p: any) => { p.levels.DETAIL.sha256 = "2".repeat(64); },
  ]) {
    const changed = structuredClone(publication); change(changed);
    assert.notEqual(preparedOpticalPublicationHash(changed), pin);
    assert.throws(() => assertPreparedOpticalPublication(changed, "M:51", pin), /prepared_optical_publication_invalid/);
  }
  const redirected = structuredClone(manifest); redirected.levels.DETAIL.downloadUrl = "/somewhere-else.png";
  assert.equal(preparedOpticalPublicationHash(redirected), pin);
  assert.throws(() => assertPreparedOpticalManifest(redirected, "M:51", pin), /prepared_optical_manifest_invalid/);
  assert.throws(() => assertPreparedOpticalManifest(manifest, "M:82", pin), /prepared_optical_publication_invalid/);
});

test("fresh hashes cannot admit incompatible AVM resize coordinate colour and box-area declarations", () => {
  for (const change of [
    (p: any) => { p.source.credit = ""; }, (p: any) => { p.source.sourceUrl = "http://example.invalid/image.jpg"; },
    (p: any) => { p.source.nominalAvm.accuracy = "PRECISE"; },
    (p: any) => { p.source.nominalAvm.crpixFitsOneBased[1] += .25; },
    (p: any) => { p.source.nominalAvm.cdeltDegrees[0] *= -1; },
    (p: any) => { p.source.decodedRgb.rowOrder = "bottom-first"; },
    (p: any) => { p.source.decodedRgb.bytes--; }, (p: any) => { p.processing.sampleOffsetsDyDx.reverse(); },
    (p: any) => { p.master.rgba.bytes = p.master.rgbaNpy.bytes; },
    (p: any) => { p.master.rgbaNpy.bytes = p.master.rgba.bytes; },
    (p: any) => { p.master.rgbaNpy.dtype = "float32"; },
    (p: any) => { p.master.rgbaNpy.rowOrder = "bottom-first"; },
    (p: any) => { p.master.rgbaNpy.shape[2] = 3; },
    (p: any) => { p.processing.sampling = "brightness-derived-mask"; },
    (p: any) => { p.levels.DETAIL.masterCrop.boundsXYExclusive[0]++; },
    (p: any) => { p.levels.MEDIUM.fieldDegrees = p.master.fieldDegrees / 2; },
    (p: any) => { p.levels.DETAIL.masterRgbaSha256 = "2".repeat(64); },
    (p: any) => { p.levels.DETAIL.file = "../image.png"; },
    (p: any) => { p.levels.DETAIL.alphaPixels.opaque--; p.levels.DETAIL.alphaPixels.partial++; },
    (p: any) => { p.master.geometricBlackPixels++; },
  ]) {
    const p = fixture(); change(p);
    assert.throws(() => assertPreparedOpticalPublication(p, "M:51", preparedOpticalPublicationHash(p)), /prepared_optical_publication_invalid/);
  }
});

test("prepared AVM preserves independently declared pixel scales and rejects inconsistent axis resizing", () => {
  const publication = fixture();
  // Actual heic0604a AVM scale pair; this structural fixture is not the image.
  const geometry = publication.source.nominalAvm;
  geometry.scale = [-1.38805562484e-5, 1.38939775733e-5];
  geometry.cdeltDegrees = geometry.scale.map(v => v / geometry.resizeCommonXFactor) as [number, number];
  const manifest = envelope(publication);
  assertPreparedOpticalManifest(manifest, publication.objectRef, manifest.publicationHash);
  assert.notEqual(-geometry.scale[0], geometry.scale[1]);
  for (const change of [
    (p: PreparedOpticalPublication) => { p.source.nominalAvm.cdeltDegrees[1] = -p.source.nominalAvm.cdeltDegrees[0]; },
    (p: PreparedOpticalPublication) => { p.source.nominalAvm.scale[1] *= -1; },
    (p: PreparedOpticalPublication) => { p.source.nominalAvm.scale[0] = 0; },
    (p: PreparedOpticalPublication) => { p.source.nominalAvm.cdeltDegrees[0] = Infinity; },
  ]) {
    const changed = structuredClone(publication); change(changed);
    assert.throws(() => assertPreparedOpticalPublication(changed, changed.objectRef), /prepared_optical_publication_invalid/);
  }
});
