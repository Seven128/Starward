import { createHash } from "node:crypto";
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

export const releaseRevision = "a".repeat(40);
export const releaseImageDigest = `sha256:${"b".repeat(64)}`;

const databasePassword = "database-password-at-least-24";
const redisPassword = "redis-password-at-least-24xx";

function lines(values) {
  return `${Object.entries(values).map(([key, value]) => `${key}=${value}`).join("\n")}\n`;
}

export async function createReleaseEnvironmentFixture(overrides = {}) {
  const fixtureRoot = await mkdtemp(path.join(os.tmpdir(), "starward-release-env-"));
  const backupDirectory = path.join(fixtureRoot, "backups");
  const receiptDirectory = path.join(fixtureRoot, "receipts");
  const backupKeyFile = path.join(fixtureRoot, "backup.key");
  await writeFile(backupKeyFile, `${"1".repeat(64)}\n`);
  const lanePaths = Object.fromEntries(
    ["api", "worker", "migrate", "postgres", "redis"].map((lane) => [lane, path.join(fixtureRoot, `${lane}.env`)]),
  );
  const environment = overrides.environment ?? "staging";
  const domain = environment === "production" ? "api.starward.test" : "api-staging.starward.test";
  const project = `starward-${environment}`;
  const databaseUrl = `postgresql://starward:${databasePassword}@postgres:5432/starward`;
  const redisUrl = `redis://:${redisPassword}@redis:6379/0`;
  const api = {
    NODE_ENV: "production",
    MINIAPP_API_HOST: "0.0.0.0",
    MINIAPP_API_PORT: "8787",
    MINIAPP_CORS_ORIGINS: `https://${domain}`,
    MINIAPP_TRUST_PROXY_CIDRS: "172.30.10.2/32",
    MINIAPP_RATE_LIMIT_MAX: "120",
    MINIAPP_RATE_LIMIT_WINDOW_MS: "60000",
    MINIAPP_RELEASE_PROFILE: environment === "production" ? "COMMERCIAL" : "TRIAL",
    MINIAPP_STORAGE_MODE: "POSTGRES",
    MINIAPP_AUTH_MODE: "WECHAT",
    MINIAPP_MEDIA_STORAGE_MODE: "DISABLED",
    MINIAPP_AUTO_MIGRATE: "0",
    MINIAPP_ACCEPTANCE_MODE: "0",
    MINIAPP_DEVELOPMENT_FIXTURE_MODE: "0",
    DATABASE_URL: databaseUrl,
    REDIS_URL: redisUrl,
    MINIAPP_CACHE_PREFIX: `starward:${environment}:`,
    MINIAPP_QUEUE_NAME: `starward-${environment}-outbox`,
    WECHAT_MINIAPP_APP_ID: "wx1234567890abcd",
    WECHAT_MINIAPP_APP_SECRET: "wechat-app-secret-at-least-24",
    MINIAPP_SESSION_SECRET: "session-secret-at-least-thirty-two-characters",
    MINIAPP_ADMIN_TOKEN: "admin-token-at-least-thirty-two-characters",
    MINIAPP_WEATHER_PROVIDER: "QWEATHER",
    QWEATHER_API_HOST: "example.qweatherapi.com",
    QWEATHER_CREDENTIAL_ID: "qweather-credential",
    QWEATHER_PROJECT_ID: "qweather-project",
    QWEATHER_PRIVATE_KEY_PEM: "-----BEGIN PRIVATE KEY-----fake-test-material-----END PRIVATE KEY-----",
    MINIAPP_ROUTE_PROVIDER: "DISABLED",
    MINIAPP_PLACE_SEARCH_PROVIDER: "DISABLED",
    ...(overrides.api ?? {}),
  };
  const worker = {
    DATABASE_URL: databaseUrl,
    REDIS_URL: redisUrl,
    MINIAPP_QUEUE_NAME: `starward-${environment}-outbox`,
    MINIAPP_WORKER_HEARTBEAT_FILE: "/run/starward/worker-heartbeat.json",
    MINIAPP_WORKER_HEARTBEAT_MAX_AGE_MS: "30000",
    ...(overrides.worker ?? {}),
  };
  const migrate = { DATABASE_URL: databaseUrl, MINIAPP_AUTO_MIGRATE: "0", ...(overrides.migrate ?? {}) };
  const postgres = { POSTGRES_DB: "starward", POSTGRES_USER: "starward", POSTGRES_PASSWORD: databasePassword, ...(overrides.postgres ?? {}) };
  const redis = { REDIS_PASSWORD: redisPassword, ...(overrides.redis ?? {}) };
  await Promise.all([
    writeFile(lanePaths.api, lines(api)),
    writeFile(lanePaths.worker, lines(worker)),
    writeFile(lanePaths.migrate, lines(migrate)),
    writeFile(lanePaths.postgres, lines(postgres)),
    writeFile(lanePaths.redis, lines(redis)),
  ]);
  const baseDeployPath = path.join(fixtureRoot, "deploy.base.env");
  const deployPath = path.join(fixtureRoot, "deploy.env");
  const baseDeploy = {
    STARWARD_ENVIRONMENT: environment,
    COMPOSE_PROJECT_NAME: project,
    STARWARD_IMAGE_REPOSITORY: "registry.example/starward",
    STARWARD_API_DOMAIN: domain,
    CADDY_EMAIL: "operator@starward.test",
    STARWARD_API_ENV_FILE: lanePaths.api,
    STARWARD_WORKER_ENV_FILE: lanePaths.worker,
    STARWARD_MIGRATE_ENV_FILE: lanePaths.migrate,
    STARWARD_POSTGRES_ENV_FILE: lanePaths.postgres,
    STARWARD_REDIS_ENV_FILE: lanePaths.redis,
    STARWARD_BACKUP_DIRECTORY: backupDirectory,
    STARWARD_BACKUP_ENCRYPTION_KEY_FILE: backupKeyFile,
    STARWARD_BACKUP_MAX_BYTES: "268435456",
    STARWARD_RECEIPT_DIRECTORY: receiptDirectory,
    ...(overrides.baseDeploy ?? {}),
  };
  const deploy = {
    ...baseDeploy,
    STARWARD_IMAGE_REF: `registry.example/starward@${releaseImageDigest}`,
    STARWARD_RELEASE_REVISION: releaseRevision,
    STARWARD_IMAGE_DIGEST: releaseImageDigest,
    STARWARD_RELEASED_AT: "2026-08-26T10:00:00.000Z",
    ...(overrides.deploy ?? {}),
  };
  await writeFile(baseDeployPath, lines(baseDeploy));
  await writeFile(deployPath, lines(deploy));
  return Object.freeze({
    root: fixtureRoot,
    baseDeployPath,
    deployPath,
    backupDirectory,
    receiptDirectory,
    environment,
    domain,
    project,
  });
}

export async function createVerifiedBackupFixture({ fixture, now = new Date("2026-08-26T11:00:00.000Z"), overrides = {} }) {
  await mkdir(fixture.backupDirectory, { recursive: true });
  const encryptedFileName = `${fixture.environment}-verified.dump.enc`;
  const encryptedBytes = Buffer.from("authenticated-encrypted-backup-fixture");
  await writeFile(path.join(fixture.backupDirectory, encryptedFileName), encryptedBytes);
  const manifest = {
    schemaVersion: "starward-verified-backup-v1",
    status: "verified",
    environment: fixture.environment,
    composeProject: fixture.project,
    releaseRevision,
    releaseImageDigest,
    createdAt: now.toISOString(),
    verifiedAt: now.toISOString(),
    schemaMigration: "202608260001",
    encrypted: {
      fileName: encryptedFileName,
      byteLength: encryptedBytes.length,
      sha256: createHash("sha256").update(encryptedBytes).digest("hex"),
    },
    restore: {
      status: "restored_and_verified",
      temporaryDatabaseDropped: true,
    },
    ...overrides,
  };
  const manifestPath = path.join(fixture.backupDirectory, `${fixture.environment}-verified.manifest.json`);
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  return Object.freeze({ manifestPath, manifest, encryptedFileName });
}
