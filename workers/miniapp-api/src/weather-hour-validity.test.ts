import assert from "node:assert/strict";
import { generateKeyPairSync } from "node:crypto";
import test from "node:test";
import { createTestRuntimeConfig } from "./runtime-config.ts";
import { QWeatherCompositeAdapter, QWeatherForecastAdapter } from "./weather-provider.ts";

const config = createTestRuntimeConfig({ qweather: { apiHost: "test.qweatherapi.com", credentialId: "test", projectId: "test", forecastHours: 24,
  privateKeyPem: generateKeyPairSync("ed25519").privateKey.export({ format: "pem", type: "pkcs8" }).toString() } });
const input = { point: { system: "WGS84" as const, latitude: 22.5, longitude: 114 }, localDate: "2026-03-02", timezone: "Asia/Shanghai" };
const json = (payload: unknown) => new Response(JSON.stringify(payload), { headers: { "content-type": "application/json" } });
const hour = (forecastTime: string, cloudCover = 0.1) => ({ forecastTime, cloudCover, temperature: { value: 20, unit: "°C" },
  wind: { speed: { value: 2, unit: "m/s" } }, precipitation: { amount: { value: 0, unit: "mm" } } });
const noon = Date.parse("2026-03-02T12:00:00Z");

test("invalid calendar instants do not roll into a real day or assume a timezone", async () => {
  for (const invalid of ["2026-02-30T13:00:00Z", "2026-03-02T24:00:00Z", "2026-03-02T13:00:00", "2026-03-02T13:60:00Z"]) {
    const adapter = new QWeatherForecastAdapter(config, async () => json({ hours: [hour(invalid), hour("2026-03-02T14:00:00Z")] }), 1000, () => noon);
    const result = await adapter.getHourly(input);
    assert.deepEqual(result.value?.map(row => row.at), ["2026-03-02T14:00:00.000Z"], invalid);
    assert.equal(result.state, "PARTIAL");
  }
});

test("conflicting timestamps including offset aliases cannot choose a first or last cloud value", async () => {
  const adapter = new QWeatherForecastAdapter(config, async () => json({ hours: [hour("2026-03-02T13:00:00Z", .1),
    hour("2026-03-02T21:00:00+08:00", .9), hour("2026-03-02T14:00:00Z", 0)] }), 1000, () => noon);
  const result = await adapter.getHourly(input);
  assert.deepEqual(result.value?.map(row => [row.at, row.cloudPercent]), [["2026-03-02T14:00:00.000Z", 0]]);
  assert.equal(result.state, "PARTIAL");
});

test("a feed with only invalid or duplicate identities has no weather facts", async () => {
  for (const hours of [[hour("2026-02-30T13:00:00Z")], [hour("2026-03-02T13:00:00Z"), hour("2026-03-02T13:00:00Z", .9)]]) {
    const result = await new QWeatherForecastAdapter(config, async () => json({ hours }), 1000, () => noon).getHourly(input);
    assert.equal(result.value, null); assert.equal(result.state, "UNAVAILABLE");
  }
});

test("expired intervals are absent while a current interval retains its real end-exclusive coverage", async () => {
  const adapter = new QWeatherForecastAdapter(config, async () => json({ hours: [hour("2026-03-02T10:00:00Z"), hour("2026-03-02T11:00:00Z"), hour("2026-03-02T12:00:00Z")] }), 1000, () => noon);
  const result = await adapter.getHourly(input);
  assert.deepEqual(result.value?.map(row => row.at), ["2026-03-02T12:00:00.000Z"]);
  assert.equal(result.source.validFrom, "2026-03-02T12:00:00.000Z");
  assert.equal(result.modelRun?.validFrom, result.source.validFrom);
  assert.equal(result.state, "PARTIAL");
  const expired = await new QWeatherForecastAdapter(config, async () => json({ hours: [hour("2026-03-01T12:00:00Z")] }), 1000, () => noon).getHourly(input);
  assert.equal(expired.value, null); assert.equal(expired.state, "EXPIRED");
});

test("warm cache drops an elapsed hour without renewing the source or changing previously delivered rows", async () => {
  let now = noon - 1000, calls = 0;
  const adapter = new QWeatherForecastAdapter(config, async () => { calls++; return json({ hours: [hour("2026-03-02T11:00:00Z"), hour("2026-03-02T12:00:00Z")] }); }, 1000, () => now);
  const first = await adapter.getHourly(input); now = noon;
  const next = await adapter.getHourly(input);
  assert.equal(calls, 1); assert.equal(first.value?.length, 2);
  assert.deepEqual(next.value?.map(row => row.at), ["2026-03-02T12:00:00.000Z"]);
  assert.equal(next.source.retrievedAt, first.source.retrievedAt);
  assert.equal(next.state, "PARTIAL");
});

test("waiting for an independent warning response cannot deliver an hour that ended meanwhile", async context => {
  context.mock.timers.enable({ apis: ["Date"], now: noon - 1000 });
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  const adapter = new QWeatherCompositeAdapter(config, async request => {
    if (new URL(request.toString()).pathname.startsWith("/weatheralert/")) { await gate; return json({ metadata: { zeroResult: true }, alerts: [] }); }
    return json({ hours: [hour("2026-03-02T11:00:00Z")] });
  });
  const pending = adapter.getHourly({ ...input, windowUtc: { start: "2026-03-02T11:00:00Z", end: "2026-03-02T12:00:00Z" } });
  await new Promise(resolve => setImmediate(resolve));
  context.mock.timers.setTime(noon); release();
  const result = await pending;
  assert.equal(result.value, null); assert.equal(result.timelineRole, "UNAVAILABLE");
  assert.equal(result.warningState, "FRESH", "independent valid warning survives");
});
