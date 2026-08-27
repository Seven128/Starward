import path from "node:path";
import { isIPv4 } from "node:net";
import { pathToFileURL } from "node:url";
import { readEnvironmentFile } from "./env-file.mjs";

const SHA_PATTERN = /^[0-9a-f]{40}$/u;
const DIGEST_PATTERN = /^sha256:[0-9a-f]{64}$/u;
const HOST_PATTERN = /^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/u;
const IMAGE_REPOSITORY_PATTERN = /^[a-z0-9.-]+(?::[0-9]+)?(?:\/[a-z0-9._-]+)+$/u;
const RELEASE_IDENTITY_KEYS = Object.freeze([
  "STARWARD_ENVIRONMENT",
  "STARWARD_RELEASE_REVISION",
  "STARWARD_IMAGE_DIGEST",
  "STARWARD_RELEASED_AT",
]);
const SECRET_KEYS = new Set([
  "AMAP_WEB_SERVICE_KEY",
  "MINIAPP_ADMIN_TOKEN",
  "MINIAPP_SESSION_SECRET",
  "OPEN_METEO_API_KEY",
  "QWEATHER_CREDENTIAL_ID",
  "QWEATHER_PRIVATE_KEY_PEM",
  "QWEATHER_PROJECT_ID",
  "REDIS_PASSWORD",
  "WECHAT_MINIAPP_APP_SECRET",
]);

function fail(code, field) {
  throw new Error(field ? `${code}:${field}` : code);
}

function value(environment, key) {
  const selected = environment[key]?.trim();
  if (!selected) fail("release_environment_required", key);
  return selected;
}

function rejectPlaceholder(key, selected) {
  if (
    /^secret-ref:/iu.test(selected) ||
    /(?:CHANGE[_-]?ME|REPLACE[_-]?ME|TODO|TBD)/iu.test(selected) ||
    /^<[^>]+>$/u.test(selected) ||
    /\$\{[^}]+\}/u.test(selected)
  )
    fail("release_environment_unresolved", key);
}

function checkedValue(environment, key) {
  const selected = value(environment, key);
  rejectPlaceholder(key, selected);
  return selected;
}

function boundedInteger(environment, key, minimum, maximum) {
  const selected = checkedValue(environment, key);
  if (!/^[1-9][0-9]*$/u.test(selected))
    fail("release_environment_invalid", `api:${key}`);
  const parsed = Number(selected);
  if (!Number.isSafeInteger(parsed) || parsed < minimum || parsed > maximum)
    fail("release_environment_invalid", `api:${key}`);
  return parsed;
}

function equal(actual, expected, key) {
  if (actual !== expected) fail("release_environment_mismatch", key);
}

function secret(environment, key, minimumLength = 24) {
  const selected = checkedValue(environment, key);
  if (selected.length < minimumLength)
    fail("release_environment_secret_too_short", key);
  return selected;
}

function releaseIdentity(environment, expected) {
  equal(checkedValue(environment, "STARWARD_ENVIRONMENT"), expected.environment, "STARWARD_ENVIRONMENT");
  const revision = checkedValue(environment, "STARWARD_RELEASE_REVISION");
  if (!SHA_PATTERN.test(revision))
    fail("release_environment_invalid", "STARWARD_RELEASE_REVISION");
  const digest = checkedValue(environment, "STARWARD_IMAGE_DIGEST");
  if (!DIGEST_PATTERN.test(digest))
    fail("release_environment_invalid", "STARWARD_IMAGE_DIGEST");
  equal(digest, expected.imageDigest, "STARWARD_IMAGE_DIGEST");
  const releasedAt = checkedValue(environment, "STARWARD_RELEASED_AT");
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/u.test(releasedAt) || !Number.isFinite(Date.parse(releasedAt)))
    fail("release_environment_invalid", "STARWARD_RELEASED_AT");
  return { revision, digest, releasedAt };
}

function rejectLaneReleaseIdentity(environment, lane) {
  for (const key of RELEASE_IDENTITY_KEYS) {
    if (key in environment)
      fail("release_environment_lane_identity_forbidden", `${lane}:${key}`);
  }
}

function validateDatabase(api, postgres) {
  const databaseUrl = new URL(checkedValue(api, "DATABASE_URL"));
  if (databaseUrl.protocol !== "postgresql:" && databaseUrl.protocol !== "postgres:")
    fail("release_environment_invalid", "DATABASE_URL");
  equal(databaseUrl.hostname, "postgres", "DATABASE_URL:host");
  equal(decodeURIComponent(databaseUrl.username), checkedValue(postgres, "POSTGRES_USER"), "DATABASE_URL:user");
  equal(decodeURIComponent(databaseUrl.password), secret(postgres, "POSTGRES_PASSWORD"), "DATABASE_URL:password");
  equal(decodeURIComponent(databaseUrl.pathname.slice(1)), checkedValue(postgres, "POSTGRES_DB"), "DATABASE_URL:database");
}

function validateRedis(api, redis) {
  const redisUrl = new URL(checkedValue(api, "REDIS_URL"));
  equal(redisUrl.protocol, "redis:", "REDIS_URL:protocol");
  equal(redisUrl.hostname, "redis", "REDIS_URL:host");
  equal(decodeURIComponent(redisUrl.password), secret(redis, "REDIS_PASSWORD"), "REDIS_URL:password");
}

function validateApi(api, expected, postgres, redis) {
  rejectLaneReleaseIdentity(api, "api");
  equal(checkedValue(api, "NODE_ENV"), "production", "api:NODE_ENV");
  equal(checkedValue(api, "MINIAPP_API_HOST"), "0.0.0.0", "api:MINIAPP_API_HOST");
  equal(checkedValue(api, "MINIAPP_API_PORT"), "8787", "api:MINIAPP_API_PORT");
  equal(checkedValue(api, "MINIAPP_TRUST_PROXY_CIDRS"), "172.30.10.2/32", "api:MINIAPP_TRUST_PROXY_CIDRS");
  if ("MINIAPP_TRUST_PROXY_HOPS" in api)
    fail("release_environment_forbidden", "api:MINIAPP_TRUST_PROXY_HOPS");
  boundedInteger(api, "MINIAPP_RATE_LIMIT_MAX", 1, 5_000);
  boundedInteger(api, "MINIAPP_RATE_LIMIT_WINDOW_MS", 1_000, 3_600_000);
  equal(checkedValue(api, "MINIAPP_RELEASE_PROFILE"), expected.environment === "production" ? "COMMERCIAL" : "TRIAL", "api:MINIAPP_RELEASE_PROFILE");
  equal(checkedValue(api, "MINIAPP_STORAGE_MODE"), "POSTGRES", "api:MINIAPP_STORAGE_MODE");
  equal(checkedValue(api, "MINIAPP_AUTH_MODE"), expected.preview ? "LOCAL_TEST" : "WECHAT", "api:MINIAPP_AUTH_MODE");
  equal(checkedValue(api, "MINIAPP_MEDIA_STORAGE_MODE"), "DISABLED", "api:MINIAPP_MEDIA_STORAGE_MODE");
  equal(checkedValue(api, "MINIAPP_AUTO_MIGRATE"), "0", "api:MINIAPP_AUTO_MIGRATE");
  equal(checkedValue(api, "MINIAPP_ACCEPTANCE_MODE"), expected.preview ? "1" : "0", "api:MINIAPP_ACCEPTANCE_MODE");
  equal(checkedValue(api, "MINIAPP_DEVELOPMENT_FIXTURE_MODE"), "0", "api:MINIAPP_DEVELOPMENT_FIXTURE_MODE");
  const corsOrigins = checkedValue(api, "MINIAPP_CORS_ORIGINS").split(",").map((entry) => entry.trim()).filter(Boolean);
  if (!corsOrigins.includes(`https://${expected.domain}`))
    fail("release_environment_mismatch", "api:MINIAPP_CORS_ORIGINS");
  for (const origin of corsOrigins) {
    const parsed = new URL(origin);
    const allowed = expected.preview
      ? origin === `https://${expected.domain}`
      : parsed.protocol === "https:";
    if (!allowed || parsed.origin !== origin)
      fail("release_environment_invalid", "api:MINIAPP_CORS_ORIGINS");
  }
  validateDatabase(api, postgres);
  validateRedis(api, redis);
  equal(checkedValue(api, "MINIAPP_CACHE_PREFIX"), `starward:${expected.environment}:`, "api:MINIAPP_CACHE_PREFIX");
  equal(checkedValue(api, "MINIAPP_QUEUE_NAME"), `starward-${expected.environment}-outbox`, "api:MINIAPP_QUEUE_NAME");
  if (!expected.preview) {
    secret(api, "WECHAT_MINIAPP_APP_ID", 10);
    secret(api, "WECHAT_MINIAPP_APP_SECRET", 24);
  }
  secret(api, "MINIAPP_SESSION_SECRET", 32);
  secret(api, "MINIAPP_ADMIN_TOKEN", 32);
  const weatherProvider = checkedValue(api, "MINIAPP_WEATHER_PROVIDER");
  equal(weatherProvider, "QWEATHER", "api:MINIAPP_WEATHER_PROVIDER");
  equal(
    checkedValue(api, "QWEATHER_FORECAST_HOURS"),
    expected.environment === "production" ? "72" : "24",
    "api:QWEATHER_FORECAST_HOURS",
  );
  checkedValue(api, "QWEATHER_API_HOST");
  secret(api, "QWEATHER_CREDENTIAL_ID", 8);
  secret(api, "QWEATHER_PROJECT_ID", 8);
  secret(api, "QWEATHER_PRIVATE_KEY_PEM", 40);
  const expectedEvidenceMode =
    expected.environment === "production"
      ? "OPEN_METEO_COMMERCIAL"
      : "OPEN_METEO_NONCOMMERCIAL";
  equal(
    checkedValue(api, "MINIAPP_OPEN_METEO_EVIDENCE_MODE"),
    expectedEvidenceMode,
    "api:MINIAPP_OPEN_METEO_EVIDENCE_MODE",
  );
  if (expectedEvidenceMode === "OPEN_METEO_COMMERCIAL") {
    secret(api, "OPEN_METEO_API_KEY", 16);
  } else if ("OPEN_METEO_API_KEY" in api) {
    fail("release_environment_forbidden", "api:OPEN_METEO_API_KEY");
  }
  for (const provider of ["MINIAPP_ROUTE_PROVIDER", "MINIAPP_PLACE_SEARCH_PROVIDER"]) {
    const mode = checkedValue(api, provider);
    if (mode !== "AMAP" && mode !== "DISABLED")
      fail("release_environment_invalid", `api:${provider}`);
    if (mode === "AMAP") secret(api, "AMAP_WEB_SERVICE_KEY", 16);
  }
}

function validateWorker(worker, expected, api) {
  rejectLaneReleaseIdentity(worker, "worker");
  for (const key of SECRET_KEYS) {
    if (key in worker) fail("release_environment_worker_secret_forbidden", key);
  }
  equal(checkedValue(worker, "DATABASE_URL"), checkedValue(api, "DATABASE_URL"), "worker:DATABASE_URL");
  equal(checkedValue(worker, "REDIS_URL"), checkedValue(api, "REDIS_URL"), "worker:REDIS_URL");
  equal(checkedValue(worker, "MINIAPP_QUEUE_NAME"), `starward-${expected.environment}-outbox`, "worker:MINIAPP_QUEUE_NAME");
  equal(checkedValue(worker, "MINIAPP_WORKER_HEARTBEAT_FILE"), "/run/starward/worker-heartbeat.json", "worker:MINIAPP_WORKER_HEARTBEAT_FILE");
  equal(checkedValue(worker, "MINIAPP_WORKER_HEARTBEAT_MAX_AGE_MS"), "30000", "worker:MINIAPP_WORKER_HEARTBEAT_MAX_AGE_MS");
}

function validateMigrate(migrate, expected, api) {
  rejectLaneReleaseIdentity(migrate, "migrate");
  equal(checkedValue(migrate, "DATABASE_URL"), checkedValue(api, "DATABASE_URL"), "migrate:DATABASE_URL");
  equal(checkedValue(migrate, "MINIAPP_AUTO_MIGRATE"), "0", "migrate:MINIAPP_AUTO_MIGRATE");
}

function validateDomain(environment, domain) {
  if (!HOST_PATTERN.test(domain) || domain.endsWith(".example.com") || domain.endsWith(".invalid"))
    fail("release_environment_invalid", "STARWARD_API_DOMAIN");
  const requiredPrefix = environment === "production" ? "api." : "api-staging.";
  if (!domain.startsWith(requiredPrefix))
    fail("release_environment_mismatch", "STARWARD_API_DOMAIN");
}

export function immutableImageDigest(imageReference) {
  const match = imageReference.match(/@(?<digest>sha256:[0-9a-f]{64})$/u);
  if (!match?.groups?.digest) fail("release_environment_mutable_image", "STARWARD_IMAGE_REF");
  return match.groups.digest;
}

async function readLaneFiles(deploy) {
  const laneKeys = {
    api: "STARWARD_API_ENV_FILE",
    worker: "STARWARD_WORKER_ENV_FILE",
    migrate: "STARWARD_MIGRATE_ENV_FILE",
    postgres: "STARWARD_POSTGRES_ENV_FILE",
    redis: "STARWARD_REDIS_ENV_FILE",
  };
  const files = Object.create(null);
  const used = new Set();
  for (const [lane, key] of Object.entries(laneKeys)) {
    const filePath = checkedValue(deploy, key);
    if (!path.isAbsolute(filePath)) fail("release_environment_path_not_absolute", key);
    if (used.has(filePath)) fail("release_environment_file_reused", key);
    used.add(filePath);
    files[lane] = { path: filePath, environment: await readEnvironmentFile(filePath) };
  }
  return files;
}

export async function validateReleaseEnvironment({ deployEnvPath }) {
  return validateEnvironment(deployEnvPath, false);
}

export async function validateOperatorPreviewEnvironment({ deployEnvPath }) {
  return validateEnvironment(deployEnvPath, true);
}

async function validateEnvironment(deployEnvPath, preview) {
  if (!deployEnvPath || !path.isAbsolute(deployEnvPath))
    fail("release_environment_path_not_absolute", "deployEnvPath");
  const deploy = await readEnvironmentFile(deployEnvPath);
  const environment = checkedValue(deploy, "STARWARD_ENVIRONMENT");
  if (environment !== "staging" && environment !== "production")
    fail("release_environment_invalid", "STARWARD_ENVIRONMENT");
  if (preview && environment !== "staging") fail("operator_preview_staging_required");
  equal(checkedValue(deploy, "COMPOSE_PROJECT_NAME"), `starward-${environment}`, "COMPOSE_PROJECT_NAME");
  const domain = checkedValue(deploy, "STARWARD_API_DOMAIN");
  if (preview) {
    if (!isIPv4(domain)) fail("operator_preview_ip_required");
    if (!/^[A-Za-z0-9_-]{43,128}$/u.test(checkedValue(deploy, "STARWARD_OPERATOR_PREVIEW_TOKEN")))
      fail("operator_preview_token_invalid");
  } else {
    if ("STARWARD_OPERATOR_PREVIEW_TOKEN" in deploy) fail("release_preview_token_forbidden");
    validateDomain(environment, domain);
  }
  const email = checkedValue(deploy, "CADDY_EMAIL");
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/u.test(email) || /@example\./iu.test(email))
    fail("release_environment_invalid", "CADDY_EMAIL");
  const imageReference = checkedValue(deploy, "STARWARD_IMAGE_REF");
  const digest = immutableImageDigest(imageReference);
  const imageRepository = checkedValue(deploy, "STARWARD_IMAGE_REPOSITORY");
  if (!IMAGE_REPOSITORY_PATTERN.test(imageRepository))
    fail("release_environment_invalid", "STARWARD_IMAGE_REPOSITORY");
  equal(imageReference, `${imageRepository}@${digest}`, "STARWARD_IMAGE_REF");
  const identity = releaseIdentity(deploy, { environment, imageDigest: digest });
  const backupDirectory = checkedValue(deploy, "STARWARD_BACKUP_DIRECTORY");
  const receiptDirectory = checkedValue(deploy, "STARWARD_RECEIPT_DIRECTORY");
  const backupKeyFile = checkedValue(deploy, "STARWARD_BACKUP_ENCRYPTION_KEY_FILE");
  for (const [field, selected] of [
    ["STARWARD_BACKUP_DIRECTORY", backupDirectory],
    ["STARWARD_RECEIPT_DIRECTORY", receiptDirectory],
    ["STARWARD_BACKUP_ENCRYPTION_KEY_FILE", backupKeyFile],
  ]) {
    if (!path.isAbsolute(selected))
      fail("release_environment_path_not_absolute", field);
  }
  if (path.normalize(backupDirectory) === path.normalize(receiptDirectory))
    fail("release_environment_path_reused", "STARWARD_BACKUP_DIRECTORY");
  const maxBackupBytes = Number(checkedValue(deploy, "STARWARD_BACKUP_MAX_BYTES"));
  if (!Number.isSafeInteger(maxBackupBytes) || maxBackupBytes < 1_048_576 || maxBackupBytes > 1_073_741_824)
    fail("release_environment_invalid", "STARWARD_BACKUP_MAX_BYTES");
  const files = await readLaneFiles(deploy);
  const protectedPaths = new Set([
    path.normalize(deployEnvPath),
    ...Object.values(files).map((record) => path.normalize(record.path)),
  ]);
  if (protectedPaths.has(path.normalize(backupKeyFile)))
    fail("release_environment_file_reused", "STARWARD_BACKUP_ENCRYPTION_KEY_FILE");
  secret(files.postgres.environment, "POSTGRES_PASSWORD");
  secret(files.redis.environment, "REDIS_PASSWORD");
  const expected = { environment, domain, preview };
  validateApi(files.api.environment, expected, files.postgres.environment, files.redis.environment);
  validateWorker(files.worker.environment, expected, files.api.environment);
  validateMigrate(files.migrate.environment, expected, files.api.environment);
  return Object.freeze({
    schemaVersion: preview ? "starward-operator-preview-validation-v1" : "starward-release-environment-validation-v1",
    status: "valid",
    environment,
    domain,
    revision: identity.revision,
    imageDigest: digest,
    imageRepository,
    releasedAt: identity.releasedAt,
    lanes: Object.freeze(Object.fromEntries(Object.entries(files).map(([lane, record]) => [lane, record.path]))),
    operations: Object.freeze({
      backupDirectory,
      backupKeyFile,
      maxBackupBytes,
      receiptDirectory,
    }),
  });
}

function argument(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : null;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  try {
    const result = await validateReleaseEnvironment({ deployEnvPath: argument("--deploy-env") });
    process.stdout.write(`${JSON.stringify(result)}\n`);
  } catch (error) {
    process.stderr.write(`${JSON.stringify({ status: "invalid", code: error instanceof Error ? error.message : "release_environment_validation_failed" })}\n`);
    process.exitCode = 1;
  }
}
