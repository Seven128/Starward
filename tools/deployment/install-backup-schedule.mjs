import { readFile, mkdir, writeFile, rename, lstat, realpath } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { validateOperatorPreviewEnvironment } from "./validate-release-environment.mjs";

const begin = "# BEGIN STARWARD PERSONAL TRIAL BACKUP";
const end = "# END STARWARD PERSONAL TRIAL BACKUP";
const fail = (code) => { throw new Error(`backup_schedule_${code}`); };

export function managedCrontab(existing, { nodePath, dispatcherPath, pointerPath, statusPath, minute }) {
  for (const value of [nodePath, dispatcherPath, pointerPath, statusPath])
    if (!/^\/[A-Za-z0-9_./-]+$/u.test(value) || value.includes("/../")) fail("unsafe_path");
  if (!Number.isInteger(minute) || minute < 0 || minute > 59) fail("minute_invalid");
  const start = existing.indexOf(begin);
  const finish = existing.indexOf(end);
  if ((start === -1) !== (finish === -1) || (start !== -1 &&
      (finish < start || existing.indexOf(begin, start + begin.length) !== -1 || existing.indexOf(end, finish + end.length) !== -1)))
    fail("ambiguous_managed_block");
  const command = `${minute} * * * * ${nodePath} ${dispatcherPath} --pointer ${pointerPath} > ${statusPath} 2>&1`;
  const block = `${begin}\n${command}\n${end}\n`;
  if (start === -1) return `${existing}${existing && !existing.endsWith("\n") ? "\n" : ""}${block}`;
  const after = finish + end.length + (existing[finish + end.length] === "\n" ? 1 : 0);
  return existing.slice(0, start) + block + existing.slice(after);
}

export async function installBackupSchedule({ pointerPath, execute = spawnSync }) {
  if (process.platform !== "linux" || !path.isAbsolute(pointerPath ?? "")) fail("linux_absolute_pointer_required");
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
  const pointer = JSON.parse(await readFile(pointerPath, "utf8"));
  if (await realpath(pointer.sourceRoot) !== await realpath(root)) fail("run_from_current_deployment");
  const validation = await validateOperatorPreviewEnvironment({ deployEnvPath: pointer.deployEnvPath });
  if (pointer.revision !== validation.revision || pointer.imageDigest !== validation.imageDigest) fail("candidate_mismatch");
  if (path.dirname(pointerPath) !== validation.operations.receiptDirectory) fail("pointer_outside_receipts");
  const receipt = JSON.parse(await readFile(pointer.receiptPath, "utf8"));
  if (receipt.status !== "succeeded" || receipt.operation !== "deploy" || receipt.productionQualified !== false ||
      receipt.revision !== pointer.revision || receipt.imageDigest !== pointer.imageDigest) fail("successful_deploy_required");
  const options = { encoding: "utf8", env: { ...process.env, LC_ALL: "C" }, maxBuffer: 1048576, timeout: 10000 };
  const readCrontab = () => {
    const result = execute("crontab", ["-l"], options);
    if (!result.error && result.status === 0) return result.stdout;
    if (!result.error && result.status === 1 && /^no crontab for [^\n]+\n?$/u.test(result.stderr.trimEnd())) return "";
    fail("crontab_read_failed");
  };
  const existing = readCrontab();
  const directory = path.join(validation.operations.receiptDirectory, "backup-maintenance");
  await mkdir(directory, { mode: 0o700, recursive: true });
  const info = await lstat(directory);
  if (!info.isDirectory() || info.isSymbolicLink()) fail("unsafe_directory");
  const dispatcherPath = path.join(directory, "dispatcher.mjs");
  const statusPath = path.join(directory, "latest.json");
  const temporary = path.join(directory, `${randomUUID()}.tmp`);
  await writeFile(temporary, await readFile(path.join(root, "tools/deployment/backup-maintenance-cli.mjs")), { flag: "wx", mode: 0o600 });
  await rename(temporary, dispatcherPath);
  // First scheduled execution is within the next two minutes, then hourly.
  const minute = (new Date().getUTCMinutes() + 2) % 60;
  const selected = managedCrontab(existing, { nodePath: process.execPath, dispatcherPath, pointerPath, statusPath, minute });
  if (existing !== readCrontab()) fail("crontab_changed_retry");
  const installed = execute("crontab", ["-"], { ...options, input: selected });
  if (installed.error || installed.status !== 0) fail("crontab_install_failed");
  if (readCrontab() !== selected) fail("crontab_readback_mismatch");
  return { status: "installed", minute, statusPath, dispatcherPath, pointerPath, intervalHours: 1 };
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  try {
    const index = process.argv.indexOf("--pointer");
    process.stdout.write(`${JSON.stringify(await installBackupSchedule({ pointerPath: index >= 0 ? process.argv[index + 1] : null }))}\n`);
  } catch (error) {
    const code = /^backup_schedule_[a-z_]+$/u.test(error.message ?? "") ? error.message : "backup_schedule_failed";
    process.stderr.write(`${JSON.stringify({ status: "failed", code })}\n`);
    process.exitCode = 1;
  }
}
