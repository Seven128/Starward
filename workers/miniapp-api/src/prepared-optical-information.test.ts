import "reflect-metadata";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join } from "node:path";
import { pathToFileURL } from "node:url";
import test from "node:test";
import { Module } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { FastifyAdapter, type NestFastifyApplication } from "@nestjs/platform-fastify";
import { assertPreparedOpticalPublication, preparedOpticalPublicationHash, sdssScienceOpticalPublicationHash } from "@starward/miniapp-contracts";
import { PreparedOpticalImageryService } from "./prepared-optical-imagery.ts";
import { SdssOpticalImageryService } from "./sdss-optical-imagery.ts";
import { CelestialObjectInformationService } from "./celestial-object-information.ts";
import { MiniappController } from "./controller.ts";
import { MiniappService } from "./miniapp-service.ts";
import { EtagInterceptor } from "./etag.interceptor.ts";
import { ApiExceptionFilter } from "./api-exception.filter.ts";
import { createTestMiniappService } from "./test-fixtures/create-test-service.ts";
import { createSyntheticPreparedOpticalPublication } from "./test-fixtures/prepared-optical-publication.ts";

const selection = { imageVersion: "source-finite-v3" } as const;
const temporary = () => mkdtempSync(join(tmpdir(), "starward-prepared-information-"));
function cleanup(directory: string) {
  assert.equal(dirname(realpathSync(directory)), realpathSync(tmpdir()));
  assert.match(basename(directory), /^starward-prepared-information-/u);
  rmSync(directory, { recursive: true }); // Only this regenerated, owned test copy.
}
function fixture(directory: string) {
  const actual = process.env.CLOUD_SKY_PREPARED_PUBLICATION_PATH;
  if (!actual) return createSyntheticPreparedOpticalPublication(directory);
  const bytes = readFileSync(join(actual, "manifest.json")), value: unknown = JSON.parse(bytes.toString("utf8"));
  assertPreparedOpticalPublication(value, "M:51");
  const manifestUrl = pathToFileURL(join(directory, "manifest.json"));
  writeFileSync(manifestUrl, bytes);
  return { value, manifestUrl, expectedHash: preparedOpticalPublicationHash(value) };
}
const information = (service: MiniappService, reference: string, hash?: string) =>
  service.celestialObjects.get(reference, "zh-CN", "bsc5p-bright-stars.v3", undefined, selection, hash);

test("explicit Prepared information retains exact full provenance and independent W3 without changing default SDSS", () => {
  const directory = temporary();
  try {
    const candidate = fixture(directory), owner = new PreparedOpticalImageryService([
      { reference: "M:51", expectedHash: candidate.expectedHash, manifestUrl: candidate.manifestUrl },
    ]), service = createTestMiniappService({ preparedOpticalImages: owner });
    const legacy = new CelestialObjectInformationService().get("M:51", "zh-CN", "bsc5p-bright-stars.v3", undefined, selection);
    const selected = information(service, "M:51", candidate.expectedHash);
    assert.equal(selected.dataState, "FRESH");
    assert.deepEqual(selected.warnings, []);
    assert.deepEqual(selected.data.facts, legacy.data.facts);
    assert.deepEqual(selected.data.aliases, legacy.data.aliases);
    assert.deepEqual(selected.sources, selected.data.sources);
    const source = selected.sources.find(item => item.id.startsWith("prepared-optical-imagery:"));
    assert.deepEqual(source, owner.source("M:51", candidate.expectedHash));
    assert.equal(source!.id, `prepared-optical-imagery:${candidate.value.publicationId}:${candidate.expectedHash}`);
    assert.equal(source!.attribution!.name, candidate.value.source.credit);
    assert.ok(source!.attribution!.statements.includes(candidate.value.source.credit));
    assert.ok(source!.attribution!.statements.includes(candidate.value.processing.modification));
    assert.equal(source!.sourceUrl, candidate.value.source.metadataReferenceUrl);
    assert.equal(source!.licenseUrl, candidate.value.source.licenseUrl);
    assert.ok(source!.limitations.includes(candidate.value.source.colourMeaning));
    assert.ok(source!.limitations.includes(candidate.value.source.nominalAvm.spatialNotes!));
    assert.match(source!.precision!, /科学有效性未知/u);
    assert.ok(!selected.sources.some(item => item.id.startsWith("optical-imagery:")), "no latest Sloan source is borrowed");
    assert.deepEqual(selected.sources.find(item => item.id.startsWith("imagery:")), legacy.sources.find(item => item.id.startsWith("imagery:")));
    assert.deepEqual(information(service, "M:51").data, legacy.data);
    source!.attribution!.statements = ["caller mutation"];
    selected.data.sources = [];
    assert.deepEqual(information(service, "M:51", candidate.expectedHash).sources.find(item => item.id.startsWith("prepared-optical-imagery:")), owner.source("M:51", candidate.expectedHash));
    const wrongObject = information(service, "M:82", candidate.expectedHash);
    assert.equal(wrongObject.dataState, "PARTIAL");
    assert.deepEqual(wrongObject.warnings, ["prepared_optical_publication_unavailable"]);
    assert.ok(wrongObject.sources.some(item => item.id.startsWith("imagery:")));
    assert.ok(!wrongObject.sources.some(item => /^(?:prepared-)?optical-imagery:/u.test(item.id)));
    assert.throws(() => new PreparedOpticalImageryService().manifest(candidate.expectedHash), /not_found/u);
  } finally { cleanup(directory); }
});

test("actual loopback HTTP retries failed Prepared metadata and replaces the partial conditional version with original full credit", async () => {
  const directory = temporary();
  let app: NestFastifyApplication | undefined;
  try {
    const candidate = fixture(directory), original = readFileSync(candidate.manifestUrl);
    const owner = new PreparedOpticalImageryService([
      { reference: "M:51", expectedHash: candidate.expectedHash, manifestUrl: candidate.manifestUrl },
    ]), service = createTestMiniappService({ preparedOpticalImages: owner });
    writeFileSync(candidate.manifestUrl, "{invalid metadata");
    class TestModule {}
    Module({ controllers: [MiniappController], providers: [{ provide: MiniappService, useValue: service }] })(TestModule);
    app = await NestFactory.create<NestFastifyApplication>(TestModule, new FastifyAdapter(), { logger: false });
    app.useGlobalFilters(new ApiExceptionFilter()); app.useGlobalInterceptors(new EtagInterceptor());
    await app.listen(0, "127.0.0.1");
    const url = (await app.getUrl()) + `/v2/celestial-objects/M%3A51?deepSkyImageVersion=source-finite-v3&opticalPublicationHash=${candidate.expectedHash}`;
    const first = await fetch(url), partial = await first.json();
    assert.equal(first.status, 200); assert.equal(partial.dataState, "PARTIAL");
    assert.deepEqual(partial.warnings, ["prepared_optical_publication_unavailable"]);
    assert.ok(partial.sources.some((source: { id: string }) => source.id.startsWith("imagery:")));
    assert.ok(!partial.sources.some((source: { id: string }) => /^(?:prepared-)?optical-imagery:/u.test(source.id)));
    const repeated = await fetch(url, { headers: { "if-none-match": first.headers.get("etag")! } });
    assert.equal(repeated.status, 304);
    writeFileSync(candidate.manifestUrl, original);
    const retried = await fetch(url, { headers: { "if-none-match": first.headers.get("etag")! } }), fresh = await retried.json();
    assert.equal(retried.status, 200); assert.equal(fresh.dataState, "FRESH");
    assert.deepEqual(fresh.warnings, []); assert.deepEqual(fresh.data.facts, partial.data.facts);
    assert.deepEqual(fresh.data.aliases, partial.data.aliases); assert.deepEqual(fresh.sources, fresh.data.sources);
    assert.notEqual(retried.headers.get("etag"), first.headers.get("etag"));
    assert.notEqual(fresh.data.contentRevision, partial.data.contentRevision);
    assert.deepEqual(fresh.sources.find((source: { id: string }) => source.id.startsWith("prepared-optical-imagery:")), owner.source("M:51", candidate.expectedHash));
    const stable = await fetch(url, { headers: { "if-none-match": retried.headers.get("etag")! } });
    assert.equal(stable.status, 304);
    const manifest = await fetch((await app.getUrl()) + `/v2/sky/prepared-optical/${candidate.expectedHash}/manifest`);
    assert.equal(manifest.status, 200); assert.equal((await manifest.json()).publicationHash, candidate.expectedHash);
    assert.equal((await fetch((await app.getUrl()) + `/v2/sky/sdss-optical/${candidate.expectedHash}/manifest`)).status, 404);
    if (process.env.CLOUD_SKY_PREPARED_SOURCE_TRACE_PATH) writeFileSync(process.env.CLOUD_SKY_PREPARED_SOURCE_TRACE_PATH,
      JSON.stringify({ publicationHash: candidate.expectedHash, publication: candidate.value, partial, fresh,
        httpStatuses: [first.status, repeated.status, retried.status, stable.status, manifest.status] }, null, 2), { flag: "wx" });
  } finally { await app?.close(); cleanup(directory); }
});

test("registered Prepared hash claims cannot steal a Sloan publication, and unspecified selection retains compatibility", () => {
  const directory = temporary();
  try {
    const optical = new SdssOpticalImageryService(), legacy = optical.currentManifest("M:51");
    const owner = new PreparedOpticalImageryService([{ reference: "M:51", expectedHash: legacy.publicationHash,
      manifestUrl: pathToFileURL(join(directory, "must-not-be-read.json")) }]);
    const service = createTestMiniappService({ sdssOpticalImages: optical, preparedOpticalImages: owner });
    const ordinary = information(service, "M:51");
    assert.equal(ordinary.dataState, "FRESH");
    assert.ok(ordinary.sources.some(source => source.id === `optical-imagery:${legacy.publicationId}:${legacy.publicationHash}`));
    const ambiguous = information(service, "M:51", legacy.publicationHash);
    assert.equal(ambiguous.dataState, "PARTIAL");
    assert.deepEqual(ambiguous.warnings, ["prepared_optical_publication_unavailable"]);
    assert.ok(!ambiguous.sources.some(source => /^(?:prepared-)?optical-imagery:/u.test(source.id)));
    assert.deepEqual(ambiguous.data.facts, ordinary.data.facts);
    assert.deepEqual(ambiguous.sources.find(source => source.id.startsWith("imagery:")), ordinary.sources.find(source => source.id.startsWith("imagery:")));
  } finally { cleanup(directory); }
});

test("explicit science and legacy Sloan information retain their source family, while unknown hashes cannot select Prepared", () => {
  const science = process.env.CLOUD_SKY_SCIENCE_PUBLICATION_PATH;
  const legacyOwner = new SdssOpticalImageryService(), legacy = legacyOwner.currentManifest("M:51");
  const legacyService = createTestMiniappService({ sdssOpticalImages: legacyOwner });
  assert.deepEqual(information(legacyService, "M:51", legacy.publicationHash).data, information(legacyService, "M:51").data);
  const unknown = information(legacyService, "M:51", "0".repeat(64));
  assert.equal(unknown.dataState, "PARTIAL"); assert.deepEqual(unknown.warnings, ["sdss_optical_publication_unavailable"]);
  if (science) {
    const value = JSON.parse(readFileSync(join(science, "manifest.json"), "utf8"));
    const hash = sdssScienceOpticalPublicationHash(value);
    const owner = new SdssOpticalImageryService({ sciencePublications: [{ reference: "M:51", expectedHash: hash,
      manifestUrl: pathToFileURL(join(science, "manifest.json")) }] });
    const selected = information(createTestMiniappService({ sdssOpticalImages: owner }), "M:51", hash);
    assert.equal(selected.dataState, "FRESH");
    assert.deepEqual(selected.sources.find(source => source.id.startsWith("optical-imagery:")), owner.source("M:51", hash));
    assert.ok(!selected.sources.some(source => source.id.startsWith("prepared-optical-imagery:")));
  }
});
