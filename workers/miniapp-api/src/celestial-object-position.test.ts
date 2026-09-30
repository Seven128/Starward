import "reflect-metadata";
import assert from "node:assert/strict";
import test from "node:test";
import { Module } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { FastifyAdapter } from "@nestjs/platform-fastify";
import { TEST_PUBLISHED_SPOT } from "@starward/miniapp-contracts/test-fixtures";
import { positionBsc5pCatalog } from "@starward/astronomy-core/bsc5p-catalog";
import { projectStellarMotion } from "@starward/astronomy-core/stellar-vectors";
import { celestialObjectPosition } from "./celestial-object-position.ts";
import { createBsc5pSkyCatalogProvider } from "./sky-scene-catalog-provider.ts";
import { createTestMiniappService } from "./test-fixtures/create-test-service.ts";
import { SaoPublicationService } from "./sao-publication.ts";
import { loadSaoCatalog } from "./sao-catalog-provider.ts";
import { MiniappController } from "./controller.ts";
import { MiniappService } from "./miniapp-service.ts";
import { createSkyViewBasis, projectSkyDirection } from "../../../apps/wechat-miniapp/src/features/sky/sky-view-projection.ts";
import { matchingCelestialPositionResponse } from "../../../apps/wechat-miniapp/src/services/celestial-position-response.ts";

const service = createTestMiniappService({ skyCatalog: createBsc5pSkyCatalogProvider() });
const context = (await service.resolveObservationContext({
  location: { kind: "FORMAL_SPOT", spotId: TEST_PUBLISHED_SPOT.spotId }, localDate: "2026-09-22",
})).data;
const report = await service.getSky(TEST_PUBLISHED_SPOT.spotId, context.contextId);
const at = report.data.hourly[0]!.at;

test("the adopted v3 sky report resolves HR and SAO positions against matching publications", async () => {
  const revised = await service.getSky(TEST_PUBLISHED_SPOT.spotId, context.contextId, null,
    "bsc5p-bright-stars.v3");
  assert.equal(revised.data.skyScene.catalog?.catalogVersion, "bsc5p-bright-stars.v3");
  const instant = revised.data.hourly[0]!.at;
  const bright = celestialObjectPosition("HR:7001", instant, revised);
  assert.equal(bright.dataState, "FRESH");
  assert.equal(bright.data.position?.catalogHash, revised.data.skyScene.catalog?.catalogHash);
  const sao = loadSaoCatalog("bsc5p-bright-stars.v3").catalog;
  const reference = sao.references().next().value;
  assert.ok(reference);
  const faint = celestialObjectPosition(reference, instant, revised);
  assert.equal(faint.dataState, "FRESH");
  assert.equal(faint.data.position?.catalogHash, sao.catalogHash);
});

test("selected HR stars use the exact rendered geometry and preserve below-horizon positions", () => {
  const expected = positionBsc5pCatalog({ at, ...report.data.skyScene.observer! });
  const below = expected.find(row => row.altitudeDeg < -10)!;
  for (const reference of ["HR:2491", "HR:7001", "HR:424", below.sourceId]) {
    const result = celestialObjectPosition(reference, at, report);
    const star = expected.find(row => row.sourceId === reference)!;
    assert.equal(result.dataState, "FRESH");
    assert.equal(result.data.contextId, context.contextId);
    assert.equal(result.data.contextRevision, report.data.context.contextRevision);
    assert.equal(result.data.contextFingerprint, report.data.context.contextFingerprint);
    assert.equal(result.data.at, at);
    assert.equal(result.data.position!.azimuthDeg, star.azimuthDeg);
    assert.equal(result.data.position!.altitudeDeg, star.altitudeDeg);
  }
  assert.ok(celestialObjectPosition(below.sourceId, at, report).data.position!.altitudeDeg < 0);
});

test("new time slices change location and cannot silently reuse the previous position", () => {
  const later = report.data.hourly[6]!.at;
  const first = celestialObjectPosition("HR:7001", at, report).data;
  const second = celestialObjectPosition("HR:7001", later, report).data;
  assert.notDeepEqual(first.position, second.position);
  assert.equal(second.at, later);
  assert.throws(() => celestialObjectPosition("HR:7001", "1990-01-01T00:00:00.000Z", report), /time_outside_report/);
  assert.throws(() => celestialObjectPosition("HIP:91262", at, report), /reference_invalid/);
});

test("planet position uses the same exact report row and fails closed on retired geometry", () => {
  const first = celestialObjectPosition("PLANET:VENUS", at, report);
  const planet = report.data.hourly[0]!.planets![1]!;
  assert.equal(first.dataState, "FRESH");
  assert.equal(first.data.position?.azimuthDeg, planet.azimuthDeg);
  assert.equal(first.data.position?.altitudeDeg, planet.altitudeDeg);
  const later = report.data.hourly[6]!.at;
  assert.notDeepEqual(first.data.position, celestialObjectPosition("PLANET:VENUS", later, report).data.position);
  const without = structuredClone(report);
  without.data.hourly[0]!.planets = null;
  assert.equal(celestialObjectPosition("PLANET:VENUS", at, without).data.position, null);
  assert.equal(celestialObjectPosition("HR:7001", at, without).dataState, "FRESH");
  const wrong = structuredClone(report);
  wrong.data.hourly[0]!.planets![1]!.body = "MERCURY";
  assert.equal(celestialObjectPosition("PLANET:VENUS", at, wrong).dataState, "UNAVAILABLE");
});

test("deep-sky selection consumes the same registered center independently of the stellar layer", () => {
  const independent = structuredClone(report);
  independent.data.skyScene.state = "UNAVAILABLE";
  independent.data.skyScene.catalog = null;
  const result = celestialObjectPosition("M:31", at, independent);
  const deep = report.data.skyScene.deepSky!;
  const index = deep.catalog!.entries.findIndex(row => row.objectRef === "M:31");
  const point = deep.frames.find(frame => frame.at === at)!.points!.find(point => point[0] === index)!;
  assert.equal(result.dataState, "FRESH");
  assert.equal(result.data.position!.azimuthDeg, point[1]);
  assert.equal(result.data.position!.altitudeDeg, point[2]);
  assert.equal(result.data.position!.catalogHash, deep.catalog!.catalogHash);
  assert.equal(celestialObjectPosition("HR:7001", at, independent).dataState, "UNAVAILABLE");
});

test("SAO selected positions match the real tile's propagated geometry without loading a visible scene", async () => {
  const publication = new SaoPublicationService();
  const index = await publication.get();
  const tile = await publication.tile(index.data.publicationHash, index.data.index.tiles[0]!.id);
  const row = tile.data.tile.rows[0]!;
  const geometry = report.data.skyScene.frames.find(frame => frame.at === at)!.geometry!;
  const expected = projectStellarMotion([row[2], row[3], row[4], row[5], row[6], row[7]], geometry.julianYears, geometry.equatorialToEnu);
  const result = celestialObjectPosition(row[0], at, report);
  assert.equal(result.dataState, "FRESH");
  assert.equal(result.data.position!.catalogHash, tile.data.tile.catalogHash);
  // Published vectors are decimal-serialized; compare at sub-milliarcsecond scale.
  assert.ok(Math.abs(result.data.position!.azimuthDeg - expected.azimuthDeg) < 1e-7);
  assert.ok(Math.abs(result.data.position!.altitudeDeg - expected.altitudeDeg) < 1e-7);
});

test("stale, expired and wrong-catalog frames never become fresh selectable coordinates", () => {
  const stale = { ...report, dataState: "STALE_USABLE" as const };
  assert.equal(celestialObjectPosition("HR:7001", at, stale).dataState, "STALE_USABLE");
  const expired = celestialObjectPosition("M:31", at, { ...report, dataState: "EXPIRED" });
  assert.equal(expired.data.position, null);
  assert.equal(expired.data.unavailableReason, "SKY_UNAVAILABLE");
  const wrong = structuredClone(report);
  wrong.data.skyScene.frames.find(frame => frame.at === at)!.geometry!.catalogHash = "0".repeat(64);
  const unavailable = celestialObjectPosition("HR:7001", at, wrong);
  assert.equal(unavailable.dataState, "UNAVAILABLE");
  assert.equal(unavailable.data.position, null);
});

test("authorized HTTP location lookup reaches the existing camera projection; private proposals retain auth", async () => {
  const originalGetSky = service.getSky;
  let privateSkyCalls = 0;
  service.getSky = async (...args) => {
    if (args[0].startsWith("contribution:")) privateSkyCalls++;
    return originalGetSky.apply(service, args);
  };
  class TestModule {}
  Module({ controllers: [MiniappController], providers: [{ provide: MiniappService, useValue: service }] })(TestModule);
  const app = await NestFactory.create(TestModule, new FastifyAdapter(), { logger: false });
  try {
    await app.listen(0, "127.0.0.1");
    const base = await app.getUrl();
    const path = `/v2/spots/${encodeURIComponent(TEST_PUBLISHED_SPOT.spotId)}/sky/objects/HR%3A7001?contextId=${encodeURIComponent(context.contextId)}&at=${encodeURIComponent(at)}`;
    const response = await fetch(base + path);
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.data.reference, "HR:7001");
    matchingCelestialPositionResponse(body, { reference: "HR:7001", ...report.data.context, at }, report.data.skyScene.catalog!);
    const position = body.data.position;
    const basis = createSkyViewBasis(position.azimuthDeg, 90 + position.altitudeDeg, 0)!;
    const projected = projectSkyDirection(position.azimuthDeg, position.altitudeDeg, basis, 390, 844, 5)!;
    assert.ok(projected && Math.hypot(projected.x - 195, projected.y - 422) < 1e-7);
    const revisedSky = await fetch(`${base}/v2/spots/${encodeURIComponent(TEST_PUBLISHED_SPOT.spotId)}/sky?contextId=${encodeURIComponent(context.contextId)}&catalogVersion=bsc5p-bright-stars.v3`);
    assert.equal(revisedSky.status, 200);
    const revisedReport = await revisedSky.json();
    assert.equal(revisedReport.data.skyScene.catalog.catalogVersion, "bsc5p-bright-stars.v3");
    const revisedPosition = await fetch(base + path + "&catalogVersion=bsc5p-bright-stars.v3");
    assert.equal(revisedPosition.status, 200);
    matchingCelestialPositionResponse(await revisedPosition.json(),
      { reference: "HR:7001", ...revisedReport.data.context, at }, revisedReport.data.skyScene.catalog);
    assert.equal((await fetch(base + path + "&catalogVersion=invalid")).status, 400);
    const invalid = await fetch(base + path.replace(encodeURIComponent(at), "invalid-time"));
    assert.equal(invalid.status, 400);
    const privateResponse = await fetch(base + path.replace(encodeURIComponent(TEST_PUBLISHED_SPOT.spotId), "contribution%3Aother-account"));
    assert.notEqual(privateResponse.status, 200);
    const privateBody = await privateResponse.json();
    assert.equal(privateBody.data?.position, undefined);
    assert.equal(privateSkyCalls, 0, "anonymous requests must be rejected before accessing private proposal sky data");
  } finally { service.getSky = originalGetSky; await app.close(); }
});
