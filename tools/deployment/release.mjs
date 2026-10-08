import { createHash } from "node:crypto";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { composeExecutor } from "./compose-runtime.mjs";
import { readEnvironmentFile } from "./env-file.mjs";
import { publicReadiness } from "./public-readiness.mjs";
import { validateReleaseEnvironment, validateStagingQualification } from "./validate-release-environment.mjs";
import { prepareSkyStaticDelivery, reuseSkyStaticRelease, verifySkyStaticDelivery, assertSkyStaticDeliveryIdentity } from "./sky-static-release.mjs";
import { readSkyStaticBackup, verifiedBackupSkyRecord } from "./sky-static-backup.mjs";
import { decryptBackup, readBackupKeyFile } from "./verified-backup.mjs";

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
    !["starward-verified-backup-v1", "starward-verified-backup-v2"].includes(manifest.schemaVersion) ||
    manifest.status !== "verified" ||
    manifest.restore?.status !== "restored_and_verified" ||
    manifest.restore?.temporaryDatabaseDropped !== true
  ) throw new Error("release_backup_manifest_not_verified");
  const skyStaticBackup = verifiedBackupSkyRecord(manifest);
  if (validation.operations.skyStaticDirectory && !skyStaticBackup) throw new Error("release_backup_sky_snapshot_required");
  if (path.resolve(path.dirname(manifestPath)) !== path.resolve(validation.operations.backupDirectory))
    throw new Error("release_backup_manifest_outside_backup_directory");
  if (skyStaticBackup) await readSkyStaticBackup({ backupDirectory: validation.operations.backupDirectory, record: skyStaticBackup });
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
  const authenticateSky = skyStaticBackup?.schemaVersion === "starward-sky-static-backup-v2";
  // Reuse the recovery owner's configured dump ceiling plus envelope allowance.
  // Legacy backups retain their original verification path.
  if (authenticateSky && metadata.size > validation.operations.maxBackupBytes + 4096)
    throw new Error("release_backup_size_limit_exceeded");
  const bytes = await readFile(encryptedPath);
  if (digest(bytes) !== manifest.encrypted.sha256)
    throw new Error("release_backup_file_digest_mismatch");
  if (authenticateSky) {
    let key, dump;
    try {
      key = await readBackupKeyFile(validation.operations.backupKeyFile);
      dump = decryptBackup(bytes, key, skyStaticBackup);
      if (dump.length < 512 || dump.length > validation.operations.maxBackupBytes)
        throw new Error("backup_dump_size_invalid");
    } catch {
      throw new Error("release_backup_sky_authentication_invalid");
    } finally { dump?.fill(0); key?.fill(0); }
  }
  return Object.freeze({
    manifestSchema: manifest.schemaVersion,
    schemaMigration: manifest.schemaMigration,
    verifiedAt: manifest.verifiedAt,
    encryptedSha256: manifest.encrypted.sha256,
    ...(skyStaticBackup ? { skyStaticBackup } : {}),
    ...(authenticateSky ? { skyStaticAuthentication: "AES_256_GCM_BOUND_COMPONENT_VERIFIED" } : {}),
  });
}

async function writeReceipt({ validation, operator, startedAt, finishedAt, status, steps, backup, errorCode, skyStaticDelivery }) {
  await mkdir(validation.operations.receiptDirectory, { recursive: true, mode: 0o700 });
  const stamp = startedAt.replace(/[:.]/gu, "-");
  const receiptPath = path.join(
    validation.operations.receiptDirectory,
    `${validation.environment}-${stamp}-${validation.revision.slice(0, 12)}.release.json`,
  );
  const receipt = Object.freeze({
    schemaVersion: validation.operations.skyStaticDirectory ? "starward-release-receipt-v2" : "starward-release-receipt-v1",
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
    ...(validation.operations.skyStaticDirectory ? {skyStaticDelivery: skyStaticDelivery ?? null} : {}),
  });
  await writeFile(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`, { mode: 0o600, flag: "wx" });
  return Object.freeze({ receiptPath, receipt });
}

export async function executeRelease({
  deployEnvPath,
  backupManifestPath,
  operator,
  confirmProductionDigest,
  stagingReceiptPath,
  execute,
  fetchImpl,
  inspectTls,
  delay,
  now = () => new Date(),
  prepareStatic = prepareSkyStaticDelivery,
  verifyStatic = verifySkyStaticDelivery,
  preparedStaticDelivery,
}) {
  const validation = await validateReleaseEnvironment({ deployEnvPath });
  const deploy = await readEnvironmentFile(deployEnvPath);
  const selectedOperator = safeOperator(operator);
  if (validation.environment === "production" && confirmProductionDigest !== validation.imageDigest)
    throw new Error("release_production_digest_confirmation_required");
  const startedAt = now().toISOString();
  let run = composeExecutor({ composePath, deployEnvPath, cwd: root, execute });
  const steps = [];
  let backup = null;
  let delivery = null;
  let skyStaticDelivery = null;
  const perform = (name, action) => {
    action();
    steps.push(Object.freeze({ name, status: "passed" }));
  };
  try {
    const stagingQualification = validation.environment === "production" && validation.operations.skyStaticDirectory
      ? await validateStagingQualification({receiptPath: stagingReceiptPath, revision: validation.revision,
        imageDigest: validation.imageDigest, requireSkyStatic: true}) : null;
    backup = await validateBackupManifest({
      manifestPath: backupManifestPath,
      validation,
      deploy,
      now: new Date(startedAt),
    });
    steps.push(Object.freeze({ name: "backup-verification", status: "passed" }));
    if (preparedStaticDelivery) {
      const reused = await reuseSkyStaticRelease({ validation, deploy, deployEnvPath, delivery: preparedStaticDelivery });
      delivery = reused.delivery;
      steps.push(...reused.steps);
    } else {
      perform("compose-version", () => run({ args: ["version"], step: "release-compose-version" }));
      perform("compose-config", () => run({ args: ["config", "--quiet"], step: "release-compose-config" }));
      perform("image-pull", () => run({ args: ["pull"], step: "release-image-pull" }));
    }
    if (validation.operations.skyStaticDirectory) {
      if (!delivery) delivery = await prepareStatic({validation, deploy, execute});
      if (!delivery) throw new Error("sky_static_configured_delivery_missing");
      skyStaticDelivery = assertSkyStaticDeliveryIdentity(delivery.identity, {revision: validation.revision, imageDigest: validation.imageDigest});
      if (stagingQualification && skyStaticDelivery.imagePublicationHash !== stagingQualification.skyStaticDelivery.imagePublicationHash)
        throw new Error("sky_static_staging_image_publication_mismatch");
      steps.push(Object.freeze({name: "sky-static-preparation", status: "passed",
        ...(preparedStaticDelivery ? { executionPhase: "BEFORE_VERIFIED_BACKUP" } : {}) }));
      run = composeExecutor({composePath, overlayPaths: delivery.overlayPaths, deployEnvPath, cwd: root, execute});
      perform("sky-static-compose-config", () => run({args: ["config", "--quiet"], step: "release-static-compose-config"}));
    }
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
    if (delivery) {
      const result = await verifyStatic({delivery, validation, deploy, fetchImpl});
      const checked = assertSkyStaticDeliveryIdentity(result?.identity, {revision: validation.revision, imageDigest: validation.imageDigest});
      if (result.status !== "passed" || result.checkedFiles !== skyStaticDelivery.files || result.checkedBytes !== skyStaticDelivery.bytes ||
          Object.keys(skyStaticDelivery).some(key => checked[key] !== skyStaticDelivery[key])) throw new Error("sky_static_verification_invalid");
      steps.push(Object.freeze({name: "sky-static-verification", status: "passed", result}));
    }
    return await writeReceipt({
      validation,
      operator: selectedOperator,
      startedAt,
      finishedAt: now().toISOString(),
      status: "succeeded",
      steps,
      backup,
      errorCode: null,
      skyStaticDelivery,
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
      skyStaticDelivery,
    });
    throw new Error(`release_failed:${failed.receiptPath}:${errorCode}`);
  } finally {
    await delivery?.dispose();
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
      stagingReceiptPath: option("--staging-receipt"),
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
