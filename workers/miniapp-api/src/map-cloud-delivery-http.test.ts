import "reflect-metadata";
import assert from "node:assert/strict";
import test from "node:test";
import { generateKeyPairSync } from "node:crypto";
import { Module } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { FastifyAdapter } from "@nestjs/platform-fastify";
import { MiniappController } from "./controller.ts";
import { MiniappService } from "./miniapp-service.ts";
import { createTestMiniappService } from "./test-fixtures/create-test-service.ts";
import { DeterministicWeatherTestAdapter } from "./test-fixtures/deterministic-weather-adapter.ts";
import type { WeatherPort } from "./ports.ts";
import { QWeatherCompositeAdapter } from "./weather-provider.ts";
import { createTestRuntimeConfig } from "./runtime-config.ts";
import { InMemoryTestRepository } from "./test-fixtures/in-memory-repository.ts";
import { TEST_PUBLISHED_SPOT } from "@starward/miniapp-contracts/test-fixtures";
import type { SpotId } from "@starward/miniapp-contracts";
import { waitForCaller } from "./provider-deadline.ts";

test("independent cloud HTTP completes with the selected real sample hour while a legacy Scene decision is held", { timeout: 15_000 }, async t => {
  t.mock.timers.enable({ apis: ["Date"], now: Date.parse("2026-09-15T11:00:00Z") });
  const fixture = new DeterministicWeatherTestAdapter();
  let samples = 0;
  const weather: WeatherPort = { key: "controlled-cloud-delivery", getHourly: fixture.getHourly.bind(fixture),
    async getForecastHourly(input) {
      samples++;
      const result = await fixture.getHourly(input);
      return { ...result, modelRun: null, value: result.value!.map(row => ({ ...row,
        cloudPercent: row.at === "2026-09-15T12:00:00.000Z" ? 0 : 80 })) };
    } };
  const service = createTestMiniappService({ weather });
  const context = (await service.resolveObservationContext({ location: { kind: "MAP_POINT", source: "MAP_VIEWPORT",
    displayName: "controlled public coordinate", wgs84: { system: "WGS84", latitude: 22.5, longitude: 114.5 },
    timezoneHint: "Asia/Shanghai" }, localDate: "2026-09-15", selectedAt: "2026-09-15T12:30:00Z", targetProfile: "DAILY" })).data;
  let release!: () => void, entered!: () => void, settledScene = false;
  const held = new Promise<void>(resolve => { release = resolve; });
  const decisionStarted = new Promise<void>(resolve => { entered = resolve; });
  const original = service.astronomy.computeDecision.bind(service.astronomy);
  t.mock.method(service.astronomy, "computeDecision", async (...args: Parameters<typeof original>) => {
    entered(); await held; return original(...args);
  });
  class TestModule {}
  Module({ controllers: [MiniappController], providers: [{ provide: MiniappService, useValue: service }] })(TestModule);
  const app = await NestFactory.create(TestModule, new FastifyAdapter(), { logger: false });
  let scene: Promise<Response> | undefined;
  try {
    await app.listen(0, "127.0.0.1");
    const base = await app.getUrl();
    scene = fetch(`${base}/v2/map/scene?contextId=${encodeURIComponent(context.contextId)}&layer=CLOUD`)
      .then(value => { settledScene = true; return value; });
    await decisionStarted;
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(samples, 9, "legacy public cloud samples are ready independently of the held decision");
    assert.equal(settledScene, false, "legacy Scene still joins the unrelated decision batch");
    const response = await fetch(`${base}/v2/map/cloud?contextId=${encodeURIComponent(context.contextId)}&centerLat=22.5&centerLng=114.5&zoom=12&viewportBounds=114.48,22.48,114.52,22.52`);
    assert.equal(response.status, 200);
    const result = await response.json();
    assert.equal(settledScene, false, "the independent cloud response must arrive before releasing decision");
    assert.equal(result.data.context.contextId, context.contextId);
    assert.equal(result.data.layer.validAt, context.selectedAtUtc);
    assert.equal(result.data.layer.polygons.length, 9);
    assert.ok(result.data.layer.polygons.every((row: { value: number; weatherAt: string }) => row.value === 0 && row.weatherAt === "2026-09-15T12:00:00.000Z"));
    assert.equal(result.data.cloudSnapshot.cells.length, 9);
    const later = result.data.timeFrames.find((frame: { atUtc: string }) => frame.atUtc === "2026-09-15T13:30:00.000Z");
    assert.ok(later.dynamicLayer.polygons.every((row: { value: number }) => row.value === 80));
    assert.deepEqual(later.spotSignals, {}, "cloud data cannot manufacture marker decisions");
    assert.equal(result.data.spots, undefined);
  } finally {
    release();
    if (scene) assert.equal((await scene).status, 200, "old supported Scene remains available");
    await app.close(); await service.onModuleDestroy();
  }
});

test("disconnecting one cloud HTTP consumer does not abort another consumer's coalesced QWeather source", { timeout: 15_000 }, async t => {
  t.mock.timers.enable({ apis: ["Date"], now: Date.parse("2026-09-15T11:00:00Z") });
  const privateKeyPem = generateKeyPairSync("ed25519").privateKey.export({ format: "pem", type: "pkcs8" }).toString();
  const config = createTestRuntimeConfig({ weatherProvider: "QWEATHER", qweather: {
    apiHost: "test.qweatherapi.com", credentialId: "synthetic", projectId: "synthetic", privateKeyPem, forecastHours: 24,
  } });
  const upstream: { signal: AbortSignal | null | undefined; release: () => void }[] = [];
  const weather = new QWeatherCompositeAdapter(config, async (_url, init) => new Promise<Response>(resolve => {
    upstream.push({ signal: init?.signal, release: () => resolve(new Response(JSON.stringify({ hours: [{
      forecastTime: "2026-09-15T12:00:00Z", cloudCover: 0,
      precipitation: { amount: { value: 0, unit: "mm" } }, wind: { speed: { value: 2, unit: "m/s" } },
      temperature: { value: 27, unit: "°C" },
    }] }), { headers: { "content-type": "application/json" } })) });
  }));
  const service = createTestMiniappService({ config, weather });
  const context = (await service.resolveObservationContext({ location: { kind: "MAP_POINT", source: "MAP_VIEWPORT",
    displayName: "controlled source sharing", wgs84: { system: "WGS84", latitude: 22.5, longitude: 114.5 },
    timezoneHint: "Asia/Shanghai" }, localDate: "2026-09-15", selectedAt: "2026-09-15T12:30:00Z", targetProfile: "DAILY" })).data;
  let entries = 0, bothEntered!: () => void, cancelled!: () => void;
  const started = new Promise<void>(resolve => { bothEntered = resolve; });
  const aborted = new Promise<void>(resolve => { cancelled = resolve; });
  const original = service.getMapCloud.bind(service);
  t.mock.method(service, "getMapCloud", (...args: Parameters<typeof original>) => {
    args[1]?.addEventListener("abort", cancelled, { once: true });
    if (++entries === 2) bothEntered();
    return original(...args);
  });
  class TestModule {}
  Module({ controllers: [MiniappController], providers: [{ provide: MiniappService, useValue: service }] })(TestModule);
  const app = await NestFactory.create(TestModule, new FastifyAdapter(), { logger: false });
  let remaining: Promise<Response> | undefined;
  const controller = new AbortController();
  try {
    await app.listen(0, "127.0.0.1");
    const base = await app.getUrl(), url = `${base}/v2/map/cloud?contextId=${encodeURIComponent(context.contextId)}&centerLat=22.5&centerLng=114.5&zoom=12&viewportBounds=114.48,22.48,114.52,22.52`;
    assert.equal((await fetch(`${base}/v2/map/cloud?contextId=${encodeURIComponent(context.contextId)}`)).status, 400);
    const cancelledRequest = assert.rejects(fetch(url, { signal: controller.signal }), { name: "AbortError" });
    remaining = fetch(url);
    await started;
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(upstream.length, 9, "both geographic readers share the same nine actual source requests");
    controller.abort(); await cancelledRequest; await aborted;
    assert.ok(upstream.every(request => !request.signal?.aborted), "HTTP ownership must not reach a shared provider request");
    upstream.forEach(request => request.release());
    const response = await remaining;
    assert.equal(response.status, 200);
    const result = await response.json();
    assert.equal(result.data.layer.polygons.length, 9);
    assert.ok(result.data.layer.polygons.every((row: { value: number }) => row.value === 0));
    assert.equal(result.data.cloudSnapshot.requestBudget.reusedHourlyResponses, 9);
    assert.equal(result.data.cloudSnapshot.requestBudget.hourlyRequestAttempts, 0);
  } finally {
    controller.abort(); upstream.forEach(request => request.release());
    await remaining?.catch(() => {}); await app.close(); await service.onModuleDestroy();
  }
});

test("cancelling a legacy marker Scene stops the next decision batch", { timeout: 10_000 }, async t => {
  const repository = new InMemoryTestRepository(Array.from({ length: 9 }, (_, index) => ({
    ...TEST_PUBLISHED_SPOT, spotId: `controlled-cloud-cancel-${index}` as SpotId,
  })));
  const service = createTestMiniappService({ repository });
  const context = (await service.resolveObservationContext({ location: { kind: "MAP_POINT", source: "MAP_VIEWPORT",
    displayName: "controlled batch cancellation", wgs84: { system: "WGS84", latitude: 22.5, longitude: 114.5 },
    timezoneHint: "Asia/Shanghai" }, localDate: "2026-09-15", targetProfile: "DAILY" })).data;
  let calls = 0, entered!: () => void, release!: () => void;
  const started = new Promise<void>(resolve => { entered = resolve; });
  const held = new Promise<void>(resolve => { release = resolve; });
  const original = service.astronomy.computeDecision.bind(service.astronomy);
  t.mock.method(service.astronomy, "computeDecision", async (...args: Parameters<typeof original>) => {
    if (++calls === 4) entered();
    await waitForCaller(held, args[2]); return original(...args);
  });
  const controller = new AbortController();
  try {
    const pending = service.getMapScene({ contextId: context.contextId }, undefined, controller.signal);
    const rejected = assert.rejects(pending, /obsolete_viewport/);
    await started; controller.abort(new Error("obsolete_viewport"));
    await rejected; release();
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(calls, 4, "later batches of obsolete decisions must never start");
  } finally { release(); await service.onModuleDestroy(); }
});
