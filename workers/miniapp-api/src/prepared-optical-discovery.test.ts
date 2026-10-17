import "reflect-metadata";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, readFileSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join } from "node:path";
import test from "node:test";
import { Module } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { FastifyAdapter, type NestFastifyApplication } from "@nestjs/platform-fastify";
import { PREPARED_OPTICAL_DISCOVERY_PATH, assertPreparedOpticalDiscovery, selectedPreparedOpticalPublication } from "@starward/miniapp-contracts";
import { PreparedOpticalImageryService } from "./prepared-optical-imagery.ts";
import { MiniappController } from "./controller.ts";
import { MiniappService } from "./miniapp-service.ts";
import { createTestMiniappService } from "./test-fixtures/create-test-service.ts";
import { createSyntheticPreparedOpticalPublication } from "./test-fixtures/prepared-optical-publication.ts";

const temporary = () => mkdtempSync(join(tmpdir(), "starward-prepared-discovery-"));
function cleanup(directory: string) {
  assert.equal(dirname(realpathSync(directory)), realpathSync(tmpdir()));
  assert.match(basename(directory), /^starward-prepared-discovery-/u);
  rmSync(directory, { recursive: true }); // Regenerated, checked test scope only.
}
function generations(directory: string) {
  return ["old", "current"].map(id => {
    const path = join(directory, id); mkdirSync(path);
    return createSyntheticPreparedOpticalPublication(path, `synthetic-discovery-${id}-v1`);
  });
}

test("only explicit current editions are discovered; candidates/retained descriptors do not self-adopt", () => {
  const directory = temporary();
  try {
    const [old, current] = generations(directory), descriptors = [old!, current!].map(item => ({
      reference: "M:51", expectedHash: item.expectedHash, manifestUrl: item.manifestUrl,
    }));
    assert.deepEqual(new PreparedOpticalImageryService().discovery().publications, []);
    assert.deepEqual(new PreparedOpticalImageryService(descriptors).discovery().publications, []);
    const declared = [current!.expectedHash], owner = new PreparedOpticalImageryService(descriptors, declared);
    declared[0] = old!.expectedHash;
    const discovery = owner.discovery(); assertPreparedOpticalDiscovery(discovery);
    assert.equal(discovery.publications.length, 1);
    assert.equal(selectedPreparedOpticalPublication(discovery, "M:51")?.publicationHash, current!.expectedHash);
    assert.equal(owner.manifest(old!.expectedHash).publicationId, old!.value.publicationId);
    (discovery.publications[0] as { publicationHash: string }).publicationHash = old!.expectedHash;
    assert.equal(owner.discovery().publications[0]!.publicationHash, current!.expectedHash);
    for (const hashes of [[old!.expectedHash, current!.expectedHash], [current!.expectedHash, current!.expectedHash], ["0".repeat(64)]])
      assert.throws(() => new PreparedOpticalImageryService(descriptors, hashes), /current_selection_invalid/u);
  } finally { cleanup(directory); }
});

test("discovery admits real pinned metadata and recovers without substituting a retained edition", () => {
  const directory = temporary();
  try {
    const [old, current] = generations(directory), saved = readFileSync(current!.manifestUrl);
    const owner = new PreparedOpticalImageryService([old!, current!].map(item => ({
      reference: "M:51", expectedHash: item.expectedHash, manifestUrl: item.manifestUrl,
    })), [current!.expectedHash]);
    current!.value.source.credit += " corrupt"; current!.save();
    assert.throws(() => owner.discovery(), /publication_invalid/u);
    assert.equal(owner.source("M:51", old!.expectedHash).attribution!.name, old!.value.source.credit);
    writeFileSync(current!.manifestUrl, saved);
    assert.equal(owner.discovery().publications[0]!.publicationHash, current!.expectedHash);
  } finally { cleanup(directory); }
});

test("ordinary HTTP discovery is mutable while selected old/current metadata stay immutable and independent", async () => {
  const directory = temporary();
  const [old, current] = generations(directory), owner = new PreparedOpticalImageryService([old!, current!].map(item => ({
    reference: "M:51", expectedHash: item.expectedHash, manifestUrl: item.manifestUrl,
  })), [current!.expectedHash]);
  const service = createTestMiniappService({ preparedOpticalImages: owner });
  class TestModule {}
  Module({ controllers: [MiniappController], providers: [{ provide: MiniappService, useValue: service }] })(TestModule);
  const app = await NestFactory.create<NestFastifyApplication>(TestModule, new FastifyAdapter(), { logger: false });
  try {
    await app.init(); const http = app.getHttpAdapter().getInstance();
    const index = await http.inject({ method: "GET", url: PREPARED_OPTICAL_DISCOVERY_PATH });
    assert.equal(index.statusCode, 200); assert.equal(index.headers["cache-control"], "no-cache");
    assert.equal(index.headers["x-content-type-options"], "nosniff");
    assertPreparedOpticalDiscovery(index.json());
    assert.equal(index.json().publications[0].publicationHash, current!.expectedHash);
    for (const item of [old!, current!]) {
      const metadata = await http.inject({ method: "GET", url: `/v2/sky/prepared-optical/${item.expectedHash}/manifest` });
      assert.equal(metadata.statusCode, 200); assert.match(String(metadata.headers["cache-control"]), /immutable/u);
      assert.equal(metadata.json().publicationId, item.value.publicationId);
    }
  } finally { await app.close(); cleanup(directory); }
});
