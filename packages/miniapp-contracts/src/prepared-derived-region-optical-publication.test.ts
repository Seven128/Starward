import assert from "node:assert/strict";
import test from "node:test";
import { preparedDerivedRegionFixture } from "./test-fixtures/prepared-derived-region-optical-publication.ts";
import { assertPreparedDerivedRegionOpticalPublication, assertPreparedDerivedRegionOpticalManifest,
  preparedDerivedRegionOpticalPublicationHash, preparedDerivedRegionOpticalSource,
  preparedDerivedRegionOpticalSources } from "./prepared-derived-region-optical-publication.ts";
import { assertPreparedNativeOpticalPublication } from "./prepared-native-optical-publication.ts";
import { preparedRenderedOpticalAssets, assertPreparedRenderedOpticalManifest } from "./prepared-rendered-optical-publication.ts";

const manifest = () => {
  const p = preparedDerivedRegionFixture(), publicationHash = preparedDerivedRegionOpticalPublicationHash(p);
  const withUrl = (a: { file: string }) => ({ ...a, downloadUrl: `/v2/sky/prepared-optical/${publicationHash}/${a.file}` });
  return { ...p, publicationHash, levels: Object.fromEntries(Object.entries(p.levels).map(([key, a]) => [key, withUrl(a)])),
    support: Object.fromEntries(Object.entries(p.support).map(([key, a]) => [key, withUrl(a)])) } as any;
};
test("derived region keeps modified data, original notices/support and immutable transport distinct", () => {
  const p = manifest();
  assertPreparedDerivedRegionOpticalManifest(p, p.reference, p.publicationHash);
  assertPreparedRenderedOpticalManifest(p, p.reference, p.publicationHash);
  assert.equal(preparedRenderedOpticalAssets(p).length, 5);
  assert.throws(() => assertPreparedNativeOpticalPublication(p, p.reference), /publication_invalid/u);
  const source = preparedDerivedRegionOpticalSource(p);
  assert(source.attribution?.statements.some(text=>text.includes('AI')&&text.includes('SXT ML11')));
  assert(source.attribution?.statements.includes("Fixture original source acknowledgment"));
  assert(source.attribution?.statements.includes("Fixture original acknowledgment"));
  assert(source.attribution?.statements.includes("Fixture database ODbL notice"));
  assert(source.limitations.some(text => text.includes("未普通采用")));
  assert(source.attribution?.statements.some(text => text.includes(p.publicationHash)));
  const sources = preparedDerivedRegionOpticalSources(p);
  assert.equal(sources.length, 2); assert.equal(sources[1]!.license, "ODbL-1.0");
  assert.equal(sources[1]!.sourceUrl, "https://example.test/record");
  assert.equal(sources[1]!.licenseUrl, "https://opendatacommons.org/licenses/odbl/1-0/");
  assert.equal(preparedDerivedRegionOpticalPublicationHash(p), p.publicationHash);
});
test("fresh hashes cannot convert source absence, source identity, photo provenance or quality into adopted data", () => {
  const mutations = [(p: any) => { p.subject.kind = "object"; }, (p: any) => { p.source.resourceId = "CDS/P/Foreign"; },
    (p: any) => { p.source.usedTiles[0].sha256 = "2".repeat(64); }, (p: any) => { p.source.counts.opaqueSamples += 8; },
    (p: any) => { p.nominalTan.accuracy = "UNVERIFIED_APPROXIMATE_PUBLISHER_AVM"; }, (p: any) => { p.alterations.pixelBytes = "UNCHANGED"; },
    (p: any) => { delete p.support.suppliedMask; }, (p: any) => { p.processing.sceneAcceptance = "PASSED"; },
    (p: any) => { p.ordinaryAdoption = true; }, (p: any) => { p.source.originalHipsRights.utf8 += " "; }];
  for (const mutate of mutations) {
    const p = preparedDerivedRegionFixture(); mutate(p);
    assert.throws(() => assertPreparedDerivedRegionOpticalPublication(p, p.reference, preparedDerivedRegionOpticalPublicationHash(p)));
  }
});
test("support downloads and complete modified master bind the same immutable publication", () => {
  const p = manifest(); p.support.originalRegion.downloadUrl = "https://foreign.test/arbitrary.png";
  assert.throws(() => assertPreparedDerivedRegionOpticalManifest(p, p.reference, p.publicationHash), /manifest_invalid/u);
  const changed = preparedDerivedRegionFixture(); changed.processing.modifiedMaster.sha256 = "3".repeat(64);
  assert.throws(() => assertPreparedDerivedRegionOpticalPublication(changed, changed.reference), /publication_invalid/u);
});
