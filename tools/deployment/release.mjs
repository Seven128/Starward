import { createHash } from "node:crypto";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { composeExecutor } from "./compose-runtime.mjs";
import { readEnvironmentFile } from "./env-file.mjs";
import { publicReadiness } from "./public-readiness.mjs";
import { validateReleaseEnvironment } from "./validate-release-environment.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const composePath = path.join(root, "infrastructure", "deployment", "compose.yml");
const backupMaximumAgeMs = 6 * 60 * 60 * 1000;

function digest(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function safeOperator(value) {
  if (!/^[A-Za-z0-9._:@/-]{2,120}$/u.test(value ?? ""))
    throw new Error("release_operator_invalid");
  return value;
}

function failureCode(error) {
  const message = error instanceof Error ? error.message : "";
  return /^[a-z][a-z0-9_-]*(?::[A-Za-z0-9_.-]+)*$/u.test(message)
    ? message
    : "release_unexpected_failure";
}

async function validateBackupManifest({ manifestPath, validation, deploy, now }) {
  if (!manifestPath || !path.isAbsolute(manifestPath))
    throw new Error("release_backup_manifest_path_must_be_absolute");
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  if (
    manifest.schemaVersion !== "starward-verified-backup-v1" ||
    manifest.status !== "verified" ||
    manifest.restore?.status !== "restored_and_verified" ||
    manifest.restore?.temporaryDatabaseDropped !== true
  ) throw new Error("release_backup_manifest_not_verified");
  if (manifest.environment !== validation.environment)
    throw new Error("release_backup_environment_mismatch");
  if (manifest.composeProject !== deploy.COMPOSE_PROJECT_NAME)
    throw new Error("release_backup_project_mismatch");
  if (manifest.releaseRevision !== validation.revision || manifest.releaseImageDigest !== validation.imageDigest)
    throw new Error("release_backup_candidate_mismatch");
  const verifiedAt = Date.parse(manifest.verifiedAt);
  const age = now.getTime() - verifiedAt;
  if (!Number.isFinite(verifiedAt) || age < -5 * 60 * 1000 || age > backupMaximumAgeMs)
    throw new Error("release_backup_manifest_stale");
  const encryptedFile = manifest.encrypted?.fileName;
  if (typeof encryptedFile !== "string" || path.basename(encryptedFile) !== encryptedFile)
    throw new Error("release_backup_file_name_invalid");
  const encryptedPath = path.join(path.dirname(manifestPath), encryptedFile);
  const metadata = await stat(encryptedPath);
  if (!metadata.isFile() || metadata.size !== manifest.encrypted.byteLength)
    throw new Error("release_backup_file_size_mismatch");
  const bytes = await readFile(encryptedPath);
  if (digest(bytes) !== manifest.encrypted.sha256)
    throw new Error("release_backup_file_digest_mismatch");
  return Object.freeze({
    manifestSchema: manifest.schemaVersion,
    schemaMigration: manifest.schemaMigration,
    verifiedAt: manifest.verifiedAt,
    encryptedSha256: manifest.encrypted.sha256,
  });
}

async function writeReceipt({ validation, operator, startedAt, finishedAt, status, steps, backup, errorCode }) {
  await mkdir(validation.operations.receiptDirectory, { recursive: true, mode: 0o700 });
  const stamp = startedAt.replace(/[:.]/gu, "-");
  const receiptPath = path.join(
    validation.operations.receiptDirectory,
    `${validation.environment}-${stamp}-${validation.revision.slice(0, 12)}.release.json`,
  );
  const receipt = Object.freeze({
    schemaVersion: "starward-release-receipt-v1",
    status,
    environment: validation.environment,
    domain: validation.domain,
    revision: validation.revision,
    imageDigest: validation.imageDigest,
    operator,
    startedAt,
    finishedAt,
    backup,
    steps,
    errorCode,
  });
  await writeFile(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`, { mode: 0o600, flag: "wx" });
  return Object.freeze({ receiptPath, receipt });
}

export async function executeRelease({
  deployEnvPath,
  backupManifestPath,
  operator,
  confirmProductionDigest,
  execute,
  fetchImpl,
  inspectTls,
  delay,
  now = () => new Date(),
}) {
  const validation = await validateReleaseEnvironment({ deployEnvPath });
  const deploy = await readEnvironmentFile(deployEnvPath);
  const selectedOperator = safeOperator(operator);
  if (validation.environment === "production" && confirmProductionDigest !== validation.imageDigest)
    throw new Error("release_production_digest_confirmation_required");
  const startedAt = now().toISOString();
  const run = composeExecutor({ composePath, deployEnvPath, cwd: root, execute });
  const steps = [];
  let backup = null;
  const perform = (name, action) => {
    action();
    steps.push(Object.freeze({ name, status: "passed" }));
  };
  try {
    backup = await validateBackupManifest({
      manifestPath: backupManifestPath,
      validation,
      deploy,
      now: new Date(startedAt),
    });
    steps.push(Object.freeze({ name: "backup-verification", status: "passed" }));
    perform("compose-version", () => run({ args: ["version"], step: "release-compose-version" }));
    perform("compose-config", () => run({ args: ["config", "--quiet"], step: "release-compose-config" }));
    perform("image-pull", () => run({ args: ["pull"], step: "release-image-pull" }));
    perform("migration", () => run({ args: ["--profile", "operations", "run", "--rm", "migrate"], step: "release-migration" }));
    perform("converge", () => run({ args: ["up", "-d", "--wait", "--remove-orphans"], step: "release-converge" }));
    perform("worker-readiness", () => run({
      args: ["exec", "-T", "worker", "node", "--conditions=production", "workers/miniapp-api/dist/worker-healthcheck.js"],
      step: "release-worker-readiness",
    }));
    const health = await publicReadiness({ validation, fetchImpl, inspectTls, delay, now });
    steps.push(Object.freeze({
      name: "public-readiness",
      status: "passed",
      release: health.release,
      http: health.http,
      tls: health.tls,
    }));
    return writeReceipt({
      validation,
      operator: selectedOperator,
      startedAt,
      finishedAt: now().toISOString(),
      status: "succeeded",
      steps,
      backup,
      errorCode: null,
    });
  } catch (error) {
    const errorCode = failureCode(error);
    steps.push(Object.freeze({ name: "release", status: "failed", errorCode }));
    const failed = await writeReceipt({
      validation,
      operator: selectedOperator,
      startedAt,
      finishedAt: now().toISOString(),
      status: "failed",
      steps,
      backup,
      errorCode,
    });
    throw new Error(`release_failed:${failed.receiptPath}:${errorCode}`);
  }
}

function option(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : null;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  try {
    const result = await executeRelease({
      deployEnvPath: option("--deploy-env"),
      backupManifestPath: option("--backup-manifest"),
      operator: option("--operator") ?? process.env.GITHUB_ACTOR,
      confirmProductionDigest: option("--confirm-production-digest"),
    });
    process.stdout.write(`${JSON.stringify({
      status: result.receipt.status,
      environment: result.receipt.environment,
      imageDigest: result.receipt.imageDigest,
      receiptPath: result.receiptPath,
    })}\n`);
  } catch (error) {
    process.stderr.write(`${JSON.stringify({
      status: "failed",
      code: error instanceof Error ? error.message : "release_failed",
    })}\n`);
    process.exitCode = 1;
  }
}
