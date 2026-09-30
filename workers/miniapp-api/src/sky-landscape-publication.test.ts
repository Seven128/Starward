import "reflect-metadata";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import { Module } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { FastifyAdapter, type NestFastifyApplication } from "@nestjs/platform-fastify";
import { assertSkyLandscapeManifest, decodeSkyLandscapeAlpha } from "@starward/miniapp-contracts";
import { SkyLandscapePublicationService } from "./sky-landscape-publication.ts";
import { MiniappController } from "./controller.ts";
import { MiniappService } from "./miniapp-service.ts";
import { createTestMiniappService } from "./test-fixtures/create-test-service.ts";

test("landscape publication retains identity, virtual registration, both licenses and exact alpha", async () => {
  const owner = new SkyLandscapePublicationService(), manifest = owner.manifest();
  assertSkyLandscapeManifest(manifest);
  assert.equal(manifest.source.packageLicense, "CC BY 4.0");
  assert.equal(manifest.source.registryLicense, "CC BY-SA 4.0");
  assert.equal(manifest.projection.registration, "virtual-not-site-survey");
  for (const resource of manifest.resources) {
    const image = await owner.asset(manifest.publicationHash, resource.image.file);
    assert.equal(image.contentType, "image/png");
    assert.equal(createHash("sha256").update(image.bytes).digest("hex"), resource.image.sha256);
    const encoded = await owner.asset(manifest.publicationHash, resource.alpha.file);
    const input = JSON.parse(encoded.bytes.toString("utf8"));
    const alpha = decodeSkyLandscapeAlpha(input, resource);
    assert.equal(alpha.length, resource.image.width * resource.image.height);
    assert.equal(createHash("sha256").update(alpha).digest("hex"), resource.alpha.decodedSha256);
    assert.throws(() => decodeSkyLandscapeAlpha({ ...input, sourcePngSha256: "0".repeat(64) }, resource), /identity_invalid/u);
    assert.throws(() => decodeSkyLandscapeAlpha({ ...input, rows: input.rows.slice(1) }, resource), /identity_invalid/u);
    const incomplete = structuredClone(input); incomplete.rows[0][0][1]--;
    assert.throws(() => decodeSkyLandscapeAlpha(incomplete, resource), /row_incomplete/u);
    const fakeSky = structuredClone(input); fakeSky.rows[0][0][0] = 255;
    assert.throws(() => decodeSkyLandscapeAlpha(fakeSky, resource), /alpha_corrupt/u);
  }
  await assert.rejects(owner.asset("0".repeat(64), "panorama-1024.png"), /version_unavailable/u);
  await assert.rejects(owner.asset(manifest.publicationHash, "../manifest.json"), /asset_unavailable/u);
});

test("normal same-origin HTTP returns usable JSON alpha, exact image and original package", async () => {
  class TestModule {}
  Module({ controllers: [MiniappController], providers: [{ provide: MiniappService, useValue: createTestMiniappService() }] })(TestModule);
  const app = await NestFactory.create<NestFastifyApplication>(TestModule, new FastifyAdapter(), { logger: false });
  try {
    await app.init(); const http = app.getHttpAdapter().getInstance();
    const response = await http.inject({ method: "GET", url: "/v2/sky/landscape/manifest" });
    assert.equal(response.statusCode, 200); const manifest = response.json(); assertSkyLandscapeManifest(manifest);
    const resource = manifest.resources[0]!;
    const alpha = await http.inject({ method: "GET", url: resource.alpha.downloadUrl });
    assert.equal(alpha.statusCode, 200); assert.equal(alpha.headers["cache-control"], "public, max-age=31536000, immutable");
    assert.equal(decodeSkyLandscapeAlpha(alpha.json(), resource).length, 524288);
    const image = await http.inject({ method: "GET", url: resource.image.downloadUrl });
    assert.equal(image.statusCode, 200); assert.equal(image.headers["content-type"], "image/png");
    assert.equal(createHash("sha256").update(image.rawPayload).digest("hex"), resource.image.sha256);
    const original = await http.inject({ method: "GET", url: manifest.source.originalDownloadUrl });
    assert.equal(original.statusCode, 200); assert.equal(original.headers["content-type"], "application/zip");
    assert.equal(createHash("sha256").update(original.rawPayload).digest("hex"), manifest.source.originalSha256);
    assert.equal((await http.inject({ method: "GET", url: resource.image.downloadUrl.replace(manifest.publicationHash, "0".repeat(64)) })).statusCode, 404);
  } finally { await app.close(); }
});
