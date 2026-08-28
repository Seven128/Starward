import { readFile } from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";

const fail = (code) => { throw new Error(`backup_dispatch_${code}`); };

// The root-installed timer follows the successful deployment pointer, not a stale candidate.
export async function dispatchBackupMaintenance({ pointerPath, execute = spawnSync }) {
  if (!path.isAbsolute(pointerPath ?? "")) fail("pointer_not_absolute");
  const pointer = JSON.parse(await readFile(pointerPath, "utf8"));
  if (!/^[a-f0-9]{40}$/u.test(pointer.revision ?? "") ||
      !/^sha256:[a-f0-9]{64}$/u.test(pointer.imageDigest ?? "")) fail("identity_invalid");
  for (const field of ["sourceRoot", "deployEnvPath", "receiptPath"]) {
    if (!path.isAbsolute(pointer[field] ?? "")) fail("path_invalid");
  }
  const receipt = JSON.parse(await readFile(pointer.receiptPath, "utf8"));
  if (receipt.schemaVersion !== "starward-operator-preview-operation-v1" || receipt.operation !== "deploy" ||
      receipt.environment !== "staging" || receipt.productionQualified !== false || receipt.status !== "succeeded" ||
      receipt.revision !== pointer.revision || receipt.imageDigest !== pointer.imageDigest)
    fail("successful_preview_required");
  // Read-only inventory is performed independently before legacy cleanup is authorized.
  const script = path.join(pointer.sourceRoot, "tools/deployment/operator-preview-cli.mjs");
  const owner = path.join(pointer.sourceRoot, "tools/deployment/backup-maintenance.mjs");
  await readFile(owner); // Old deployment archives must fail rather than silently run an unsupported command.
  const result = execute(process.execPath, [script, "--deploy-env", pointer.deployEnvPath,
    "--operation", "maintain-backups", "--operator", "scheduled-backup"], {
    cwd: pointer.sourceRoot, encoding: "utf8", timeout: 1800000, maxBuffer: 1048576,
    windowsHide: true,
  });
  if (result.error || result.status !== 0) fail("operation_failed_check_receipts");
  let output;
  try { output = JSON.parse(result.stdout); } catch { fail("invalid_operation_output"); }
  if (output.receipt?.status !== "succeeded" || output.receipt.operation !== "maintain-backups" ||
      output.receipt.environment !== "staging" || output.receipt.revision !== pointer.revision ||
      output.receipt.imageDigest !== pointer.imageDigest) fail("operation_identity_mismatch");
  if (output.receipt.retention?.unclassified > 0) fail("unclassified_backups_require_inventory");
  return { status: "succeeded", receiptPath: output.receiptPath, retention: output.receipt.retention };
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  try {
    const index = process.argv.indexOf("--pointer");
    const result = await dispatchBackupMaintenance({ pointerPath: index >= 0 ? process.argv[index + 1] : null });
    process.stdout.write(`${JSON.stringify(result)}\n`);
  } catch (error) {
    const code = /^backup_dispatch_[a-z_]+$/u.test(error.message ?? "") ? error.message : "backup_dispatch_failed_check_receipts";
    process.stderr.write(`${JSON.stringify({ status: "failed", code })}\n`);
    process.exitCode = 1;
  }
}
