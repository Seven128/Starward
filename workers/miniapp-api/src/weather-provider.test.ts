import assert from "node:assert/strict";
import { generateKeyPairSync } from "node:crypto";
import test from "node:test";
import { createTestRuntimeConfig } from "./runtime-config.ts";
import {
  OpenMeteoWeatherAdapter,
  QWeatherCompositeAdapter,
  QWeatherForecastAdapter,
} from "./weather-provider.ts";

const privateKeyPem = generateKeyPairSync("ed25519")
  .privateKey.export({ format: "pem", type: "pkcs8" })
  .toString();

function response(value: unknown, status = 200): Response {
  return new Response(JSON.stringify(value), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function openMeteoPayload() {
  const time = ["2026-08-23T13:00"];
  return {
    latitude: 22.5,
    longitude: 114,
    utc_offset_seconds: 0,
    hourly: {
      time,
      cloud_cover_best_match: [10],
      cloud_cover_low_best_match: [4],
      cloud_cover_mid_best_match: [3],
      cloud_cover_high_best_match: [3],
      precipitation_best_match: [0],
      precipitation_probability_best_match: [5],
      wind_speed_10m_best_match: [12],
      wind_gusts_10m_best_match: [18],
      wind_direction_10m_best_match: [135],
      temperature_2m_best_match: [26],
      relative_humidity_2m_best_match: [70],
      dew_point_2m_best_match: [20],
      visibility_best_match: [18_000],
      weather_code_best_match: [1],
      cloud_cover_icon_seamless: [10],
      cloud_cover_low_icon_seamless: [4],
      cloud_cover_mid_icon_seamless: [3],
      cloud_cover_high_icon_seamless: [3],
      cloud_cover_gfs_seamless: [20],
      cloud_cover_low_gfs_seamless: [8],
      cloud_cover_mid_gfs_seamless: [6],
      cloud_cover_high_gfs_seamless: [6],
      cloud_cover_ecmwf_ifs025: [30],
      cloud_cover_low_ecmwf_ifs025: [12],
      cloud_cover_mid_ecmwf_ifs025: [9],
      cloud_cover_high_ecmwf_ifs025: [9],
      cloud_cover_ecmwf_aifs025_single: [40],
      cloud_cover_low_ecmwf_aifs025_single: [16],
      cloud_cover_mid_ecmwf_aifs025_single: [12],
      cloud_cover_high_ecmwf_aifs025_single: [12],
    },
  };
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

test("Open-Meteo adapter requests explicit model evidence and never selects the clearest model", async () => {
  const requests: URL[] = [];
  const adapter = new OpenMeteoWeatherAdapter(
    createTestRuntimeConfig(),
    async (input) => {
      requests.push(new URL(input.toString()));
      return response(openMeteoPayload());
    },
  );
  const result = await adapter.getHourly(weatherInput);
  const requestUrl = requests[0];
  assert.ok(requestUrl);
  assert.equal(
    requestUrl.searchParams.get("models"),
    "best_match,icon_seamless,gfs_seamless,ecmwf_ifs025,ecmwf_aifs025_single",
  );
  assert.equal(result.value?.[0]?.cloudPercent, 10);
  assert.equal(result.value?.[0]?.modelSpreadPercent, 30);
  assert.equal(result.value?.[0]?.modelConsistency, 0.7);
  assert.equal(result.value?.[0]?.modelConsistencyLabel, "MEDIUM");
  assert.equal(result.modelRuns.length, 5);
  assert.equal(result.warningState, "UNAVAILABLE");
});

test("QWeather composition keeps the Weather API v1 timeline primary, adds layered cloud and applies official alerts", async () => {
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
          attributions: ["https://developer.qweather.com/attribution.html"],
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
          attributions: ["Official authority"],
        },
        alerts: [
          {
            id: "alert-1",
            issuedTime: "2026-08-23T12:00:00Z",
            messageType: { code: "alert", supersedes: null },
            eventType: { name: "Thunderstorm", code: "1043" },
            urgency: "expected",
            severity: "severe",
            certainty: "likely",
            effectiveTime: "2026-08-23T12:30:00Z",
            expireTime: new Date(Date.now() + 60 * 60_000).toISOString(),
            headline: "雷暴预警",
            description: "可能出现强雷暴。",
            instruction: "停止户外活动。",
          },
        ],
      });
    return response(openMeteoPayload());
  });

  const result = await adapter.getHourly(weatherInput);
  const row = result.value?.[0];
  assert.equal(result.timelineRole, "PRIMARY");
  assert.equal(result.warningState, "FRESH");
  assert.equal(result.state, "FRESH");
  assert.equal(row?.cloudPercent, 70, "QWeather total cloud remains primary");
  assert.equal(row?.relativeHumidityPercent, 72);
  assert.equal(row?.precipitationProbabilityPercent, 5);
  assert.equal(row?.visibilityKm, 18);
  assert.ok(Math.abs((row?.windKph ?? 0) - 10.008) < 0.001);
  assert.deepEqual(
    [row?.lowCloudPercent, row?.midCloudPercent, row?.highCloudPercent],
    [4, 3, 3],
  );
  assert.equal(row?.modelConsistencyLabel, "MEDIUM");
  assert.equal(row?.officialSevereAlert, true);
  assert.equal(row?.thunderstorm, true);
  assert.deepEqual(row?.officialAlertIds, ["alert-1"]);
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

test("QWeather primary failure uses an explicit Open-Meteo fallback", async () => {
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
    return response(openMeteoPayload());
  });
  const result = await adapter.getHourly(weatherInput);
  assert.equal(result.timelineRole, "PRIMARY_FALLBACK");
  assert.equal(result.state, "PARTIAL");
  assert.equal(result.value?.[0]?.cloudPercent, 10);
  assert.ok(result.warnings.some((warning) => warning.includes("备源")));
});
