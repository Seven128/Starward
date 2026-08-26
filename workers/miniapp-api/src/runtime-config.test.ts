import assert from "node:assert/strict";
import test from "node:test";
import { loadRuntimeConfig } from "./runtime-config.ts";

const managedEnvironment = /^(?:NODE_ENV|DATABASE_URL|REDIS_URL|OPEN_METEO_|QWEATHER_|WECHAT_|MINIAPP_)/u;

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

test("TRIAL accepts explicitly selected non-commercial Open-Meteo evidence", () => {
  const config = withEnvironment(
    releaseEnvironment("TRIAL", "OPEN_METEO_NONCOMMERCIAL"),
    () => loadRuntimeConfig(),
  );
  assert.equal(config.releaseProfile, "TRIAL");
  assert.equal(config.weatherProvider, "QWEATHER");
  assert.equal(config.openMeteoEvidenceMode, "OPEN_METEO_NONCOMMERCIAL");
  assert.equal(config.openMeteoApiKey, null);
});

test("COMMERCIAL rejects non-commercial Open-Meteo evidence", () => {
  assert.throws(
    () =>
      withEnvironment(
        releaseEnvironment("COMMERCIAL", "OPEN_METEO_NONCOMMERCIAL"),
        () => loadRuntimeConfig(),
      ),
    /runtime_config_invalid:noncommercial_weather_commercial_forbidden/u,
  );
});

test("COMMERCIAL requires a commercial Open-Meteo key", () => {
  assert.throws(
    () =>
      withEnvironment(
        releaseEnvironment("COMMERCIAL", "OPEN_METEO_COMMERCIAL"),
        () => loadRuntimeConfig(),
      ),
    /runtime_config_invalid:open_meteo_commercial_key_required/u,
  );
  const config = withEnvironment(
    releaseEnvironment(
      "COMMERCIAL",
      "OPEN_METEO_COMMERCIAL",
      "commercial-open-meteo-key",
    ),
    () => loadRuntimeConfig(),
  );
  assert.equal(config.openMeteoEvidenceMode, "OPEN_METEO_COMMERCIAL");
  assert.equal(config.openMeteoApiKey, "commercial-open-meteo-key");
});
