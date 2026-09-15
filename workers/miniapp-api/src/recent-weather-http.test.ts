import "reflect-metadata";
import assert from "node:assert/strict";
import { generateKeyPairSync } from "node:crypto";
import test from "node:test";
import { Module } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { FastifyAdapter } from "@nestjs/platform-fastify";
import { TEST_PUBLISHED_SPOT } from "@starward/miniapp-contracts/test-fixtures";
import { MiniappController } from "./controller.ts";
import { MiniappService } from "./miniapp-service.ts";
import { QWeatherRecentWeatherAdapter } from "./recent-weather-provider.ts";
import { createTestRuntimeConfig } from "./runtime-config.ts";
import { createTestMiniappService } from "./test-fixtures/create-test-service.ts";

test("formal spot → region → real HTTP contract preserves partial dated evidence without weather/astronomy dependency", async () => {
  const config = createTestRuntimeConfig({ qweather: { apiHost: "test.qweatherapi.com", projectId: "test", credentialId: "test", forecastHours: 24,
    privateKeyPem: generateKeyPairSync("ed25519").privateKey.export({ format: "pem", type: "pkcs8" }).toString() } });
  let calls = 0;
  const provider = new QWeatherRecentWeatherAdapter(config, async request => {
    calls++;
    const url = new URL(request.toString());
    const body = url.pathname.includes("/geo/") ? { code: "200", location: [{ id: "101-test", name: "邻近区域", tz: "Asia/Shanghai" }] }
      : url.searchParams.get("date") === "20260914" ? { code: "403" }
      : { code: "200", weatherDaily: { date: "2026-09-13", precip: "12", tempMin: "8", tempMax: "16" } };
    return new Response(JSON.stringify(body), { headers: { "content-type": "application/json" } });
  }, () => Date.parse("2026-09-15T01:00:00Z"));
  const service = createTestMiniappService({ config, recentWeather: provider,
    weather: { key: "must-not-be-used", getHourly: async () => { throw new Error("forecast should be independent"); } } });
  await assert.rejects(service.getSpotRecentWeather("contribution:private"), /formal_spot_not_found/);
  assert.equal(calls, 0, "unpublished identities cannot spend upstream requests");
  class TestModule {}
  Module({ controllers: [MiniappController], providers: [{ provide: MiniappService, useValue: service }] })(TestModule);
  const app = await NestFactory.create(TestModule, new FastifyAdapter(), { logger: false });
  try {
    await app.listen(0, "127.0.0.1");
    const response = await fetch(`${await app.getUrl()}/v2/spots/${encodeURIComponent(TEST_PUBLISHED_SPOT.spotId)}/recent-weather`);
    assert.equal(response.status, 200);
    const result = await response.json();
    assert.equal(result.dataState, "PARTIAL");
    assert.equal(result.data.spotId, TEST_PUBLISHED_SPOT.spotId);
    assert.equal(result.data.region.name, "邻近区域");
    assert.equal(result.data.days[0].precipitationMm, 12);
    assert.deepEqual(result.data.days.map((day: { localDate: string }) => day.localDate), ["2026-09-13"]);
    assert.deepEqual(result.data.missingDates, ["2026-09-14"]);
    assert.equal(result.data.unavailableReason, "REQUEST_FAILED");
    assert.equal(result.sources[0].kind, "HISTORICAL_RECORD");
    assert.equal(calls, 3);
  } finally { await app.close(); }
});
