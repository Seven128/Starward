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
import { createTestMiniappService } from "./test-fixtures/create-test-service.ts";
import { createTestRuntimeConfig } from "./runtime-config.ts";
import { QWeatherCompositeAdapter } from "./weather-provider.ts";
import { createTestSkyCatalogProvider } from "./sky-scene-catalog.ts";
import { InMemoryTestRepository } from "./test-fixtures/in-memory-repository.ts";
import { EMPTY_FILTER_STATE } from "@starward/miniapp-contracts";
import { MemoryCache } from "./cache.ts";

for (const crossing of ["favorites", "cache get", "cache set", "favorites past original budget"] as const) test(`Map rechecks forecast expiry after awaiting ${crossing}`, async context => {
  const boundary = Date.parse("2026-03-02T12:00:00Z");
  context.mock.timers.enable({ apis: ["Date"], now: boundary - 1000 });
  const config = createTestRuntimeConfig({ qweather: { apiHost: "test.qweatherapi.com", credentialId: "test", projectId: "test", forecastHours: 24,
    privateKeyPem: generateKeyPairSync("ed25519").privateKey.export({ format: "pem", type: "pkcs8" }).toString() } });
  let transportCalls = 0;
  const weather = new QWeatherCompositeAdapter(config, async request => {
    transportCalls++;
    return new Response(JSON.stringify(new URL(request.toString()).pathname.startsWith("/weatheralert/")
      ? { metadata: { zeroResult: true }, alerts: [] }
      : { hours: ["11", "12"].map(hour => ({ forecastTime: `2026-03-02T${hour}:00:00Z`, cloudCover: .9,
        temperature: { value: 20, unit: "°C" }, wind: { speed: { value: 2, unit: "m/s" } },
        precipitation: { amount: { value: 0, unit: "mm" } } })) }), { headers: { "content-type": "application/json" } });
  });
  const repository = new InMemoryTestRepository([TEST_PUBLISHED_SPOT]);
  const userId = await repository.findOrCreateWechatUser(`map-expiry:${crossing}`);
  const cache = new MemoryCache();
  let armed = crossing !== "cache get", crossed = false, cacheHit = false;
  const cross = () => { if (armed && !crossed) { crossed = true; context.mock.timers.setTime(boundary + (crossing === "favorites past original budget" ? 7000 : 1000)); } };
  const favoriteIds = repository.listFavoriteIds.bind(repository);
  repository.listFavoriteIds = async id => { const result = await favoriteIds(id); if (crossing.startsWith("favorites")) cross(); return result; };
  const get = cache.get.bind(cache), set = cache.set.bind(cache);
  cache.get = async <T>(key: string) => {
    const result = await get<T>(key);
    if (crossing === "cache get" && armed && key.startsWith("map:")) { cacheHit ||= result !== null; cross(); }
    return result;
  };
  cache.set = async <T>(key: string, value: T, ttl: number) => {
    await set(key, value, ttl);
    if (crossing === "cache set" && key.startsWith("map:")) cross();
  };
  const service = createTestMiniappService({ config, weather, repository, cache });
  try {
    const observation = (await service.resolveObservationContext({ location: { kind: "FORMAL_SPOT", spotId: TEST_PUBLISHED_SPOT.spotId },
      localDate: "2026-03-02", selectedAt: "2026-03-02T11:30:00Z" })).data;
    const input = { contextId: observation.contextId, userId, filters: { ...EMPTY_FILTER_STATE, LESS_CLOUD: ["lessCloud"] }, layer: "CLOUD" as const };
    if (crossing === "cache get") { assert.deepEqual((await service.getMapScene(input)).data.spots, []); armed = true; }
    const result = (await service.getMapScene(input)).data;
    assert.equal(crossed, true);
    if (crossing === "cache get") assert.equal(cacheHit, true, "exercise the cached-return branch, not merely a cold read");
    assert.deepEqual(result.spots.map(spot => spot.spotId), [TEST_PUBLISHED_SPOT.spotId], `${crossing}: expired NO_MATCH must not survive Map delivery`);
    assert.equal(result.evaluations[TEST_PUBLISHED_SPOT.spotId]?.cloudPercent, null);
    assert.equal(result.filterEvidence[TEST_PUBLISHED_SPOT.spotId]?.LESS_CLOUD.state, "UNKNOWN");
    assert.equal(result.context.selectedAtUtc, observation.selectedAtUtc);
    const celestialSignal = result.timeFrames.find(frame => frame.atUtc === observation.selectedAtUtc)?.spotSignals[TEST_PUBLISHED_SPOT.spotId];
    assert.ok(celestialSignal, "selected celestial frame retains the candidate signal");
    assert.notEqual(celestialSignal.moonImpact, "UNKNOWN");
    if (crossing === "favorites past original budget") assert.equal(
      result.timeFrames.find(frame => frame.atUtc === "2026-03-02T12:30:00.000Z")?.spotSignals[TEST_PUBLISHED_SPOT.spotId]?.cloudPercent,
      null, "reprojection must retain the original expired weather budget instead of acquiring valid later hours");
    assert.equal(transportCalls, 2, "reprojection keeps provider source-cache reuse");
  } finally { await service.onModuleDestroy(); }
});

test("HTTP empty less-cloud results retain the excluded weather deadline and regain unknown candidates after expiry", async context => {
  const boundary = Date.parse("2026-03-02T12:00:00Z");
  context.mock.timers.enable({ apis: ["Date"], now: boundary - 1000 });
  const config = createTestRuntimeConfig({ qweather: { apiHost: "test.qweatherapi.com", credentialId: "test", projectId: "test", forecastHours: 24,
    privateKeyPem: generateKeyPairSync("ed25519").privateKey.export({ format: "pem", type: "pkcs8" }).toString() } });
  let transportCalls = 0;
  const weather = new QWeatherCompositeAdapter(config, async request => {
    transportCalls++;
    return new Response(JSON.stringify(new URL(request.toString()).pathname.startsWith("/weatheralert/")
      ? { metadata: { zeroResult: true }, alerts: [] }
      : { hours: ["11", "12"].map(hour => ({ forecastTime: `2026-03-02T${hour}:00:00Z`, cloudCover: .9,
        temperature: { value: 20, unit: "°C" }, wind: { speed: { value: 2, unit: "m/s" } },
        precipitation: { amount: { value: 0, unit: "mm" } } })) }), { headers: { "content-type": "application/json" } });
  });
  const service = createTestMiniappService({ config, weather, repository: new InMemoryTestRepository([TEST_PUBLISHED_SPOT]) });
  class TestModule {}
  Module({ controllers: [MiniappController], providers: [{ provide: MiniappService, useValue: service }] })(TestModule);
  const app = await NestFactory.create(TestModule, new FastifyAdapter(), { logger: false });
  try {
    await app.listen(0, "127.0.0.1");
    const base = await app.getUrl();
    const resolved = await fetch(`${base}/v2/observation-contexts/resolve`, { method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ location: { kind: "FORMAL_SPOT", spotId: TEST_PUBLISHED_SPOT.spotId }, localDate: "2026-03-02", selectedAt: "2026-03-02T11:30:00Z" }) });
    assert.equal(resolved.status, 201);
    const observation = (await resolved.json()).data;
    const params = new URLSearchParams({ contextId: observation.contextId, layer: "CLOUD",
      filters: JSON.stringify({ ...EMPTY_FILTER_STATE, LESS_CLOUD: ["lessCloud"] }) });
    const get = async () => {
      const response = await fetch(`${base}/v2/map/scene?${params}`);
      assert.equal(response.status, 200);
      return (await response.json()).data;
    };
    const before = await get();
    assert.deepEqual(before.spots, [], "known 90% cloud excludes the sole candidate");
    assert.deepEqual(before.evaluations, {});
    assert.ok(before.timeFrames.every((frame: any) => Object.keys(frame.spotSignals).length === 0));
    assert.equal(before.forecastValidUntil, "2026-03-02T12:00:00.000Z", "empty result must retain the discarded candidate's forecast deadline");
    const callsBefore = transportCalls;
    context.mock.timers.setTime(boundary + 1000);
    const after = await get();
    assert.deepEqual(after.spots.map((spot: any) => spot.spotId), [TEST_PUBLISHED_SPOT.spotId]);
    assert.equal(after.filterEvidence[TEST_PUBLISHED_SPOT.spotId].LESS_CLOUD.state, "UNKNOWN");
    assert.equal(after.evaluations[TEST_PUBLISHED_SPOT.spotId].cloudPercent, null);
    assert.equal(after.context.selectedAtUtc, observation.selectedAtUtc);
    assert.ok(after.timeFrames.some((frame: any) => frame.atUtc === observation.selectedAtUtc && frame.spotSignals[TEST_PUBLISHED_SPOT.spotId].moonImpact !== "UNKNOWN"));
    assert.equal(transportCalls, callsBefore, "expiry refresh projects the retained provider source without another upstream request");
  } finally { await app.close(); }
});

test("a waiter joining shared weather after an hour boundary cannot receive the earlier waiter's expired hour", async context => {
  const boundary = Date.parse("2026-03-02T12:00:00Z");
  context.mock.timers.enable({ apis: ["Date"], now: boundary - 1000 });
  const config = createTestRuntimeConfig({ qweather: { apiHost: "test.qweatherapi.com", credentialId: "test", projectId: "test", forecastHours: 24,
    privateKeyPem: generateKeyPairSync("ed25519").privateKey.export({ format: "pem", type: "pkcs8" }).toString() } });
  let transportCalls = 0;
  const weather = new QWeatherCompositeAdapter(config, async request => {
    transportCalls++;
    const body = new URL(request.toString()).pathname.startsWith("/weatheralert/")
      ? { metadata: { zeroResult: true }, alerts: [] }
      : { hours: ["11", "12"].map(hour => ({ forecastTime: `2026-03-02T${hour}:00:00Z`, cloudCover: .1,
        temperature: { value: 20, unit: "°C" }, wind: { speed: { value: 2, unit: "m/s" } },
        precipitation: { amount: { value: 0, unit: "mm" } } })) };
    return new Response(JSON.stringify(body), { headers: { "content-type": "application/json" } });
  });
  let release!: () => void, acquired!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  const acquisition = new Promise<void>(resolve => { acquired = resolve; });
  const getHourly = weather.getHourly.bind(weather);
  let deliveries = 0;
  weather.getHourly = async input => {
    const result = await getHourly(input);
    if (++deliveries === 1) { acquired(); await gate; }
    return result;
  };
  const service = createTestMiniappService({ config, weather });
  try {
    const selectedAt = "2026-03-02T11:30:00.000Z";
    const observation = (await service.resolveObservationContext({
      location: { kind: "FORMAL_SPOT", spotId: TEST_PUBLISHED_SPOT.spotId },
      localDate: "2026-03-02", selectedAt,
    })).data;
    const first = service.getSky(TEST_PUBLISHED_SPOT.spotId, observation.contextId);
    await acquisition;
    context.mock.timers.setTime(boundary + 1000);
    const second = service.getSky(TEST_PUBLISHED_SPOT.spotId, observation.contextId);
    // Drain the second caller's repository/context reads so it joins the
    // existing in-flight weather request before the old result is released.
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(deliveries, 1, "the later caller must share the pending acquisition");
    release();
    const reports = await Promise.all([first, second]);
    for (const [index, { data: report }] of reports.entries()) {
      const selected = report.hourly.find(row => row.at === selectedAt)!;
      assert.equal(selected.cloudPercent, null, `waiter ${index + 1} cannot receive the expired hour`);
      assert.equal(selected.weatherAt, null);
      assert.ok(Number.isFinite(selected.moonAltitudeDeg));
      assert.equal(report.context.at, selectedAt);
      assert.ok(report.targetFrames.some(frame => frame.at === selectedAt));
      assert.equal(report.hourly.find(row => row.at === "2026-03-02T12:30:00.000Z")?.cloudPercent, 10);
    }
    assert.equal(deliveries, 2, "waiters share the refresh after rejecting the old acquisition");
    assert.equal(transportCalls, 2, "refresh reuses the forecast and alert source caches");
  } finally { release(); await service.onModuleDestroy(); }
});

for (const crossing of ["warm cache", "scene projection", "weather delivery"]) test(`HTTP Sky and Map retain celestial time when weather expires during ${crossing}`, async context => {
  const boundary = Date.parse("2026-03-02T12:00:00Z");
  context.mock.timers.enable({ apis: ["Date"], now: boundary - 1000 });
  const config = createTestRuntimeConfig({ qweather: { apiHost: "test.qweatherapi.com", credentialId: "test", projectId: "test", forecastHours: 24,
    privateKeyPem: generateKeyPairSync("ed25519").privateKey.export({ format: "pem", type: "pkcs8" }).toString() } });
  const hour = (forecastTime: string, cloudCover = .1) => ({ forecastTime, cloudCover, temperature: { value: 20, unit: "°C" },
    wind: { speed: { value: 2, unit: "m/s" } }, precipitation: { amount: { value: 0, unit: "mm" } } });
  let upstreamCalls = 0;
  const weather = new QWeatherCompositeAdapter(config, async request => {
    upstreamCalls++;
    return new Response(JSON.stringify(new URL(request.toString()).pathname.startsWith("/weatheralert/")
      ? { metadata: { zeroResult: true }, alerts: [] }
      : { hours: [hour("2026-03-02T11:00:00Z"), hour("2026-03-02T12:00:00Z", 0),
        hour("2026-03-02T13:00:00Z", .1), hour("2026-03-02T21:00:00+08:00", .9),
        hour("2026-02-30T15:00:00Z"), hour("2026-03-02T14:00:00Z", .2)] }), { headers: { "content-type": "application/json" } });
  });
  const getHourly = weather.getHourly.bind(weather);
  weather.getHourly = async input => {
    const result = await getHourly(input);
    if (crossing === "weather delivery" && Date.now() < boundary) context.mock.timers.setTime(boundary + 1000);
    return result;
  };
  const skyCatalog = createTestSkyCatalogProvider();
  const frame = skyCatalog.frame.bind(skyCatalog);
  let crossed = false;
  skyCatalog.frame = input => {
    if (crossing === "scene projection" && !crossed) { crossed = true; context.mock.timers.setTime(boundary + 1000); }
    return frame(input);
  };
  const service = createTestMiniappService({ config, weather, skyCatalog });
  class TestModule {}
  Module({ controllers: [MiniappController], providers: [{ provide: MiniappService, useValue: service }] })(TestModule);
  const app = await NestFactory.create(TestModule, new FastifyAdapter(), { logger: false });
  try {
    await app.listen(0, "127.0.0.1");
    const base = await app.getUrl();
    const selectedAt = "2026-03-02T11:30:00.000Z";
    const resolved = await fetch(`${base}/v2/observation-contexts/resolve`, { method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ location: { kind: "FORMAL_SPOT", spotId: TEST_PUBLISHED_SPOT.spotId }, localDate: "2026-03-02", selectedAt }) });
    assert.equal(resolved.status, 201);
    const observation = (await resolved.json()).data;
    const get = async (path: string) => { const response = await fetch(base + path); assert.equal(response.status, 200); return (await response.json()).data; };
    const skyPath = `/v2/spots/${encodeURIComponent(TEST_PUBLISHED_SPOT.spotId)}/sky?contextId=${encodeURIComponent(observation.contextId)}`;
    const mapPath = `/v2/map/scene?layer=CLOUD&contextId=${encodeURIComponent(observation.contextId)}`;
    const firstSky = await get(skyPath), firstMap = await get(mapPath);
    const at = (hour: string) => `2026-03-02T${hour}:00.000Z`;
    for (const time of ["13:30", "15:30"]) {
      assert.equal(firstSky.hourly.find((row: any) => row.at === at(time)).cloudPercent, null);
      assert.deepEqual(firstMap.timeFrames.find((row: any) => row.atUtc === at(time)).dynamicLayer.polygons, []);
    }
    if (crossing === "warm cache") {
      assert.equal(firstSky.hourly.find((row: any) => row.at === selectedAt).cloudPercent, 10);
      assert.ok(firstMap.timeFrames.find((row: any) => row.atUtc === selectedAt).dynamicLayer.polygons.length > 0);
    } else {
      assert.equal(firstSky.hourly.find((row: any) => row.at === selectedAt).cloudPercent, null, "scene construction cannot outlive its weather evidence");
    }
    const requestsBefore = upstreamCalls;
    context.mock.timers.setTime(boundary + 1000);
    const secondSky = await get(skyPath), secondMap = await get(mapPath);
    for (const report of [firstSky, secondSky]) {
      assert.equal(report.context.at, selectedAt);
      assert.ok(Number.isFinite(report.hourly.find((row: any) => row.at === selectedAt).moonAltitudeDeg));
      assert.ok(report.targetFrames.some((frame: any) => frame.at === selectedAt));
    }
    assert.equal(secondSky.hourly.find((row: any) => row.at === selectedAt).cloudPercent, null, "expired hour must not survive the report cache");
    assert.deepEqual(secondMap.timeFrames.find((row: any) => row.atUtc === selectedAt).dynamicLayer.polygons, [], "map cache must not resurrect the expired polygon");
    assert.equal(secondSky.hourly.find((row: any) => row.at === at("12:30")).cloudPercent, 0, "valid zero cloud survives");
    assert.equal(upstreamCalls, requestsBefore, "delivery filtering reuses provider source cache");
  } finally { await app.close(); }
});
