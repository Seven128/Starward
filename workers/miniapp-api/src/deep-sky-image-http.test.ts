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
    assert.equal(publication.schemaVersion, "allwise-w3-deep-sky-publication-v2");
    assert.equal(publication.entryCount, 51);
    assert.equal(publication.source.hipsLicense, "ODbL-1.0");
    assert.match(publication.distribution.notice, /CDS\/Aladin.*CNRS\/Unistra/u);
    assert.match(publication.distribution.catalogNotice, /Mattia Verga.*CC BY-SA 4.0/u);
    let images = 0;
    for (const entry of publication.entries) {
      for (const asset of Object.values(entry.levels) as Array<{ downloadUrl: string; sha256: string; bytes: number; validFraction: null; coverageState: string }>) {
        assert.equal(asset.validFraction, null, entry.objectRef);
        assert.equal(asset.coverageState, "NOT_MEASURED", entry.objectRef);
        const image = await http.inject({ method: "GET", url: asset.downloadUrl });
        assert.equal(image.statusCode, 200, asset.downloadUrl);
        assert.equal(image.rawPayload.length, asset.bytes);
        assert.equal(createHash("sha256").update(image.rawPayload).digest("hex"), asset.sha256);
        images++;
      }
    }
    assert.equal(images, 153);
    assert.ok(source.limitations.some((value: string) => value.includes("未测量源数据有效覆盖比例")));
    const previous = await http.inject({ method: "GET", url: `/v2/sky/deep-sky/${publication.previousPublicationHash}/manifest` });
    assert.equal(previous.statusCode, 200, "previously published source offers remain reachable");
    assert.equal(previous.json().schemaVersion, "allwise-w3-deep-sky-publication-v1");
    assert.equal(previous.json().publicationHash, "2076958a52af3eca6d194b0bd79686ec34c67c6829469d0b26b26b2bc0db3bce");
    for (const reference of ["M:31", "M:42", "M:101"]) {
      const asset = previous.json().entries.find((entry: { objectRef: string }) => entry.objectRef === reference).levels.DETAIL;
      const image = await http.inject({ method: "GET", url: asset.downloadUrl });
      assert.equal(image.statusCode, 200);
      assert.equal(createHash("sha256").update(image.rawPayload).digest("hex"), asset.sha256);
    }
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

test("source-finite opt-in serves all M42 PNG levels and discloses the publication actually painted", async () => {
  const service = createTestMiniappService();
  class TestModule {}
  Module({ controllers: [MiniappController], providers: [{ provide: MiniappService, useValue: service }] })(TestModule);
  const app = await NestFactory.create<NestFastifyApplication>(TestModule, new FastifyAdapter(), { logger: false });
  try {
    await app.init();
    const http = app.getHttpAdapter().getInstance();
    const sourceFrom = (response: { json(): any }) => response.json().data.sources.find((value: { id: string }) => value.id.startsWith("imagery:"));
    const legacyObject = await http.inject({ method: "GET", url: "/v2/celestial-objects/M%3A42" });
    const legacyHash = sourceFrom(legacyObject).id.split(":").at(-1);
    const currentObject = await http.inject({ method: "GET", url: "/v2/celestial-objects/M%3A42?deepSkyImageVersion=source-finite-v3" });
    const currentSource = sourceFrom(currentObject), currentHash = currentSource.id.split(":").at(-1);
    assert.notEqual(currentHash, legacyHash, "the image opt-in must change both pixels and their disclosed publication");
    const manifest = (await http.inject({ method: "GET", url: `/v2/sky/deep-sky/${currentHash}/manifest` })).json();
    assert.equal(manifest.schemaVersion, "allwise-w3-deep-sky-publication-v3");
    assert.equal(manifest.legacyPublicationHash, legacyHash);
    assert.equal(manifest.entryCount, 51);
    const m42 = manifest.entries.find((entry: { objectRef: string }) => entry.objectRef === "M:42");
    const expectedMissing = { OVERVIEW: 22, MEDIUM: 648, DETAIL: 5095 };
    for (const level of ["OVERVIEW", "MEDIUM", "DETAIL"] as const) {
      const asset = m42.levels[level];
      assert.equal(asset.sourceFiniteMask.missingPixels, expectedMissing[level]);
      assert.equal(asset.validFraction, null, "finite source samples are not artifact-free scientific validity");
      const image = await http.inject({ method: "GET", url: `/v2/celestial-objects/M%3A42/image?level=${level}&imageVersion=source-finite-v3` });
      assert.equal(image.statusCode, 200);
      assert.equal(image.headers["content-type"], "image/png");
      assert.equal(image.headers["x-starward-image-publication-hash"], currentHash);
      assert.equal(image.headers["x-starward-image-source-id"], currentSource.id);
      assert.equal(image.headers["x-starward-image-missing-pixels"], String(expectedMissing[level]));
      assert.equal(image.rawPayload.readUInt32BE(16), asset.pixels);
      assert.equal(createHash("sha256").update(image.rawPayload).digest("hex"), asset.sha256);
      assert.deepEqual((await http.inject({ method: "GET", url: asset.downloadUrl })).rawPayload, image.rawPayload);
      const support = JSON.parse(String(image.headers["x-starward-image-display-support"]));
      assert.deepEqual(support, asset.displaySupport);
      assert.equal(support.sourceSha256, asset.sha256);
      const oldV3Hash = "87ab6341b43d660e3c93a2430994c0f38b409dafa86216e7e3313e98cdbbc073";
      const oldV3Manifest = (await http.inject({ method: "GET", url: `/v2/sky/deep-sky/${oldV3Hash}/manifest` })).json();
      const oldV3Asset = oldV3Manifest.entries.find((entry: { objectRef: string }) => entry.objectRef === "M:42").levels[level];
      assert.equal(oldV3Asset.displaySupport, undefined, "an immutable archived manifest is not rewritten");
      const oldV3Image = await http.inject({ method: "GET", url: oldV3Asset.downloadUrl });
      assert.equal(oldV3Image.statusCode, 200);
      assert.deepEqual(oldV3Image.rawPayload, image.rawPayload);
      assert.equal(oldV3Image.headers["x-starward-image-publication-hash"], oldV3Hash);
      assert.deepEqual(JSON.parse(String(oldV3Image.headers["x-starward-image-display-support"])), support,
        "the exact same old-v3 PNG can receive byte-bound display refinement without changing its provenance");
      const oldImage = await http.inject({ method: "GET", url: `/v2/celestial-objects/M%3A42/image?level=${level}` });
      assert.equal(oldImage.headers["content-type"], "image/jpeg");
      assert.equal(oldImage.headers["x-starward-image-publication-hash"], legacyHash);
      assert.equal(oldImage.headers["x-starward-image-missing-pixels"], undefined);
      assert.equal(oldImage.headers["x-starward-image-display-support"], undefined);
    }
    assert.ok(currentSource.limitations.some((value: string) => value.includes("5095/262144")));
    const boundOld = await http.inject({ method: "GET", url: `/v2/celestial-objects/M%3A42?deepSkyImageVersion=source-finite-v3&deepSkyPublicationHash=${legacyHash}` });
    assert.equal(sourceFrom(boundOld).id, sourceFrom(legacyObject).id, "retained old imagery cannot inherit a new source after fine-level failure");
    const unavailable = await http.inject({ method: "GET", url: `/v2/celestial-objects/M%3A42?deepSkyImageVersion=source-finite-v3&deepSkyPublicationHash=${"0".repeat(64)}` });
    assert.equal(unavailable.statusCode, 200);
    assert.equal(unavailable.json().dataState, "PARTIAL");
    assert.equal(unavailable.json().data.kind, "NEBULA");
    assert.equal(sourceFrom(unavailable), undefined, "missing bound provenance never silently switches to the current publication");
    for (const url of ["/v2/celestial-objects/M%3A42/image?imageVersion=unknown", "/v2/celestial-objects/M%3A42?deepSkyImageVersion=unknown",
      "/v2/celestial-objects/M%3A42?deepSkyPublicationHash=../outside"]) {
      assert.equal((await http.inject({ method: "GET", url })).statusCode, 400, url);
    }
    const unchanged = await http.inject({ method: "GET", url: "/v2/celestial-objects/M%3A31/image?level=DETAIL&imageVersion=source-finite-v3" });
    assert.equal(unchanged.headers["content-type"], "image/jpeg");
    assert.equal(unchanged.headers["x-starward-image-missing-pixels"], undefined);
  } finally { await app.close(); }
});
