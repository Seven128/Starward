import assert from "node:assert/strict";
import test from "node:test";
import { TEST_PUBLISHED_SPOT } from "@starward/miniapp-contracts/test-fixtures";
import { createTestMiniappService } from "./test-fixtures/create-test-service.ts";
import { InMemoryTestRepository } from "./test-fixtures/in-memory-repository.ts";
import { DeterministicWeatherTestAdapter } from "./test-fixtures/deterministic-weather-adapter.ts";
import { MemoryCache } from "./cache.ts";

test("old supplier Context is invalidated and can recover the same point and instant under current source selection", async () => {
  const cache = new MemoryCache();
  const service = createTestMiniappService({ cache, repository: new InMemoryTestRepository([TEST_PUBLISHED_SPOT]) });
  try {
    const request = { location: { kind: "FORMAL_SPOT" as const, spotId: TEST_PUBLISHED_SPOT.spotId }, localDate: "2026-09-15", selectedAt: "2026-09-15T13:20:00Z", targetProfile: "DAILY" as const };
    const original = (await service.resolveObservationContext(request)).data;
    await cache.set(`observation-context:${original.contextId}`, { ...original,
      weatherView: { primaryPolicy: "OPEN_METEO", cloudLayer: "HIGH", comparisonModels: ["ecmwf"], selectedModel: "ecmwf" } }, 3600);
    await assert.rejects(service.getObservationContext(original.contextId), /observation_context_expired/);
    assert.equal(await cache.get(`observation-context:${original.contextId}`), null);
    const restored = (await service.resolveObservationContext(request)).data;
    assert.notEqual(restored.contextId, original.contextId);
    assert.deepEqual(restored.location, original.location);
    assert.equal(restored.selectedAtUtc, original.selectedAtUtc); assert.equal(restored.localDate, original.localDate);
    assert.deepEqual(restored.weatherView, { primaryPolicy: "QWEATHER", cloudLayer: "TOTAL", comparisonModels: [], selectedModel: null });
    assert.deepEqual((await service.getObservationContext(restored.contextId)).data.weatherView, restored.weatherView);
  } finally { await service.onModuleDestroy(); }
});

test("official alerts bind their exact minute interval even inside one forecast hour or without a forecast", async () => {
  for (const forecastAvailable of [true, false]) {
    const fixture = new DeterministicWeatherTestAdapter();
    const service = createTestMiniappService({ repository: new InMemoryTestRepository([TEST_PUBLISHED_SPOT]), weather: {
      key: `minute-alert-${forecastAvailable}`, getHourly: async input => {
        const result = await fixture.getHourly(input);
        return { ...result, value: forecastAvailable ? result.value : null, alerts: [{
          id: "alert:minute", headline: "严重天气预警", description: "分钟有效期测试", instruction: null,
          eventName: "暴雨", eventCode: "rain", severity: "severe", urgency: null, certainty: null,
          issuedAt: "2026-09-15T12:00:00Z", effectiveAt: "2026-09-15T12:15:00Z", expiresAt: "2026-09-15T12:45:00Z",
          status: "ACTIVE" as const, material: true, sourceId: "source:test-alert",
        }] };
      },
    } });
    try {
      for (const [time, active] of [["12:00", false], ["12:15", true], ["12:30", true], ["12:45", false], ["13:00", false]] as const) {
        const at = `2026-09-15T${time}:00Z`;
        const context = (await service.resolveObservationContext({ location: { kind: "FORMAL_SPOT", spotId: TEST_PUBLISHED_SPOT.spotId }, localDate: "2026-09-15", selectedAt: at })).data;
        const report = (await service.getSky(TEST_PUBLISHED_SPOT.spotId, context.contextId)).data;
        const row = report.hourly.find(row => Date.parse(row.at) === Date.parse(at))!;
        assert.equal(row.opportunityBlockers.includes("OFFICIAL_SEVERE_WEATHER_ALERT"), active, `${forecastAvailable}/${time}`);
        assert.ok(Number.isFinite(row.moonAltitudeDeg));
      }
    } finally { await service.onModuleDestroy(); }
  }
});

test("actual forecast holes remain empty through SkyReport and Map while celestial frames retain their exact time", async () => {
  const fixture = new DeterministicWeatherTestAdapter();
  const service = createTestMiniappService({ repository: new InMemoryTestRepository([TEST_PUBLISHED_SPOT]), weather: {
    key: "partial-hour-fixture", getHourly: async input => {
      const result = await fixture.getHourly(input);
      return { ...result, state: "PARTIAL" as const, value: result.value!.filter(row => [12, 14].includes(new Date(row.at).getUTCHours())) };
    },
  } });
  try {
    const context = (await service.resolveObservationContext({ location: { kind: "FORMAL_SPOT", spotId: TEST_PUBLISHED_SPOT.spotId },
      localDate: "2026-09-15", selectedAt: "2026-09-15T13:30:00Z" })).data;
    const report = (await service.getSky(TEST_PUBLISHED_SPOT.spotId, context.contextId)).data;
    assert.equal(report.nightFacts?.startAt, context.nightStartUtc);
    assert.equal(report.nightFacts?.endAt, context.nightEndUtc);
    const dusk = Date.parse(report.nightFacts?.astronomicalDuskAt ?? "");
    const dawn = Date.parse(report.nightFacts?.astronomicalDawnAt ?? "");
    assert.ok(dusk >= Date.parse(context.nightStartUtc) && dusk < Date.parse(context.nightEndUtc));
    assert.ok(dawn > dusk && dawn <= Date.parse(context.nightEndUtc));
    for (const time of ["13:00", "13:30", "15:00"]) {
      const row = report.hourly.find(row => Date.parse(row.at) === Date.parse(`2026-09-15T${time}:00Z`))!;
      assert.ok(row, `${time}: ${report.hourly.map(row => row.at).join(",")}`); assert.equal(row.cloudPercent, null); assert.equal(row.weatherAt, null); assert.equal(row.state, "UNAVAILABLE");
      assert.ok(Number.isFinite(row.moonAltitudeDeg));
      assert.ok(report.targetFrames.some(frame => frame.at === row.at));
    }
    const actual = report.hourly.find(row => Date.parse(row.at) === Date.parse("2026-09-15T12:30:00Z"))!;
    assert.ok(actual.cloudPercent !== null); assert.equal(actual.weatherAt, "2026-09-15T12:00:00.000Z");
    const map = (await service.getMapScene({ contextId: context.contextId, layer: "CLOUD" })).data;
    const missing = map.timeFrames.find(frame => Date.parse(frame.atUtc) === Date.parse("2026-09-15T13:30:00Z"))!;
    assert.equal(missing.spotSignals[TEST_PUBLISHED_SPOT.spotId]?.cloudPercent, null);
    assert.deepEqual(missing.dynamicLayer?.polygons, []);
    assert.ok(map.timeFrames.some(frame => Date.parse(frame.atUtc) === Date.parse("2026-09-15T12:30:00Z") && frame.dynamicLayer?.polygons.length));
  } finally { await service.onModuleDestroy(); }
});
