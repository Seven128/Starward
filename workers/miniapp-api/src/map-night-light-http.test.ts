import "reflect-metadata";
import assert from "node:assert/strict";
import test from "node:test";
import { Module } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { FastifyAdapter } from "@nestjs/platform-fastify";
import type { MapLayerData, TerrainBounds } from "@starward/miniapp-contracts";
import { MiniappController } from "./controller.ts";
import { MiniappService } from "./miniapp-service.ts";
import { createTestMiniappService } from "./test-fixtures/create-test-service.ts";
import { InMemoryTestRepository } from "./test-fixtures/in-memory-repository.ts";

// This fixture verifies routing/dependency isolation. The real sealed-file,
// numeric and PostgreSQL publication tests retain their separate responsibilities.
test("public static light responds during a pending Scene and recovers its own failed publication read", { timeout: 10_000 }, async t => {
  const repository = new InMemoryTestRepository();
  Object.defineProperty(repository, "kind", { value: "postgres" });
  const service = createTestMiniappService({ repository, weather: { key: "must-not-read-static-weather",
    async getHourly() { throw new Error("static_layer_requested_weather"); } } });
  let releaseScene!: () => void, settledScene = false;
  const sceneHold = new Promise<void>(resolve => { releaseScene = resolve; });
  t.mock.method(service, "getMapScene", async () => { await sceneHold; settledScene = true; return { deliberatelyHeld: true }; });
  const sceneWork = service.getMapScene({ contextId: "unrelated-weather-context" });
  let reads = 0, fail = false;
  const layer: MapLayerData = { kind: "LIGHT_POLLUTION", cloudLayer: null, validAt: "2025-01-01T00:00:00Z",
    datasetVersion: "isolated-static-fixture", state: "PARTIAL", source: null, precision: "controlled dependency fixture",
    polygons: [{ id: "valid-zero", points: [{ latitude: 22, longitude: 114 }, { latitude: 22, longitude: 114.01 },
      { latitude: 22.01, longitude: 114.01 }], fillColor: "#87714A66", strokeColor: "#87714A66", strokeWidth: 1,
      value: 0, label: "valid zero", state: "PARTIAL" }], legend: [{ label: "valid zero", color: "#87714A", range: "fixture only" }] };
  t.mock.method(service.nightLight, "layer", async (_version: string, bounds: TerrainBounds | undefined, signal?: AbortSignal) => {
    reads++; assert.deepEqual(bounds, { west: 113.9, south: 21.9, east: 114.1, north: 22.1 });
    assert.equal(signal?.aborted, false);
    if (fail) throw new Error("controlled_publication_read_failure");
    return layer;
  });
  class TestModule {}
  Module({ controllers: [MiniappController], providers: [{ provide: MiniappService, useValue: service }] })(TestModule);
  const app = await NestFactory.create(TestModule, new FastifyAdapter(), { logger: false });
  try {
    await app.listen(0, "127.0.0.1");
    const base = await app.getUrl(), url = `${base}/v2/map/night-light?centerLat=22&centerLng=114&zoom=12&viewportBounds=113.9,21.9,114.1,22.1`;
    assert.equal((await fetch(`${base}/v2/map/night-light`)).status, 400);
    assert.equal(reads, 0);
    const response = await fetch(url); assert.equal(response.status, 200);
    const result = await response.json();
    assert.deepEqual(result.data, layer, "published values/coverage cannot be replaced by an empty success");
    assert.equal(settledScene, false, "static response must not wait for the unrelated Scene promise");
    fail = true;
    const failed = await (await fetch(url)).json();
    assert.equal(failed.data.failureCode, "LIGHT_READ_FAILED"); assert.equal(failed.data.state, "UNAVAILABLE");
    fail = false;
    assert.deepEqual((await (await fetch(url)).json()).data, layer);
  } finally {
    releaseScene(); await sceneWork; await app.close();
  }
});
