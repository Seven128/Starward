import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { composeExecutor } from "./compose-runtime.mjs";
import { executeDatabaseRecovery } from "./database-recovery-execution.mjs";
import { fail } from "./database-recovery-operations.mjs";
import { readEnvironmentFile } from "./env-file.mjs";
import { validateReleaseEnvironment } from "./validate-release-environment.mjs";
import { readBackupKeyFile } from "./verified-backup.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const composePath = path.join(root, "infrastructure", "deployment", "compose.yml");

async function loadRecoveryMaterial({ manifestPath, validation }) {
  if (!manifestPath || !path.isAbsolute(manifestPath)) fail("recovery_manifest_path_not_absolute");
  if (path.normalize(path.dirname(manifestPath)) !== path.normalize(validation.operations.backupDirectory))
    fail("recovery_manifest_outside_backup_directory");
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  const fileName = manifest.encrypted?.fileName;
  if (typeof fileName !== "string" || path.basename(fileName) !== fileName)
    fail("recovery_backup_file_name_invalid");
  const encryptedPath = path.join(path.dirname(manifestPath), fileName);
  const metadata = await stat(encryptedPath);
  if (!metadata.isFile()) fail("recovery_backup_not_file");
  return Object.freeze({ manifest, envelope: await readFile(encryptedPath) });
}

export { executeDatabaseRecovery };

export async function recoverDatabase({
  deployEnvPath,
  manifestPath,
  confirmEnvironment,
  confirmBackupSha256,
  confirmTargetDatabase,
  operator,
}) {
  const validation = await validateReleaseEnvironment({ deployEnvPath });
  const deploy = await readEnvironmentFile(deployEnvPath);
  const postgres = await readEnvironmentFile(validation.lanes.postgres);
  const key = await readBackupKeyFile(validation.operations.backupKeyFile);
  const { manifest, envelope } = await loadRecoveryMaterial({ manifestPath, validation });
  const run = composeExecutor({ composePath, deployEnvPath, cwd: root });
  try {
    return await executeDatabaseRecovery({
      validation,
      deploy,
      postgres,
      manifest,
      envelope,
      key,
      confirmEnvironment,
      confirmBackupSha256,
      confirmTargetDatabase,
      operator,
      run,
    });
  } finally {
    key.fill(0);
    envelope.fill(0);
  }
}

function option(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : null;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  try {
    const result = await recoverDatabase({
      deployEnvPath: option("--deploy-env"),
      manifestPath: option("--backup-manifest"),
      confirmEnvironment: option("--confirm-environment"),
      confirmBackupSha256: option("--confirm-backup-sha256"),
      confirmTargetDatabase: option("--confirm-target-database"),
      operator: option("--operator") ?? process.env.USER,
    });
    process.stdout.write(`${JSON.stringify({
      status: result.receipt.status,
      environment: result.receipt.environment,
      backupSha256: result.receipt.backup.encryptedSha256,
      receiptPath: result.receiptPath,
    })}\n`);
  } catch (error) {
    process.stderr.write(`${JSON.stringify({
      status: "failed",
      code: error instanceof Error ? error.message : "recovery_failed",
    })}\n`);
    process.exitCode = 1;
  }
}
