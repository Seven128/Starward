import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import { dockerComposeInvocation } from "./docker-compose-runtime.mjs";

const { Client } = pg;
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const composePath = path.join(root, "infra", "miniapp", "docker-compose.yml");
const defaultAdminUrl =
  "postgresql://starward_miniapp:local_demo_only@127.0.0.1:55432/starward_miniapp";

function assertDatabaseName(databaseName) {
  if (!/^starward_[a-z0-9_]{1,55}$/u.test(databaseName))
    throw new Error("backup_database_name_not_owned");
}

function runDockerPostgres(args, options = {}) {
  const compose = dockerComposeInvocation([
    "-f",
    composePath,
    "exec",
    "-T",
    "postgres",
    ...args,
  ]);
  const result = spawnSync(
    compose.command,
    compose.args,
    {
      cwd: root,
      windowsHide: true,
      maxBuffer: 256 * 1024 * 1024,
      ...options,
    },
  );
  if (result.status !== 0)
    throw new Error(`backup_postgres_command_failed:${result.status}`);
  return result;
}

function databaseUrl(databaseName) {
  const url = new URL(process.env.MINIAPP_ADMIN_DATABASE_URL ?? defaultAdminUrl);
  url.pathname = `/${databaseName}`;
  return url.toString();
}

async function fingerprint(databaseName) {
  assertDatabaseName(databaseName);
  const client = new Client({ connectionString: databaseUrl(databaseName) });
  await client.connect();
  try {
    const result = await client.query(`SELECT jsonb_build_object(
      'schema', (SELECT jsonb_agg(version ORDER BY version) FROM schema_migrations),
      'spots', (SELECT count(*) FROM spots),
      'spot_digest', (SELECT md5(string_agg(spot_id || ':' || payload::text, '|' ORDER BY spot_id)) FROM spots),
      'favorites', (SELECT count(*) FROM favorites),
      'plans', (SELECT count(*) FROM observation_plans),
      'profile_links', (SELECT count(*) FROM user_profile_links),
      'imports', (SELECT count(*) FROM external_post_imports),
      'drafts', (SELECT count(*) FROM external_post_import_drafts),
      'outbox', (SELECT count(*) FROM outbox_events),
      'audits', (SELECT count(*) FROM audit_logs)
    ) AS value`);
    return result.rows[0].value;
  } finally {
    await client.end();
  }
}

export async function createBackup({ databaseName, outputPath }) {
  assertDatabaseName(databaseName);
  const resolved = path.resolve(outputPath);
  await mkdir(path.dirname(resolved), { recursive: true });
  const result = runDockerPostgres([
    "pg_dump",
    "--username=starward_miniapp",
    `--dbname=${databaseName}`,
    "--format=custom",
    "--no-owner",
    "--no-privileges",
  ]);
  const bytes = Buffer.from(result.stdout);
  if (bytes.length < 512) throw new Error("backup_dump_too_small");
  await writeFile(resolved, bytes);
  const manifest = {
    schema_version: "starward-miniapp-backup-v1",
    source_database: databaseName,
    created_at: new Date().toISOString(),
    byte_length: bytes.length,
    sha256: createHash("sha256").update(bytes).digest("hex"),
    fingerprint: await fingerprint(databaseName),
    restore_policy: "new-owned-database-only",
  };
  await writeFile(
    `${resolved}.manifest.json`,
    `${JSON.stringify(manifest, null, 2)}\n`,
  );
  return { path: resolved, manifest };
}

export async function restoreBackup({ inputPath, targetDatabase }) {
  assertDatabaseName(targetDatabase);
  if (!targetDatabase.startsWith("starward_restore_"))
    throw new Error("restore_target_must_be_new_restore_database");
  const resolved = path.resolve(inputPath);
  await access(resolved);
  const bytes = await readFile(resolved);
  const manifest = JSON.parse(await readFile(`${resolved}.manifest.json`, "utf8"));
  const digest = createHash("sha256").update(bytes).digest("hex");
  if (digest !== manifest.sha256 || bytes.length !== manifest.byte_length)
    throw new Error("backup_manifest_integrity_mismatch");
  const admin = new Client({
    connectionString: process.env.MINIAPP_ADMIN_DATABASE_URL ?? defaultAdminUrl,
  });
  await admin.connect();
  let created = false;
  try {
    const exists = await admin.query(
      "SELECT 1 FROM pg_database WHERE datname = $1",
      [targetDatabase],
    );
    if (exists.rowCount) throw new Error("restore_target_already_exists");
    await admin.query(`CREATE DATABASE "${targetDatabase}"`);
    created = true;
    runDockerPostgres(
      [
        "pg_restore",
        "--username=starward_miniapp",
        `--dbname=${targetDatabase}`,
        "--no-owner",
        "--no-privileges",
        "--exit-on-error",
      ],
      { input: bytes },
    );
    const restoredFingerprint = await fingerprint(targetDatabase);
    if (JSON.stringify(restoredFingerprint) !== JSON.stringify(manifest.fingerprint))
      throw new Error("backup_restore_fingerprint_mismatch");
    return {
      target_database: targetDatabase,
      sha256: digest,
      fingerprint: restoredFingerprint,
      status: "restored_and_verified",
    };
  } catch (error) {
    if (created) {
      await admin.query(
        "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = $1 AND pid <> pg_backend_pid()",
        [targetDatabase],
      );
      await admin.query(`DROP DATABASE IF EXISTS "${targetDatabase}"`);
    }
    throw error;
  } finally {
    await admin.end();
  }
}

function option(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

if (path.resolve(process.argv[1] ?? "") === fileURLToPath(import.meta.url)) {
  const command = process.argv[2];
  if (command === "backup") {
    const databaseName = option("--database") ?? "starward_miniapp";
    const stamp = new Date().toISOString().replace(/[:.]/gu, "-");
    const outputPath =
      option("--output") ??
      path.join(root, "artifacts", "miniapp", "backups", `${databaseName}-${stamp}.dump`);
    const result = await createBackup({ databaseName, outputPath });
    process.stdout.write(
      `${JSON.stringify({ status: "backup_created", path: result.path, manifest: result.manifest })}\n`,
    );
  } else if (command === "restore") {
    const inputPath = option("--input");
    const targetDatabase = option("--target");
    if (!inputPath || !targetDatabase)
      throw new Error("restore_requires_input_and_target");
    process.stdout.write(
      `${JSON.stringify(await restoreBackup({ inputPath, targetDatabase }))}\n`,
    );
  } else {
    throw new Error("usage: backup-restore.mjs backup|restore [options]");
  }
}
