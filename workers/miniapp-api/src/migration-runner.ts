import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import type pg from "pg";

const MIGRATION_FILE_PATTERN = /^(\d+_[a-z0-9_-]+)\.sql$/u;
const TRANSACTION_CONTROL_PATTERN = /^\s*(?:BEGIN|COMMIT|ROLLBACK)(?:\s|;)/imu;
const MIGRATION_LOCK_KEY = "783782678931651449";

export async function listMigrationVersions(migrationDirectory: string) {
  return (await readdir(migrationDirectory))
    .map((name) => ({ name, match: MIGRATION_FILE_PATTERN.exec(name) }))
    .filter((entry): entry is { name: string; match: RegExpExecArray } => entry.match !== null)
    .sort((left, right) => left.name.localeCompare(right.name))
    .map((entry) => entry.match[1]!);
}

async function migrationFiles(migrationDirectory: string) {
  const versions = await listMigrationVersions(migrationDirectory);
  return Promise.all(
    versions.map(async (version) => {
      const sql = await readFile(path.join(migrationDirectory, `${version}.sql`), "utf8");
      if (!sql.trim()) throw new Error(`postgres_migration_empty:${version}`);
      if (TRANSACTION_CONTROL_PATTERN.test(sql))
        throw new Error(`postgres_migration_transaction_control_forbidden:${version}`);
      return Object.freeze({ version, sql });
    }),
  );
}

async function appliedVersions(client: pg.PoolClient) {
  const relation = await client.query<{ exists: boolean }>(
    "SELECT to_regclass('public.schema_migrations') IS NOT NULL AS exists",
  );
  if (relation.rows[0]?.exists !== true) return new Set<string>();
  const result = await client.query<{ version: string }>(
    "SELECT version FROM schema_migrations ORDER BY version",
  );
  return new Set(result.rows.map((row) => row.version));
}

export async function runPostgresMigrations({
  pool,
  migrationDirectory,
}: {
  pool: pg.Pool;
  migrationDirectory: string;
}) {
  const files = await migrationFiles(migrationDirectory);
  if (files.length === 0) throw new Error("postgres_migration_plan_empty");
  const known = new Set(files.map((file) => file.version));
  const client = await pool.connect();
  let lockHeld = false;
  let primaryError: unknown = null;
  try {
    const lock = await client.query<{ acquired: boolean }>(
      "SELECT pg_try_advisory_lock($1::bigint) AS acquired",
      [MIGRATION_LOCK_KEY],
    );
    if (lock.rows[0]?.acquired !== true)
      throw new Error("postgres_migration_lock_busy");
    lockHeld = true;

    const applied = await appliedVersions(client);
    for (const version of applied) {
      if (!known.has(version))
        throw new Error(`postgres_migration_unknown_applied_version:${version}`);
    }

    const executed: string[] = [];
    for (const file of files) {
      if (applied.has(file.version)) continue;
      await client.query("BEGIN");
      try {
        await client.query(file.sql);
        const registration = await client.query<{ count: number }>(
          "SELECT count(*)::integer AS count FROM schema_migrations WHERE version = $1",
          [file.version],
        );
        if (registration.rows[0]?.count !== 1)
          throw new Error(`postgres_migration_registration_missing:${file.version}`);
        await client.query("COMMIT");
        executed.push(file.version);
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      }
    }
    return Object.freeze({
      known: Object.freeze(files.map((file) => file.version)),
      alreadyApplied: Object.freeze([...applied]),
      executed: Object.freeze(executed),
    });
  } catch (error) {
    primaryError = error;
    throw error;
  } finally {
    try {
      if (lockHeld) {
        try {
          const unlocked = await client.query<{ unlocked: boolean }>(
            "SELECT pg_advisory_unlock($1::bigint) AS unlocked",
            [MIGRATION_LOCK_KEY],
          );
          if (unlocked.rows[0]?.unlocked !== true && primaryError === null)
            throw new Error("postgres_migration_lock_lost");
        } catch (error) {
          if (primaryError === null) throw error;
        }
      }
    } finally {
      client.release();
    }
  }
}
