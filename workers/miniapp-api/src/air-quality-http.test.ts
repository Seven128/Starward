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
import { QWeatherAirQualityAdapter } from "./air-quality-provider.ts";
import { createTestRuntimeConfig } from "./runtime-config.ts";
import { createTestMiniappService } from "./test-fixtures/create-test-service.ts";

test("formal spot to HTTP AQ preserves independent failure and forecast identity", async () => {
  const config = createTestRuntimeConfig({ qweather: { apiHost: "test.qweatherapi.com", projectId: "test", credentialId: "test", forecastHours: 24,
    privateKeyPem: generateKeyPairSync("ed25519").privateKey.export({ format: "pem", type: "pkcs8" }).toString() } });
  let calls = 0, currentFails = true, now = Date.parse("2026-09-15T01:00:00Z");
  const provider = new QWeatherAirQualityAdapter(config, async request => {
    calls++;
    if (new URL(request.toString()).pathname.includes("/current/")) return currentFails ? new Response("", { status: 403 })
      : new Response(JSON.stringify({ indexes: [{ code: "cn-mee", name: "中国 AQI", aqi: 0, aqiDisplay: "0" }] }), { headers: { "content-type": "application/json" } });
    return new Response(JSON.stringify({ hours: [{ forecastTime: "2026-09-15T02:00:00Z", indexes: [{ code: "cn-mee", name: "中国 AQI", aqi: 32, aqiDisplay: "32" }] }] }), { headers: { "content-type": "application/json" } });
  }, () => now);
  const service = createTestMiniappService({ config, airQuality: provider,
    weather: { key: "must-not-be-used", getHourly: async () => { throw new Error("forecast must remain independent"); } } });
  await assert.rejects(service.getSpotAirQuality("contribution:private"), /formal_spot_not_found/);
  assert.equal(calls, 0);
  class TestModule {}
  Module({ controllers: [MiniappController], providers: [{ provide: MiniappService, useValue: service }] })(TestModule);
  const app = await NestFactory.create(TestModule, new FastifyAdapter(), { logger: false });
  try {
    await app.listen(0, "127.0.0.1");
    const response = await fetch(`${await app.getUrl()}/v2/spots/${encodeURIComponent(TEST_PUBLISHED_SPOT.spotId)}/air-quality`);
    assert.equal(response.status, 200);
    const result = await response.json();
    assert.equal(result.dataState, "PARTIAL");
    assert.equal(result.data.spotId, TEST_PUBLISHED_SPOT.spotId);
    assert.equal(result.data.current.value, null);
    assert.equal(result.data.current.unavailableReason, "REQUEST_FAILED");
    assert.equal(result.data.forecast.value[0].at, "2026-09-15T02:00:00.000Z");
    assert.equal(result.data.forecast.value[0].indexes[0].value, 32);
    assert.deepEqual(result.data.forecast.value[0].pollutants, []);
    assert.equal(result.sources.length, 2);
    assert.ok(result.warnings.length > 0);
    assert.equal(calls, 2);
    now += 2 * 3_600_000; currentFails = false;
    const refreshed = await fetch(`${await app.getUrl()}/v2/spots/${encodeURIComponent(TEST_PUBLISHED_SPOT.spotId)}/air-quality`);
    assert.equal(refreshed.status, 200);
    const elapsed = await refreshed.json();
    assert.equal(elapsed.dataState, "PARTIAL");
    assert.equal(elapsed.data.current.value.indexes[0].value, 0);
    assert.equal(elapsed.data.forecast.value, null);
    assert.equal(elapsed.data.forecast.unavailableReason, "EXPIRED");
    assert.equal(elapsed.data.forecast.source.state, "EXPIRED");
    assert.deepEqual(elapsed.warnings, [], "elapsed valid forecast does not invent a request failure");
    assert.equal(elapsed.sources[1].publishedAt, null, "unknown publication time stays unknown");
    assert.equal(elapsed.sources[1].validTo, "2026-09-15T03:00:00.000Z");
    assert.equal(calls, 4);
  } finally { await app.close(); }
});
