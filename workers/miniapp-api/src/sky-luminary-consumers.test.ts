import "reflect-metadata";
import assert from "node:assert/strict";
import test from "node:test";
import { Module } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { FastifyAdapter } from "@nestjs/platform-fastify";
import { SKY_LUMINARY_CATALOG_VERSION, SKY_LUMINARY_CATALOG_HASH } from "@starward/miniapp-contracts";
import { TEST_PUBLISHED_SPOT } from "@starward/miniapp-contracts/test-fixtures";
import { CelestialObjectSearchService } from "./celestial-object-search.ts";
import { CelestialObjectInformationService } from "./celestial-object-information.ts";
import { celestialObjectPosition } from "./celestial-object-position.ts";
import { MoonTexturePublicationService } from "./moon-texture-publication.ts";
import { createTestMiniappService } from "./test-fixtures/create-test-service.ts";
import { MiniappController } from "./controller.ts";
import { MiniappService } from "./miniapp-service.ts";
import { matchingCelestialSearchResponse } from "../../../apps/wechat-miniapp/src/services/celestial-search-response.ts";
import { matchingCelestialInformationResponse } from "../../../apps/wechat-miniapp/src/services/celestial-information-response.ts";
import { matchingCelestialPositionResponse } from "../../../apps/wechat-miniapp/src/services/celestial-position-response.ts";

const catalog = { catalogVersion: SKY_LUMINARY_CATALOG_VERSION, catalogHash: SKY_LUMINARY_CATALOG_HASH };
test("real search opt-in resolves day/night luminaries; old clients never receive unknown identities", () => {
  const search = new CelestialObjectSearchService();
  for (const [query, reference, kind] of [ ["太阳", "SOLAR:SUN", "STAR"], ["Sun", "SOLAR:SUN", "STAR"],
    ["Moon", "SOLAR:MOON", "MOON"], ["月球", "SOLAR:MOON", "MOON"], ["月亮", "SOLAR:MOON", "MOON"] ]) {
    const current = search.search(query!, 20, "bsc5p-bright-stars.v3", catalog.catalogVersion);
    matchingCelestialSearchResponse(current, query!);
    assert.equal(current.data.results[0]?.reference, reference);
    assert.equal(current.data.results[0]?.kind, kind);
    const old = search.search(query!, 20, "bsc5p-bright-stars.v3");
    assert.ok(old.data.results.every(result => !result.reference.startsWith("SOLAR:")));
  }
  assert.throws(() => search.search("Sun", 20, "bsc5p-bright-stars.v3", "unknown"), /luminary_catalog_version_invalid/);
});

test("coverage lunar facts recover without leaking the legacy publication cache",()=>{
  const moon=new MoonTexturePublicationService(), original=moon.coverageManifest.bind(moon);
  let broken=true;moon.coverageManifest=()=>{if(broken)throw Error("unavailable");return original();};
  const info=new CelestialObjectInformationService(undefined,undefined,moon);
  const legacy=info.get("SOLAR:MOON");
  const partial=info.get("SOLAR:MOON","zh-CN","bsc5p-bright-stars.v2","coverage-v2");
  assert.equal(partial.dataState,"PARTIAL");
  assert.ok(!partial.data.sources.some(s=>s.id.includes("clementine")));
  broken=false;
  const recovered=info.get("SOLAR:MOON","zh-CN","bsc5p-bright-stars.v2","coverage-v2");
  assert.equal(recovered.dataState,"FRESH");
  assert.ok(recovered.data.sources.some(s=>s.id==="usgs-clementine-uv750-v21-coverage"));
  assert.deepEqual(info.get("SOLAR:MOON"),legacy);
});

test("information shares scientific identity, real publication credit and recoverable lunar-source failure", () => {
  const moon = new MoonTexturePublicationService();
  const original = moon.manifest.bind(moon);
  let unavailable = true;
  moon.manifest = () => { if (unavailable) throw Error("unavailable"); return original(); };
  const info = new CelestialObjectInformationService(undefined, undefined, moon);
  const partial = info.get("SOLAR:MOON");
  assert.equal(partial.dataState, "PARTIAL");
  assert.equal(partial.data.reference, "SOLAR:MOON");
  unavailable = false;
  const recovered = info.get("SOLAR:MOON");
  assert.equal(recovered.dataState, "FRESH");
  assert.ok(recovered.data.sources.some(source => source.attribution?.name === original().source.credit));
  assert.notEqual(recovered.data.contentRevision, partial.data.contentRevision);
  for (const reference of ["SOLAR:SUN", "SOLAR:MOON"]) {
    const result = info.get(reference);
    matchingCelestialInformationResponse(result, reference);
    assert.equal(result.data.sources.length, 2);
    result.data.kind = "PLANET";
    assert.throws(() => matchingCelestialInformationResponse(result, reference), /information_response_invalid/);
    assert.notEqual(info.get(reference).data.kind, "PLANET", "callers cannot poison cached facts");
  }
  assert.ok(info.get("SOLAR:SUN").data.sources.some(source => source.id === "hestroffer-magnan-1998-solar-limb"));
});

test("authorized HTTP discovery, facts and exact report location reach Mini validators with independent failures", async () => {
  const service = createTestMiniappService();
  const context = (await service.resolveObservationContext({ location: { kind: "FORMAL_SPOT",
    spotId: TEST_PUBLISHED_SPOT.spotId }, localDate: "2026-09-28" })).data;
  const report = await service.getSky(TEST_PUBLISHED_SPOT.spotId, context.contextId);
  const row = report.data.hourly[0]!;
  class TestModule {}
  Module({ controllers: [MiniappController], providers: [{ provide: MiniappService, useValue: service }] })(TestModule);
  const app = await NestFactory.create(TestModule, new FastifyAdapter(), { logger: false });
  try {
    await app.listen(0, "127.0.0.1");
    const base = await app.getUrl();
    for (const [reference, query, azimuth, altitude] of [
      ["SOLAR:SUN", "太阳", row.sunAzimuthDeg, row.sunAltitudeDeg],
      ["SOLAR:MOON", "月球", row.moonAzimuthDeg, row.moonAltitudeDeg],
    ] as const) {
      const searchPath = `${base}/v2/celestial-objects?q=${encodeURIComponent(query)}&catalogVersion=bsc5p-bright-stars.v3`;
      const old = await (await fetch(searchPath)).json();
      assert.equal(old.data.results.some((value: { reference: string }) => value.reference === reference), false);
      const search = await fetch(`${searchPath}&luminaryCatalogVersion=${encodeURIComponent(catalog.catalogVersion)}`);
      assert.equal(search.status, 200);
      assert.equal(matchingCelestialSearchResponse(await search.json(), query).data.results[0]?.reference, reference);
      assert.equal((await fetch(searchPath + "&luminaryCatalogVersion=invalid")).status, 400);
      const facts = await fetch(`${base}/v2/celestial-objects/${encodeURIComponent(reference)}`);
      assert.equal(facts.status, 200);
      matchingCelestialInformationResponse(await facts.json(), reference);
      const path = `${base}/v2/spots/${encodeURIComponent(TEST_PUBLISHED_SPOT.spotId)}/sky/objects/${encodeURIComponent(reference)}?contextId=${encodeURIComponent(context.contextId)}&at=${encodeURIComponent(row.at)}`;
      const located = await fetch(path);
      assert.equal(located.status, 200);
      const result = matchingCelestialPositionResponse(await located.json(), { reference, ...report.data.context, at: row.at }, catalog);
      assert.equal(result.data.position?.azimuthDeg, azimuth);
      assert.equal(result.data.position?.altitudeDeg, altitude);
      assert.equal(celestialObjectPosition(reference, row.at, { ...report, dataState: "EXPIRED" }).data.position, null);
      assert.equal(celestialObjectPosition(reference, row.at, { ...report, dataState: "STALE_USABLE" }).dataState, "STALE_USABLE");
      const duplicate = structuredClone(report);
      duplicate.data.hourly = [...duplicate.data.hourly, structuredClone(row)];
      assert.equal(celestialObjectPosition(reference, row.at, duplicate).data.position, null);
      assert.notEqual((await fetch(path.replace(encodeURIComponent(TEST_PUBLISHED_SPOT.spotId), "contribution%3Aother-account"))).status, 200);
    }
    const broken = structuredClone(report);
    broken.data.hourly[0]!.sunAzimuthDeg = null;
    assert.equal(celestialObjectPosition("SOLAR:SUN", row.at, broken).dataState, "UNAVAILABLE");
    assert.ok(celestialObjectPosition("SOLAR:MOON", row.at, broken).data.position);
    const below = structuredClone(report);
    below.data.hourly[0]!.sunAltitudeDeg = -8;
    assert.equal(celestialObjectPosition("SOLAR:SUN", row.at, below).data.position?.altitudeDeg, -8);
  } finally { await app.close(); }
});
