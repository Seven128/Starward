import assert from "node:assert/strict";
import test from "node:test";
import { preparedNativeOpticalFixture } from "./test-fixtures/prepared-native-optical-publication.ts";
import { assertPreparedNativeOpticalManifest, assertPreparedNativeOpticalPublication,
  preparedNativeOpticalPublicationHash, preparedNativeOpticalSource, isPreparedOpticalReference } from "./prepared-native-optical-publication.ts";
import { assertPreparedRenderedOpticalManifest } from "./prepared-rendered-optical-publication.ts";
import { assertPreparedOpticalPublication, preparedOpticalPublicationHash } from "./prepared-optical-publication.ts";
import { preparedOpticalFixture } from "./test-fixtures/prepared-optical-publication.ts";
import { isCelestialObjectReference } from "./celestial-identity.ts";
import { OPTICAL_IMAGE_LEVELS } from "./optical-publication-content.ts";

test("whole rectangular rotated tiers preserve non-Messier/region identity and keep old admission/hash", () => {
  for (const region of [false, true]) {
    const p = preparedNativeOpticalFixture(region), hash = preparedNativeOpticalPublicationHash(p);
    assertPreparedNativeOpticalPublication(p, p.reference, hash);
    assert(isPreparedOpticalReference(p.reference));
    assert.equal(isCelestialObjectReference(p.reference), !region);
    const m = { ...p, publicationHash: hash, levels: Object.fromEntries(OPTICAL_IMAGE_LEVELS.map(level => [level,
      { ...p.levels[level], downloadUrl: `/v2/sky/prepared-optical/${hash}/${p.levels[level].file}` }])) } as any;
    assertPreparedNativeOpticalManifest(m, p.reference, hash); assertPreparedRenderedOpticalManifest(m, p.reference, hash);
    assert.equal(preparedNativeOpticalPublicationHash(m), hash);
    assert.throws(() => assertPreparedOpticalPublication(p, "M:51"), /publication_invalid/u);
    const source = preparedNativeOpticalSource(m);
    assert(source.attribution?.statements.includes(p.source.credit));
    assert(source.limitations.some(line => line.includes("黑像素") && line.includes("不表示科学有效")));
    const larger = structuredClone(p);
    larger.levels.DETAIL.width = 2048; larger.levels.DETAIL.height = Math.round(7510 * 2048 / 8285);
    larger.levels.DETAIL.decodedRgb.bytes = larger.levels.DETAIL.width * larger.levels.DETAIL.height * 3;
    assertPreparedNativeOpticalPublication(larger, p.reference, preparedNativeOpticalPublicationHash(larger));
  }
  const old = preparedOpticalFixture(), hash = preparedOpticalPublicationHash(old);
  assertPreparedOpticalPublication(old, "M:51", hash);
  assert.throws(() => assertPreparedNativeOpticalPublication(old, "M:51"), /native_optical_publication_invalid/u);
  assert.equal(preparedOpticalPublicationHash(old), hash);
});

test("fresh hashes cannot lend a crop, fabricated validity, wrong subject or singular/non-TAN geometry", () => {
  const edits = [
    (p: any) => { p.objectRef = "NGC:253"; }, (p: any) => { p.center = { raDeg: 11.888, decDeg: -25.288 }; },
    (p: any) => { p.subject.kind = "region"; }, (p: any) => { p.nominalTan.projection = "SIN"; },
    (p: any) => { p.nominalTan.cdDegreesPerPixel = [[1, 2], [2, 4]]; },
    (p: any) => { p.source.metadata.kind = "companion-fits"; },
    (p: any) => { p.levels.DETAIL.sourceUvBounds = [.1, .1, .9, .9]; },
    (p: any) => { p.levels.DETAIL.scientificAvailability = "AVAILABLE"; },
    (p: any) => { p.levels.MEDIUM.decodedRgb.bytes++; },
    (p: any) => { p.levels.DETAIL.height = 1024; },
    (p: any) => { p.levels.OVERVIEW.file = "../photo.jpg"; },
  ];
  for (const edit of edits) {
    const p = preparedNativeOpticalFixture(); edit(p);
    assert.throws(() => assertPreparedNativeOpticalPublication(p, p.reference, preparedNativeOpticalPublicationHash(p)), /native_optical_publication_invalid/u);
  }
});
