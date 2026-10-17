import "reflect-metadata";
import assert from "node:assert/strict";
import test from "node:test";
import { readFile, rename, stat } from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { Module } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { FastifyAdapter } from "@nestjs/platform-fastify";
import { gcj02ToWgs84 } from "@starward/coordinate-system";
import { NIGHT_LIGHT_FIXED_SCALE } from "@starward/miniapp-contracts";
import { MiniappController } from "./controller.ts";
import { MiniappService } from "./miniapp-service.ts";
import { PostgresMiniappRepository } from "./postgres-repository.ts";
import { createTestRuntimeConfig } from "./runtime-config.ts";
import { DisabledRouteAdapter } from "./route-provider.ts";
import { TerrainService } from "./terrain-service.ts";
import { fixedNightLightDataset, readFixedNightLightInventory, readFixedNightLightProof } from "./night-light-publication.ts";

const root = process.env.MINIAPP_EOG_FIXED_TEST_ROOT;
test("published fixed night-light reaches the public Map and asset routes; missing metadata recovers without dropping context", {
  skip: !root || !process.env.DATABASE_URL,
}, async () => {
  assert.ok(root && path.isAbsolute(root));
  const database = new URL(process.env.DATABASE_URL!);
  assert.ok(["127.0.0.1", "localhost"].includes(database.hostname));
  assert.match(database.pathname, /^\/starward_eog_test_[a-f0-9]+$/u);
  const fixture = JSON.parse(await readFile(path.join(root, "fixture.json"), "utf8"));
  const repository = await new PostgresMiniappRepository(database.toString()).initialize();
  const record = await repository.getPublishedDarkSkyDataset(fixture.datasetVersion);
  assert.ok(record);
  const dataset = fixedNightLightDataset(record);
  assert.ok(dataset);
  const directory = path.join(root, dataset.datasetVersion);
  const inventory = await readFixedNightLightInventory(directory, dataset);
  const proof = await readFixedNightLightProof(directory, dataset, inventory.assets[0]!);
  let weatherCalls = 0;
  const service = new MiniappService({ repository, config: createTestRuntimeConfig({
    storageMode: "POSTGRES", databaseUrl: database.toString(), darkSkyDatasetVersion: dataset.datasetVersion,
    nightLightPublicationRoot: root,
  }), weather: { key: "static-layer-must-not-read-weather", async getHourly() { weatherCalls++; throw new Error("unexpected_weather_request"); } },
  route: new DisabledRouteAdapter(), terrain: new TerrainService({ renderer: async () => null }) });
  class TestModule {}
  Module({ controllers: [MiniappController], providers: [{ provide: MiniappService, useValue: service }] })(TestModule);
  const app = await NestFactory.create(TestModule, new FastifyAdapter(), { logger: false });
  const inventoryFile = path.resolve(directory, "inventory.json"), backupFile = inventoryFile + ".test-owned-backup";
  assert.ok(inventoryFile.startsWith(path.resolve(root) + path.sep));
  let hidden = false;
  try {
    await app.listen(0, "127.0.0.1");
    const base = await app.getUrl(), b = proof.grid.boundsGcj02;
    const center = { latitude: (b.north + b.south) / 2, longitude: (b.west + b.east) / 2 };
    const wgs = gcj02ToWgs84({ system: "GCJ-02", lat: center.latitude, lon: center.longitude });
    const resolved = await fetch(`${base}/v2/observation-contexts/resolve`, { method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ location: { kind: "MAP_POINT", displayName: "合成夜光发布验证区域", source: "MAP_VIEWPORT",
        wgs84: { system: "WGS84", latitude: wgs.lat, longitude: wgs.lon } }, localDate: "2026-10-17", selectedAt: "2026-10-17T13:00:00.000Z" }) });
    assert.equal(resolved.status, 201);
    const context = (await resolved.json()).data;
    const bounds = [b.west + .01, b.south + .01, b.east - .01, b.north - .01].join(",");
    const query = new URLSearchParams({ contextId: context.contextId, layer: "LIGHT_POLLUTION", centerLat: String(center.latitude),
      centerLng: String(center.longitude), zoom: "9", viewportBounds: bounds });
    const sceneUrl = `${base}/v2/map/scene?${query}`;
    await rename(inventoryFile, backupFile); hidden = true;
    const failedResponse = await fetch(sceneUrl);
    assert.equal(failedResponse.status, 200);
    const failed = await failedResponse.json();
    assert.equal(failed.data.context.contextId, context.contextId);
    assert.equal(failed.data.layer.failureCode, "LIGHT_READ_FAILED");
    assert.equal(failed.data.layer.raster, undefined);
    await rename(backupFile, inventoryFile); hidden = false;
    const response = await fetch(sceneUrl);
    assert.equal(response.status, 200);
    const scene = await response.json(), layer = scene.data.layer;
    assert.equal(scene.data.context.contextId, context.contextId);
    assert.equal(layer.failureCode, undefined);
    assert.equal(layer.raster.datasetVersion, dataset.datasetVersion);
    assert.equal(layer.raster.methodVersion, NIGHT_LIGHT_FIXED_SCALE.methodVersion);
    assert.equal(layer.raster.imageSha256, proof.image.sha256);
    assert.equal(layer.polygons.length, 0);
    assert.equal(layer.legend.length, 5);
    assert.ok(layer.legend.every((item: { range: string }) => item.range.includes("nW/cm²/sr")));
    const imageResponse = await fetch(base + layer.raster.imageUrl);
    assert.equal(imageResponse.status, 200);
    assert.match(imageResponse.headers.get("content-type")!, /^image\/png/u);
    assert.match(imageResponse.headers.get("cache-control")!, /immutable/u);
    const image = Buffer.from(await imageResponse.arrayBuffer());
    assert.equal(image.length, proof.image.bytes);
    assert.equal(createHash("sha256").update(image).digest("hex"), proof.image.sha256);
    const spotTerrain = await fetch(`${base}/v2/terrain/overlay?purpose=SPOT&centerLat=${center.latitude}&centerLng=${center.longitude}&radiusKm=5`);
    assert.equal(spotTerrain.status, 200);
    const light = (await spotTerrain.json()).data.lightPollution;
    assert.equal(light.raster.datasetVersion, layer.raster.datasetVersion);
    assert.equal(light.raster.methodVersion, layer.raster.methodVersion);
    assert.equal(light.cells.length, 0);
    assert.equal(weatherCalls, 0);
  } finally {
    if (hidden && (await stat(backupFile).catch(() => null))) await rename(backupFile, inventoryFile);
    await app.close();
  }
});
