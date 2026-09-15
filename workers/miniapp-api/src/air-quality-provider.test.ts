import assert from "node:assert/strict";
import { generateKeyPairSync } from "node:crypto";
import test from "node:test";
import { QWeatherAirQualityAdapter, parseAirQualitySnapshot } from "./air-quality-provider.ts";
import { createTestRuntimeConfig } from "./runtime-config.ts";
import { describeVendorRequest } from "./vendor-usage.ts";

const config = createTestRuntimeConfig({ qweather: {
  apiHost: "test.qweatherapi.com", projectId: "test", credentialId: "test", forecastHours: 24,
  privateKeyPem: generateKeyPairSync("ed25519").privateKey.export({ format: "pem", type: "pkcs8" }).toString(),
} });
const input = { point: { system: "WGS84" as const, latitude: 22.5, longitude: 114 } };
const start = Date.parse("2026-09-15T00:00:00Z");
const index = (aqi = 21, code = "cn-mee") => ({ code, name: "中国 AQI", aqi, aqiDisplay: String(aqi), category: "优", primaryPollutant: null });
const pollutant = (value: unknown = 0) => ({ code: "pm2p5", name: "PM2.5", concentration: { value, unit: "μg/m³" } });
const hour = (forecastTime = "2026-09-15T01:00:00Z") => ({ forecastTime, indexes: [index()] });
const json = (body: unknown) => new Response(JSON.stringify(body), { headers: { "content-type": "application/json" } });

test("AQ standards, source display and concentration units survive; unknown is not zero", () => {
  const result = parseAirQualitySnapshot({ indexes: [index(0), index(15, "cn-mee-1h")], pollutants: [pollutant(0)] });
  assert.deepEqual(result.indexes.map(row => [row.code, row.value, row.display]), [["cn-mee", 0, "0"], ["cn-mee-1h", 15, "15"]]);
  assert.deepEqual(result.pollutants[0], { code: "pm2p5", name: "PM2.5", value: 0, unit: "μg/m³" });
  for (const value of [null, "", false, -1, "23", NaN]) assert.deepEqual(parseAirQualitySnapshot({ pollutants: [pollutant(value)] }).pollutants, []);
  assert.equal(parseAirQualitySnapshot({ indexes: [index(1), index(2)] }).indexes.length, 0);
});

test("current concentrations never fill missing forecast pollutants; gaps and source attribution survive", async () => {
  const adapter = new QWeatherAirQualityAdapter(config, async request => json(new URL(request.toString()).pathname.includes("/current/")
    ? { indexes: [index()], pollutants: [pollutant(8)], metadata: { attributions: ["原始来源署名"] } }
    : { hours: [hour("2026-09-15T11:00:00+08:00"), hour()] }), () => start);
  const result = await adapter.getAirQuality(input);
  assert.equal(result.current.value!.pollutants[0]!.value, 8);
  assert.deepEqual(result.forecast.value!.map(row => [row.at, row.pollutants]), [["2026-09-15T01:00:00.000Z", []], ["2026-09-15T03:00:00.000Z", []]]);
  assert.ok(result.current.source.limitations.includes("原始来源署名"));
  assert.equal(result.current.source.publishedAt, null);
  assert.equal(result.forecast.source.validTo, "2026-09-15T04:00:00.000Z");
});

test("unsupported current and failed forecast remain independently classified", async () => {
  for (const status of [404, 403]) {
    const adapter = new QWeatherAirQualityAdapter(config, async request => new URL(request.toString()).pathname.includes("/current/")
      ? new Response("", { status }) : json({ hours: [hour()] }), () => start);
    const result = await adapter.getAirQuality(input);
    assert.equal(result.current.value, null);
    assert.equal(result.current.unavailableReason, status === 404 ? "NO_DATA" : "REQUEST_FAILED");
    assert.equal(result.forecast.value!.length, 1);
    assert.equal(result.forecast.state, "FRESH");
  }
  const result = await new QWeatherAirQualityAdapter(config, async request => new URL(request.toString()).pathname.includes("/hourly/")
    ? new Response("", { status: 403 }) : json({ pollutants: [pollutant(0)] }), () => start).getAirQuality(input);
  assert.equal(result.current.value!.pollutants[0]!.value, 0);
  assert.equal(result.forecast.unavailableReason, "REQUEST_FAILED");
});

test("invalid dates and duplicate instants cannot turn into invented forecast hours", async () => {
  const result = await new QWeatherAirQualityAdapter(config, async request => json(new URL(request.toString()).pathname.includes("/current/")
    ? { indexes: [index()] } : { hours: [hour(), hour("2026-09-15T02:00:00Z"), hour("2026-09-15T10:00:00+08:00"), hour("2026-02-30T01:00:00Z"), hour("2026-09-15T24:00:00Z")] }), () => start).getAirQuality(input);
  assert.deepEqual(result.forecast.value!.map(row => row.at), ["2026-09-15T01:00:00.000Z"]);
  assert.equal(result.forecast.state, "PARTIAL");
});

test("current refresh is hourly; forecast cache never outlives its actual last hour", async () => {
  let now = start;
  const calls = { current: 0, hourly: 0 };
  const adapter = new QWeatherAirQualityAdapter(config, async request => {
    const kind = new URL(request.toString()).pathname.includes("/current/") ? "current" : "hourly";
    calls[kind]++;
    return json(kind === "current" ? { indexes: [index(calls.current)] }
      : { hours: [hour(new Date(now + 3_600_000).toISOString())] });
  }, () => now);
  const first = await adapter.getAirQuality(input);
  now += 3_600_000;
  const second = await adapter.getAirQuality(input);
  assert.deepEqual(calls, { current: 2, hourly: 1 });
  assert.equal(second.current.value!.indexes[0]!.value, 2);
  assert.equal(second.forecast.source.retrievedAt, first.forecast.source.retrievedAt);
  now += 3_600_000;
  const third = await adapter.getAirQuality(input);
  assert.deepEqual(calls, { current: 3, hourly: 2 });
  assert.equal(third.forecast.value![0]!.at, "2026-09-15T03:00:00.000Z");
});

test("a repeated expired upstream package cannot become fresh future data; valid sibling hours survive", async () => {
  let now = start, includeFuture = false;
  const adapter = new QWeatherAirQualityAdapter(config, async request => json(new URL(request.toString()).pathname.includes("/current/")
    ? { indexes: [index()] } : { hours: [hour("2026-09-14T01:00:00Z"), ...(includeFuture ? [hour()] : [])] }), () => now);
  for (let attempt = 0; attempt < 2; attempt++) {
    const result = await adapter.getAirQuality(input);
    assert.equal(result.forecast.value, null);
    assert.equal(result.forecast.state, "UNAVAILABLE");
    assert.equal(result.forecast.unavailableReason, "REQUEST_FAILED");
    assert.equal(result.current.state, "FRESH");
    now += 30_000;
  }
  includeFuture = true;
  const recovered = await adapter.getAirQuality(input);
  assert.equal(recovered.forecast.state, "PARTIAL");
  assert.deepEqual(recovered.forecast.value!.map(row => row.at), ["2026-09-15T01:00:00.000Z"]);
});

test("one canceled caller does not cancel shared AQ requests; failures can recover", async () => {
  let finish!: () => void, calls = 0;
  const gate = new Promise<void>(resolve => { finish = resolve; });
  const adapter = new QWeatherAirQualityAdapter(config, async request => {
    calls++; await gate;
    return json(new URL(request.toString()).pathname.includes("/current/") ? { indexes: [index()] } : { hours: [hour()] });
  }, () => start);
  const controller = new AbortController();
  const first = adapter.getAirQuality({ ...input, signal: controller.signal });
  const second = adapter.getAirQuality(input);
  controller.abort(); await assert.rejects(first); finish();
  assert.equal((await second).forecast.value!.length, 1); assert.equal(calls, 2);
  let now = start, failed = true;
  const recovery = new QWeatherAirQualityAdapter(config, async request => failed ? new Response("", { status: 503 })
    : json(new URL(request.toString()).pathname.includes("/current/") ? { indexes: [index()] } : { hours: [hour()] }), () => now);
  assert.equal((await recovery.getAirQuality(input)).current.unavailableReason, "REQUEST_FAILED");
  failed = false; now += 30_000;
  assert.equal((await recovery.getAirQuality(input)).current.state, "FRESH");
});

test("an hour expiring while either request is in flight cannot be delivered as fresh", async () => {
  for (const delayed of ["current", "hourly"]) {
    let now = Date.parse("2026-09-15T00:59:59Z");
    let release!: () => void;
    const gate = new Promise<void>(resolve => { release = resolve; });
    const adapter = new QWeatherAirQualityAdapter(config, async request => {
      const current = new URL(request.toString()).pathname.includes("/current/");
      if ((current ? "current" : "hourly") === delayed) { await gate; now += 2_000; }
      return json(current ? { indexes: [index()] } : { hours: [hour("2026-09-15T00:00:00Z")] });
    }, () => now);
    const pending = adapter.getAirQuality(input);
    await new Promise<void>(resolve => setImmediate(resolve)); release();
    const result = await pending;
    assert.equal(result.forecast.state, "UNAVAILABLE", `expired during ${delayed} request`);
    assert.equal(result.forecast.value, null);
    assert.equal(result.current.state, "FRESH");
  }
});

test("AQ attempts are counted by endpoint without retaining private coordinates", () => {
  for (const kind of ["current", "hourly"]) {
    const value = describeVendorRequest(new URL(`https://test.qweatherapi.com/airquality/v1/${kind}/22.50/114.00?lang=zh`));
    assert.equal(value.capability, "AIR_QUALITY");
    assert.equal(value.operation, kind === "current" ? "AIR_CURRENT" : "AIR_HOURLY");
    assert.deepEqual(value.dimensions, {});
  }
});
