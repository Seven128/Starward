import {
  SELECTED_FEATURE_FLAGS,
  assertFeatureFlagClosure,
  type FeatureFlags,
} from "@starward/miniapp-contracts";
import { ASTRONOMICAL_EVENT_CATALOG_VERSION } from "./astronomical-event-catalog.ts";
import { validateDeliveryIdentityKey } from "./wechat-delivery-identity.ts";

export type ReleaseProfile = "LOCAL" | "TRIAL" | "COMMERCIAL";
export type StorageMode = "MEMORY_TEST" | "POSTGRES";
export type AuthMode = "LOCAL_TEST" | "WECHAT";
export type WeatherProviderMode = "QWEATHER";
export type QWeatherForecastHours = number;
export type RouteProviderMode = "DISABLED";
export type PlaceSearchProviderMode = "DISABLED";
export type MediaStorageMode = "LOCAL_FILESYSTEM" | "DISABLED";
export type EventArticleDnsMode = "SYSTEM" | "CLOUDFLARE_DOH";

export interface MiniappRuntimeConfig {
  releaseProfile: ReleaseProfile;
  storageMode: StorageMode;
  authMode: AuthMode;
  weatherProvider: WeatherProviderMode;
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
  qweather: {
    apiHost: string | null;
    credentialId: string | null;
    projectId: string | null;
    privateKeyPem: string | null;
    forecastHours: QWeatherForecastHours;
  };
  wechat: {
    appId: string | null;
    appSecret: string | null;
    sessionSecret: string;
    deliveryIdentityKey?: string | null;
    subscriptionTemplateId?: string | null;
  };
  trialRegion: string;
  eventCatalogVersion: string;
  eventCatalogCheckIntervalDays: number;
  eventArticleDnsMode: EventArticleDnsMode;
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

function qweatherForecastHours(): QWeatherForecastHours {
  return boundedInteger("QWEATHER_FORECAST_HOURS", 240, 1, 240);
}

function boundedInteger(name: string, fallback: number, minimum: number, maximum: number) {
  const raw = value(name);
  const selected = raw === null ? fallback : Number(raw);
  if (!Number.isInteger(selected) || selected < minimum || selected > maximum)
    throw new Error(`runtime_config_invalid:${name}:${raw}`);
  return selected;
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
    ["QWEATHER"] as const,
    "QWEATHER",
  );
  const routeProvider = oneOf(
    "MINIAPP_ROUTE_PROVIDER",
    value("MINIAPP_ROUTE_PROVIDER"),
    ["DISABLED"] as const,
    "DISABLED",
  );
  const placeSearchProvider = oneOf(
    "MINIAPP_PLACE_SEARCH_PROVIDER",
    value("MINIAPP_PLACE_SEARCH_PROVIDER"),
    ["DISABLED"] as const,
    "DISABLED",
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
  const qweather = {
    apiHost: value("QWEATHER_API_HOST"),
    credentialId: value("QWEATHER_CREDENTIAL_ID"),
    projectId: value("QWEATHER_PROJECT_ID"),
    privateKeyPem: value("QWEATHER_PRIVATE_KEY_PEM")?.replace(/\\n/gu, "\n") ?? null,
    forecastHours: qweatherForecastHours(),
  };
  const wechat = {
    appId: value("WECHAT_MINIAPP_APP_ID"),
    appSecret: value("WECHAT_MINIAPP_APP_SECRET"),
    sessionSecret: value("MINIAPP_SESSION_SECRET") ?? "",
    deliveryIdentityKey: value("WECHAT_DELIVERY_IDENTITY_KEY"),
    subscriptionTemplateId: value("WECHAT_REMINDER_TEMPLATE_ID"),
  };
  if (wechat.deliveryIdentityKey) {
    validateDeliveryIdentityKey(wechat.deliveryIdentityKey);
    if (wechat.deliveryIdentityKey === wechat.sessionSecret)
      throw new Error("runtime_config_invalid:wechat_delivery_key_must_be_independent");
  }
  if (wechat.subscriptionTemplateId && !/^[A-Za-z0-9_-]{1,128}$/u.test(wechat.subscriptionTemplateId))
    throw new Error("runtime_config_invalid:wechat_reminder_template_id");
  const darkSkyDatasetVersion =
    value("MINIAPP_DARK_SKY_DATASET_VERSION") ?? "UNAVAILABLE";
  const eventCatalogVersion =
    value("MINIAPP_EVENT_CATALOG_VERSION") ?? ASTRONOMICAL_EVENT_CATALOG_VERSION;

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
    releaseProfile !== "LOCAL" &&
    Object.values(qweather).some((part) => !part)
  )
    throw new Error("runtime_config_invalid:qweather_credentials_required");
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
  if (eventCatalogVersion !== ASTRONOMICAL_EVENT_CATALOG_VERSION)
    throw new Error("runtime_config_invalid:event_catalog_not_installed");
  if (releaseProfile !== "LOCAL" && mediaStorageMode === "LOCAL_FILESYSTEM")
    throw new Error("runtime_config_invalid:local_media_storage_local_only");

  return Object.freeze({
    releaseProfile,
    storageMode,
    authMode,
    weatherProvider,
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
    qweather,
    wechat,
    trialRegion: value("MINIAPP_TRIAL_REGION") ?? "GREATER_BAY_AREA_3H",
    eventCatalogVersion,
    eventCatalogCheckIntervalDays: boundedInteger("MINIAPP_EVENT_CATALOG_CHECK_INTERVAL_DAYS", 7, 1, 30),
    eventArticleDnsMode: oneOf("MINIAPP_EVENT_ARTICLE_DNS_MODE", value("MINIAPP_EVENT_ARTICLE_DNS_MODE"), ["SYSTEM", "CLOUDFLARE_DOH"], "SYSTEM"),
    darkSkyDatasetVersion,
    skyCatalogVersion:
      value("MINIAPP_SKY_CATALOG_VERSION") ?? "iau-bright-targets-2026.1",
    astronomyAlgorithmVersion:
      value("MINIAPP_ASTRONOMY_ALGORITHM_VERSION") ?? "astronomy-engine-2.1.19",
    opportunityRuleVersion:
      value("MINIAPP_OPPORTUNITY_RULE_VERSION") ?? "sky-opportunity-qweather-total-2",
    tripDecisionRuleVersion:
      value("MINIAPP_TRIP_DECISION_RULE_VERSION") ?? "trip-decision-1",
    features: selectedFlags({
      authMode,
      realWeatherEnabled: true,
      layeredCloudEnabled: false,
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
    weatherProvider: "QWEATHER",
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
    qweather: {
      apiHost: null,
      credentialId: null,
      projectId: null,
      privateKeyPem: null,
      forecastHours: 240,
    },
    wechat: { appId: null, appSecret: null, sessionSecret: "test-only-session-secret-not-for-release" },
    trialRegion: "TEST",
    eventCatalogVersion: ASTRONOMICAL_EVENT_CATALOG_VERSION,
    eventCatalogCheckIntervalDays: 7,
    eventArticleDnsMode: "SYSTEM",
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
