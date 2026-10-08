import { randomBytes } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  createRestoreDatabase,
  dropDatabase,
  fail,
  failureCode,
  loadRestoreDatabase,
  renameDatabase,
  terminateConnections,
  validateRecoveryInputs,
  workerReadiness,
} from "./database-recovery-operations.mjs";
import { publicReadiness } from "./public-readiness.mjs";
import { decryptBackup, postgresIdentifier, schemaVersion } from "./verified-backup.mjs";
import { readSkyStaticBackup, restoreSkyStaticBackup, verifiedBackupSkyRecord } from "./sky-static-backup.mjs";
import { restoreManagedSkyStaticBackup } from "./sky-static-release.mjs";

async function writeRecoveryReceipt({
  validation,
  operator,
  startedAt,
  finishedAt,
  status,
  manifest,
  targetDatabase,
  restoredDatabase,
  retainedDatabase,
  rollback,
  steps,
  errorCode,
  skyRestore,
}) {
  await mkdir(validation.operations.receiptDirectory, { recursive: true, mode: 0o700 });
  const stamp = startedAt.replace(/[:.]/gu, "-");
  const receiptPath = path.join(
    validation.operations.receiptDirectory,
    `${validation.environment}-${stamp}-${manifest.encrypted.sha256.slice(0, 12)}.recovery.json`,
  );
  const receipt = Object.freeze({
    schemaVersion: manifest.schemaVersion === "starward-verified-backup-v2" ? "starward-database-recovery-receipt-v2" : "starward-database-recovery-receipt-v1",
    status,
    environment: validation.environment,
    composeProject: manifest.composeProject,
    activeRelease: Object.freeze({ revision: validation.revision, imageDigest: validation.imageDigest }),
    backup: Object.freeze({
      releaseRevision: manifest.releaseRevision,
      releaseImageDigest: manifest.releaseImageDigest,
      schemaMigration: manifest.schemaMigration,
      encryptedSha256: manifest.encrypted.sha256,
      createdAt: manifest.createdAt,
      ...(manifest.skyStaticBackup ? { skyStaticBackup: manifest.skyStaticBackup } : {}),
    }),
    operator,
    startedAt,
    finishedAt,
    targetDatabase,
    restoredDatabase,
    retainedDatabase,
    rollback,
    steps,
    errorCode,
    ...(manifest.skyStaticBackup ? { skyRestore } : {}),
  });
  await writeFile(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`, { mode: 0o600, flag: "wx" });
  return Object.freeze({ receiptPath, receipt });
}

export async function executeDatabaseRecovery({
  validation,
  deploy,
  postgres,
  manifest,
  envelope,
  key,
  confirmEnvironment,
  confirmBackupSha256,
  confirmTargetDatabase,
  skyRestoreDirectory,
  skyManagedRestoreDirectory,
  confirmSkyPublicationHash,
  operator,
  run,
  execute,
  fetchImpl,
  inspectTls,
  delay,
  now = () => new Date(),
  random = randomBytes,
}) {
  const { targetDatabase, postgresUser } = validateRecoveryInputs({
    validation,
    deploy,
    postgres,
    manifest,
    envelope,
    confirmEnvironment,
    confirmBackupSha256,
    confirmTargetDatabase,
    operator,
  });
  const skyRecord = verifiedBackupSkyRecord(manifest);
  if (skyRestoreDirectory && skyManagedRestoreDirectory) fail("recovery_sky_restore_modes_exclusive");
  const skyOutput = skyRestoreDirectory || skyManagedRestoreDirectory;
  if ((skyOutput || confirmSkyPublicationHash) && !skyRecord) fail("recovery_sky_snapshot_missing");
  if (confirmSkyPublicationHash && !skyOutput) fail("recovery_sky_restore_directory_required");
  if (skyOutput && validation.operations.skyStaticDirectory) {
    const source = path.resolve(validation.operations.skyStaticDirectory), target = path.resolve(skyOutput);
    const overlaps = (parent, child) => { const relative = path.relative(parent, child);
      return !relative || (relative !== ".." && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative)); };
    if (overlaps(source, target) || overlaps(target, source)) fail("recovery_sky_restore_directory_overlaps_store");
  }
  if (skyRecord) await readSkyStaticBackup({ backupDirectory: validation.operations.backupDirectory, record: skyRecord });
  let skyRestore = skyRecord ? Object.freeze({ status: "VERIFIED_PUBLIC_SNAPSHOT", publicationHash: skyRecord.publicationHash,
    files: skyRecord.files, bytes: skyRecord.bytes, runtimeApplied: false }) : null;
  const dump = decryptBackup(envelope, key, skyRecord);
  if (dump.length < 512 || dump.length > validation.operations.maxBackupBytes) {
    dump.fill(0);
    fail("recovery_dump_size_invalid");
  }
  const suffix = random(6).toString("hex");
  const restoredDatabase = postgresIdentifier(`starward_recovery_new_${suffix}`, "recovery_restore_database_name_invalid");
  const retainedDatabase = postgresIdentifier(`starward_recovery_old_${suffix}`, "recovery_retained_database_name_invalid");
  const startedAt = now().toISOString();
  const steps = [];
  let restoredCreated = false;
  let servicesTouched = false;
  let originalRenamed = false;
  let switched = false;
  const passed = (name, details) => steps.push(Object.freeze({ name, status: "passed", ...details }));
  const invoke = (name, action) => {
    action();
    passed(name);
  };
  try {
    if (skyManagedRestoreDirectory) {
      skyRestore = await restoreManagedSkyStaticBackup({ validation, deploy, record: skyRecord,
        outputDirectory: skyManagedRestoreDirectory, confirmPublicationHash: confirmSkyPublicationHash, execute });
      passed("sky-managed-prepared-restore", skyRestore);
    }
    if (skyRestoreDirectory) {
      skyRestore = await restoreSkyStaticBackup({ backupDirectory: validation.operations.backupDirectory, record: skyRecord,
        outputDirectory: skyRestoreDirectory, confirmPublicationHash: confirmSkyPublicationHash });
      passed("sky-public-isolated-restore", skyRestore);
    }
    createRestoreDatabase(run, postgresUser, restoredDatabase);
    restoredCreated = true;
    loadRestoreDatabase(run, postgresUser, restoredDatabase, dump, validation.operations.maxBackupBytes);
    passed("isolated-restore");
    const restoredSchema = schemaVersion(run, restoredDatabase, postgresUser, 1024 * 1024, "recovery-restored-schema");
    if (restoredSchema !== manifest.schemaMigration) fail("recovery_schema_mismatch");
    passed("schema-verification", { schemaMigration: restoredSchema });
    servicesTouched = true;
    invoke("edge-stop", () => run({ args: ["stop", "caddy"], step: "recovery-stop-edge" }));
    invoke("writer-stop", () => run({ args: ["stop", "api", "worker"], step: "recovery-stop-writers" }));
    invoke("connection-drain", () => terminateConnections(run, postgresUser, targetDatabase, "recovery-terminate-target-connections"));
    renameDatabase(run, postgresUser, targetDatabase, retainedDatabase, "recovery-rename-original");
    originalRenamed = true;
    passed("original-retained", { retainedDatabase });
    renameDatabase(run, postgresUser, restoredDatabase, targetDatabase, "recovery-rename-restored");
    switched = true;
    restoredCreated = false;
    passed("database-cutover", { targetDatabase });
    invoke("service-start", () => run({ args: ["up", "-d", "--wait", "api", "worker", "caddy"], step: "recovery-start-services" }));
    invoke("worker-readiness", () => workerReadiness(run, "recovery-worker-readiness"));
    const health = await publicReadiness({ validation, fetchImpl, inspectTls, delay, now });
    passed("public-readiness", { release: health.release, http: health.http, tls: health.tls });
    return await writeRecoveryReceipt({
      validation,
      operator,
      startedAt,
      finishedAt: now().toISOString(),
      status: "succeeded",
      manifest,
      targetDatabase,
      restoredDatabase: null,
      retainedDatabase,
      rollback: null,
      steps,
      errorCode: null,
      skyRestore,
    });
  } catch (error) {
    const originalErrorCode = failureCode(error);
    let rollback = Object.freeze({ attempted: false, status: "not_required" });
    try {
      if (switched) {
        run({ args: ["stop", "caddy"], step: "recovery-rollback-stop-edge" });
        run({ args: ["stop", "api", "worker"], step: "recovery-rollback-stop-writers" });
        terminateConnections(run, postgresUser, targetDatabase, "recovery-rollback-terminate-connections");
        renameDatabase(run, postgresUser, targetDatabase, restoredDatabase, "recovery-rollback-retain-restored");
        renameDatabase(run, postgresUser, retainedDatabase, targetDatabase, "recovery-rollback-restore-original");
        switched = false;
        originalRenamed = false;
        run({ args: ["up", "-d", "--wait", "api", "worker", "caddy"], step: "recovery-rollback-start-services" });
        workerReadiness(run, "recovery-rollback-worker-readiness");
        await publicReadiness({ validation, fetchImpl, inspectTls, delay, now });
        rollback = Object.freeze({ attempted: true, status: "original_restored", retainedFailedDatabase: restoredDatabase });
      } else if (originalRenamed) {
        renameDatabase(run, postgresUser, retainedDatabase, targetDatabase, "recovery-rollback-restore-original");
        originalRenamed = false;
        if (servicesTouched) {
          run({ args: ["up", "-d", "--wait", "api", "worker", "caddy"], step: "recovery-rollback-start-services" });
          workerReadiness(run, "recovery-rollback-worker-readiness");
          await publicReadiness({ validation, fetchImpl, inspectTls, delay, now });
        }
        rollback = Object.freeze({ attempted: true, status: "original_restored", retainedFailedDatabase: restoredCreated ? restoredDatabase : null });
      } else if (servicesTouched) {
        run({ args: ["up", "-d", "--wait", "api", "worker", "caddy"], step: "recovery-rollback-start-services" });
        workerReadiness(run, "recovery-rollback-worker-readiness");
        await publicReadiness({ validation, fetchImpl, inspectTls, delay, now });
        rollback = Object.freeze({ attempted: true, status: "services_restored", retainedFailedDatabase: null });
      }
      if (restoredCreated) {
        dropDatabase(run, postgresUser, restoredDatabase, "recovery-restore-cleanup");
        restoredCreated = false;
        if (rollback.status === "original_restored") rollback = Object.freeze({ ...rollback, retainedFailedDatabase: null });
      }
    } catch (rollbackError) {
      rollback = Object.freeze({ attempted: true, status: "failed", errorCode: failureCode(rollbackError) });
    }
    const errorCode = rollback.status === "failed"
      ? `recovery_rollback_failed:${originalErrorCode}:${rollback.errorCode}`
      : originalErrorCode;
    steps.push(Object.freeze({ name: "recovery", status: "failed", errorCode }));
    const failed = await writeRecoveryReceipt({
      validation,
      operator,
      startedAt,
      finishedAt: now().toISOString(),
      status: "failed",
      manifest,
      targetDatabase,
      restoredDatabase: rollback.retainedFailedDatabase ?? null,
      retainedDatabase: originalRenamed ? retainedDatabase : null,
      rollback,
      steps,
      errorCode,
      skyRestore,
    });
    throw new Error(`recovery_failed:${failed.receiptPath}:${errorCode}`);
  } finally {
    dump.fill(0);
  }
}
