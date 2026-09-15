import assert from "node:assert/strict";
import { generateKeyPairSync } from "node:crypto";
import test from "node:test";
import { createTestRuntimeConfig } from "./runtime-config.ts";
import { QWeatherAlertAdapter, QWeatherForecastAdapter } from "./weather-provider.ts";

const privateKeyPem = generateKeyPairSync("ed25519").privateKey.export({ format: "pem", type: "pkcs8" }).toString();
const config = () => createTestRuntimeConfig({ weatherProvider: "QWEATHER", qweather: {
  apiHost: "test.qweatherapi.com", credentialId: "test", projectId: "test", privateKeyPem, forecastHours: 24,
} });
const input = { point: { system: "WGS84" as const, latitude: 23.13, longitude: 113.26 }, localDate: "2026-09-14", timezone: "Asia/Shanghai" };
const tomorrow = { ...input, localDate: "2026-09-15" };
const start = Date.parse("2026-09-14T00:00:00Z");
const json = (payload: unknown, status = 200) => new Response(JSON.stringify(payload), { status, headers: { "content-type": "application/json" } });
function forecast(cloud: number) {
  return { hours: [{ forecastTime: "2026-09-14T13:00:00Z", cloudCover: cloud,
    precipitation: { amount: { value: 0, unit: "mm" } }, wind: { speed: { value: 2, unit: "m/s" } }, temperature: { value: 27, unit: "°C" },
  }] };
}
const warning = (expires: number) => ({ metadata: { zeroResult: false }, alerts: [{
  id: "storm", messageType: { code: "alert" }, severity: "severe", issuedTime: new Date(start).toISOString(),
  expireTime: new Date(expires).toISOString(), eventType: { name: "雷暴", code: "thunderstorm" },
}] });

test("different observation dates share source requests, preserve retrieval time and refresh forecasts independently", async () => {
  let now = start, forecasts = 0, alerts = 0;
  const primary = new QWeatherForecastAdapter(config(), async () => json(forecast(++forecasts / 10)), 1000, () => now);
  const official = new QWeatherAlertAdapter(config(), async () => {
    alerts++;
    return json({ metadata: { zeroResult: true }, alerts: [] });
  }, 1000, () => now);
  const [first, second] = await Promise.all([primary.getHourly(input), primary.getHourly(tomorrow)]);
  await Promise.all([official.getAlerts(input), official.getAlerts(tomorrow)]);
  assert.equal(forecasts, 1);
  assert.equal(alerts, 1);
  assert.equal(first.value?.[0]?.cloudPercent, 10);
  assert.equal(second.source.retrievedAt, new Date(start).toISOString());
  now += 5 * 60_000;
  await official.getAlerts(tomorrow);
  const cached = await primary.getHourly(tomorrow);
  assert.equal(alerts, 2);
  assert.equal(forecasts, 1);
  assert.equal(cached.source.retrievedAt, first.source.retrievedAt);
  now = start + 30 * 60_000;
  assert.equal((await primary.getHourly(input)).value?.[0]?.cloudPercent, 20);
  assert.equal(forecasts, 2);
});

test("an expiring alert forces a fresh feed; failure cannot reuse its fresh state and retry is bounded", async () => {
  let now = start, calls = 0;
  const adapter = new QWeatherAlertAdapter(config(), async () => {
    calls++;
    return calls === 1 ? json(warning(start + 60_000)) : calls === 2 ? json({}, 503)
      : json({ metadata: { zeroResult: true }, alerts: [] });
  }, 1000, () => now);
  const active = await adapter.getAlerts(input);
  assert.equal(active.value?.[0]?.status, "ACTIVE");
  assert.equal(active.source.validTo, new Date(start + 60_000).toISOString());
  now += 60_000;
  const failed = await adapter.getAlerts(input);
  assert.equal(failed.state, "UNAVAILABLE");
  assert.equal(failed.value, null);
  assert.equal((await adapter.getAlerts(tomorrow)).state, "UNAVAILABLE");
  assert.equal(calls, 2);
  now += 5_000;
  const recovered = await adapter.getAlerts(input);
  assert.equal(calls, 3);
  assert.equal(recovered.state, "FRESH");
  assert.deepEqual(recovered.value, []);
  assert.equal(recovered.source.validTo, new Date(now + 5 * 60_000).toISOString());
});

test("one cancelled date waiter does not cancel another source waiter", async () => {
  let finish!: (response: Response) => void;
  let calls = 0;
  let upstreamSignal: AbortSignal | undefined;
  const adapter = new QWeatherForecastAdapter(config(), async (_url, init) => {
    calls++;
    upstreamSignal = init?.signal ?? undefined;
    return new Promise<Response>(resolve => { finish = resolve; });
  }, 1000, () => start);
  const controller = new AbortController();
  const cancelled = adapter.getHourly({ ...input, signal: controller.signal });
  const rejected = assert.rejects(cancelled, /date_changed/);
  const remaining = adapter.getHourly(tomorrow);
  await new Promise(resolve => setImmediate(resolve));
  controller.abort(new Error("date_changed"));
  await rejected;
  assert.equal(upstreamSignal?.aborted, false);
  finish(json(forecast(0.7)));
  assert.equal((await remaining).value?.[0]?.cloudPercent, 70);
  assert.equal(calls, 1);
});

test("different actual request points and independently configured adapters remain isolated", async () => {
  let calls = 0;
  const transport: typeof fetch = async () => { calls++; return json(forecast(0.2)); };
  const first = new QWeatherForecastAdapter(config(), transport, 1000, () => start);
  const second = new QWeatherForecastAdapter(config(), transport, 1000, () => start);
  await first.getHourly(input);
  await first.getHourly({ ...input, point: { ...input.point, longitude: 114 } });
  await second.getHourly(input);
  assert.equal(calls, 3);
});

test("a single current forecast hour remains cacheable until its coverage end", async () => {
  let calls = 0;
  const now = Date.parse("2026-09-14T13:30:00Z");
  const selected = config();
  selected.qweather.forecastHours = 1;
  const adapter = new QWeatherForecastAdapter(selected, async () => { calls++; return json(forecast(0.7)); }, 1000, () => now);
  const first = await adapter.getHourly(input);
  const second = await adapter.getHourly(input);
  assert.equal(first.source.validTo, "2026-09-14T14:00:00.000Z");
  assert.equal(second.value?.[0]?.cloudPercent, 70);
  assert.equal(calls, 1);
});

test("only explicit zero-result is a successful empty warning feed", async () => {
  for (const payload of [{ metadata: {} }, { metadata: { zeroResult: false }, alerts: [] },
    { metadata: { zeroResult: true }, alerts: [{}] }, { metadata: { zeroResult: false }, alerts: [{}] }]) {
    const adapter = new QWeatherAlertAdapter(config(), async () => json(payload), 1000, () => start);
    const result = await adapter.getAlerts(input);
    assert.equal(result.state, "UNAVAILABLE", JSON.stringify(payload));
    assert.equal(result.value, null);
  }
  const adapter = new QWeatherAlertAdapter(config(), async () => json({ metadata: { zeroResult: true } }), 1000, () => start);
  assert.deepEqual((await adapter.getAlerts(input)).value, []);
});

test("unrecognized alert severity cannot certify a complete non-material warning feed", async () => {
  const payload = warning(start + 60_000);
  payload.alerts[0]!.severity = "unsupported-value";
  const adapter = new QWeatherAlertAdapter(config(), async () => json(payload), 1000, () => start);
  const result = await adapter.getAlerts(input);
  assert.equal(result.state, "PARTIAL");
  assert.equal(result.value?.[0]?.severity, "unknown");
  assert.equal(result.value?.length, 1);
});
