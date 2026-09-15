import assert from "node:assert/strict";
import test from "node:test";
import { setTimeout as delay } from "node:timers/promises";
import { TEST_PUBLISHED_SPOT, buildTestSpotDetail } from "@starward/miniapp-contracts/test-fixtures";
import type { ObservationContext, SpotDetail } from "@starward/miniapp-contracts";
import { AstronomyService, ASTRONOMY_CACHE_POLICY } from "./astronomy-service.ts";
import { createTestMiniappService } from "./test-fixtures/create-test-service.ts";
import { InMemoryTestRepository } from "./test-fixtures/in-memory-repository.ts";
import { DeterministicWeatherTestAdapter } from "./test-fixtures/deterministic-weather-adapter.ts";
import { createTestRuntimeConfig } from "./runtime-config.ts";
import { createTestSkyCatalogProvider } from "./sky-scene-catalog.ts";
import type { WeatherPort, WeatherEvidenceResult } from "./ports.ts";

async function setup() {
  let now = Date.now();
  let weatherCalls = 0, positions = 0;
  let revision = 1;
  let detail = { ...buildTestSpotDetail(TEST_PUBLISHED_SPOT.spotId)! };
  const repository = new InMemoryTestRepository();
  repository.getDetail = async () => structuredClone(detail);
  const fixture = new DeterministicWeatherTestAdapter();
  let weatherTransform = (value: WeatherEvidenceResult) => value;
  const weather: WeatherPort = { key: "isolated-test-weather", getHourly: async (input) => {
    weatherCalls++;
    const value = await fixture.getHourly(input);
    const validTo = new Date(now + 86_400_000).toISOString();
    value.source.validTo = validTo;
    value.sources = value.sources.map((source) => ({ ...source, validTo }));
    value.modelRuns = value.modelRuns.map((run) => ({ ...run, validTo }));
    return weatherTransform(value);
  } };
  const catalog = createTestSkyCatalogProvider();
  const position = catalog.position.bind(catalog);
  const cacheKey = catalog.cacheKey.bind(catalog);
  catalog.position = (input) => { positions++; return position(input); };
  catalog.cacheKey = () => `${cacheKey()}:${revision}`;
  const service = createTestMiniappService({ repository, weather, skyCatalog: catalog });
  const contexts: ObservationContext[] = [];
  for (let i = 0; i < 2; i++) contexts.push((await service.resolveObservationContext({
    location: { kind: "FORMAL_SPOT", spotId: TEST_PUBLISHED_SPOT.spotId },
    localDate: "2026-09-08", selectedAt: "2026-09-08T13:20:00.000Z",
  })).data);
  const astronomy = new AstronomyService(weather, repository, createTestRuntimeConfig(), catalog, () => now);
  return { service, astronomy, contexts, repository,
    counts: () => ({ weatherCalls, positions }),
    now: () => now,
    advance: (ms: number) => { now += ms; },
    changeCatalog: () => { revision++; },
    changeDetail: (change: (detail: SpotDetail) => SpotDetail) => { detail = change(detail); },
    transformWeather: (change: typeof weatherTransform) => { weatherTransform = change; },
  };
}

test("map → layer → overview → sky shares public evidence and projects stars only for sky", async () => {
  const h = await setup();
  try {
    const [context, second] = h.contexts;
    const map = await h.service.getMapScene({ contextId: context!.contextId });
    await h.service.getMapScene({ contextId: context!.contextId, layer: "CLOUD" });
    const overview = await h.service.getSpotOverview(TEST_PUBLISHED_SPOT.spotId, second!.contextId);
    assert.equal(h.counts().weatherCalls, 1);
    assert.equal(h.counts().positions, 0);
    const [sky, other] = await Promise.all([
      h.service.getSky(TEST_PUBLISHED_SPOT.spotId, context!.contextId),
      h.service.getSky(TEST_PUBLISHED_SPOT.spotId, second!.contextId),
    ]);
    assert.equal(h.counts().positions, sky.data.hourly.length);
    assert.equal(h.counts().weatherCalls, 1);
    assert.equal(sky.data.context.contextId, context!.contextId);
    assert.equal(other.data.context.contextId, second!.contextId);
    assert.equal(sky.data.context.dataRevision, other.data.context.dataRevision);
    assert.deepEqual(sky.data.decision, overview.data.decision);
    assert.equal(map.data.evaluations[TEST_PUBLISHED_SPOT.spotId]!.recommendation, sky.data.decision.recommendation);
    const before = h.counts();
    await h.service.getSky(TEST_PUBLISHED_SPOT.spotId, context!.contextId);
    assert.deepEqual(h.counts(), before);
  } finally { await h.service.onModuleDestroy(); }
});

test("concurrent cold requests coalesce; exact time, factual edits and catalog change invalidate their own inputs", async () => {
  const h = await setup();
  try {
    const context = h.contexts[0]!;
    const reports = await Promise.all(Array.from({ length: 4 }, () => h.astronomy.compute(context)));
    assert.equal(h.counts().weatherCalls, 1);
    assert.equal(h.counts().positions, reports[0]!.data.hourly.length);
    const changedTime = { ...context, selectedAtUtc: "2026-09-08T13:21:12.345Z", revision: context.revision + 1 };
    const changed = await h.astronomy.compute(changedTime);
    assert.equal(changed.data.context.at, changedTime.selectedAtUtc);
    assert.ok(changed.data.skyScene.frames.some((frame) => frame.at === changedTime.selectedAtUtc));
    assert.notEqual(changed.data.context.dataRevision, reports[0]!.data.context.dataRevision);
    const count = h.counts().positions;
    h.changeDetail((detail) => ({ ...detail, spot: { ...detail.spot, status: "TEMPORARILY_CLOSED" } }));
    const closed = await h.astronomy.compute(context);
    assert.notEqual(closed.data.context.dataRevision, reports[0]!.data.context.dataRevision);
    assert.notEqual(closed.data.decision.recommendation, "RECOMMENDED");
    assert.equal(h.counts().positions, count, "site status does not change geometry");
    h.changeCatalog();
    await h.astronomy.compute(context);
    assert.ok(h.counts().positions > count);
    h.changeDetail((detail) => ({ ...detail, spot: { ...detail.spot, status: "DATA_INSUFFICIENT" } }));
    await assert.rejects(h.astronomy.compute(context), /formal_spot_not_found/);
  } finally { await h.service.onModuleDestroy(); }
});

test("weather expiry, official-alert validity and failures retry without expiring pure astronomy", async () => {
  const h = await setup();
  try {
    const context = h.contexts[0]!;
    const first = await h.astronomy.compute(context);
    const projected = h.counts().positions;
    h.advance(ASTRONOMY_CACHE_POLICY.weatherTtlMs + 1);
    h.transformWeather((weather) => ({ ...weather, warningState: "UNAVAILABLE", state: "PARTIAL" }));
    const partial = await h.astronomy.compute(context);
    assert.equal(h.counts().weatherCalls, 2);
    assert.equal(h.counts().positions, projected);
    assert.notEqual(partial.data.context.dataRevision, first.data.context.dataRevision);
    assert.equal(partial.data.weatherEvidence.warningState, "UNAVAILABLE");
    assert.notEqual(partial.data.decision.recommendation, "RECOMMENDED");
    h.advance(ASTRONOMY_CACHE_POLICY.partialWeatherTtlMs + 1);
    h.transformWeather(() => { throw new Error("injected failure"); });
    const unavailable = await h.astronomy.compute(context);
    assert.equal(unavailable.dataState, "UNAVAILABLE");
    assert.equal(unavailable.data.skyScene.state, "AVAILABLE", "weather does not fabricate missing geometry");
    h.transformWeather((weather) => weather);
    const recovered = await h.astronomy.compute(context);
    assert.equal(h.counts().weatherCalls, 4);
    assert.notEqual(recovered.dataState, "UNAVAILABLE");
    assert.equal(h.counts().positions, projected);
  } finally { await h.service.onModuleDestroy(); }
});

test("sky carries the warning feed deadline even with no alerts or forecast coverage", async () => {
  const h = await setup();
  try {
    const validTo = new Date(Date.now() + 60_000).toISOString();
    let expected: unknown;
    h.transformWeather(weather => {
      const warningSource = { ...weather.source, id: "official-warning-feed", kind: "OFFICIAL_REFERENCE" as const,
        state: "FRESH" as const, validTo };
      expected = warningSource;
      return { ...weather, value: [], warningState: "FRESH", warningSource, alerts: [], sources: [...weather.sources, warningSource] };
    });
    const result = await h.astronomy.compute(h.contexts[0]!);
    assert.deepEqual(result.data.weatherEvidence.warningSource, expected);
    assert.deepEqual(result.data.weatherEvidence.alerts, []);
    assert.ok(result.data.skyScene.frames.length > 0);
  } finally { await h.service.onModuleDestroy(); }
});

test("aborting one shared weather caller does not cancel its peer or retain private context", async () => {
  const h = await setup();
  try {
    const controller = new AbortController();
    const original = h.astronomy.weather.getHourly.bind(h.astronomy.weather);
    let upstreamSignal: AbortSignal | undefined;
    h.astronomy.weather.getHourly = async (input) => {
      upstreamSignal = input.signal;
      await delay(30);
      return original(input);
    };
    const first = h.astronomy.compute(h.contexts[0]!, controller.signal);
    const second = h.astronomy.compute(h.contexts[1]!);
    const rejection = assert.rejects(first, /private-caller-cancelled/);
    await delay(5);
    controller.abort(new Error("private-caller-cancelled"));
    await rejection;
    const report = await second;
    assert.equal(upstreamSignal?.aborted, false);
    assert.equal(h.counts().weatherCalls, 1);
    assert.equal(report.data.context.contextId, h.contexts[1]!.contextId);
    assert.ok(!JSON.stringify(report).includes(h.contexts[0]!.contextId));
  } finally { await h.service.onModuleDestroy(); }
});

test("map weather budget returns attributable unavailable evidence and does not launch already-expired work", async () => {
  const h = await setup();
  try {
    const report = await h.astronomy.computeDecision(h.contexts[0]!, undefined, undefined, 0);
    assert.equal(h.counts().weatherCalls, 0);
    assert.equal(report.dataState, "UNAVAILABLE");
    assert.ok(report.sources.some((source) => source.id.includes("weather_deadline_exceeded")));
    assert.ok(!("skyScene" in report.data));
    assert.ok(!("targetFrames" in report.data));
  } finally { await h.service.onModuleDestroy(); }
});

test("source and active-alert validity truncate TTL, and private origins cannot alter shared public evidence", async () => {
  const h = await setup();
  try {
    h.transformWeather((weather) => ({ ...weather,
      alerts: [{ id: "fixture-alert", headline: "isolated alert", description: "fixture only",
        instruction: null, eventName: "fixture", eventCode: "fixture", severity: "severe",
        urgency: null, certainty: null, issuedAt: new Date(h.now()).toISOString(),
        effectiveAt: null, expiresAt: new Date(h.now() + 1000).toISOString(), status: "ACTIVE",
        material: true, sourceId: weather.source.id }],
    }));
    const first = await h.astronomy.compute(h.contexts[0]!);
    const privateContext: ObservationContext = { ...h.contexts[1]!, privacyClass: "SESSION_PRECISE",
      routeOrigin: { contextId: "context:private-origin" as ObservationContext["contextId"],
        displayName: "private origin label", wgs84: { system: "WGS84", latitude: 22.8, longitude: 113.5 },
        source: "USER_LOCATION" } };
    const second = await h.astronomy.compute(privateContext);
    assert.equal(first.data.context.dataRevision, second.data.context.dataRevision);
    assert.ok(!JSON.stringify(second).includes("private origin"));
    assert.equal(h.counts().weatherCalls, 1);
    h.advance(1001);
    h.transformWeather((weather) => ({ ...weather,
      sources: weather.sources.map((source) => ({ ...source, validTo: new Date(h.now() + 1000).toISOString() })),
    }));
    const cleared = await h.astronomy.compute(h.contexts[0]!);
    assert.equal(h.counts().weatherCalls, 2);
    assert.equal(cleared.data.weatherEvidence.alerts.length, 0);
    h.advance(1001);
    await h.astronomy.compute(h.contexts[0]!);
    assert.equal(h.counts().weatherCalls, 3);
    const profile = await h.astronomy.compute({ ...h.contexts[0]!, targetProfile: "PLANET" });
    assert.notEqual(profile.data.context.dataRevision, cleared.data.context.dataRevision);
  } finally { await h.service.onModuleDestroy(); }
});

test("cache reset invalidates an in-flight computation before it can repopulate child caches", async () => {
  const h = await setup();
  try {
    const original = h.astronomy.weather.getHourly.bind(h.astronomy.weather);
    h.astronomy.weather.getHourly = async (input) => { await delay(20); return original(input); };
    const work = h.astronomy.compute(h.contexts[0]!);
    const rejection = assert.rejects(work, /astronomy_computation_invalidated/);
    await delay(5);
    h.astronomy.clearCaches();
    await rejection;
    await h.astronomy.compute(h.contexts[0]!);
    assert.equal(h.counts().weatherCalls, 2);
  } finally { await h.service.onModuleDestroy(); }
});
