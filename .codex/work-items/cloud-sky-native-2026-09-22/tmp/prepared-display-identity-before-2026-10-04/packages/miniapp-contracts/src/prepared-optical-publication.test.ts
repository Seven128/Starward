import assert from "node:assert/strict";
import test from "node:test";
import { OPTICAL_IMAGE_LEVELS } from "./optical-publication-content.ts";
import { assertPreparedOpticalPublication, assertPreparedOpticalManifest, preparedOpticalPublicationHash,
  type PreparedOpticalPublication, type PreparedOpticalManifest } from "./prepared-optical-publication.ts";
import { assertSdssScienceOpticalPublication } from "./sdss-science-optical-publication.ts";

const hash = "1".repeat(64), identity = { bytes: 128, sha256: hash };
/** Structure only; source decoding and every output pixel are verified by the
 * offline producer/writer. This fixture supplies no scientific observations. */
function fixture(): PreparedOpticalPublication {
  const fieldDegrees = .2275555555555556;
  return {
    schemaVersion: "prepared-observation-optical-publication-v1", imageVersion: "prepared-optical-v1",
    publicationId: "synthetic-prepared-admission-v1", objectRef: "M:51",
    center: { raDeg: 202.469625, decDeg: 47.1951666667, frame: "ICRS J2000" }, orientation: "north-up/east-left",
    source: { resourceId: "synthetic-avm", sourceUrl: "https://example.invalid/observation.jpg",
      metadataReferenceUrl: "https://example.invalid/observation/", credit: "Complete synthetic fixture credit",
      license: "CC BY 4.0", licenseUrl: "https://creativecommons.org/licenses/by/4.0/",
      policyUrl: "https://example.invalid/rights/", colourMeaning: "Prepared encoded observation colour; not calibrated flux",
      encodedJpeg: identity, rawXmp: identity, parserXmp: identity,
      decodedRgb: { bytes: 32 * 24 * 3, sha256: hash, shape: [24, 32, 3], rowOrder: "top-first" },
      nominalAvm: { referenceDimension: [64, 48], referencePixel: [32.5, 24.5], referenceValue: [202.468, 47.21],
        scale: [-.00002, .00002], rotation: -91.9, decodedShapeWidthHeight: [32, 24],
        resizeCommonXFactor: .5, resizeYFactor: .5, crpixFitsOneBased: [16.25, 12.25], cdeltDegrees: [-.00004, .00004],
        spatialNotes: "Approximate publisher coordinates; fixture is not an astrometric measurement",
        spatialQuality: "Full", accuracy: "UNVERIFIED_APPROXIMATE_PUBLISHER_AVM" } },
    processing: { runtimeNetwork: "forbidden", modification: "Unmodified encoded colour; geometry-only resampling",
      coverage: "Scientific availability and validity are unknown", sourceAdapterVersion: "prepared-rgb-observation-avm-v1",
      producerVersion: "prepared-rgb-tan-master-v1", producerReceipt: identity,
      sampleOffsetsDyDx: [[-.25, -.25], [-.25, .25], [.25, -.25], [.25, .25]],
      sampling: "encoded-RGB-bilinear-all-four-neighbours", levelResampling: "geometry-premultiplied-integer-box-round-to-nearest",
      validation: "BOUND_MASTER_AND_LEVELS_CHECKED" },
    master: { pixels: 2048, fieldDegrees, crpixFitsOneBased: 1024.5,
      rgba: { ...identity, bytes: 2048 ** 2 * 4 },
      rgbaNpy: { bytes: 2048 ** 2 * 4 + 128, sha256: "2".repeat(64), format: "npy",
        shape: [2048, 2048, 4], dtype: "uint8", rowOrder: "top-first" },
      geometricSupportPixels: 2048 ** 2, geometricBlackPixels: 2048 ** 2,
      scientificAvailability: "UNKNOWN", scientificValidity: "UNKNOWN", unit: "published-encoded-RGB" },
    levels: Object.fromEntries(OPTICAL_IMAGE_LEVELS.map((level, index) => {
      const extent = 2048 / 2 ** index, start = (2048 - extent) / 2;
      return [level, { ...identity, file: `M-51-${level.toLowerCase()}.png`, format: "png", pixels: 512,
        fieldDegrees: Math.atan(Math.tan(fieldDegrees * Math.PI / 360) * extent / 2048) * 360 / Math.PI,
        crpixFitsOneBased: 256.5, displayAlpha: "geometric-source-area", scientificAvailability: "UNKNOWN", masterRgbaSha256: hash,
        masterCrop: { boundsXYExclusive: [start, start, start + extent, start + extent], boxFactor: extent / 512 },
        geometricMasterSupportPixels: extent ** 2, alphaPixels: { opaque: 512 ** 2, partial: 0, zero: 0 } }];
    })) as PreparedOpticalPublication["levels"],
  };
}
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
