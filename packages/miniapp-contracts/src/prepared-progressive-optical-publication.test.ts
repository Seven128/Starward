import assert from "node:assert/strict";
import test from "node:test";
import { OPTICAL_IMAGE_LEVELS } from "./optical-publication-content.ts";
import { assertPreparedOpticalPublication, preparedOpticalPublicationHash } from "./prepared-optical-publication.ts";
import { assertPreparedRenderedOpticalManifest } from "./prepared-rendered-optical-publication.ts";
import { assertPreparedProgressiveOpticalPublication, assertPreparedProgressiveOpticalManifest,
  preparedProgressiveOpticalPublicationHash, type PreparedProgressiveOpticalManifest } from "./prepared-progressive-optical-publication.ts";
import { preparedProgressiveOpticalFixture } from "./test-fixtures/prepared-progressive-optical-publication.ts";

test("measured two-grid profile preserves opaque black, original source and strict parent v1", () => {
  const p = preparedProgressiveOpticalFixture(), originalHash = p.parent.publicationHash;
  assertPreparedProgressiveOpticalPublication(p, p.objectRef);
  assertPreparedOpticalPublication(p.parent.publication, p.objectRef, originalHash);
  assert.equal(p.fineGrid.geometricBlackPixels, p.fineGrid.geometricSupportPixels);
  assert.equal(p.levels.MEDIUM.masterRgbaSha256, p.master.rgba.sha256);
  assert.equal(p.levels.DETAIL.masterRgbaSha256, p.fineGrid.rgba.sha256);
  assert.throws(() => assertPreparedOpticalPublication(p, p.objectRef), /prepared_optical_publication_invalid/);
  assert.equal(preparedOpticalPublicationHash(p.parent.publication), originalHash);
});

test("fresh hashes do not authorize different source/grid, fabricated coverage, sizes or colour", () => {
  const changes: ((p: any) => void)[] = [
    p => { p.source.credit += " foreign"; }, p => { p.center.raDeg += .01; },
    p => { p.parent.publication.source.credit += " changed"; },
    p => { p.fineGrid.sourceRgbSha256 = "a".repeat(64); }, p => { p.fineGrid.sourceAvmHash = "a".repeat(64); },
    p => { p.fineGrid.fieldDegrees = p.master.fieldDegrees / 4; },
    p => { p.fineGrid.rgba.bytes = p.fineGrid.rgbaNpy.bytes; },
    p => { p.fineGrid.rgbaNpy.shape = [2048, 2048, 4]; },
    p => { p.fineGrid.scientificAvailability = "COMPLETE"; },
    p => { p.fineGrid.unit = "background-subtracted-display-sRGB"; },
    p => { p.processing.sampling = "sharp-generative-details"; },
    p => { p.levels.DETAIL.samplingGrid = "master"; },
    p => { p.levels.MEDIUM.masterRgbaSha256 = p.fineGrid.rgba.sha256; },
    p => { p.levels.MEDIUM.masterCrop.boxFactor = 2; },
    p => { p.levels.DETAIL.masterCrop.boundsXYExclusive = [768, 768, 1280, 1280]; },
    p => { p.levels.MEDIUM.pixels = 512; }, p => { p.levels.DETAIL.crpixFitsOneBased = 256.5; },
    p => { p.levels.OVERVIEW.sha256 = "a".repeat(64); },
    p => { p.levels.MEDIUM.alphaPixels.partial = 1; p.levels.MEDIUM.alphaPixels.opaque--; },
    p => { p.levels.DETAIL.geometricMasterSupportPixels--; }, p => { p.levels.DETAIL.file = "../foreign.png"; },
    p => { delete p.processing.sampleOffsetsDyDx; },
    p => { p.parent.publicationHash = "x".repeat(64); },
    p => { p.parent.publication.publicationHash = p.parent.publicationHash; },
  ];
  for (const change of changes) {
    const p = preparedProgressiveOpticalFixture(); change(p);
    assert.throws(() => assertPreparedProgressiveOpticalPublication(p, p.objectRef, preparedProgressiveOpticalPublicationHash(p)), /prepared_progressive_optical_publication_invalid/);
  }
});

test("wire transport is excluded only at the root, with exact immutable paths and full two-grid ancestry pinned", () => {
  const p = preparedProgressiveOpticalFixture(), hash = preparedProgressiveOpticalPublicationHash(p);
  const m = { ...p, publicationHash: hash, levels: Object.fromEntries(OPTICAL_IMAGE_LEVELS.map(level => [level,
    { ...p.levels[level], downloadUrl: `/v2/sky/prepared-optical/${hash}/${p.levels[level].file}` }])) } as PreparedProgressiveOpticalManifest;
  assertPreparedProgressiveOpticalManifest(m, p.objectRef, hash);
  assertPreparedRenderedOpticalManifest(m, p.objectRef, hash);
  assert.equal(preparedProgressiveOpticalPublicationHash(m), hash);
  m.levels.DETAIL.downloadUrl = "/foreign.png";
  assert.equal(preparedProgressiveOpticalPublicationHash(m), hash);
  assert.throws(() => assertPreparedProgressiveOpticalManifest(m, p.objectRef, hash), /prepared_progressive_optical_manifest_invalid/);
  for (const change of [
    (q: any) => { q.fineGrid.producerReceipt.sha256 = "a".repeat(64); },
    (q: any) => { q.processing.producerReceipt.sha256 = "a".repeat(64); },
    (q: any) => { q.levels.DETAIL.sha256 = "a".repeat(64); },
  ]) {
    const q = structuredClone(p); change(q);
    assert.notEqual(preparedProgressiveOpticalPublicationHash(q), hash);
    assert.throws(() => assertPreparedProgressiveOpticalPublication(q, q.objectRef, hash), /prepared_progressive_optical_publication_invalid/);
  }
});
