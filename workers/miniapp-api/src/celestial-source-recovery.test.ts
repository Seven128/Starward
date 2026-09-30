import "reflect-metadata";
import assert from "node:assert/strict";
import test from "node:test";
import { Module } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { FastifyAdapter, type NestFastifyApplication } from "@nestjs/platform-fastify";
import type { DeepSkyImageSelection } from "@starward/miniapp-contracts";
import { CelestialObjectInformationService } from "./celestial-object-information.ts";
import { DeepSkyImageryService } from "./deep-sky-imagery.ts";
import { SdssOpticalImageryService } from "./sdss-optical-imagery.ts";
import { MiniappController } from "./controller.ts";
import { MiniappService } from "./miniapp-service.ts";
import { EtagInterceptor } from "./etag.interceptor.ts";
import { ApiExceptionFilter } from "./api-exception.filter.ts";
import { createTestMiniappService } from "./test-fixtures/create-test-service.ts";

// Fail at the publication owner, then restore the real local publication.
// No source fixture, modified asset or external provider is substituted.
class RecoverableInfrared extends DeepSkyImageryService {
  unavailable = false;
  override source(reference: string, selection: DeepSkyImageSelection = {}) {
    if (reference === "M:82" && this.unavailable) throw new Error("test_infrared_publication_unavailable");
    return super.source(reference, selection);
  }
}
class RecoverableOptical extends SdssOpticalImageryService {
  unavailable = false;
  override source(reference: string) {
    if (reference === "M:82" && this.unavailable) throw new Error("test_optical_publication_unavailable");
    return super.source(reference);
  }
}
const selection: DeepSkyImageSelection = { imageVersion: "source-finite-v3" };

test("each missing publication retains independent facts and credit and recovers without caching the partial result", () => {
  const expected = new CelestialObjectInformationService().get("M:82", "zh-CN", "bsc5p-bright-stars.v3", undefined, selection);
  for (const [infraredUnavailable, opticalUnavailable] of [[false, true], [true, false], [true, true]]) {
    const infrared = new RecoverableInfrared(), optical = new RecoverableOptical();
    infrared.unavailable = infraredUnavailable; optical.unavailable = opticalUnavailable;
    const information = new CelestialObjectInformationService(infrared, optical);
    const partial = information.get("M:82", "zh-CN", "bsc5p-bright-stars.v3", undefined, selection);
    assert.equal(partial.dataState, "PARTIAL", "a missing optical source must not pose as a complete success");
    assert.deepEqual(partial.data.facts, expected.data.facts);
    assert.deepEqual(partial.data.aliases, expected.data.aliases);
    assert.equal(partial.data.reference, "M:82");
    assert.deepEqual(partial.sources, partial.data.sources);
    assert.ok(partial.sources.some(source => source.provider.includes("OpenNGC")));
    assert.equal(partial.sources.some(source => source.id.startsWith("imagery:")), !infraredUnavailable);
    assert.equal(partial.sources.some(source => source.id.startsWith("optical-imagery:")), !opticalUnavailable);
    assert.equal(partial.warnings.includes("deep_sky_image_publication_unavailable"), infraredUnavailable);
    assert.equal(partial.warnings.includes("sdss_optical_publication_unavailable"), opticalUnavailable);
    assert.equal(partial.data.limitations.some(text => text.includes("光学影像来源暂不可用")), opticalUnavailable);
    infrared.unavailable = false; optical.unavailable = false;
    const recovered = information.get("M:82", "zh-CN", "bsc5p-bright-stars.v3", undefined, selection);
    assert.equal(recovered.dataState, "FRESH");
    assert.deepEqual(recovered.data, expected.data);
    assert.deepEqual(recovered.warnings, []);
    assert.notEqual(recovered.etag, partial.etag);
    assert.notEqual(recovered.data.contentRevision, partial.data.contentRevision);
    const unadmitted = information.get("M:31", "zh-CN", "bsc5p-bright-stars.v3", undefined, selection);
    assert.equal(unadmitted.dataState, "FRESH", "no admitted optical publication is different from a failed one");
    assert.ok(!unadmitted.sources.some(source => source.id.startsWith("optical-imagery:")));
    assert.deepEqual(unadmitted.warnings, []);
  }
});

test("actual HTTP retry replaces partial credit and its conditional response with the object's recovered publication", async () => {
  const optical = new RecoverableOptical(); optical.unavailable = true;
  const service = createTestMiniappService({ sdssOpticalImages: optical });
  class TestModule {}
  Module({ controllers: [MiniappController], providers: [{ provide: MiniappService, useValue: service }] })(TestModule);
  const app = await NestFactory.create<NestFastifyApplication>(TestModule, new FastifyAdapter(), { logger: false });
  app.useGlobalFilters(new ApiExceptionFilter());
  app.useGlobalInterceptors(new EtagInterceptor());
  try {
    await app.init();
    const http = app.getHttpAdapter().getInstance();
    const url = "/v2/celestial-objects/M%3A82?deepSkyImageVersion=source-finite-v3";
    const first = await http.inject({ method: "GET", url });
    assert.equal(first.statusCode, 200);
    assert.equal(first.json().dataState, "PARTIAL");
    const repeated = await http.inject({ method: "GET", url, headers: { "if-none-match": first.headers.etag! } });
    assert.equal(repeated.statusCode, 304, "a still-partial publication keeps its explicit partial cached meaning");
    optical.unavailable = false;
    const retried = await http.inject({ method: "GET", url, headers: { "if-none-match": first.headers.etag! } });
    assert.equal(retried.statusCode, 200, "the old conditional response cannot hide the recovered source");
    const result = retried.json();
    assert.equal(result.dataState, "FRESH");
    assert.deepEqual(result.data.facts, first.json().data.facts);
    assert.deepEqual(result.warnings, []);
    const ownPublication = service.sdssOpticalImages.currentManifest("M:82");
    assert.ok(result.data.sources.some((source: {id:string}) => source.id ===
      `optical-imagery:${ownPublication.publicationId}:${ownPublication.publicationHash}`));
    assert.ok(result.data.sources.some((source: {id:string}) => source.id.startsWith("imagery:")));
    assert.equal((await http.inject({ method: "GET", url, headers: { "if-none-match": retried.headers.etag! } })).statusCode, 304);
  } finally { await app.close(); }
});
