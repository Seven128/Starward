import { mkdir, open, rename, unlink, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { composeExecutor, runProcess } from "./compose-runtime.mjs";
import { readEnvironmentFile } from "./env-file.mjs";
import { validateOperatorPreviewEnvironment } from "./validate-release-environment.mjs";
import { executeVerifiedBackup, readBackupKeyFile } from "./verified-backup.mjs";
import { maintainTrialBackups } from "./backup-maintenance.mjs";
import { checkPreviewCompose, checkPreviewContainers, checkPreviewReadiness, parseComposeRows } from "./operator-preview-checks.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

export async function operatePreview({ deployEnvPath, operation = "check", operator, execute = runProcess, backup = executeVerifiedBackup, readiness = checkPreviewReadiness, maintenance = maintainTrialBackups }) {
  if (!["deploy", "check", "stop", "backup", "inspect-backups", "maintain-backups"].includes(operation)) throw new Error("operator_preview_operation_invalid");
  if (!/^[A-Za-z0-9._:@/-]{2,120}$/u.test(operator ?? "")) throw new Error("operator_preview_operator_invalid");
  const validation = await validateOperatorPreviewEnvironment({ deployEnvPath });
  const deploy = await readEnvironmentFile(deployEnvPath);
  const run = composeExecutor({
    composePath: path.join(root, "infrastructure/deployment/compose.yml"),
    overlayPaths: [path.join(root, "infrastructure/deployment/compose.operator-preview.yml")],
    deployEnvPath, cwd: root, execute,
  });
  const directory = validation.operations.receiptDirectory;
  await mkdir(directory, { recursive: true, mode: 0o700 });
  const lockPath = path.join(directory, "operator-preview.lock");
  let lock;
  try { lock = await open(lockPath, "wx", 0o600); }
  catch (error) {
    if (error.code === "EEXIST") throw new Error("operator_preview_locked_verify_owner_before_unlocking");
    throw error;
  }
  const receipt = {
    schemaVersion: "starward-operator-preview-operation-v1", operation, operator,
    status: "running", environment: "staging", productionQualified: false,
    revision: validation.revision, imageDigest: validation.imageDigest,
    startedAt: new Date().toISOString(), writersStopped: false, steps: [],
  };
  const receiptPath = path.join(directory, `operator-preview-${randomUUID()}.json`);
  let currentStep = "lock";
  let receiptPersisted = false;
  const perform = async (name, action) => {
    currentStep = name;
    const result = await action();
    receipt.steps.push({ name, status: "passed" });
    return result;
  };
  const containers = (dataOnly = false) => {
    const rows = parseComposeRows(run({ args: ["ps", "--format", "json"], step: "preview-container-state" }).stdout.toString("utf8"));
    checkPreviewContainers(rows, { dataOnly });
  };
  try {
    await lock.writeFile(JSON.stringify({ pid: process.pid, operation, revision: validation.revision, startedAt: receipt.startedAt }));
    await perform("compose-config", () => {
      const config = JSON.parse(run({ args: ["--profile", "operations", "config", "--format", "json"], step: "preview-compose-config" }).stdout.toString("utf8"));
      checkPreviewCompose(config, validation, deploy);
    });
    if (["inspect-backups", "maintain-backups"].includes(operation)) {
      receipt.retention = await perform("backup-retention", async () => maintenance({
        validation, deploy, postgres: await readEnvironmentFile(validation.lanes.postgres),
        apply: operation === "maintain-backups",
      }));
    }
    const needsBackup = ["deploy", "backup"].includes(operation) ||
      (operation === "maintain-backups" && receipt.retention.backupDue);
    if (operation !== "inspect-backups" && (operation !== "maintain-backups" || needsBackup))
      await perform("existing-data-services", () => containers(true));
    if (operation === "deploy") {
      await perform("immutable-image-pull", () => run({ args: ["pull", "api", "worker"], step: "preview-image-pull" }));
      await perform("image-source-identity", () => {
        const result = execute({ command: "docker", args: ["image", "inspect", deploy.STARWARD_IMAGE_REF, "--format", '{{ index .Config.Labels "org.opencontainers.image.revision" }}'], cwd: root, step: "preview-image-revision" });
        if (result.stdout.toString("utf8").trim() !== validation.revision) throw new Error("operator_preview_image_revision_mismatch");
      });
    }
    if (["deploy", "stop"].includes(operation)) {
      receipt.writersStopped = true;
      await perform("stop-edge-and-writers", () => run({ args: ["stop", "caddy", "api", "worker"], step: "preview-stop-writers" }));
    }
    if (needsBackup) {
      const result = await perform("verified-backup", async () => backup({
        validation, deploy, postgres: await readEnvironmentFile(validation.lanes.postgres),
        key: await readBackupKeyFile(validation.operations.backupKeyFile), run,
      }));
      receipt.backupManifestPath = result.manifestPath;
    }
    if (operation === "deploy") {
      await perform("migration", () => run({ args: ["--profile", "operations", "run", "--rm", "--no-deps", "--pull", "never", "migrate"], step: "preview-migration" }));
      await perform("start-writers", () => run({ args: ["up", "-d", "--wait", "--wait-timeout", "180", "--no-deps", "--pull", "never", "api", "worker"], step: "preview-start-writers" }));
      await perform("start-edge", () => run({ args: ["up", "-d", "--wait", "--wait-timeout", "90", "--no-deps", "--pull", "never", "caddy"], step: "preview-start-edge" }));
    }
    if (["deploy", "check"].includes(operation)) {
      await perform("healthy-services-private-ports", () => containers());
      receipt.health = await perform("guarded-ip-readiness", () => readiness({ run, validation, deploy }));
      receipt.writersStopped = false;
    }
    receipt.status = "succeeded";
    if (operation === "deploy") {
      currentStep = "persist-receipt";
      receipt.finishedAt = new Date().toISOString();
      await writeFile(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`, { mode: 0o600, flag: "wx" });
      receiptPersisted = true;
      currentStep = "publish-current-pointer";
      const pointerPath = path.join(directory, "operator-preview-current.json");
      const temporaryPath = `${pointerPath}.${randomUUID()}.tmp`;
      await writeFile(temporaryPath, JSON.stringify({ deployEnvPath, sourceRoot: root, revision: validation.revision, imageDigest: validation.imageDigest, receiptPath }), { mode: 0o600, flag: "wx" });
      try { await rename(temporaryPath, pointerPath); }
      finally { await unlink(temporaryPath).catch((error) => { if (error.code !== "ENOENT") throw error; }); }
    }
  } catch (error) {
    receipt.status = "failed";
    receipt.failedStep = currentStep;
    receipt.errorCode = /^[a-z][a-z0-9_-]*(?::[A-Za-z0-9_.-]+)*$/u.test(error.message ?? "") ? error.message : "operator_preview_unexpected_failure";
    if (operation === "deploy" && receipt.writersStopped) {
      try { run({ args: ["stop", "caddy", "api", "worker"], step: "preview-failure-stop" }); }
      catch { receipt.stopFailed = true; }
    }
  } finally {
    receipt.finishedAt = new Date().toISOString();
    try { await writeFile(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`, { mode: 0o600, flag: receiptPersisted ? "w" : "wx" }); }
    finally { await lock.close(); await unlink(lockPath); }
  }
  return { receiptPath, receipt };
}
