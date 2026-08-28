import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { composeExecutor } from "./compose-runtime.mjs";
import { readEnvironmentFile } from "./env-file.mjs";
import { validateReleaseEnvironment } from "./validate-release-environment.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const composePath = path.join(root, "infrastructure", "deployment", "compose.yml");
const envelopeMagic = Buffer.from("STARWARD-ENCRYPTED-PGDUMP-V1\n", "utf8");
export const PERSONAL_TRIAL_BACKUP_DAYS = 7;
export const PERSONAL_TRIAL_BACKUP_POLICY = "personal-trial-7d";
const schemaQuery = "SELECT CASE WHEN to_regclass('public.schema_migrations') IS NULL THEN 'EMPTY_UNINITIALIZED' ELSE COALESCE((SELECT MAX(version) FROM schema_migrations), 'EMPTY_UNINITIALIZED') END";

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

export function postgresIdentifier(value, code) {
  if (!/^[a-z][a-z0-9_]{0,62}$/u.test(value)) throw new Error(code);
  return value;
}

export function decodeBackupKey(text) {
  const selected = text.trim();
  const key = /^[0-9a-f]{64}$/iu.test(selected)
    ? Buffer.from(selected, "hex")
    : Buffer.from(selected, "base64");
  if (key.length !== 32) throw new Error("backup_encryption_key_invalid");
  return key;
}

export function encryptBackup(plaintext, key, nonce = randomBytes(12)) {
  if (!Buffer.isBuffer(plaintext) || plaintext.length === 0)
    throw new Error("backup_plaintext_invalid");
  if (!Buffer.isBuffer(key) || key.length !== 32 || !Buffer.isBuffer(nonce) || nonce.length !== 12)
    throw new Error("backup_encryption_parameters_invalid");
  const cipher = createCipheriv("aes-256-gcm", key, nonce);
  cipher.setAAD(envelopeMagic);
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const header = Buffer.from(`${JSON.stringify({
    algorithm: "aes-256-gcm",
    nonce: nonce.toString("base64"),
    tag: cipher.getAuthTag().toString("base64"),
  })}\n`, "utf8");
  return Buffer.concat([envelopeMagic, header, ciphertext]);
}

export function decryptBackup(envelope, key) {
  if (!Buffer.isBuffer(envelope) || !envelope.subarray(0, envelopeMagic.length).equals(envelopeMagic))
    throw new Error("backup_envelope_invalid");
  const headerEnd = envelope.indexOf(0x0a, envelopeMagic.length);
  if (headerEnd < 0 || headerEnd - envelopeMagic.length > 2048)
    throw new Error("backup_envelope_header_invalid");
  const header = JSON.parse(envelope.subarray(envelopeMagic.length, headerEnd).toString("utf8"));
  if (header.algorithm !== "aes-256-gcm") throw new Error("backup_envelope_algorithm_invalid");
  const nonce = Buffer.from(header.nonce, "base64");
  const tag = Buffer.from(header.tag, "base64");
  if (nonce.length !== 12 || tag.length !== 16) throw new Error("backup_envelope_header_invalid");
  const decipher = createDecipheriv("aes-256-gcm", key, nonce);
  decipher.setAAD(envelopeMagic);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(envelope.subarray(headerEnd + 1)), decipher.final()]);
}

export async function readBackupKeyFile(filePath) {
  const metadata = await stat(filePath);
  if (!metadata.isFile()) throw new Error("backup_encryption_key_not_file");
  if (process.platform !== "win32" && (metadata.mode & 0o077) !== 0)
    throw new Error("backup_encryption_key_permissions_too_open");
  return decodeBackupKey(await readFile(filePath, "utf8"));
}

export function postgresCommand(executable, args) {
  return [
    "exec", "-T", "postgres", "sh", "-euc",
    "export PGPASSWORD=\"$POSTGRES_PASSWORD\"; exec \"$@\"",
    "starward-postgres", executable, ...args,
  ];
}

export function schemaVersion(run, databaseName, postgresUser, maxBuffer, step) {
  const result = run({
    args: postgresCommand("psql", [
      `--username=${postgresUser}`,
      "--dbname", databaseName,
      "--set", "ON_ERROR_STOP=1",
      "--tuples-only",
      "--no-align",
      "--command", schemaQuery,
    ]),
    maxBuffer,
    step,
  });
  const selected = result.stdout.toString("utf8").trim();
  if (!/^[a-zA-Z0-9._-]{1,128}$/u.test(selected))
    throw new Error(`backup_schema_identity_invalid:${step}`);
  return selected;
}

export async function executeVerifiedBackup({
  validation,
  deploy,
  postgres,
  key,
  run,
  now = () => new Date(),
  random = randomBytes,
}) {
  const databaseName = postgresIdentifier(postgres.POSTGRES_DB, "backup_database_name_invalid");
  const postgresUser = postgresIdentifier(postgres.POSTGRES_USER, "backup_database_user_invalid");
  const maxBuffer = validation.operations.maxBackupBytes;
  const createdAt = now().toISOString();
  const personalTrial = validation.schemaVersion === "starward-operator-preview-validation-v1";
  if (personalTrial && validation.environment !== "staging")
    throw new Error("backup_personal_trial_requires_staging");
  // This records the retention target; backup creation never prunes existing files.
  const retention = personalTrial ? Object.freeze({
    policyId: PERSONAL_TRIAL_BACKUP_POLICY,
    days: PERSONAL_TRIAL_BACKUP_DAYS,
    expiresAt: new Date(Date.parse(createdAt) + PERSONAL_TRIAL_BACKUP_DAYS * 86400000).toISOString(),
    cleanupPerformed: false,
  }) : null;
  const sourceSchema = schemaVersion(run, databaseName, postgresUser, 1024 * 1024, "backup-source-schema");
  const dump = run({
    args: postgresCommand("pg_dump", [
      `--username=${postgresUser}`,
      `--dbname=${databaseName}`,
      "--format=custom",
      "--no-owner",
      "--no-privileges",
      "--serializable-deferrable",
    ]),
    maxBuffer,
    step: "backup-dump",
  }).stdout;
  if (dump.length < 512) throw new Error("backup_dump_too_small");
  if (dump.length > maxBuffer) throw new Error("backup_dump_size_limit_exceeded");

  const suffix = random(6).toString("hex");
  const restoreDatabase = postgresIdentifier(
    `starward_restore_${validation.environment}_${suffix}`,
    "backup_restore_database_name_invalid",
  );
  let restoreCreated = false;
  try {
    run({
      args: postgresCommand("createdb", [
        `--username=${postgresUser}`,
        `--owner=${postgresUser}`,
        restoreDatabase,
      ]),
      maxBuffer: 1024 * 1024,
      step: "backup-restore-create",
    });
    restoreCreated = true;
    run({
      args: postgresCommand("pg_restore", [
        `--username=${postgresUser}`,
        `--dbname=${restoreDatabase}`,
        "--no-owner",
        "--no-privileges",
        "--exit-on-error",
      ]),
      input: dump,
      maxBuffer: 8 * 1024 * 1024,
      step: "backup-restore-load",
    });
    const restoredSchema = schemaVersion(run, restoreDatabase, postgresUser, 1024 * 1024, "backup-restored-schema");
    if (restoredSchema !== sourceSchema)
      throw new Error("backup_restore_schema_mismatch");
  } finally {
    if (restoreCreated) {
      run({
        args: postgresCommand("dropdb", [
          `--username=${postgresUser}`,
          "--force",
          "--if-exists",
          restoreDatabase,
        ]),
        maxBuffer: 1024 * 1024,
        step: "backup-restore-cleanup",
      });
    }
  }

  const encrypted = encryptBackup(dump, key, random(12));
  const stamp = createdAt.replace(/[:.]/gu, "-");
  const fileName = `${validation.environment}-${stamp}-${validation.revision.slice(0, 12)}-${suffix}.pgdump.enc`;
  await mkdir(validation.operations.backupDirectory, { recursive: true, mode: 0o700 });
  const encryptedPath = path.join(validation.operations.backupDirectory, fileName);
  await writeFile(encryptedPath, encrypted, { mode: 0o600, flag: "wx" });
  const manifest = Object.freeze({
    schemaVersion: "starward-verified-backup-v1",
    status: "verified",
    environment: validation.environment,
    composeProject: deploy.COMPOSE_PROJECT_NAME,
    sourceDatabase: databaseName,
    releaseRevision: validation.revision,
    releaseImageDigest: validation.imageDigest,
    schemaMigration: sourceSchema,
    createdAt,
    verifiedAt: now().toISOString(),
    ...(retention ? { retention } : {}),
    encrypted: Object.freeze({
      algorithm: "aes-256-gcm",
      fileName,
      byteLength: encrypted.length,
      sha256: sha256(encrypted),
    }),
    restore: Object.freeze({
      status: "restored_and_verified",
      temporaryDatabaseDropped: true,
    }),
  });
  const manifestPath = `${encryptedPath}.manifest.json`;
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, { mode: 0o600, flag: "wx" });
  return Object.freeze({ encryptedPath, manifestPath, manifest });
}

export async function createVerifiedBackup({ deployEnvPath }) {
  const validation = await validateReleaseEnvironment({ deployEnvPath });
  const deploy = await readEnvironmentFile(deployEnvPath);
  const postgres = await readEnvironmentFile(validation.lanes.postgres);
  const key = await readBackupKeyFile(validation.operations.backupKeyFile);
  const run = composeExecutor({ composePath, deployEnvPath, cwd: root });
  return executeVerifiedBackup({ validation, deploy, postgres, key, run });
}

function option(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : null;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  try {
    const result = await createVerifiedBackup({ deployEnvPath: option("--deploy-env") });
    process.stdout.write(`${JSON.stringify({
      status: result.manifest.status,
      environment: result.manifest.environment,
      manifestPath: result.manifestPath,
      sha256: result.manifest.encrypted.sha256,
    })}\n`);
  } catch (error) {
    process.stderr.write(`${JSON.stringify({
      status: "failed",
      code: error instanceof Error ? error.message : "backup_failed",
    })}\n`);
    process.exitCode = 1;
  }
}
