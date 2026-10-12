import assert from "node:assert/strict";
import test from "node:test";
import { gcj02ToWgs84 } from "@starward/coordinate-system";
import { qweatherRequestPoint } from "./qweather-client.ts";
import { createTestMiniappService } from "./test-fixtures/create-test-service.ts";
import { InMemoryTestRepository } from "./test-fixtures/in-memory-repository.ts";
import { DeterministicWeatherTestAdapter } from "./test-fixtures/deterministic-weather-adapter.ts";
import type { WeatherPort } from "./ports.ts";

const viewport = { center: { latitude: 30.27, longitude: 120.15 }, zoom: 12 };
const selectedAt = "2026-09-15T12:30:00Z";
async function scenario(missing: boolean) {
  const fixture = new DeterministicWeatherTestAdapter(), reads: { latitude: number; longitude: number }[] = [];
  const weather: WeatherPort = { key: "isolated-map-cloud-regression", async getHourly(input) {
    const point = qweatherRequestPoint(input), exact = { latitude: Number(point.latitude.toFixed(2)), longitude: Number(point.longitude.toFixed(2)) };
    reads.push(exact);
    const result = await fixture.getHourly(input);
    return { ...result, value: result.value!.map(row => ({ ...row,
      cloudPercent: missing && exact.latitude === 30.28 && exact.longitude === 120.16 ? null
        : row.at === "2026-09-15T12:00:00.000Z" ? 0 : 80,
    })) };
  } };
  const service = createTestMiniappService({ weather, repository: new InMemoryTestRepository([]) });
  const wgs = gcj02ToWgs84({ lat: 30.27, lon: 120.15, system: "GCJ-02" });
  const context = (await service.resolveObservationContext({
    location: { kind: "MAP_POINT", displayName: "杭州公开坐标验证", source: "MAP_VIEWPORT",
      wgs84: { system: "WGS84", latitude: wgs.lat, longitude: wgs.lon }, timezoneHint: "Asia/Shanghai" },
    localDate: "2026-09-15", selectedAt, targetProfile: "DAILY",
  })).data;
  return { service, reads, context };
}

test("ordinary Map cloud data is geographic and remains available without any formal place or search match", async t => {
  t.mock.timers.enable({ apis: ["Date"], now: Date.parse("2026-09-15T11:00:00Z") });
  const { service, reads, context } = await scenario(false);
  try {
    const envelope = await service.getMapScene({ contextId: context.contextId, viewport, layer: "CLOUD", query: "没有匹配的正式点" });
    const scene = envelope.data;
    assert.equal(scene.spots.length, 0);
    assert.equal(reads.length, 9);
    assert.deepEqual(new Set(reads.map(point => `${point.latitude}/${point.longitude}`)),
      new Set([30.26, 30.27, 30.28].flatMap(lat => [120.14, 120.15, 120.16].map(lon => `${lat}/${lon}`))));
    assert.equal(scene.layer.polygons.length, 9);
    assert.ok(scene.layer.polygons.every(polygon => polygon.value === 0), "real zero is a visible forecast cell");
    assert.equal(scene.layer.source?.kind, "TEST_FIXTURE", "controlled tests do not become real-provider evidence");
    assert.ok(envelope.sources.some(source => source.id === scene.layer.source?.id));
    const cell = scene.layer.polygons.find(polygon => polygon.id === "cloud:query:30.27:120.15")!;
    assert.deepEqual(cell.points.map(point => [Number(point.latitude.toFixed(3)), Number(point.longitude.toFixed(3))]),
      [[30.265,120.145],[30.265,120.155],[30.275,120.155],[30.275,120.145]], "a sample is not stretched across the viewport");
    assert.ok(scene.forecastValidUntil);
  } finally { await service.onModuleDestroy(); }
});

test("Map cloud time frames use the sampled hour and retain valid cells when one cloud value is missing", async t => {
  t.mock.timers.enable({ apis: ["Date"], now: Date.parse("2026-09-15T11:00:00Z") });
  const { service, context } = await scenario(true);
  try {
    const scene = (await service.getMapScene({ contextId: context.contextId, viewport, layer: "CLOUD" })).data;
    assert.equal(scene.layer.state, "PARTIAL");
    assert.equal(scene.layer.polygons.length, 8);
    assert.ok(!scene.layer.polygons.some(polygon => polygon.id === "cloud:query:30.28:120.16"));
    const later = scene.timeFrames.find(frame => frame.atUtc === "2026-09-15T13:30:00.000Z")!;
    assert.equal(later.dynamicLayer?.polygons.length, 8);
    assert.ok(later.dynamicLayer?.polygons.every(polygon => polygon.value === 80));
    assert.ok(later.dynamicLayer?.polygons.every(polygon => polygon.weatherAt === "2026-09-15T13:00:00.000Z"));
    assert.deepEqual(later.spotSignals, {}, "weather cells do not manufacture formal places");
  } finally { await service.onModuleDestroy(); }
});
