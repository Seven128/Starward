import "reflect-metadata";
import assert from "node:assert/strict";
import test from "node:test";
import { Module } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { FastifyAdapter } from "@nestjs/platform-fastify";
import { MiniappController } from "./controller.ts";
import { MiniappService } from "./miniapp-service.ts";
import { TerrainService } from "./terrain-service.ts";
import { readTerrainHorizonModel } from "./terrain-horizon-model.ts";
import { createTestMiniappService } from "./test-fixtures/create-test-service.ts";
import { copernicusTestSource } from "./test-fixtures/copernicus-test-source.ts";

test("horizon public route validates, recovers a failed read, and returns source-bound numeric sectors", async () => {
  let calls = 0;
  const terrain = new TerrainService({ renderer: async () => null, horizonRenderer: async (center, signal) => {
    if (++calls === 1) throw new Error("controlled_transient_source_failure");
    return readTerrainHorizonModel(center, signal, copernicusTestSource().transport);
  } });
  const service = createTestMiniappService({ terrain });
  class TestModule {}
  Module({ controllers: [MiniappController], providers: [{ provide: MiniappService, useValue: service }] })(TestModule);
  const app = await NestFactory.create(TestModule, new FastifyAdapter(), { logger: false });
  try {
    await app.listen(0, "127.0.0.1");
    const base = await app.getUrl();
    assert.equal((await fetch(`${base}/v2/terrain/horizon?centerLat=bad&centerLng=114.35`)).status, 400);
    assert.equal(calls, 0);
    const url = `${base}/v2/terrain/horizon?centerLat=22.6&centerLng=114.35`;
    const failed = await (await fetch(url)).json();
    assert.equal(failed.data.state, "UNAVAILABLE");
    assert.equal(failed.data.failureCode, "HORIZON_READ_FAILED");
    const response = await fetch(url); assert.equal(response.status, 200);
    const recovered = await response.json();
    assert.equal(recovered.apiVersion, "v2");
    assert.equal(recovered.data.failureCode, undefined);
    assert.ok(recovered.data.model.knownSectors > 0);
    assert.equal(recovered.data.model.sectors.length, 360);
    assert.ok(recovered.data.model.sectors.some((sector: { elevationDegrees: number | null }) => sector.elevationDegrees !== null && sector.elevationDegrees !== 0));
    assert.equal(recovered.data.model.bearingReference, "TRUE_NORTH_CLOCKWISE");
    assert.equal(recovered.data.sourceProof[0].etag, '"synthetic-cog"');
    assert.equal(recovered.data.sourceProof[0].hashScope, "RETRIEVED_RANGES");
    assert.ok(recovered.data.source.attribution.statements.length >= 3);
    const cached = await (await fetch(url)).json();
    assert.equal(cached.data.publicationId, recovered.data.publicationId);
    assert.equal(calls, 2);
  } finally { await app.close(); }
});
