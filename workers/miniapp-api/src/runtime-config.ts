import {
  SELECTED_FEATURE_FLAGS,
  assertFeatureFlagClosure,
  type FeatureFlags,
} from "@starward/miniapp-contracts";
import { METEOR_EVENT_CATALOG_VERSION } from "./meteor-event-catalog.ts";

export type ReleaseProfile = "LOCAL" | "TRIAL" | "COMMERCIAL";
export type StorageMode = "MEMORY_TEST" | "POSTGRES";
export type AuthMode = "LOCAL_TEST" | "WECHAT";
export type WeatherProviderMode =
  | "OPEN_METEO_NONCOMMERCIAL"
  | "OPEN_METEO_COMMERCIAL"
  | "QWEATHER";
export type OpenMeteoEvidenceMode =
  | "OPEN_METEO_NONCOMMERCIAL"
  | "OPEN_METEO_COMMERCIAL";
export type RouteProviderMode = "AMAP" | "DISABLED";
export type PlaceSearchProviderMode = "AMAP" | "DISABLED";
export type MediaStorageMode = "LOCAL_FILESYSTEM" | "DISABLED";

export interface MiniappRuntimeConfig {
  releaseProfile: ReleaseProfile;
  storageMode: StorageMode;
  authMode: AuthMode;
  weatherProvider: WeatherProviderMode;
  openMeteoEvidenceMode: OpenMeteoEvidenceMode;
  routeProvider: RouteProviderMode;
  placeSearchProvider: PlaceSearchProviderMode;
  mediaStorage: {
    mode: MediaStorageMode;
    root: string | null;
    maxUploadBytes: number;
  };
  databaseUrl: string | null;
  redisUrl: string | null;
  cachePrefix: string;
  autoMigrate: boolean;
  openMeteoApiKey: string | null;
  qweather: {
    apiHost: string | null;
    credentialId: string | null;
    projectId: string | null;
    privateKeyPem: string | null;
  };
  amapWebServiceKey: string | null;
  wechat: {
    appId: string | null;
    appSecret: string | null;
    sessionSecret: string;
  };
  trialRegion: string;
  eventCatalogVersion: string;
  darkSkyDatasetVersion: string;
  skyCatalogVersion: string;
  astronomyAlgorithmVersion: string;
  opportunityRuleVersion: string;
  tripDecisionRuleVersion: string;
  features: FeatureFlags;
}

function value(name: string): string | null {
  const selected = process.env[name]?.trim();
  return selected ? selected : null;
}

function oneOf<T extends string>(
  name: string,
  raw: string | null,
  allowed: readonly T[],
  fallback: T,
): T {
  const selected = (raw ?? fallback).toUpperCase();
  if (!allowed.includes(selected as T))
    throw new Error(`runtime_config_invalid:${name}:${selected}`);
  return selected as T;
}

function selectedFlags(input: {
  authMode: AuthMode;
  realWeatherEnabled: boolean;
  layeredCloudEnabled: boolean;
  routeProvider: RouteProviderMode;
  lightDatasetVersion: string;
}): FeatureFlags {
  const flags: FeatureFlags = Object.freeze({
    ...SELECTED_FEATURE_FLAGS,
    REAL_WEATHER_ENABLED: input.realWeatherEnabled,
    LAYERED_CLOUD_ENABLED: input.layeredCloudEnabled,
    WECHAT_AUTH_ENABLED: input.authMode === "WECHAT",
    LIGHT_POLLUTION_LAYER_ENABLED:
      input.lightDatasetVersion !== "UNAVAILABLE",
    SKY_OPPORTUNITY_LAYER_ENABLED: input.realWeatherEnabled,
  });
  assertFeatureFlagClosure(flags);
  return flags;
}

export function loadRuntimeConfig(): MiniappRuntimeConfig {
  const releaseProfile = oneOf(
    "MINIAPP_RELEASE_PROFILE",
    value("MINIAPP_RELEASE_PROFILE"),
    ["LOCAL", "TRIAL", "COMMERCIAL"] as const,
    "LOCAL",
  );
  const storageMode = oneOf(
    "MINIAPP_STORAGE_MODE",
    value("MINIAPP_STORAGE_MODE"),
    ["MEMORY_TEST", "POSTGRES"] as const,
    "POSTGRES",
  );
  const authMode = oneOf(
    "MINIAPP_AUTH_MODE",
    value("MINIAPP_AUTH_MODE"),
    ["LOCAL_TEST", "WECHAT"] as const,
    releaseProfile === "LOCAL" ? "LOCAL_TEST" : "WECHAT",
  );
  const weatherProvider = oneOf(
    "MINIAPP_WEATHER_PROVIDER",
    value("MINIAPP_WEATHER_PROVIDER"),
    ["OPEN_METEO_NONCOMMERCIAL", "OPEN_METEO_COMMERCIAL", "QWEATHER"] as const,
    releaseProfile === "LOCAL" ? "OPEN_METEO_NONCOMMERCIAL" : "QWEATHER",
  );
  const openMeteoEvidenceMode = oneOf(
    "MINIAPP_OPEN_METEO_EVIDENCE_MODE",
    value("MINIAPP_OPEN_METEO_EVIDENCE_MODE"),
    ["OPEN_METEO_NONCOMMERCIAL", "OPEN_METEO_COMMERCIAL"] as const,
    weatherProvider === "OPEN_METEO_COMMERCIAL" || releaseProfile !== "LOCAL"
      ? "OPEN_METEO_COMMERCIAL"
      : "OPEN_METEO_NONCOMMERCIAL",
  );
  const routeProvider = oneOf(
    "MINIAPP_ROUTE_PROVIDER",
    value("MINIAPP_ROUTE_PROVIDER"),
    ["AMAP", "DISABLED"] as const,
    value("AMAP_WEB_SERVICE_KEY") ? "AMAP" : "DISABLED",
  );
  const placeSearchProvider = oneOf(
    "MINIAPP_PLACE_SEARCH_PROVIDER",
    value("MINIAPP_PLACE_SEARCH_PROVIDER"),
    ["AMAP", "DISABLED"] as const,
    value("AMAP_WEB_SERVICE_KEY") ? "AMAP" : "DISABLED",
  );
  const mediaStorageMode = oneOf(
    "MINIAPP_MEDIA_STORAGE_MODE",
    value("MINIAPP_MEDIA_STORAGE_MODE"),
    ["LOCAL_FILESYSTEM", "DISABLED"] as const,
    releaseProfile === "LOCAL" ? "LOCAL_FILESYSTEM" : "DISABLED",
  );
  const mediaStorageRoot =
    value("MINIAPP_MEDIA_STORAGE_ROOT") ?? "tmp/miniapp-media";
  const databaseUrl = value("DATABASE_URL");
  const redisUrl = value("REDIS_URL");
  const openMeteoApiKey = value("OPEN_METEO_API_KEY");
  const qweather = {
    apiHost: value("QWEATHER_API_HOST"),
    credentialId: value("QWEATHER_CREDENTIAL_ID"),
    projectId: value("QWEATHER_PROJECT_ID"),
    privateKeyPem: value("QWEATHER_PRIVATE_KEY_PEM")?.replace(/\\n/gu, "\n") ?? null,
  };
  const amapWebServiceKey = value("AMAP_WEB_SERVICE_KEY");
  const wechat = {
    appId: value("WECHAT_MINIAPP_APP_ID"),
    appSecret: value("WECHAT_MINIAPP_APP_SECRET"),
    sessionSecret: value("MINIAPP_SESSION_SECRET") ?? "",
  };
  const darkSkyDatasetVersion =
    value("MINIAPP_DARK_SKY_DATASET_VERSION") ?? "UNAVAILABLE";
  const eventCatalogVersion =
    value("MINIAPP_EVENT_CATALOG_VERSION") ?? METEOR_EVENT_CATALOG_VERSION;

  if (storageMode === "POSTGRES" && !databaseUrl)
    throw new Error("runtime_config_invalid:postgres_database_url_required");
  if (
    storageMode === "MEMORY_TEST" &&
    process.env.NODE_ENV !== "test" &&
    process.env.MINIAPP_ACCEPTANCE_MODE !== "1" &&
    process.env.MINIAPP_DEVELOPMENT_FIXTURE_MODE !== "1"
  )
    throw new Error("runtime_config_invalid:memory_test_not_explicit_test");
  if (releaseProfile !== "LOCAL" && storageMode !== "POSTGRES")
    throw new Error("runtime_config_invalid:release_requires_postgres");
  if (
    process.env.MINIAPP_DEVELOPMENT_FIXTURE_MODE === "1" &&
    (releaseProfile !== "LOCAL" || storageMode !== "MEMORY_TEST")
  )
    throw new Error("runtime_config_invalid:fixture_lane_local_memory_only");
  if (
    (weatherProvider === "OPEN_METEO_NONCOMMERCIAL" ||
      openMeteoEvidenceMode === "OPEN_METEO_NONCOMMERCIAL") &&
    releaseProfile !== "LOCAL"
  )
    throw new Error("runtime_config_invalid:free_weather_noncommercial_only");
  if (
    (weatherProvider === "OPEN_METEO_COMMERCIAL" ||
      openMeteoEvidenceMode === "OPEN_METEO_COMMERCIAL") &&
    !openMeteoApiKey
  )
    throw new Error("runtime_config_invalid:open_meteo_commercial_key_required");
  if (
    weatherProvider === "QWEATHER" &&
    Object.values(qweather).some((part) => !part)
  )
    throw new Error("runtime_config_invalid:qweather_credentials_required");
  if (
    (routeProvider === "AMAP" || placeSearchProvider === "AMAP") &&
    !amapWebServiceKey
  )
    throw new Error("runtime_config_invalid:amap_key_required");
  if (
    authMode === "WECHAT" &&
    (!wechat.appId || !wechat.appSecret || wechat.sessionSecret.length < 32)
  )
    throw new Error("runtime_config_invalid:wechat_credentials_required");
  if (
    authMode === "LOCAL_TEST" &&
    releaseProfile !== "LOCAL" &&
    process.env.MINIAPP_ACCEPTANCE_MODE !== "1"
  )
    throw new Error("runtime_config_invalid:local_auth_not_allowed");
  if (eventCatalogVersion !== METEOR_EVENT_CATALOG_VERSION)
    throw new Error("runtime_config_invalid:event_catalog_not_installed");
  if (releaseProfile !== "LOCAL" && mediaStorageMode === "LOCAL_FILESYSTEM")
    throw new Error("runtime_config_invalid:local_media_storage_local_only");

  return Object.freeze({
    releaseProfile,
    storageMode,
    authMode,
    weatherProvider,
    openMeteoEvidenceMode,
    routeProvider,
    placeSearchProvider,
    mediaStorage: {
      mode: mediaStorageMode,
      root: mediaStorageMode === "LOCAL_FILESYSTEM" ? mediaStorageRoot : null,
      maxUploadBytes: 1_200_000,
    },
    databaseUrl,
    redisUrl,
    cachePrefix: value("MINIAPP_CACHE_PREFIX") ?? "starward:miniapp:current:",
    autoMigrate: process.env.MINIAPP_AUTO_MIGRATE === "1",
    openMeteoApiKey,
    qweather,
    amapWebServiceKey,
    wechat,
    trialRegion: value("MINIAPP_TRIAL_REGION") ?? "GREATER_BAY_AREA_3H",
    eventCatalogVersion,
    darkSkyDatasetVersion,
    skyCatalogVersion:
      value("MINIAPP_SKY_CATALOG_VERSION") ?? "iau-bright-targets-2026.1",
    astronomyAlgorithmVersion:
      value("MINIAPP_ASTRONOMY_ALGORITHM_VERSION") ?? "astronomy-engine-2.1.19",
    opportunityRuleVersion:
      value("MINIAPP_OPPORTUNITY_RULE_VERSION") ?? "sky-opportunity-1",
    tripDecisionRuleVersion:
      value("MINIAPP_TRIP_DECISION_RULE_VERSION") ?? "trip-decision-1",
    features: selectedFlags({
      authMode,
      realWeatherEnabled: true,
      layeredCloudEnabled: true,
      routeProvider,
      lightDatasetVersion: darkSkyDatasetVersion,
    }),
  });
}

export function createTestRuntimeConfig(
  overrides: Partial<MiniappRuntimeConfig> = {},
): MiniappRuntimeConfig {
  const base: MiniappRuntimeConfig = {
    releaseProfile: "LOCAL",
    storageMode: "MEMORY_TEST",
    authMode: "LOCAL_TEST",
    weatherProvider: "OPEN_METEO_NONCOMMERCIAL",
    openMeteoEvidenceMode: "OPEN_METEO_NONCOMMERCIAL",
    routeProvider: "DISABLED",
    placeSearchProvider: "DISABLED",
    mediaStorage: {
      mode: "LOCAL_FILESYSTEM",
      root: null,
      maxUploadBytes: 1_200_000,
    },
    databaseUrl: null,
    redisUrl: null,
    cachePrefix: "starward:miniapp:test:",
    autoMigrate: false,
    openMeteoApiKey: null,
    qweather: {
      apiHost: null,
      credentialId: null,
      projectId: null,
      privateKeyPem: null,
    },
    amapWebServiceKey: null,
    wechat: { appId: null, appSecret: null, sessionSecret: "test-only-session-secret-not-for-release" },
    trialRegion: "TEST",
    eventCatalogVersion: METEOR_EVENT_CATALOG_VERSION,
    darkSkyDatasetVersion: "test-dark-sky",
    skyCatalogVersion: "test-sky-catalog",
    astronomyAlgorithmVersion: "test-astronomy",
    opportunityRuleVersion: "test-opportunity",
    tripDecisionRuleVersion: "test-trip-decision",
    features: { ...SELECTED_FEATURE_FLAGS, WECHAT_AUTH_ENABLED: false },
  };
  const config = { ...base, ...overrides };
  assertFeatureFlagClosure(config.features);
  return Object.freeze(config);
}
