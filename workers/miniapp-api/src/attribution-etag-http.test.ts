import "reflect-metadata";
import assert from "node:assert/strict";
import test from "node:test";
import { Module } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { FastifyAdapter } from "@nestjs/platform-fastify";
import type { SourceSummary } from "@starward/miniapp-contracts";
import { TEST_PUBLISHED_SPOT } from "@starward/miniapp-contracts/test-fixtures";
import { MiniappController } from "./controller.ts";
import { EtagInterceptor } from "./etag.interceptor.ts";
import { MiniappService } from "./miniapp-service.ts";
import { createTestMiniappService } from "./test-fixtures/create-test-service.ts";

test("Geo-bearing recent weather is no-store and never becomes a conditional 304", async () => {
  let source: SourceSummary = {
    ...TEST_PUBLISHED_SPOT.source,
    id: "qweather:recent:attribution-regression", kind: "HISTORICAL_RECORD", provider: "和风天气",
    retrievedAt: "2026-09-20T00:00:00Z", state: "FRESH",
  };
  const service = createTestMiniappService({ recentWeather: { getRecent: async () => ({
    value: { region: { locationId: "101-test", name: "邻近地区", timezone: "Asia/Shanghai" },
      requestedDates: ["2026-09-19"], missingDates: [], asOfLocalDate: "2026-09-20", unavailableReason: null,
      days: [{ localDate: "2026-09-19", precipitationMm: 1, temperatureMinC: 10, temperatureMaxC: 20,
        sampledWindMaxKph: 9, sampledWindHours: 24, conditions: ["晴"] }] },
    state: "FRESH", source, errorCode: null,
  }) } });
  class TestModule {}
  Module({ controllers: [MiniappController], providers: [{ provide: MiniappService, useValue: service }] })(TestModule);
  const app = await NestFactory.create(TestModule, new FastifyAdapter(), { logger: false });
  app.useGlobalInterceptors(new EtagInterceptor());
  try {
    await app.listen(0, "127.0.0.1");
    const url = `${await app.getUrl()}/v2/spots/${encodeURIComponent(TEST_PUBLISHED_SPOT.spotId)}/recent-weather`;
    const first = await fetch(url);
    assert.equal(first.status, 200);
    const original = await first.json();
    assert.equal(first.headers.get("cache-control"), "no-store");
    assert.equal(first.headers.get("etag"), null);
    let etag = original.etag;
    assert.ok(etag);
    for (const attribution of [
      { name: "和风天气", url: "https://www.qweather.com", statements: [" 原始来源声明 "] },
      { name: "和风天气", url: "https://www.qweather.com", statements: [" 原始来源声明 ", "更新后的必要声明"] },
      { name: "QWeather", url: "https://www.qweather.com/", statements: ["更新后的必要声明"] },
    ]) {
      source = { ...source, attribution };
      const response = await fetch(url, { headers: { "if-none-match": etag } });
      assert.equal(response.status, 200, "new mandatory credit must not be hidden by an unchanged weather-data ETag");
      const current = await response.json();
      assert.deepEqual(current.data, original.data, "only attribution changes in this scenario");
      assert.deepEqual(current.sources[0].attribution, attribution);
      assert.equal(response.headers.get("cache-control"), "no-store");
      assert.equal(response.headers.get("etag"), null);
      assert.notEqual(current.etag, etag);
      etag = current.etag;
    }
    source = { ...source, retrievedAt: "2026-09-20T00:01:00Z" };
    const unchanged = await fetch(url, { headers: { "if-none-match": etag } });
    assert.equal(unchanged.status, 200, "even a matching old envelope must not authorize cached Geo reuse");
    assert.equal(unchanged.headers.get("cache-control"), "no-store");
    assert.equal((await unchanged.json()).sources[0].retrievedAt, source.retrievedAt);
  } finally { await app.close(); }
});
