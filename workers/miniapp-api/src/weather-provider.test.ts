import assert from "node:assert/strict";
import { generateKeyPairSync } from "node:crypto";
import test, { mock } from "node:test";
import { createTestRuntimeConfig } from "./runtime-config.ts";
import {
  QWeatherCompositeAdapter,
  QWeatherForecastAdapter,
  QWeatherAlertAdapter,
} from "./weather-provider.ts";

// These payloads describe this exact forecast issuance, independent of the day
// the suite runs. Expiry behavior has explicit advancing-clock regressions.
test.beforeEach(() => mock.timers.enable({ apis: ["Date"], now: Date.parse("2026-08-23T12:00:00Z") }));
test.afterEach(() => mock.timers.reset());

const privateKeyPem = generateKeyPairSync("ed25519")
  .privateKey.export({ format: "pem", type: "pkcs8" })
  .toString();

function response(value: unknown, status = 200): Response {
  return new Response(JSON.stringify(value), {
    status,
    headers: { "content-type": "application/json" },
  });
}

const weatherInput = {
  point: {
    system: "WGS84" as const,
    latitude: 22.548,
    longitude: 114.052,
  },
  localDate: "2026-08-23",
  timezone: "Asia/Shanghai",
};

function deadlineConfig() {
  return createTestRuntimeConfig({ weatherProvider: "QWEATHER", qweather: {
    apiHost: "test.qweatherapi.com", credentialId: "test-credential",
    projectId: "test-project", privateKeyPem, forecastHours: 24,
  } });
}

test("official warnings reject impossible and timezone-less source times without rewriting valid siblings", async () => {
  const valid = { id: "valid", issuedTime: "2026-08-23T19:00:00+08:00", effectiveTime: "2026-08-23T19:30:00+08:00",
    expireTime: "2026-08-23T21:00:00+08:00", messageType: { code: "alert" }, severity: "severe" };
  for (const field of ["issuedTime", "effectiveTime", "onsetTime", "expireTime"]) {
    for (const invalid of ["2026-02-30T00:00:00Z", "2026-08-23T12:00:00"]) {
      const bad = { ...valid, id: "invalid", [field]: invalid };
      for (const siblings of [false, true]) {
        const adapter = new QWeatherAlertAdapter(deadlineConfig(), async () => response({ metadata: { zeroResult: false }, alerts: siblings ? [bad, valid] : [bad] }));
        const result = await adapter.getAlerts(weatherInput);
        assert.equal(result.state, siblings ? "PARTIAL" : "UNAVAILABLE", `${field}: ${invalid}`);
        assert.equal(result.source.publishedAt, null, "unknown feed publication cannot become retrieval time");
        if (siblings) {
          assert.deepEqual(result.value?.map(row => [row.id, row.issuedAt, row.effectiveAt, row.expiresAt]),
            [["valid", "2026-08-23T11:00:00.000Z", "2026-08-23T11:30:00.000Z", "2026-08-23T13:00:00.000Z"]]);
        } else assert.equal(result.value, null, "invalid alert is not a successful empty feed");
      }
    }
  }
});

function deadlinePayload(lane: string) {
  if (lane === "alerts") return { metadata: { tag: "clear-alert-test", zeroResult: true }, alerts: [] };
  return { metadata: { tag: "forecast-test" }, hours: [{
    forecastTime: "2026-08-23T13:00:00Z", condition: { text: "多云", code: "101" },
    temperature: { value: 27, unit: "°C" }, humidity: 0.72,
    wind: { direction: { degree: 90 }, speed: { value: 2, unit: "m/s" } },
    windGust: { value: 3, unit: "m/s" },
    precipitation: { amount: { value: 0, unit: "mm" }, probability: 0.05 },
    visibility: { value: 18_000, unit: "m" }, dewPoint: { value: 21, unit: "°C" }, cloudCover: 0.7,
  }] };
}

test("each hanging weather lane reaches its deadline without discarding other lanes", async () => {
  for (const hanging of ["primary", "alerts", "all"]) {
    const signals: AbortSignal[] = [];
    const adapter = new QWeatherCompositeAdapter(deadlineConfig(), async (input, init) => {
      const url = new URL(input.toString());
      const lane = url.pathname.startsWith("/weather/v1/") ? "primary"
        : url.pathname.startsWith("/weatheralert/") ? "alerts" : "evidence";
      if (lane === hanging || hanging === "all") {
        signals.push(init!.signal!);
        return new Promise<Response>(() => {});
      }
      return response(deadlinePayload(lane));
    }, 20);
    const result = await adapter.getHourly(weatherInput);
    assert.ok(signals.every((signal) => signal.aborted));
    assert.ok(result.sources.some((source) => source.id.includes("weather_deadline_exceeded")));
    if (hanging === "all" || hanging === "primary") {
      assert.equal(result.state, "UNAVAILABLE");
      assert.equal(result.value, null);
    } else {
      assert.ok(result.value?.length);
      assert.equal(result.timelineRole, "PRIMARY");
      assert.equal(result.warningState, hanging === "alerts" ? "UNAVAILABLE" : "FRESH");
      assert.equal(result.value![0]!.cloudPercent, 70);
    }
  }
});

test("QWeather composition keeps the Weather API v1 timeline primary, exposes total cloud only and applies official alerts", async () => {
  const requested: URL[] = [];
  const config = createTestRuntimeConfig({
    weatherProvider: "QWEATHER",
    qweather: {
      apiHost: "test.qweatherapi.com",
      credentialId: "test-credential",
      projectId: "test-project",
      privateKeyPem,
      forecastHours: 24,
    },
  });
  const adapter = new QWeatherCompositeAdapter(config, async (input) => {
    const url = new URL(input.toString());
    requested.push(url);
    if (url.pathname.startsWith("/weather/v1/hourly/"))
      return response({
        metadata: {
          tag: "forecast-tag",
          attributions: ["  Forecast © source\nhttps://www.qweather.com  "],
        },
        hours: [
          {
            forecastTime: "2026-08-23T13:00:00Z",
            condition: { text: "多云", code: "101" },
            temperature: { value: 27, unit: "°C" },
            humidity: 0.72,
            wind: {
              direction: { degree: 90, compass: "e" },
              speed: { value: 2.78, unit: "m/s" },
              scale: 2,
            },
            windGust: { value: 5, unit: "m/s" },
            precipitation: {
              amount: { value: 0, unit: "mm" },
              intensity: { value: 0, unit: "mm/h" },
              probability: 0.05,
              type: "none",
            },
            visibility: { value: 18_000, unit: "m" },
            dewPoint: { value: 21, unit: "°C" },
            cloudCover: 0.7,
          },
        ],
      });
    if (url.pathname.startsWith("/weatheralert/v1/current/"))
      return response({
        metadata: {
          tag: "alert-tag",
          zeroResult: false,
          attributions: [" Official authority\nOriginal declaration "],
        },
        alerts: [
          {
            id: "alert-1",
            senderName: "原发布机构",
            issuedTime: "2026-08-23T12:00:00Z",
            messageType: { code: "alert", supersedes: null },
            eventType: { name: "Thunderstorm", code: "1043" },
            urgency: "expected",
            severity: "severe",
            certainty: "likely",
            effectiveTime: "2026-08-23T12:30:00Z",
            // This composition fixture tests an active current alert. Keep the
            // expiry open so the assertion does not depend on wall-clock date.
            expireTime: null,
            headline: "雷暴预警",
            description: "可能出现强雷暴。",
            instruction: "停止户外活动。",
          },
        ],
      });
    throw new Error(`unexpected_weather_provider:${url.host}`);
  });

  const result = await adapter.getHourly({ ...weatherInput, windowUtc: { start: "2026-08-23T13:00:00Z", end: "2026-08-23T14:00:00Z" } });
  const row = result.value?.[0];
  assert.equal(result.timelineRole, "PRIMARY");
  assert.equal(result.warningState, "FRESH");
  assert.equal(result.state, "FRESH");
  assert.equal(row?.cloudPercent, 70, "QWeather total cloud remains primary");
  assert.equal(row?.relativeHumidityPercent, 72);
  assert.equal(row?.precipitationProbabilityPercent, 5);
  assert.equal(row?.visibilityKm, 18);
  assert.ok(Math.abs((row?.windKph ?? 0) - 10.008) < 0.001);
  assert.ok(row && !["lowCloudPercent", "midCloudPercent", "highCloudPercent", "modelConsistency", "modelConsistencyLabel"].some(key => key in row));
  assert.ok(row && !("officialSevereAlert" in row), "warnings remain independent from hourly forecast samples");
  assert.equal(row?.thunderstorm, false, "a warning must not rewrite the hourly forecast condition");
  assert.deepEqual(result.alerts.map(alert => alert.id), ["alert-1"]);
  assert.equal(result.alerts[0]?.senderName, "原发布机构");
  assert.deepEqual(result.sources.find(source => source.kind === "THIRD_PARTY_FORECAST")?.attribution,
    { name: "和风天气", url: "https://www.qweather.com", statements: ["  Forecast © source\nhttps://www.qweather.com  "] });
  assert.deepEqual(result.sources.find(source => source.kind === "OFFICIAL_REFERENCE")?.attribution?.statements,
    [" Official authority\nOriginal declaration "]);
  assert.ok(result.sources.some((source) => source.kind === "OFFICIAL_REFERENCE"));
  assert.ok(
    requested.some((url) => url.pathname.startsWith("/weather/v1/hourly/")),
  );
  const forecastRequest = requested.find((url) =>
    url.pathname.startsWith("/weather/v1/hourly/"),
  );
  assert.equal(forecastRequest?.searchParams.get("hours"), "24");
  assert.equal(forecastRequest?.searchParams.get("localTime"), "false");
  assert.equal(
    result.modelRuns[0]?.modelKey,
    "qweather-weather-v1-hourly-24h",
  );
  assert.equal(result.modelRuns[0]?.nativeSpatialResolutionKm, 1);
  assert.ok(
    result.sources.some((source) => source.title.includes("24 小时")),
  );
  const alertRequest = requested.find((url) =>
    url.pathname.startsWith("/weatheralert/v1/current/"),
  );
  assert.ok(alertRequest);
  assert.notEqual(
    alertRequest.pathname,
    "/weatheralert/v1/current/22.55/114.05",
    "mainland QWeather request uses the GCJ-02 provider boundary",
  );
});

test("QWeather v1 rejects an unexpected provider unit instead of mislabelling it", async () => {
  const config = createTestRuntimeConfig({
    qweather: {
      apiHost: "test.qweatherapi.com",
      credentialId: "test-credential",
      projectId: "test-project",
      privateKeyPem,
      forecastHours: 24,
    },
  });
  const adapter = new QWeatherForecastAdapter(config, async () =>
    response({
      metadata: { tag: "unit-test", attributions: [] },
      hours: [
        {
          forecastTime: "2026-08-23T13:00:00Z",
          condition: { code: "101" },
          temperature: { value: 27, unit: "°C" },
          humidity: 0.72,
          wind: { speed: { value: 10, unit: "km/h" } },
          precipitation: {
            amount: { value: 0, unit: "mm" },
            probability: 0.05,
          },
          visibility: { value: 18_000, unit: "m" },
          dewPoint: { value: 21, unit: "°C" },
          cloudCover: 0.7,
        },
      ],
    }),
  );

  const result = await adapter.getHourly(weatherInput);
  assert.equal(result.state, "PARTIAL");
  assert.equal(result.value?.[0]?.windKph, null);
});

test("QWeather primary failure preserves alert status without requesting a fallback", async () => {
  const config = createTestRuntimeConfig({
    weatherProvider: "QWEATHER",
    qweather: {
      apiHost: "test.qweatherapi.com",
      credentialId: "test-credential",
      projectId: "test-project",
      privateKeyPem,
      forecastHours: 72,
    },
  });
  const adapter = new QWeatherCompositeAdapter(config, async (input) => {
    const url = new URL(input.toString());
    if (
      url.pathname.startsWith("/weather/v1/hourly/") &&
      url.searchParams.get("hours") === "72"
    )
      return response({ error: "unavailable" }, 503);
    if (url.pathname.startsWith("/weatheralert/v1/current/"))
      return response({
        metadata: { tag: "empty-alerts", zeroResult: true, attributions: [] },
        alerts: [],
      });
    throw new Error(`unexpected_weather_provider:${url.host}`);
  });
  const result = await adapter.getHourly(weatherInput);
  assert.equal(result.timelineRole, "UNAVAILABLE");
  assert.equal(result.state, "UNAVAILABLE");
  assert.equal(result.value, null);
  assert.equal(result.warningState, "FRESH");
});

test("missing future hours and internal gaps stay absent; the astronomy window is not shifted", async () => {
  const requests: URL[] = [];
  const adapter = new QWeatherCompositeAdapter(deadlineConfig(), async input => {
    const url = new URL(input.toString()); requests.push(url);
    assert.equal(url.host, "test.qweatherapi.com");
    if (url.pathname.startsWith("/weatheralert/")) return response(deadlinePayload("alerts"));
    const payload = deadlinePayload("primary") as { hours: Record<string, unknown>[] };
    payload.hours.push({ ...payload.hours[0], forecastTime: "2026-08-23T15:00:00Z" });
    return response(payload);
  });
  const partial = await adapter.getHourly({ ...weatherInput, windowUtc: { start: "2026-08-23T13:00:00Z", end: "2026-08-23T17:00:00Z" } });
  assert.deepEqual(partial.value?.map(row => row.at), ["2026-08-23T13:00:00.000Z", "2026-08-23T15:00:00.000Z"]);
  assert.equal(partial.state, "PARTIAL");
  assert.equal(partial.timelineRole, "PRIMARY");
  assert.ok(partial.warnings.some(warning => warning.includes("其余时段")));
  const absent = await adapter.getHourly({ ...weatherInput, localDate: "2026-08-24" });
  assert.equal(absent.value, null);
  assert.equal(absent.errorCode, "weather_window_unavailable");
  assert.equal(absent.warningState, "FRESH");
  assert.ok(requests.every(url => url.host === "test.qweatherapi.com"), "no fallback provider fills unavailable dates");
});

test("forecast JSON-body timeout and caller cancellation leave retry possible", async () => {
  let stall = true;
  let now = Date.now();
  const adapter = new QWeatherForecastAdapter(deadlineConfig(), async () => {
    const result = response(deadlinePayload("primary"));
    if (stall) result.json = () => new Promise(() => {});
    return result;
  }, 20, () => now);
  assert.equal((await adapter.getHourly(weatherInput)).errorCode, "weather_deadline_exceeded");
  now += 6000;
  const controller = new AbortController();
  const cancelled = adapter.getHourly({ ...weatherInput, signal: controller.signal });
  const rejection = assert.rejects(cancelled, /caller_aborted/);
  controller.abort(new Error("caller_aborted")); await rejection;
  // The independently cached source request finishes its own bounded deadline.
  await new Promise(resolve => setTimeout(resolve, 30));
  now += 6000; stall = false;
  assert.equal((await adapter.getHourly(weatherInput)).value?.[0]?.cloudPercent, 70);
});
