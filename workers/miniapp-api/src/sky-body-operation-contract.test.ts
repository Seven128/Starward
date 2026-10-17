import "reflect-metadata";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import { Module } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { FastifyAdapter, type NestFastifyApplication } from "@nestjs/platform-fastify";
import { BODY_IMAGE_KINDS } from "@starward/miniapp-contracts";
import { MiniappController } from "./controller.ts";
import { MiniappService } from "./miniapp-service.ts";
import { LEGACY_MOON_TEXTURE_PUBLICATION_HASH } from "./moon-texture-publication.ts";
import { ApiExceptionFilter } from "./api-exception.filter.ts";
import { createTestMiniappService } from "./test-fixtures/create-test-service.ts";
import { assertPublicBinary, declaredPublicJson, publicOperationPath } from "./test-fixtures/public-operation-response.ts";

test("body operations declare actual bare discovery, immutable metadata and exact binary bytes", async () => {
  const service = createTestMiniappService();
  class TestModule {}
  Module({ controllers: [MiniappController], providers: [{ provide: MiniappService, useValue: service }] })(TestModule);
  const app = await NestFactory.create<NestFastifyApplication>(TestModule, new FastifyAdapter(), { logger: false });
  app.useGlobalFilters(new ApiExceptionFilter());
  try {
    await app.init(); const http = app.getHttpAdapter().getInstance();
    const stem = (kind: typeof BODY_IMAGE_KINDS[number]) => kind === "jupiter" || kind === "saturn" || kind === "uranus" || kind === "neptune"
      ? `${kind}Bands` : `${kind}Texture`;
    const digest = (value: Buffer) => createHash("sha256").update(value).digest("hex");
    for (const kind of BODY_IMAGE_KINDS) {
      const id = stem(kind), current = await http.inject({ method: "GET", url: publicOperationPath(`${id}ManifestGet`) });
      assert.equal(current.statusCode, 200, `${kind} discovery`);
      const manifest = current.json();
      assert.match(manifest.publicationHash, /^[a-f0-9]{64}$/u);
      assert.ok(manifest.schemaVersion && manifest.image.bytes > 0);
      assert.deepEqual(declaredPublicJson(`${id}ManifestGet`, current), manifest);
      assert.equal(current.headers["cache-control"], "no-cache");
      const selected = await http.inject({ method: "GET", url: publicOperationPath(`${id}VersionManifestGet`, manifest) });
      assert.equal(selected.statusCode, 200, `${kind} immutable metadata`);
      assert.deepEqual(declaredPublicJson(`${id}VersionManifestGet`, selected), manifest);
      assert.match(String(selected.headers["cache-control"]), /immutable/u);
      const imageUrl = publicOperationPath(`${id}ImageGet`, { publicationHash: manifest.publicationHash, file: manifest.image.file });
      assert.equal(imageUrl, manifest.image.downloadUrl);
      const image = await http.inject({ method: "GET", url: imageUrl });
      assert.equal(image.statusCode, 200, `${kind} image`);
      assertPublicBinary(`${id}ImageGet`, image, manifest.image, digest);
      const wrongVersion = await http.inject({ method: "GET", url: publicOperationPath(`${id}VersionManifestGet`, { publicationHash: "0".repeat(64) }) });
      assert.equal(wrongVersion.statusCode, 404, `${kind} may not substitute current`);
    }
    const coverageResponse = await http.inject({ method: "GET", url: publicOperationPath("moonCoverageManifestGet") });
    assert.equal(coverageResponse.statusCode, 200); const coverage = coverageResponse.json();
    assert.deepEqual(declaredPublicJson("moonCoverageManifestGet", coverageResponse), coverage);
    const coverageVersion = await http.inject({ method: "GET", url: publicOperationPath("moonCoverageVersionManifestGet", coverage) });
    assert.equal(coverageVersion.statusCode, 200);
    assert.deepEqual(declaredPublicJson("moonCoverageVersionManifestGet", coverageVersion), coverage);
    const coverageImage = await http.inject({ method: "GET", url: publicOperationPath("moonCoverageImageGet", { publicationHash: coverage.publicationHash, file: coverage.image.file }) });
    assert.equal(coverageImage.statusCode, 200); assertPublicBinary("moonCoverageImageGet", coverageImage, coverage.image, digest);
    assert.equal(coverage.coverage.kind, "measured-area-fraction");

    const moon = service.moonTexture.manifest();
    const alias = await http.inject({ method: "GET", url: publicOperationPath("moonTextureImageGet", {
      publicationHash: LEGACY_MOON_TEXTURE_PUBLICATION_HASH, file: moon.image.file,
    }) });
    assert.equal(alias.statusCode, 200); assertPublicBinary("moonTextureImageGet", alias, moon.image, digest);
    const aliasMetadata = await http.inject({ method: "GET", url: publicOperationPath("moonTextureVersionManifestGet", { publicationHash: LEGACY_MOON_TEXTURE_PUBLICATION_HASH }) });
    assert.equal(aliasMetadata.statusCode, 404, "an image-only historical alias must not manufacture metadata");
    for (const foreign of ["venus", "pluto", "MOON"]) {
      const rejected = await http.inject({ method: "GET", url: `/v2/sky/${foreign}/${moon.publicationHash}/manifest` });
      assert.equal(rejected.statusCode, 404, "the shared route must not enroll another family");
    }
  } finally { await app.close(); }
});
