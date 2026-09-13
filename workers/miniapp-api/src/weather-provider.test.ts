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

function deadlineConfig() {
  return createTestRuntimeConfig({ weatherProvider: "QWEATHER", qweather: {
    apiHost: "test.qweatherapi.com", credentialId: "test-credential",
    projectId: "test-project", privateKeyPem, forecastHours: 24,
  } });
}

function deadlinePayload(lane: string) {
  if (lane === "evidence") return openMeteoPayload();
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
  for (const hanging of ["primary", "alerts", "evidence", "all"]) {
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
    if (hanging === "all") {
      assert.equal(result.state, "UNAVAILABLE");
      assert.equal(result.value, null);
    } else {
      assert.ok(result.value?.length);
      assert.equal(result.timelineRole, hanging === "primary" ? "PRIMARY_FALLBACK" : "PRIMARY");
      assert.equal(result.warningState, hanging === "alerts" ? "UNAVAILABLE" : "FRESH");
      assert.equal(result.value![0]!.cloudPercent, hanging === "primary" ? 10 : 70);
    }
  }
});

test("weather deadline includes a slow JSON body, caller abort and subsequent successful retry", async () => {
  let stall = true;
  let seenSignal: AbortSignal | undefined;
  const adapter = new OpenMeteoWeatherAdapter(createTestRuntimeConfig(), async (_input, init) => {
    seenSignal = init!.signal!;
    const result = response(openMeteoPayload());
    if (stall) result.json = () => new Promise(() => {});
    return result;
  }, undefined, 20);
  const timedOut = await adapter.getHourly(weatherInput);
  assert.equal(timedOut.state, "UNAVAILABLE");
  assert.equal(timedOut.errorCode, "weather_deadline_exceeded");
  assert.equal(seenSignal?.aborted, true);
  const controller = new AbortController();
  const cancelled = adapter.getHourly({ ...weatherInput, signal: controller.signal });
  const rejection = assert.rejects(cancelled, /caller_aborted/);
  controller.abort(new Error("caller_aborted"));
  await rejection;
  stall = false;
  const recovered = await adapter.getHourly(weatherInput);
  assert.ok(recovered.value?.length);
  assert.equal(recovered.errorCode, null);
});

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

test("Open-Meteo requests the local noon-to-noon observation window, including a DST change", async () => {
  const requests: URL[] = [];
  const adapter = new OpenMeteoWeatherAdapter(createTestRuntimeConfig(), async input => {
    requests.push(new URL(input.toString()));
    return response(openMeteoPayload());
  }, undefined, undefined, () => new Date("2026-10-30T12:00:00Z"));
  await adapter.getHourly({ ...weatherInput, localDate: "2026-10-31", timezone: "America/New_York" });
  assert.equal(requests[0]!.searchParams.get("start_hour"), "2026-10-31T16:00");
  assert.equal(requests[0]!.searchParams.get("end_hour"), "2026-11-01T16:00");
  assert.equal(requests[0]!.searchParams.get("timezone"), "GMT");
});

test("Open-Meteo preserves available hours on the last forecast night instead of rejecting the entire request", async () => {
  let calls = 0;
  const adapter = new OpenMeteoWeatherAdapter(createTestRuntimeConfig(), async input => {
    calls += 1;
    const params = new URL(input.toString()).searchParams;
    const end = params.get("end_hour") ?? `${params.get("end_date")}T23:00`;
    if (end > "2026-08-23T23:00") return response({ error: "outside_forecast_range" }, 400);
    const payload = openMeteoPayload();
    payload.hourly.time = Array.from({ length: 20 }, (_, index) => `2026-08-23T${String(index + 4).padStart(2, "0")}:00`);
    for (const [key, values] of Object.entries(payload.hourly)) {
      if (key !== "time") (payload.hourly as Record<string, unknown[]>)[key] = Array(20).fill(values[0]);
    }
    return response(payload);
  }, undefined, undefined, () => new Date("2026-08-08T12:00:00Z"));
  const lastNight = await adapter.getHourly(weatherInput);
  assert.equal(lastNight.errorCode, null);
  assert.equal(lastNight.value?.length, 20);
  assert.equal(lastNight.value?.at(-1)?.at, "2026-08-23T23:00:00.000Z");
  assert.equal(lastNight.source.state, "PARTIAL");
  const outside = await adapter.getHourly({ ...weatherInput, localDate: "2026-08-24" });
  assert.equal(outside.state, "UNAVAILABLE");
  assert.equal(outside.errorCode, "open_meteo_outside_forecast_range");
  assert.equal(calls, 1, "an entirely unsupported night must not repeatedly call the provider");
});

test("Open-Meteo model validity follows non-missing cloud hours rather than the response envelope", async () => {
  const payload = openMeteoPayload();
  payload.hourly.time = ["2026-08-23T12:00", "2026-08-23T13:00", "2026-08-23T14:00"];
  for (const [key, values] of Object.entries(payload.hourly)) {
    if (key !== "time") (payload.hourly as Record<string, unknown[]>)[key] = Array(3).fill(values[0]);
  }
  for (const key of ["cloud_cover", "cloud_cover_low", "cloud_cover_mid", "cloud_cover_high"]) {
    (payload.hourly as Record<string, unknown[]>)[`${key}_icon_seamless`] = [null, 10, null];
  }
  const adapter = new OpenMeteoWeatherAdapter(createTestRuntimeConfig(), async () => response(payload));
  const result = await adapter.getHourly(weatherInput);
  const icon = result.modelRuns.find(run => run.modelKey === "icon_seamless")!;
  assert.equal(icon.state, "PARTIAL");
  assert.equal(icon.validFrom, "2026-08-23T13:00:00.000Z");
  assert.equal(icon.validTo, "2026-08-23T13:00:00.000Z");
  assert.equal(result.sources.find(source => source.id === icon.sourceId)?.state, "PARTIAL");
  assert.equal(result.value?.[0]?.evidenceSourceIds.includes(icon.sourceId), false);
});

test("unlabelled Open-Meteo fields cannot manufacture agreement from absent comparison models", async () => {
  const original = openMeteoPayload();
  const hourly: Record<string, unknown[]> = { time: original.hourly.time };
  for (const [key, values] of Object.entries(original.hourly)) {
    if (key.endsWith("_best_match")) hourly[key.replace(/_best_match$/u, "")] = values;
  }
  const adapter = new OpenMeteoWeatherAdapter(createTestRuntimeConfig(), async () => response({ ...original, hourly }));
  const result = await adapter.getHourly(weatherInput);
  assert.equal(result.value?.[0]?.cloudPercent, 10);
  assert.equal(result.value?.[0]?.modelConsistency, null);
  assert.equal(result.value?.[0]?.modelConsistencyLabel, "UNAVAILABLE");
  assert.ok(result.modelRuns.filter(run => run.modelKey !== "best_match").every(run => run.state === "UNAVAILABLE"));
});

test("QWeather composition fills only missing requested hours with explicit fallback and preserves primary values", async () => {
  const adapter = new QWeatherCompositeAdapter(deadlineConfig(), async input => {
    const url = new URL(input.toString());
    if (url.pathname.startsWith("/weather/v1/")) return response(deadlinePayload("primary"));
    if (url.pathname.startsWith("/weatheralert/")) return response(deadlinePayload("alerts"));
    const payload = openMeteoPayload();
    payload.hourly.time = ["2026-08-23T13:00", "2026-08-23T14:00"];
    for (const [key, values] of Object.entries(payload.hourly)) {
      if (key !== "time") (payload.hourly as Record<string, unknown[]>)[key] = [values[0], values[0]];
    }
    return response(payload);
  });
  const result = await adapter.getHourly(weatherInput);
  assert.deepEqual(result.value?.map(row => [row.at, row.cloudPercent]), [
    ["2026-08-23T13:00:00.000Z", 70], ["2026-08-23T14:00:00.000Z", 10],
  ]);
  assert.equal(result.timelineRole, "PRIMARY_FALLBACK");
  assert.equal(result.state, "PARTIAL");
  assert.ok(result.warnings.some(warning => warning.includes("部分时段")));
});

test("QWeather current hours outside the selected night cannot mask a usable future fallback", async () => {
  const adapter = new QWeatherCompositeAdapter(deadlineConfig(), async input => {
    const url = new URL(input.toString());
    if (url.pathname.startsWith("/weather/v1/")) return response(deadlinePayload("primary"));
    if (url.pathname.startsWith("/weatheralert/")) return response(deadlinePayload("alerts"));
    const payload = openMeteoPayload();
    payload.hourly.time = ["2026-08-24T13:00"];
    return response(payload);
  });
  const result = await adapter.getHourly({ ...weatherInput, localDate: "2026-08-24" });
  assert.equal(result.value?.length, 1);
  assert.equal(result.value?.[0]?.at, "2026-08-24T13:00:00.000Z");
  assert.equal(result.value?.[0]?.cloudPercent, 10);
  assert.equal(result.timelineRole, "PRIMARY_FALLBACK");
});

test("a rolling weather publication window preserves morning hours and reports missing delivered evidence", async () => {
  let observedWindow: URL | undefined;
  const adapter = new QWeatherCompositeAdapter(deadlineConfig(), async input => {
    const url = new URL(input.toString());
    if (url.pathname.startsWith("/weather/v1/")) {
      const payload = deadlinePayload("primary") as { hours: Record<string, unknown>[] };
      payload.hours.unshift({ ...payload.hours[0], forecastTime: "2026-08-23T01:00:00Z" });
      return response(payload);
    }
    if (url.pathname.startsWith("/weatheralert/")) return response(deadlinePayload("alerts"));
    observedWindow = url;
    return response(openMeteoPayload());
  });
  const result = await adapter.getHourly({ ...weatherInput, windowUtc: {
    start: "2026-08-23T00:00:00.000Z", end: "2026-08-24T00:00:00.000Z",
  } });
  assert.equal(observedWindow?.searchParams.get("start_hour"), "2026-08-23T00:00");
  assert.equal(observedWindow?.searchParams.get("end_hour"), "2026-08-23T23:00");
  assert.equal(result.value?.[0]?.at, "2026-08-23T01:00:00.000Z");
  assert.equal(result.value?.[0]?.lowCloudPercent, null);
  assert.equal(result.state, "PARTIAL");
  assert.ok(result.warnings.length);
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
            // This composition fixture tests an active current alert. Keep the
            // expiry open so the assertion does not depend on wall-clock date.
            expireTime: null,
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
