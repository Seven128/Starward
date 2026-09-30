import "reflect-metadata";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import { Module } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { FastifyAdapter, type NestFastifyApplication } from "@nestjs/platform-fastify";
import { MiniappController } from "./controller.ts";
import { MiniappService } from "./miniapp-service.ts";
import { createTestMiniappService } from "./test-fixtures/create-test-service.ts";

test("actual M51 optical publication serves three hash-bound JPEGs and scoped provenance", async () => {
  const service = createTestMiniappService();
  class TestModule {}
  Module({ controllers: [MiniappController], providers: [{ provide: MiniappService, useValue: service }] })(TestModule);
  const app = await NestFactory.create<NestFastifyApplication>(TestModule, new FastifyAdapter(), { logger: false });
  try {
    await app.init();
    const http = app.getHttpAdapter().getInstance();
    const object = await http.inject({ method: "GET", url: "/v2/celestial-objects/M%3A51" });
    assert.equal(object.statusCode, 200);
    const sources = object.json().data.sources as Array<{ id: string; provider: string; license: string }>;
    const optical = sources.find(source => source.id.startsWith("optical-imagery:"));
    assert.equal(optical?.provider, "Sloan Digital Sky Survey");
    assert.equal(optical.license, "CC BY 4.0");
    assert.ok(sources.some(source => source.id.startsWith("imagery:")), "independent W3 provenance remains");
    const hash = optical.id.split(":").at(-1)!;
    assert.equal(hash, "5c068fae55a47444724767777532ce6af1b6555c41ca2afdcceed9e9ae762eff",
      "existing M51 clients keep their original immutable publication");
    const manifest = await http.inject({ method: "GET", url: `/v2/sky/sdss-optical/${hash}/manifest` });
    assert.equal(manifest.statusCode, 200);
    const published = manifest.json();
    assert.equal((await http.inject({ method: "GET", url: "/v2/sky/sdss-optical/manifest" })).json().publicationHash, hash);
    assert.equal(published.publicationHash, hash);
    assert.equal(published.objectRef, "M:51");
    assert.equal(published.source.credit, "Sloan Digital Sky Survey");
    assert.match(published.processing.modification, /no pixel edits/u);
    for (const level of ["OVERVIEW", "MEDIUM", "DETAIL"] as const) {
      const asset = published.levels[level];
      const response = await http.inject({ method: "GET", url: asset.downloadUrl });
      assert.equal(response.statusCode, 200);
      assert.equal(response.headers["content-type"], "image/jpeg");
      assert.equal(response.headers["x-starward-image-source"], "Sloan Digital Sky Survey - DR17 optical");
      assert.equal(Number(response.headers["x-starward-image-field-degrees"]), asset.fieldDegrees);
      assert.equal(response.rawPayload.length, asset.bytes);
      assert.equal(createHash("sha256").update(response.rawPayload).digest("hex"), asset.sha256);
    }
    assert.equal((await http.inject({ method: "GET", url: `/v2/sky/sdss-optical/${hash}/M-31-detail.jpg` })).statusCode, 404);
    assert.equal((await http.inject({ method: "GET", url: `/v2/sky/sdss-optical/${hash}/M-51-unknown.jpg` })).statusCode, 404);
    assert.equal((await http.inject({ method: "GET", url: `/v2/sky/sdss-optical/${"0".repeat(64)}/M-51-detail.jpg` })).statusCode, 404);
    assert.equal((await http.inject({ method: "GET", url: `/v2/sky/sdss-optical/${"0".repeat(64)}/manifest` })).statusCode, 404);
    const unrelated = await http.inject({ method: "GET", url: "/v2/celestial-objects/M%3A31" });
    assert.ok(!unrelated.json().data.sources.some((source: { id: string }) => source.id.startsWith("optical-imagery:")));
  } finally { await app.close(); }
});

test("optical target discovery and immutable resources preserve each admitted object's identity", async () => {
  const service = createTestMiniappService();
  class TestModule {}
  Module({ controllers: [MiniappController], providers: [{ provide: MiniappService, useValue: service }] })(TestModule);
  const app = await NestFactory.create<NestFastifyApplication>(TestModule, new FastifyAdapter(), { logger: false });
  try {
    await app.init();
    const http = app.getHttpAdapter().getInstance();
    const hashes = new Set<string>();
    for (const reference of ["M:63", "M:64", "M:81", "M:82", "M:87"]) {
      const discovered = await http.inject({ method: "GET", url: `/v2/sky/sdss-optical/manifest?reference=${encodeURIComponent(reference)}` });
      assert.equal(discovered.statusCode, 200);
      const publication = discovered.json();
      assert.equal(publication.objectRef, reference, "discovery must never substitute M51 for the requested galaxy");
      assert.equal(publication.schemaVersion, "sdss-dr17-target-optical-publication-v1");
      assert.ok(!hashes.has(publication.publicationHash)); hashes.add(publication.publicationHash);
      const fixed = await http.inject({ method: "GET", url: `/v2/sky/sdss-optical/${publication.publicationHash}/manifest` });
      assert.deepEqual(fixed.json(), publication);
      const info = await http.inject({ method: "GET", url: `/v2/celestial-objects/${encodeURIComponent(reference)}` });
      const sources = info.json().data.sources as Array<{ id: string; provider: string }>;
      assert.ok(sources.some(source => source.id === `optical-imagery:${publication.publicationId}:${publication.publicationHash}`));
      assert.ok(sources.some(source => source.id.startsWith("imagery:")), "independent infrared provenance remains available");
      for (const asset of Object.values(publication.levels) as Array<{downloadUrl:string;bytes:number;sha256:string;fieldDegrees:number}>) {
        const image = await http.inject({ method: "GET", url: asset.downloadUrl });
        assert.equal(image.statusCode, 200);
        assert.equal(image.headers["content-type"], "image/jpeg");
        assert.equal(Number(image.headers["x-starward-image-field-degrees"]), asset.fieldDegrees);
        assert.equal(image.rawPayload.length, asset.bytes);
        assert.equal(createHash("sha256").update(image.rawPayload).digest("hex"), asset.sha256);
      }
      assert.equal((await http.inject({ method: "GET", url: `/v2/sky/sdss-optical/${publication.publicationHash}/M-51-detail.jpg` })).statusCode, 404);
    }
    for (const reference of ["M:31", "M:999", "", "M:82/../M:51"]) {
      assert.equal((await http.inject({method:"GET",url:`/v2/sky/sdss-optical/manifest?reference=${encodeURIComponent(reference)}`})).statusCode,404);
    }
  } finally { await app.close(); }
});
