import { createHash } from "node:crypto";
import { lstat, readdir, readFile, realpath, unlink } from "node:fs/promises";
import path from "node:path";
import { PERSONAL_TRIAL_BACKUP_DAYS, PERSONAL_TRIAL_BACKUP_POLICY } from "./verified-backup.mjs";

const day = 86400000;
const fail = (code) => { throw new Error(`backup_maintenance_${code}`); };

async function regularFile(filePath, maximum) {
  const metadata = await lstat(filePath);
  if (!metadata.isFile() || metadata.isSymbolicLink() || metadata.nlink !== 1 || metadata.size > maximum)
    fail("unsafe_file");
  return metadata;
}

function sameFile(before, after) {
  return before.dev === after.dev && before.ino === after.ino && before.size === after.size && before.mtimeMs === after.mtimeMs;
}

// Called only inside the existing operator-preview operation lock. No recursive deletion.
export async function maintainTrialBackups({ validation, deploy, postgres, apply = false, now = new Date() }) {
  if (validation.schemaVersion !== "starward-operator-preview-validation-v1" || validation.environment !== "staging")
    fail("preview_required");
  const directory = validation.operations.backupDirectory;
  if (!path.isAbsolute(directory) || !Number.isFinite(now.getTime())) fail("input_invalid");
  let resolved;
  try {
    const metadata = await lstat(directory);
    if (!metadata.isDirectory() || metadata.isSymbolicLink()) fail("unsafe_directory");
    resolved = await realpath(directory);
  } catch (error) {
    if (error.code === "ENOENT") return { mode: apply ? "apply" : "inspect", eligible: 0, expired: 0, removed: 0, unclassified: 0, backupDue: true };
    throw error;
  }
  const selected = [];
  let unclassified = 0;
  const names = await readdir(directory);
  for (const name of names) {
    if (!name.endsWith(".pgdump.enc.manifest.json")) {
      if (name.endsWith(".pgdump.enc") && !names.includes(`${name}.manifest.json`)) unclassified++;
      continue;
    }
    const manifestPath = path.join(directory, name);
    const manifestStat = await regularFile(manifestPath, 16384);
    let manifest;
    try { manifest = JSON.parse(await readFile(manifestPath, "utf8")); }
    catch { fail("invalid_manifest"); }
    if (manifest.retention?.policyId !== PERSONAL_TRIAL_BACKUP_POLICY ||
        manifest.environment !== validation.environment || manifest.composeProject !== deploy.COMPOSE_PROJECT_NAME ||
        manifest.sourceDatabase !== postgres.POSTGRES_DB) {
      unclassified++;
      continue;
    }
    const created = Date.parse(manifest.createdAt);
    const expiry = created + PERSONAL_TRIAL_BACKUP_DAYS * day;
    if (!Number.isFinite(created) || created > now.getTime() || manifest.schemaVersion !== "starward-verified-backup-v1" ||
        manifest.status !== "verified" || manifest.restore?.status !== "restored_and_verified" ||
        manifest.restore?.temporaryDatabaseDropped !== true || manifest.retention.days !== PERSONAL_TRIAL_BACKUP_DAYS ||
        manifest.retention.expiresAt !== new Date(expiry).toISOString() ||
        !/^[a-f0-9]{40}$/u.test(manifest.releaseRevision ?? "") ||
        manifest.encrypted?.algorithm !== "aes-256-gcm" || !/^[a-f0-9]{64}$/u.test(manifest.encrypted?.sha256 ?? ""))
      fail("invalid_policy_manifest");
    const prefix = `${validation.environment}-${new Date(created).toISOString().replace(/[:.]/gu, "-")}-${manifest.releaseRevision.slice(0, 12)}-`;
    const fileName = manifest.encrypted.fileName;
    if (typeof fileName !== "string" || !fileName.startsWith(prefix) ||
        !/^[a-f0-9]{12}\.pgdump\.enc$/u.test(fileName.slice(prefix.length)) || name !== `${fileName}.manifest.json`)
      fail("invalid_filename");
    const encryptedPath = path.join(directory, fileName);
    let encryptedStat;
    try { encryptedStat = await regularFile(encryptedPath, validation.operations.maxBackupBytes + 4096); }
    catch (error) {
      // A process interruption after unlinking encrypted bytes may leave a harmless manifest.
      if (error.code === "ENOENT") { unclassified++; continue; }
      throw error;
    }
    const bytes = await readFile(encryptedPath);
    if (bytes.length !== manifest.encrypted.byteLength ||
        createHash("sha256").update(bytes).digest("hex") !== manifest.encrypted.sha256)
      fail("integrity_mismatch");
    selected.push({ manifestPath, encryptedPath, manifestStat, encryptedStat, created, expired: expiry <= now.getTime() });
  }
  // Preflight every candidate before the first destructive action.
  for (const entry of selected) {
    if (!sameFile(entry.manifestStat, await regularFile(entry.manifestPath, 16384)) ||
        !sameFile(entry.encryptedStat, await regularFile(entry.encryptedPath, validation.operations.maxBackupBytes + 4096)))
      fail("concurrent_file_change");
  }
  if (resolved !== await realpath(directory)) fail("directory_changed");
  let removed = 0;
  for (const entry of selected.filter((item) => item.expired)) {
    if (!apply) continue;
    await unlink(entry.encryptedPath);
    await unlink(entry.manifestPath);
    removed++;
  }
  const newest = Math.max(-Infinity, ...selected.filter((item) => !item.expired).map((item) => item.created));
  return { mode: apply ? "apply" : "inspect", eligible: selected.length,
    expired: selected.filter((item) => item.expired).length, removed, unclassified,
    backupDue: now.getTime() - newest >= day };
}
