import { createHash } from "node:crypto";
import { postgresCommand, postgresIdentifier } from "./verified-backup.mjs";

const DIGEST_PATTERN = /^sha256:[0-9a-f]{64}$/u;
const SHA_PATTERN = /^[0-9a-f]{64}$/u;

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

export function fail(code, field) {
  throw new Error(field ? `${code}:${field}` : code);
}

export function failureCode(error) {
  const message = error instanceof Error ? error.message : "";
  return /^[a-z][a-z0-9_-]*(?::[A-Za-z0-9_.\\/-]+)*$/u.test(message)
    ? message
    : "recovery_unexpected_failure";
}

function sqlCommand(run, postgresUser, command, step) {
  return run({
    args: postgresCommand("psql", [
      `--username=${postgresUser}`,
      "--dbname=postgres",
      "--set=ON_ERROR_STOP=1",
      `--command=${command}`,
    ]),
    maxBuffer: 1024 * 1024,
    step,
  });
}

export function terminateConnections(run, postgresUser, databaseName, step) {
  sqlCommand(
    run,
    postgresUser,
    `SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '${databaseName}' AND pid <> pg_backend_pid();`,
    step,
  );
}

export function renameDatabase(run, postgresUser, from, to, step) {
  sqlCommand(run, postgresUser, `ALTER DATABASE ${from} RENAME TO ${to};`, step);
}

export function createRestoreDatabase(run, postgresUser, databaseName) {
  run({
    args: postgresCommand("createdb", [
      `--username=${postgresUser}`,
      `--owner=${postgresUser}`,
      databaseName,
    ]),
    maxBuffer: 1024 * 1024,
    step: "recovery-restore-create",
  });
}

export function loadRestoreDatabase(run, postgresUser, databaseName, dump, maxBuffer) {
  run({
    args: postgresCommand("pg_restore", [
      `--username=${postgresUser}`,
      `--dbname=${databaseName}`,
      "--no-owner",
      "--no-privileges",
      "--exit-on-error",
    ]),
    input: dump,
    maxBuffer,
    step: "recovery-restore-load",
  });
}

export function dropDatabase(run, postgresUser, databaseName, step) {
  run({
    args: postgresCommand("dropdb", [
      `--username=${postgresUser}`,
      "--force",
      "--if-exists",
      databaseName,
    ]),
    maxBuffer: 1024 * 1024,
    step,
  });
}

export function workerReadiness(run, step) {
  run({
    args: [
      "exec",
      "-T",
      "worker",
      "node",
      "--conditions=production",
      "workers/miniapp-api/dist/worker-healthcheck.js",
    ],
    maxBuffer: 1024 * 1024,
    step,
  });
}

export function validateRecoveryInputs({
  validation,
  deploy,
  postgres,
  manifest,
  envelope,
  confirmEnvironment,
  confirmBackupSha256,
  confirmTargetDatabase,
  operator,
}) {
  const targetDatabase = postgresIdentifier(postgres.POSTGRES_DB, "recovery_database_name_invalid");
  const postgresUser = postgresIdentifier(postgres.POSTGRES_USER, "recovery_database_user_invalid");
  if (confirmEnvironment !== validation.environment) fail("recovery_environment_confirmation_required");
  if (confirmTargetDatabase !== targetDatabase) fail("recovery_database_confirmation_required");
  if (!operator || !/^[A-Za-z0-9._:@/-]{2,120}$/u.test(operator)) fail("recovery_operator_invalid");
  if (
    manifest.schemaVersion !== "starward-verified-backup-v1" ||
    manifest.status !== "verified" ||
    manifest.restore?.status !== "restored_and_verified" ||
    manifest.restore?.temporaryDatabaseDropped !== true
  ) fail("recovery_manifest_not_verified");
  if (manifest.environment !== validation.environment) fail("recovery_manifest_environment_mismatch");
  if (manifest.composeProject !== deploy.COMPOSE_PROJECT_NAME) fail("recovery_manifest_project_mismatch");
  if (manifest.sourceDatabase !== targetDatabase) fail("recovery_manifest_database_mismatch");
  if (!/^[0-9a-f]{40}$/u.test(manifest.releaseRevision ?? "") || !DIGEST_PATTERN.test(manifest.releaseImageDigest ?? ""))
    fail("recovery_manifest_release_identity_invalid");
  if (!/^[A-Za-z0-9._-]{1,128}$/u.test(manifest.schemaMigration ?? "")) fail("recovery_manifest_schema_invalid");
  if (!Number.isFinite(Date.parse(manifest.createdAt)) || !Number.isFinite(Date.parse(manifest.verifiedAt)))
    fail("recovery_manifest_timestamp_invalid");
  if (manifest.encrypted?.algorithm !== "aes-256-gcm" || !SHA_PATTERN.test(manifest.encrypted?.sha256 ?? ""))
    fail("recovery_manifest_encryption_invalid");
  if (!Number.isSafeInteger(manifest.encrypted.byteLength) || manifest.encrypted.byteLength < 1)
    fail("recovery_manifest_encryption_invalid");
  if (confirmBackupSha256 !== manifest.encrypted.sha256) fail("recovery_backup_digest_confirmation_required");
  if (!Buffer.isBuffer(envelope) || envelope.length !== manifest.encrypted.byteLength) fail("recovery_backup_size_mismatch");
  if (sha256(envelope) !== manifest.encrypted.sha256) fail("recovery_backup_digest_mismatch");
  if (envelope.length > validation.operations.maxBackupBytes + 4096) fail("recovery_backup_size_limit_exceeded");
  return Object.freeze({ targetDatabase, postgresUser });
}
