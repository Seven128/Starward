import "reflect-metadata";
import assert from "node:assert/strict";
import test from "node:test";
import { createHash } from "node:crypto";
import { Module } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import {
  FastifyAdapter,
  type NestFastifyApplication,
} from "@nestjs/platform-fastify";
import { MiniappController } from "./controller.ts";
import { MiniappService } from "./miniapp-service.ts";
import { DeepSkyImageryService } from "./deep-sky-imagery.ts";
import { createTestMiniappService } from "./test-fixtures/create-test-service.ts";

test("deep-sky image HTTP route preserves JPEG bytes and cache-safe ASCII headers", async () => {
  const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xd9]);
  const service = {
    async getDeepSkyImage(reference: string, level: string) {
      assert.equal(reference, "M:31");
      assert.equal(level, "DETAIL");
      return {
        bytes: Buffer.from(jpeg),
        contentType: "image/jpeg",
        sourceLabel: "NASA/IPAC IRSA - AllWISE W3 12um",
        fieldDegrees: 0.6,
      };
    },
  } as MiniappService;
  class TestModule {}
  Module({
    controllers: [MiniappController],
    providers: [{ provide: MiniappService, useValue: service }],
  })(TestModule);
  const app = await NestFactory.create<NestFastifyApplication>(
    TestModule,
    new FastifyAdapter(),
    { logger: false },
  );
  const fastify = app.getHttpAdapter().getInstance();
  try {
    await app.init();
    const response = await fastify.inject({
      method: "GET",
      url: "/v2/celestial-objects/M%3A31/image?level=DETAIL",
    });
    assert.equal(response.statusCode, 200);
    assert.equal(response.headers["content-type"], "image/jpeg");
    assert.equal(response.headers["cache-control"], "public, max-age=86400");
    assert.equal(response.headers["x-content-type-options"], "nosniff");
    assert.equal(
      response.headers["x-starward-image-source"],
      "NASA/IPAC IRSA - AllWISE W3 12um",
    );
    assert.equal(response.headers["x-starward-image-field-degrees"], "0.6");
    assert.deepEqual(response.rawPayload, jpeg);
  } finally {
    await app.close();
  }
});

test("actual object provenance offers a hash-bound machine-readable collection and all 153 matching JPEGs over HTTP", async () => {
  const service = createTestMiniappService();
  class TestModule {}
  Module({ controllers: [MiniappController], providers: [{ provide: MiniappService, useValue: service }] })(TestModule);
  const app = await NestFactory.create<NestFastifyApplication>(TestModule, new FastifyAdapter(), { logger: false });
  try {
    await app.init();
    const http = app.getHttpAdapter().getInstance();
    const object = await http.inject({ method: "GET", url: "/v2/celestial-objects/M%3A31" });
    assert.equal(object.statusCode, 200);
    const source = object.json().data.sources.find((value: { id: string }) => value.id.startsWith("imagery:"));
    assert.ok(source);
    const hash = source.id.split(":").at(-1);
    const response = await http.inject({ method: "GET", url: `/v2/sky/deep-sky/${hash}/manifest` });
    assert.equal(response.statusCode, 200);
    assert.match(String(response.headers["content-disposition"]), /attachment/u);
    const publication = response.json();
    assert.equal(publication.publicationHash, hash);
    assert.equal(publication.entryCount, 51);
    assert.equal(publication.source.hipsLicense, "ODbL-1.0");
    assert.match(publication.distribution.notice, /CDS\/Aladin.*CNRS\/Unistra/u);
    assert.match(publication.distribution.catalogNotice, /Mattia Verga.*CC BY-SA 4.0/u);
    let images = 0;
    for (const entry of publication.entries) {
      for (const asset of Object.values(entry.levels) as Array<{ downloadUrl: string; sha256: string; bytes: number }>) {
        const image = await http.inject({ method: "GET", url: asset.downloadUrl });
        assert.equal(image.statusCode, 200, asset.downloadUrl);
        assert.equal(image.rawPayload.length, asset.bytes);
        assert.equal(createHash("sha256").update(image.rawPayload).digest("hex"), asset.sha256);
        images++;
      }
    }
    assert.equal(images, 153);
    const missing = "0".repeat(64);
    assert.equal((await http.inject({ method: "GET", url: `/v2/sky/deep-sky/${missing}/manifest` })).statusCode, 404);
    assert.equal((await http.inject({ method: "GET", url: `/v2/celestial-objects/M%3A31/image?publicationHash=${missing}` })).statusCode, 404);
  } finally { await app.close(); }
});

test("MiniappService derives celestial provenance from its injected image owner", () => {
  const images = new DeepSkyImageryService();
  const original = images.source.bind(images);
  images.source = reference => { const source = original(reference); return source ? { ...source, provider: "injected actual image publication" } : null; };
  const service = createTestMiniappService({ deepSkyImages: images });
  assert.equal(service.getCelestialObject("M:31").sources.find(source => source.id.startsWith("imagery:"))?.provider,
    "injected actual image publication");
});
