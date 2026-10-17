import assert from "node:assert/strict";
import test from "node:test";
import { gcj02ToWgs84 } from "@starward/coordinate-system";
import { qweatherRequestPoint } from "./qweather-client.ts";
import { createTestMiniappService } from "./test-fixtures/create-test-service.ts";
import { InMemoryTestRepository } from "./test-fixtures/in-memory-repository.ts";
import { DeterministicWeatherTestAdapter } from "./test-fixtures/deterministic-weather-adapter.ts";
import type { WeatherPort } from "./ports.ts";
import { readMapCloudForecast, mapCloudQueryPoints, mapCloudSnapshot, projectMapCloudLayer } from "./map-cloud-forecast.ts";

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

test("viewport sampling keeps nine actual query footprints and a complete partial snapshot without extrapolating gaps", async t => {
  t.mock.timers.enable({ apis: ["Date"], now: Date.parse("2026-09-15T11:00:00Z") });
  const { context, service } = await scenario(false), fixture = new DeterministicWeatherTestAdapter();
  const bounds = { west: 119.85, south: 29.97, east: 120.45, north: 30.57 };
  let reads = 0;
  const weather: WeatherPort = { key: "controlled-pure-forecast", getHourly: async () => { throw new Error("alert_composite_must_not_run"); },
    getForecastHourly: async input => {
      const index = reads++;
      if (index === 2) throw new Error("controlled_read_failure");
      const result = await fixture.getHourly(input);
      return { ...result, modelRun: null,
        source: { ...result.source, retrievedAt: new Date(Date.now() - (index === 1 ? 31 * 60_000 : 0)).toISOString() },
        value: result.value!.map(row => ({ ...row, cloudPercent: index === 0 ? null : 0 })),
        acquisition: { providerTag: `independent-tag-${index}`, sourceRequestId: `controlled-request-${index}`,
          requestedGcj02: mapCloudQueryPoints(viewport.center, bounds)[index]!, forecastHours: 24, cache: "MISS", upstreamRequestAttempts: 1 },
      };
    } };
  try {
    const samples = await readMapCloudForecast(weather, viewport.center, context, Date.now() + 10000, bounds);
    const snapshot = mapCloudSnapshot(samples, bounds)!, layer = projectMapCloudLayer(samples, selectedAt);
    assert.equal(reads, 9); assert.equal(snapshot.cells.length, 9); assert.equal(layer.polygons.length, 6);
    assert.deepEqual(snapshot.cells.slice(0, 3).map(cell => cell.quality), ["MISSING", "STALE", "READ_FAILED"]);
    assert.equal(snapshot.requestBudget.alertRequests, 0);
    assert.equal(snapshot.requestBudget.hourlyRequestAttempts, null, "a thrown reader cannot be counted as a known zero upstream attempt");
    assert.equal(new Set(snapshot.cells.flatMap(cell => cell.providerTag ? [cell.providerTag] : [])).size, 8);
    assert.ok(layer.polygons.every(polygon => polygon.value === 0));
    assert.ok(layer.polygons.every(polygon => Math.abs(polygon.points[1]!.longitude - polygon.points[0]!.longitude - 0.01) < 1e-9));
    assert.ok(Math.max(...samples.map(s => s.center.longitude)) - Math.min(...samples.map(s => s.center.longitude)) > 0.2,
      "queries follow the view, while their displayed footprints remain one query cell wide");
    assert.equal(mapCloudQueryPoints(viewport.center, { west: 120.149, east: 120.151, south: 30.269, north: 30.271 }).length, 1);
  } finally { await service.onModuleDestroy(); }
});

test("cloud footprints follow distinct actual query cells across the coordinate coverage boundary", async t => {
  t.mock.timers.enable({ apis: ["Date"], now: Date.parse("2026-09-15T11:00:00Z") });
  const { context, service } = await scenario(false), fixture = new DeterministicWeatherTestAdapter();
  const center = { latitude: 22.12, longitude: 113.61 };
  const bounds = { west: 113.59, east: 113.63, south: 22.10, north: 22.14 };
  const actualRequests = new Set<string>();
  const weather: WeatherPort = { key: "controlled-coordinate-boundary", getHourly: async () => { throw new Error("pure_forecast_only"); },
    getForecastHourly: async input => {
      const point = qweatherRequestPoint(input), requestedGcj02 = {
        latitude: Number(point.latitude.toFixed(2)), longitude: Number(point.longitude.toFixed(2)),
      };
      const key = `${requestedGcj02.latitude.toFixed(2)}:${requestedGcj02.longitude.toFixed(2)}`;
      const reused = actualRequests.has(key); actualRequests.add(key);
      const result = await fixture.getHourly(input);
      return { ...result, modelRun: null, source: { ...result.source, id: `controlled-actual-query:${key}` },
        value: result.value!.map(row => ({ ...row, cloudPercent: 0 })),
        acquisition: { providerTag: null, sourceRequestId: `controlled-request:${key}`, requestedGcj02,
          forecastHours: 24, cache: reused ? "JOIN" : "MISS", upstreamRequestAttempts: reused ? 0 : 1 },
      };
    } };
  try {
    const samples = await readMapCloudForecast(weather, center, context, Date.now() + 10000, bounds);
    const layer = projectMapCloudLayer(samples, selectedAt), snapshot = mapCloudSnapshot(samples, bounds)!;
    assert.equal(samples.length, 9); assert.equal(actualRequests.size, 8, "the actual adapter conversion aliases two planned samples");
    assert.equal(snapshot.requestBudget.hourlyRequestAttempts, 8);
    assert.equal(snapshot.requestBudget.reusedHourlyResponses, 1, "keep all acquisition attempts when footprints are deduplicated");
    const drawn = layer.polygons.map(polygon => {
      const latitude = (polygon.points[0]!.latitude + polygon.points[2]!.latitude) / 2;
      const longitude = (polygon.points[0]!.longitude + polygon.points[2]!.longitude) / 2;
      const key = `${latitude.toFixed(2)}:${longitude.toFixed(2)}`;
      assert.ok(actualRequests.has(key), "an unqueried planned cell must stay unpainted");
      assert.equal(polygon.id, `cloud:query:${key}`, "render identity follows the actual footprint");
      return key;
    });
    assert.deepEqual(new Set(drawn), actualRequests);
    assert.equal(drawn.length, actualRequests.size, "one provider query cell is painted only once");
    assert.ok(layer.polygons.every(polygon => polygon.value === 0), "valid zero remains visible");
    assert.equal(layer.state, "PARTIAL", "a planned query cell that moved does not certify all nine planned footprints");
  } finally { await service.onModuleDestroy(); }
});
