// Compiled production exports; explicit local test ports, no listen or deploy.
import "reflect-metadata";
import assert from "node:assert/strict";
import fs from "node:fs";
import { createHash } from "node:crypto";
import { Module } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { FastifyAdapter, type NestFastifyApplication } from "@nestjs/platform-fastify";
import { MiniappController } from "../../../../workers/miniapp-api/dist/controller.js";
import { MiniappService } from "../../../../workers/miniapp-api/dist/miniapp-service.js";
import { createBsc5pSkyCatalogProvider } from "../../../../workers/miniapp-api/dist/sky-scene-catalog.js";
import { MemoryMediaObjectStore } from "../../../../workers/miniapp-api/dist/media-object-store.js";
import { DisabledPlaceSearchAdapter } from "../../../../workers/miniapp-api/dist/place-provider.js";
import { DisabledRouteAdapter } from "../../../../workers/miniapp-api/dist/route-provider.js";
import { createTestRuntimeConfig } from "../../../../workers/miniapp-api/dist/runtime-config.js";
import { InMemoryTestRepository } from "../../../../workers/miniapp-api/src/test-fixtures/in-memory-repository.ts";
import { DeterministicWeatherTestAdapter } from "../../../../workers/miniapp-api/src/test-fixtures/deterministic-weather-adapter.ts";

const output = ".codex/work-items/cloud-sky-native-2026-09-22/evidence/experience-w3-release-http-2026-09-29.json";
assert(!fs.existsSync(output));
const service = new MiniappService({ repository: new InMemoryTestRepository(), config: createTestRuntimeConfig(),
  weather: new DeterministicWeatherTestAdapter(), route: new DisabledRouteAdapter(),
  placeSearch: new DisabledPlaceSearchAdapter(), mediaStore: new MemoryMediaObjectStore(),
  skyCatalog: createBsc5pSkyCatalogProvider("bsc5p-bright-stars.v3") });
class TestModule {}
Module({ controllers: [MiniappController], providers: [{ provide: MiniappService, useValue: service }] })(TestModule);
const app = await NestFactory.create<NestFastifyApplication>(TestModule, new FastifyAdapter(), { logger: false });
try {
  await app.init();
  const http = app.getHttpAdapter().getInstance(), rows = [];
  for (const query of ["", "&imageVersion=source-finite-v3"]) {
    const image = await http.inject({ method: "GET", url: `/v2/celestial-objects/M%3A42/image?level=DETAIL${query}` });
    assert.equal(image.statusCode, 200);
    assert.equal(image.headers["content-type"], query ? "image/png" : "image/jpeg");
    const hash = image.headers["x-starward-image-publication-hash"];
    const information = await http.inject({ method: "GET", url: `/v2/celestial-objects/M%3A42?deepSkyImageVersion=source-finite-v3&deepSkyPublicationHash=${hash}` });
    assert.equal(information.statusCode, 200);
    const source = information.json().data.sources.find((item: { id: string }) => item.id.startsWith("imagery:"));
    assert.equal(source.id, image.headers["x-starward-image-source-id"]);
    const manifest = await http.inject({ method: "GET", url: `/v2/sky/deep-sky/${hash}/manifest` });
    assert.equal(manifest.statusCode, 200);
    const detail = manifest.json().entries.find((entry: { objectRef: string }) => entry.objectRef === "M:42").levels.DETAIL;
    assert.equal(createHash("sha256").update(image.rawPayload).digest("hex"), detail.sha256);
    rows.push({ schema: manifest.json().schemaVersion, publicationHash: hash, sourceId: source.id,
      contentType: image.headers["content-type"], sha256: detail.sha256, bytes: image.rawPayload.length });
  }
  const missing = await http.inject({ method: "GET", url: `/v2/celestial-objects/M%3A42?deepSkyImageVersion=source-finite-v3&deepSkyPublicationHash=${"0".repeat(64)}` });
  assert.equal(missing.json().dataState, "PARTIAL");
  assert(!missing.json().data.sources.some((source: { id: string }) => source.id.startsWith("imagery:")));
  const result = { scope: "Compiled production-condition contracts/API exports via actual Nest/Fastify HTTP injection; explicit Memory/weather test ports. No running 8789/8791 validation, authenticated production configuration, listen, deployment, new DevTools window or device acceptance", rows, unavailableBoundSource: "PARTIAL", closed: true };
  fs.writeFileSync(output, JSON.stringify(result, null, 2) + "\n", { flag: "wx" });
  console.log(JSON.stringify(result));
} finally { await app.close(); }
