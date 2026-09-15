import assert from "node:assert/strict";
import { generateKeyPairSync } from "node:crypto";
import test from "node:test";
import { createTestRuntimeConfig } from "./runtime-config.ts";
import { QWeatherRecentWeatherAdapter, parseRecentWeatherDay } from "./recent-weather-provider.ts";
import { describeVendorRequest } from "./vendor-usage.ts";

const config = createTestRuntimeConfig({ qweather: {
  apiHost: "test.qweatherapi.com", projectId: "test-project", credentialId: "test-credential", forecastHours: 24,
  privateKeyPem: generateKeyPairSync("ed25519").privateKey.export({ format: "pem", type: "pkcs8" }).toString(),
} });
const input = { point: { system: "WGS84" as const, latitude: 22.5, longitude: 114 } };
const json = (body: unknown) => new Response(JSON.stringify(body), { headers: { "content-type": "application/json" } });
const region = { code: "200", location: [{ id: "region-test", name: "区域", adm1: "省", adm2: "市", tz: "Asia/Shanghai" }], refer: { sources: ["geo source"] } };
const daily = (date: string, precipitation: unknown = "2") => ({ code: "200", weatherDaily: { date, precip: precipitation, tempMin: "-1", tempMax: "10" },
  weatherHourly: [{ time: `${date} 05:00`, text: "小雨" }], refer: { license: ["history license"] } });
const dateFrom = (url: URL) => url.searchParams.get("date")!.replace(/^(\d{4})(\d{2})(\d{2})$/u, "$1-$2-$3");

test("region-local calendar days cross midnight and month without using sky time or rolling 48 hours", async () => {
  let now = Date.parse("2026-03-01T15:59:30Z");
  const requests: URL[] = [];
  const adapter = new QWeatherRecentWeatherAdapter(config, async request => {
    const url = new URL(request.toString()); requests.push(url);
    return json(url.pathname.includes("geo/") ? region : daily(dateFrom(url)));
  }, () => now);
  const first = await adapter.getRecent(input);
  assert.deepEqual(first.value!.requestedDates, ["2026-02-27", "2026-02-28"]);
  assert.equal(first.value!.asOfLocalDate, "2026-03-01");
  assert.equal(first.state, "FRESH");
  assert.equal(first.value!.days[0]!.precipitationMm, 2);
  assert.ok(first.source.limitations.includes("history license"));
  assert.ok(first.source.limitations.includes("geo source"));
  assert.equal(requests.length, 3);
  assert.ok(requests.slice(1).every(url => url.searchParams.get("location") === "region-test" && url.searchParams.get("unit") === "m"));
  now += 61_000;
  const second = await adapter.getRecent(input);
  assert.deepEqual(second.value!.requestedDates, ["2026-02-28", "2026-03-01"]);
  assert.equal(requests.length, 4, "Geo and overlapping day reuse the same source owners");
  assert.equal(second.source.retrievedAt, first.source.retrievedAt, "cached source time cannot become the access time");
});

test("missing day, failed day and unknown region remain distinct; valid sibling day survives", async () => {
  for (const code of ["404", "403"]) {
    const adapter = new QWeatherRecentWeatherAdapter(config, async request => {
      const url = new URL(request.toString());
      return json(url.pathname.includes("geo/") ? region : dateFrom(url) === "2026-09-13" ? { code } : daily(dateFrom(url), "0"));
    }, () => Date.parse("2026-09-15T01:00:00Z"));
    const result = await adapter.getRecent(input);
    assert.equal(result.state, "PARTIAL");
    assert.deepEqual(result.value!.missingDates, ["2026-09-13"]);
    assert.equal(result.value!.days[0]!.precipitationMm, 0);
    assert.equal(result.value!.unavailableReason, code === "404" ? "NO_DATA" : "REQUEST_FAILED");
  }
  let calls = 0;
  const missingRegion = new QWeatherRecentWeatherAdapter(config, async () => { calls++; return json({ code: "404" }); });
  const unavailable = await missingRegion.getRecent(input);
  assert.equal(calls, 1);
  assert.equal(unavailable.value!.region, null);
  assert.equal(unavailable.value!.unavailableReason, "NO_DATA");
  assert.equal(unavailable.errorCode, null);
});

test("wrong dates, invalid numeric values and foreign-hour conditions cannot become facts", () => {
  assert.throws(() => parseRecentWeatherDay(daily("2026-09-12"), "2026-09-13"), /date_mismatch/);
  const result = parseRecentWeatherDay({ code: "200", weatherDaily: { date: "2026-09-13", precip: "0", tempMin: "8", tempMax: "3" },
    weatherHourly: [{ time: "2026-09-12 12:00", text: "暴雨" }, { time: "2026-09-13 99:00", text: "暴雪" }] }, "2026-09-13");
  assert.deepEqual(result, { localDate: "2026-09-13", precipitationMm: 0, temperatureMinC: null, temperatureMaxC: null, sampledWindMaxKph: null, sampledWindHours: 0, conditions: [] });
  for (const value of [null, true, " ", -1, "NaN"])
    assert.equal(parseRecentWeatherDay(daily("2026-09-13", value), "2026-09-13").precipitationMm, null);
});

test("wind max only covers returned valid hours and neither missing nor foreign samples become calm weather", () => {
  const payload = { ...daily("2026-09-13"), weatherHourly: [
    { time: "2026-09-13 00:00", windSpeed: "0" }, { time: "2026-09-13 02:00", windSpeed: "23" },
    { time: "2026-09-13 03:00", windSpeed: null }, { time: "2026-09-12 20:00", windSpeed: "90" },
  ] };
  const parsed = parseRecentWeatherDay(payload, "2026-09-13");
  assert.equal(parsed.sampledWindMaxKph, 23); assert.equal(parsed.sampledWindHours, 2);
});

test("shared requests survive one caller cancellation and rejected source timezones never query history", async () => {
  let finish!: () => void; let calls = 0;
  const gate = new Promise<void>(resolve => { finish = resolve; });
  const adapter = new QWeatherRecentWeatherAdapter(config, async request => {
    calls++; await gate; const url = new URL(request.toString());
    return json(url.pathname.includes("geo/") ? region : daily(dateFrom(url)));
  }, () => Date.parse("2026-09-15T01:00:00Z"));
  const controller = new AbortController();
  const first = adapter.getRecent({ ...input, signal: controller.signal });
  const second = adapter.getRecent(input);
  controller.abort();
  await assert.rejects(first);
  finish();
  assert.equal((await second).state, "FRESH");
  assert.equal(calls, 3);
  const invalid = new QWeatherRecentWeatherAdapter(config, async () => json({ ...region, location: [{ ...region.location[0], tz: "Invalid/Timezone" }] }));
  assert.equal((await invalid.getRecent(input)).value!.unavailableReason, "REQUEST_FAILED");
});

test("Geo delay followed by a hanging history phase finishes within two source budgets", async () => {
  const deadline = 35;
  const started = performance.now();
  const signals: AbortSignal[] = [];
  const adapter = new QWeatherRecentWeatherAdapter(config, async (request, init) => {
    if (new URL(request.toString()).pathname.includes("geo/")) {
      await new Promise(resolve => setTimeout(resolve, 20)); return json(region);
    }
    signals.push(init!.signal!);
    return new Promise<Response>(() => {});
  }, Date.now, deadline);
  const result = await adapter.getRecent(input);
  assert.equal(result.state, "UNAVAILABLE");
  assert.equal(result.value!.unavailableReason, "REQUEST_FAILED");
  assert.equal(signals.length, 2);
  assert.ok(signals.every(signal => signal.aborted));
  assert.ok(performance.now() - started < 500, "bounded phase deadlines, not the transport's unresolved promise");
});

test("actual Geo and history transport attempts are classified without storing coordinates or dates", () => {
  for (const [path, operation] of [["/geo/v2/city/lookup?location=114,22", "WEATHER_REGION"], ["/v7/historical/weather?location=region-test&date=20260913", "RECENT_HISTORY"]]) {
    const result = describeVendorRequest(new URL(`https://test.qweatherapi.com${path}`));
    assert.equal(result.operation, operation); assert.equal(result.provider, "QWEATHER");
    assert.equal(result.estimatedRequestUnits, 1); assert.deepEqual(result.dimensions, {});
  }
});

test("the default serial pipeline returns a truthful result before the Mini Program ten-second timeout", async t => {
  t.mock.timers.enable({ apis: ["setTimeout", "Date"], now: Date.parse("2026-09-15T01:00:00Z") });
  const adapter = new QWeatherRecentWeatherAdapter(config, async request => {
    await new Promise(resolve => setTimeout(resolve, 5_500));
    const url = new URL(request.toString());
    return json(url.pathname.includes("geo/") ? region : daily(dateFrom(url)));
  });
  let disposition: "pending" | "provider" | "client_timeout" = "pending";
  const result = Promise.race([
    adapter.getRecent(input).then(value => { disposition = "provider"; return value; }),
    new Promise<null>(resolve => setTimeout(() => { if (disposition === "pending") disposition = "client_timeout"; resolve(null); }, 10_000)),
  ]);
  for (let step = 0; step < 20; step++) {
    await new Promise<void>(resolve => setImmediate(resolve));
    t.mock.timers.tick(500);
  }
  await new Promise<void>(resolve => setImmediate(resolve));
  assert.equal(disposition, "provider");
  assert.equal((await result)?.state, "UNAVAILABLE");
});
