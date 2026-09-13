import assert from "node:assert/strict";
import test from "node:test";
import { createVendorUsageTransport, describeVendorRequest, type VendorUsageAttempt, type VendorUsageOutcome, type VendorUsageStore } from "./vendor-usage.ts";
import { createWeatherPort } from "./weather-provider.ts";
import { createRoutePort } from "./route-provider.ts";
import { createTestRuntimeConfig } from "./runtime-config.ts";
import { generateKeyPairSync } from "node:crypto";

function memoryStore() {
  const attempts: VendorUsageAttempt[] = [];
  const outcomes: Array<{ requestId: string; outcome: VendorUsageOutcome }> = [];
  const store: VendorUsageStore = {
    async begin(attempt) { attempts.push(attempt); },
    async finish(requestId, outcome) { outcomes.push({ requestId, outcome }); },
  };
  return { store, attempts, outcomes };
}
const hourlyUrl = "https://account.qweatherapi.com/weather/v1/hourly/23.13/113.26?hours=24";
const response = (payload: unknown) => new Response(JSON.stringify(payload), { headers: { "content-type": "application/json" } });

test("only bounded non-secret dimensions enter the ledger; model units are estimates", async () => {
  const memory = memoryStore();
  const fetch = createVendorUsageTransport(memory.store, async () => response({}));
  await fetch(new Request("https://customer-api.open-meteo.com/v1/forecast?latitude=23.13&longitude=113.26&hourly=a,b,c,d,e,f,g,h,i,j,k,l,m,n&models=best_match,icon,gfs,ifs,aifs&forecast_days=16&apikey=private-test-key"));
  assert.equal(memory.attempts[0]!.estimatedRequestUnits, 8);
  assert.equal(memory.attempts[0]!.unitBasis, "OPEN_METEO_PUBLIC_ESTIMATE_2026_09");
  assert.equal(memory.outcomes[0]!.outcome.status, "HTTP_RESPONSE");
  assert.equal(memory.outcomes[0]!.outcome.httpStatus, 200);
  assert.doesNotMatch(JSON.stringify(memory), /private-test-key|23\.13|113\.26|https:/);
  assert.throws(() => describeVendorRequest(new URL("https://unknown.example.com/private?token=secret")), /operation_unclassified/);
});

test("failed or late recording cannot send; cancelled wait after recording is NOT_SENT", async () => {
  let sent = 0;
  const transport: typeof fetch = async () => { sent++; return response({}); };
  const memory = memoryStore();
  let release!: () => void;
  const stalled = createVendorUsageTransport({ ...memory.store, begin: () => new Promise<void>(resolve => { release = resolve; }) }, transport, 10);
  await assert.rejects(stalled(hourlyUrl), /record_unavailable/);
  release();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(sent, 0);
  const controller = new AbortController();
  const cancelled = createVendorUsageTransport({ ...memory.store, async begin(attempt) { await memory.store.begin(attempt); controller.abort(new Error("cancelled")); } }, transport);
  await assert.rejects(cancelled(hourlyUrl, { signal: controller.signal }), /cancelled/);
  assert.equal(sent, 0);
  assert.equal(memory.outcomes[0]!.outcome.status, "NOT_SENT");
  const failed = createVendorUsageTransport({ ...memory.store, async begin() { throw new Error("db-private-connection"); } }, transport);
  await assert.rejects(failed(hourlyUrl), error => String(error).includes("record_unavailable") && !String(error).includes("db-private"));
  assert.equal(sent, 0);
});

test("failed completion retains the provider result; retries get distinct attempts and errors are enums", async () => {
  const memory = memoryStore();
  let calls = 0;
  const transport = createVendorUsageTransport(memory.store, async () => {
    calls++;
    if (calls === 1) throw new Error("private-upstream-url");
    return response({ value: 42 });
  });
  await assert.rejects(transport(hourlyUrl), /private-upstream/);
  assert.equal((await transport(hourlyUrl)).status, 200);
  assert.equal(memory.attempts.length, 2);
  assert.notEqual(memory.attempts[0]!.requestId, memory.attempts[1]!.requestId);
  assert.equal(memory.outcomes[0]!.outcome.status, "TRANSPORT_FAILURE");
  assert.doesNotMatch(JSON.stringify(memory.outcomes), /private-upstream/);
  const incomplete = createVendorUsageTransport({ ...memory.store, async finish() { throw new Error("db_unavailable"); } }, async () => response({ value: 42 }));
  assert.deepEqual(await (await incomplete(hourlyUrl)).json(), { value: 42 });
});

test("real weather factory meters misses below source caches across observation dates", async () => {
  const memory = memoryStore();
  const config = createTestRuntimeConfig({ weatherProvider: "QWEATHER", qweather: {
    apiHost: "test.qweatherapi.com", credentialId: "fixture", projectId: "fixture", forecastHours: 24,
    privateKeyPem: generateKeyPairSync("ed25519").privateKey.export({ format: "pem", type: "pkcs8" }).toString(),
  } });
  const now = Date.now();
  const time = new Date(now + 3_600_000).toISOString();
  const adapter = createWeatherPort(config, createVendorUsageTransport(memory.store, async request => {
    const url = new URL(request.toString());
    if (url.pathname.startsWith("/weather/v1")) return response({ hours: [{ forecastTime: time, cloudCover: 0.7,
      wind: { speed: { value: 2, unit: "m/s" } }, precipitation: { amount: { value: 0, unit: "mm" } }, temperature: { value: 20, unit: "°C" },
    }] });
    if (url.pathname.startsWith("/weatheralert")) return response({ metadata: { zeroResult: true }, alerts: [] });
    return response({ utc_offset_seconds: 0, hourly: { time: [time], cloud_cover: [10] } });
  }));
  const date = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Shanghai" }).format(now);
  const input = { point: { system: "WGS84" as const, latitude: 23.13, longitude: 113.26 }, timezone: "Asia/Shanghai", localDate: date };
  await Promise.all([adapter.getHourly(input), adapter.getHourly({ ...input, localDate: new Date(Date.parse(`${date}T00:00Z`) + 86_400_000).toISOString().slice(0, 10) })]);
  assert.deepEqual(memory.attempts.map(a => a.operation).sort(), ["CURRENT_ALERTS", "FORECAST", "FORECAST", "HOURLY"]);
  assert.ok(memory.outcomes.every(row => row.outcome.status === "HTTP_RESPONSE"));
});

test("real transit factory meters both city lookups and the route separately", async () => {
  const memory = memoryStore();
  const config = createTestRuntimeConfig({ routeProvider: "AMAP", amapWebServiceKey: "test-only-secret" });
  const adapter = createRoutePort(config, createVendorUsageTransport(memory.store, async request => {
    const url = new URL(request.toString());
    return response(url.pathname === "/v3/geocode/regeo"
      ? { status: "1", infocode: "10000", regeocode: { addressComponent: { citycode: "020" } } }
      : { status: "1", infocode: "10000", route: { transits: [{ distance: "12000", cost: { duration: "3600" }, segments: [] }] } });
  }));
  const result = await adapter.estimate({ origin: { system: "WGS84", latitude: 23.13, longitude: 113.26 },
    destination: { system: "WGS84", latitude: 23.2, longitude: 113.3 }, travelMode: "TRANSIT", departureLocalDate: "2026-09-14", departureLocalTime: "19:30" });
  assert.equal(result.value?.travelMode, "TRANSIT");
  assert.deepEqual(memory.attempts.map(a => a.operation), ["REVERSE_GEOCODE", "REVERSE_GEOCODE", "TRANSIT"]);
  assert.doesNotMatch(JSON.stringify(memory), /test-only-secret/);
});
