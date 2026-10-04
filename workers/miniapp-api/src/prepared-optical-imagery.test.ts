import "reflect-metadata";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtempSync, mkdirSync, readFileSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join } from "node:path";
import test from "node:test";
import { Module } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { FastifyAdapter, type NestFastifyApplication } from "@nestjs/platform-fastify";
import { OPTICAL_IMAGE_LEVELS, assertPreparedOpticalManifest, type PreparedOpticalManifest } from "@starward/miniapp-contracts";
import { PreparedOpticalImageryService } from "./prepared-optical-imagery.ts";
import { MiniappController } from "./controller.ts";
import { MiniappService } from "./miniapp-service.ts";
import { createTestMiniappService } from "./test-fixtures/create-test-service.ts";
import { createSyntheticPreparedOpticalPublication } from "./test-fixtures/prepared-optical-publication.ts";

const digest = (bytes: Uint8Array) => createHash("sha256").update(bytes).digest("hex");
const temporary = () => mkdtempSync(join(tmpdir(), "starward-prepared-transport-"));
function cleanup(directory: string) {
  assert.equal(dirname(realpathSync(directory)), realpathSync(tmpdir()));
  assert.match(basename(directory), /^starward-prepared-transport-/u);
  rmSync(directory, { recursive: true }); // Only these regenerated, owned test files.
}

test("prepared providers pin separate immutable generations, preserve full credit and retain valid black", async () => {
  const directory = temporary();
  try {
    const firstDir = join(directory, "first"), nextDir = join(directory, "next"); mkdirSync(firstDir); mkdirSync(nextDir);
    const first = createSyntheticPreparedOpticalPublication(firstDir), next = createSyntheticPreparedOpticalPublication(nextDir, "synthetic-next-prepared-v1");
    const descriptors = [first, next].map(p => ({ reference: "M:51", expectedHash: p.expectedHash, manifestUrl: p.manifestUrl }));
    const service = new PreparedOpticalImageryService(descriptors);
    descriptors[0]!.manifestUrl.pathname = "/unrelated.json";
    for (const candidate of [first, next]) {
      const manifest = service.manifest(candidate.expectedHash); assertPreparedOpticalManifest(manifest, "M:51", candidate.expectedHash);
      for (const level of OPTICAL_IMAGE_LEVELS) {
        const asset: PreparedOpticalManifest["levels"][typeof level] = manifest.levels[level], result = await service.getByFile(candidate.expectedHash, asset.file);
        assert.equal(result.contentType, "image/png"); assert.equal(digest(result.bytes), asset.sha256);
        assert.equal(result.bytes.length, asset.bytes); assert.equal(result.fieldDegrees, asset.fieldDegrees);
      }
      assert.equal(manifest.master.geometricBlackPixels, manifest.master.geometricSupportPixels);
      assert.equal(manifest.master.scientificAvailability, "UNKNOWN");
      const source = service.source("M:51", candidate.expectedHash);
      assert.equal(source.provider, "example.invalid"); assert.equal(source.attribution!.name, candidate.value.source.credit);
      assert.ok(source.attribution!.statements.includes(candidate.value.source.credit));
      assert.ok(source.limitations.includes(candidate.value.source.nominalAvm.spatialNotes!));
      assert.throws(() => service.source("M:82", candidate.expectedHash), /not_found/u);
      assert.throws(() => service.getByFile(candidate.expectedHash, "prepared-rgb-tan-master.npy"), /not_found/u);
      manifest.source.credit = "caller mutation";
      assert.equal(service.manifest(candidate.expectedHash).source.credit, candidate.value.source.credit);
    }
    assert.throws(() => new PreparedOpticalImageryService().manifest(first.expectedHash), /not_found/u);
    for (const changed of [{ ...descriptors[1]!, expectedHash: "bad" }, { ...descriptors[1]!, reference: "M:51/../x" },
      { ...descriptors[1]!, manifestUrl: new URL("https://example.invalid/manifest.json") }])
      assert.throws(() => new PreparedOpticalImageryService([changed]), /descriptor_invalid/u);
    assert.throws(() => new PreparedOpticalImageryService([descriptors[1]!, descriptors[1]!]), /descriptor_invalid/u);
  } finally { cleanup(directory); }
});

test("failed metadata and changed PNG cannot enter the pinned prepared cache and recovery retains identity", async () => {
  const directory = temporary();
  try {
    const fixture = createSyntheticPreparedOpticalPublication(directory), original = readFileSync(fixture.manifestUrl);
    const descriptor = { reference: "M:51", expectedHash: fixture.expectedHash, manifestUrl: fixture.manifestUrl };
    const service = new PreparedOpticalImageryService([descriptor]);
    fixture.value.source.credit += " changed"; fixture.save();
    assert.throws(() => service.manifest(fixture.expectedHash), /publication_invalid/u);
    writeFileSync(fixture.manifestUrl, original); service.manifest(fixture.expectedHash);
    const file = join(directory, fixture.value.levels.DETAIL.file), pixels = readFileSync(file), changed = Buffer.from(pixels);
    changed[changed.length - 1] ^= 1; writeFileSync(file, changed);
    await assert.rejects(service.getByFile(fixture.expectedHash, fixture.value.levels.DETAIL.file), /asset_invalid/u);
    writeFileSync(file, pixels); assert.deepEqual((await service.getByFile(fixture.expectedHash, fixture.value.levels.DETAIL.file)).bytes, pixels);
    fixture.value.center.raDeg += 2e-7; const shifted = fixture.save();
    assert.throws(() => new PreparedOpticalImageryService([{ ...descriptor, expectedHash: shifted }]).manifest(shifted), /catalog_registration_invalid/u);
  } finally { cleanup(directory); }
});

test("actual prepared routes serve only explicit field files and keep SDSS discovery separate", async () => {
  const directory = temporary();
  const fixture = createSyntheticPreparedOpticalPublication(directory);
  const owner = new PreparedOpticalImageryService([{ reference: "M:51", expectedHash: fixture.expectedHash, manifestUrl: fixture.manifestUrl }]);
  const service = createTestMiniappService({ preparedOpticalImages: owner });
  class TestModule {}
  Module({ controllers: [MiniappController], providers: [{ provide: MiniappService, useValue: service }] })(TestModule);
  const app = await NestFactory.create<NestFastifyApplication>(TestModule, new FastifyAdapter(), { logger: false });
  try {
    await app.init(); const http = app.getHttpAdapter().getInstance();
    const response = await http.inject({ method: "GET", url: `/v2/sky/prepared-optical/${fixture.expectedHash}/manifest` });
    assert.equal(response.statusCode, 200); const manifest = response.json();
    assertPreparedOpticalManifest(manifest, "M:51", fixture.expectedHash);
    assert.equal(response.headers["cache-control"], "public, max-age=31536000, immutable");
    assert.equal(manifest.source.credit, fixture.value.source.credit);
    for (const asset of Object.values(manifest.levels)) {
      const image = await http.inject({ method: "GET", url: asset.downloadUrl });
      assert.equal(image.statusCode, 200); assert.equal(image.headers["content-type"], "image/png");
      assert.equal(image.headers["x-starward-image-source"], "Historical prepared observation RGB");
      assert.equal(Number(image.headers["x-starward-image-field-degrees"]), asset.fieldDegrees);
      assert.equal(digest(image.rawPayload), asset.sha256); assert.equal(image.rawPayload.length, asset.bytes);
    }
    for (const suffix of ["prepared-rgb-tan-master.npy", "M-82-detail.png", "writer-receipt.json"])
      assert.equal((await http.inject({ method: "GET", url: `/v2/sky/prepared-optical/${fixture.expectedHash}/${suffix}` })).statusCode, 404);
    assert.equal((await http.inject({ method: "GET", url: `/v2/sky/prepared-optical/${"0".repeat(64)}/manifest` })).statusCode, 404);
    assert.equal((await http.inject({ method: "GET", url: `/v2/sky/sdss-optical/${fixture.expectedHash}/manifest` })).statusCode, 404);
    assert.equal((await http.inject({ method: "GET", url: "/v2/sky/sdss-optical/manifest" })).json().schemaVersion, "sdss-dr17-m51-optical-publication-v1");
    assert.equal((await http.inject({ method: "GET", url: "/v2/sky/wide-field/manifest" })).statusCode, 200);
  } finally { await app.close(); cleanup(directory); }
});
