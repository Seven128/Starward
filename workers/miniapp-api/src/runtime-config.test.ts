import assert from "node:assert/strict";
import test from "node:test";
import { loadRuntimeConfig } from "./runtime-config.ts";

const managedEnvironment = /^(?:NODE_ENV|DATABASE_URL|REDIS_URL|AMAP_|OPEN_METEO_|QWEATHER_|WECHAT_|MINIAPP_)/u;

function releaseEnvironment(
  profile: "TRIAL" | "COMMERCIAL",
  evidenceMode: "OPEN_METEO_NONCOMMERCIAL" | "OPEN_METEO_COMMERCIAL",
  openMeteoApiKey?: string,
): NodeJS.ProcessEnv {
  return {
    NODE_ENV: "production",
    DATABASE_URL: "postgresql://starward:password@postgres:5432/starward",
    REDIS_URL: "redis://:password@redis:6379/0",
    MINIAPP_RELEASE_PROFILE: profile,
    MINIAPP_STORAGE_MODE: "POSTGRES",
    MINIAPP_AUTH_MODE: "WECHAT",
    MINIAPP_MEDIA_STORAGE_MODE: "DISABLED",
    MINIAPP_ACCEPTANCE_MODE: "0",
    MINIAPP_DEVELOPMENT_FIXTURE_MODE: "0",
    MINIAPP_WEATHER_PROVIDER: "QWEATHER",
    MINIAPP_OPEN_METEO_EVIDENCE_MODE: evidenceMode,
    MINIAPP_ROUTE_PROVIDER: "DISABLED",
    MINIAPP_PLACE_SEARCH_PROVIDER: "DISABLED",
    WECHAT_MINIAPP_APP_ID: "wx1234567890abcd",
    WECHAT_MINIAPP_APP_SECRET: "wechat-secret",
    MINIAPP_SESSION_SECRET: "session-secret-at-least-thirty-two-characters",
    QWEATHER_API_HOST: "example.qweatherapi.com",
    QWEATHER_CREDENTIAL_ID: "credential-id",
    QWEATHER_PROJECT_ID: "project-id",
    QWEATHER_PRIVATE_KEY_PEM:
      "-----BEGIN PRIVATE KEY-----\\nprivate-test-material\\n-----END PRIVATE KEY-----",
    ...(openMeteoApiKey ? { OPEN_METEO_API_KEY: openMeteoApiKey } : {}),
  };
}

function withEnvironment<T>(values: NodeJS.ProcessEnv, assertion: () => T): T {
  const previous = Object.fromEntries(
    Object.entries(process.env).filter(([key]) => managedEnvironment.test(key)),
  );
  for (const key of Object.keys(process.env)) {
    if (managedEnvironment.test(key)) delete process.env[key];
  }
  Object.assign(process.env, values);
  try {
    return assertion();
  } finally {
    for (const key of Object.keys(process.env)) {
      if (managedEnvironment.test(key)) delete process.env[key];
    }
    Object.assign(process.env, previous);
  }
}

test("delivery identity encryption requires a distinct valid key and defaults to disabled", () => {
  const environment = releaseEnvironment("TRIAL", "OPEN_METEO_COMMERCIAL");
  const key = "17".repeat(32);
  assert.equal(withEnvironment(environment, loadRuntimeConfig).wechat.deliveryIdentityKey, null);
  assert.equal(withEnvironment({ ...environment, WECHAT_DELIVERY_IDENTITY_KEY: key }, loadRuntimeConfig).wechat.deliveryIdentityKey, key);
  assert.throws(() => withEnvironment({ ...environment, WECHAT_DELIVERY_IDENTITY_KEY: "invalid" }, loadRuntimeConfig), /wechat_delivery_key_invalid/);
  assert.throws(() => withEnvironment({ ...environment, MINIAPP_SESSION_SECRET: key, WECHAT_DELIVERY_IDENTITY_KEY: key }, loadRuntimeConfig), /wechat_delivery_key_must_be_independent/);
});

test("reminder template defaults to unavailable and rejects malformed IDs", () => {
  const environment = releaseEnvironment("TRIAL", "OPEN_METEO_COMMERCIAL");
  assert.equal(withEnvironment(environment, loadRuntimeConfig).wechat.subscriptionTemplateId, null);
  assert.equal(withEnvironment({ ...environment, WECHAT_REMINDER_TEMPLATE_ID: "synthetic-template_1" }, loadRuntimeConfig).wechat.subscriptionTemplateId, "synthetic-template_1");
  for (const id of ["a/b", "x".repeat(129)]) {
    assert.throws(() => withEnvironment({ ...environment, WECHAT_REMINDER_TEMPLATE_ID: id }, loadRuntimeConfig), /wechat_reminder_template_id/);
  }
});

test("event catalog check interval is configurable within a bounded range", () => {
  const config = withEnvironment(
    { ...releaseEnvironment("TRIAL", "OPEN_METEO_NONCOMMERCIAL"), MINIAPP_EVENT_CATALOG_CHECK_INTERVAL_DAYS: "3" },
    () => loadRuntimeConfig(),
  );
  assert.equal(config.eventCatalogCheckIntervalDays, 3);
  assert.throws(
    () => withEnvironment(
      { ...releaseEnvironment("TRIAL", "OPEN_METEO_NONCOMMERCIAL"), MINIAPP_EVENT_CATALOG_CHECK_INTERVAL_DAYS: "0" },
      () => loadRuntimeConfig(),
    ),
    /runtime_config_invalid:MINIAPP_EVENT_CATALOG_CHECK_INTERVAL_DAYS:0/u,
  );
});

test("article DNS uses an explicit bounded resolver mode without a private-address fallback", () => {
  const environment = releaseEnvironment("TRIAL", "OPEN_METEO_NONCOMMERCIAL");
  assert.equal(withEnvironment(environment, loadRuntimeConfig).eventArticleDnsMode, "SYSTEM");
  assert.equal(withEnvironment({ ...environment, MINIAPP_EVENT_ARTICLE_DNS_MODE: "CLOUDFLARE_DOH" }, loadRuntimeConfig).eventArticleDnsMode, "CLOUDFLARE_DOH");
  assert.throws(() => withEnvironment({ ...environment, MINIAPP_EVENT_ARTICLE_DNS_MODE: "unsafe-fallback" }, loadRuntimeConfig), /runtime_config_invalid:MINIAPP_EVENT_ARTICLE_DNS_MODE/);
});

test("TRIAL and COMMERCIAL use QWeather alone without an Open-Meteo key", () => {
  for (const profile of ["TRIAL", "COMMERCIAL"] as const) {
    const config = withEnvironment(releaseEnvironment(profile, "OPEN_METEO_COMMERCIAL"), loadRuntimeConfig);
    assert.equal(config.weatherProvider, "QWEATHER");
    assert.equal(config.qweather.forecastHours, 240);
    assert.equal(config.features.LAYERED_CLOUD_ENABLED, false);
    assert.equal("openMeteoApiKey" in config, false);
    assert.equal("openMeteoEvidenceMode" in config, false);
  }
});

test("forecast hours support actual requested horizons from 1 through 240, rejecting invalid bounds", () => {
  for (const hours of [1, 24, 48, 72, 168, 240]) {
    const config = withEnvironment({ ...releaseEnvironment("TRIAL", "OPEN_METEO_NONCOMMERCIAL"), QWEATHER_FORECAST_HOURS: String(hours) }, loadRuntimeConfig);
    assert.equal(config.qweather.forecastHours, hours);
  }
  for (const hours of ["0", "241", "1.5", "bad"]) {
    assert.throws(() => withEnvironment({ ...releaseEnvironment("TRIAL", "OPEN_METEO_NONCOMMERCIAL"), QWEATHER_FORECAST_HOURS: hours }, loadRuntimeConfig), /runtime_config_invalid:QWEATHER_FORECAST_HOURS/);
  }
});

test("retired provider selection fails explicitly instead of silently selecting another weather source", () => {
  assert.throws(() => withEnvironment({ ...releaseEnvironment("TRIAL", "OPEN_METEO_NONCOMMERCIAL"), MINIAPP_WEATHER_PROVIDER: "OPEN_METEO_NONCOMMERCIAL" }, loadRuntimeConfig), /runtime_config_invalid:MINIAPP_WEATHER_PROVIDER/);
});

test("a leftover map key cannot enable retired providers; explicit old selections are rejected", () => {
  const environment: NodeJS.ProcessEnv = { ...releaseEnvironment("TRIAL", "OPEN_METEO_NONCOMMERCIAL"), AMAP_WEB_SERVICE_KEY: "synthetic-old-key" };
  delete environment.MINIAPP_ROUTE_PROVIDER;
  delete environment.MINIAPP_PLACE_SEARCH_PROVIDER;
  const config = withEnvironment(environment, loadRuntimeConfig);
  assert.equal(config.routeProvider, "DISABLED");
  assert.equal(config.placeSearchProvider, "DISABLED");
  assert.equal("amapWebServiceKey" in config, false);
  for (const key of ["MINIAPP_ROUTE_PROVIDER", "MINIAPP_PLACE_SEARCH_PROVIDER"]) {
    assert.throws(() => withEnvironment({ ...environment, [key]: "AMAP" }, loadRuntimeConfig), /runtime_config_invalid:MINIAPP_/);
  }
});
