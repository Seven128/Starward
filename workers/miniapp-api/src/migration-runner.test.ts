import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import type pg from "pg";
import {
  listMigrationVersions,
  runPostgresMigrations,
} from "./migration-runner.ts";

class FakeMigrationClient {
  acquired = true;
  relationExists = true;
  applied: string[] = [];
  registrationCount = 1;
  failSql: string | null = null;
  released = false;
  readonly queries: Array<{ text: string; values: readonly unknown[] }> = [];

  async query(
    text: string,
    values: readonly unknown[] = [],
  ): Promise<{ rows: Array<Record<string, unknown>> }> {
    this.queries.push({ text, values });
    if (text.includes("pg_try_advisory_lock"))
      return { rows: [{ acquired: this.acquired }] };
    if (text.includes("to_regclass"))
      return { rows: [{ exists: this.relationExists }] };
    if (text === "SELECT version FROM schema_migrations ORDER BY version")
      return { rows: this.applied.map((version) => ({ version })) };
    if (text.includes("count(*)::integer AS count"))
      return { rows: [{ count: this.registrationCount }] };
    if (text.includes("pg_advisory_unlock"))
      return { rows: [{ unlocked: true }] };
    if (this.failSql && text.includes(this.failSql))
      throw new Error("fixture_sql_failure");
    return { rows: [] };
  }

  release() {
    this.released = true;
  }
}

function fakePool(client: FakeMigrationClient) {
  return {
    async connect() {
      return client;
    },
  } as unknown as pg.Pool;
}

async function migrationFixture(files: Record<string, string>) {
  const root = await mkdtemp(path.join(os.tmpdir(), "starward-migrations-"));
  const directory = path.join(root, "migrations");
  await mkdir(directory);
  await Promise.all(
    Object.entries(files).map(([name, sql]) => writeFile(path.join(directory, name), sql)),
  );
  return { root, directory };
}

async function withMigrations(files: Record<string, string>, assertion: (directory: string) => Promise<void>) {
  const fixture = await migrationFixture(files);
  try {
    await assertion(fixture.directory);
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
}

const registered = (version: string, statement = "SELECT 1;") =>
  `${statement}\nINSERT INTO schema_migrations(version) VALUES ('${version}');\n`;

test("every repository migration self-registers its exact version", async () => {
  const directory = fileURLToPath(
    new URL("../../../database/miniapp/migrations/", import.meta.url),
  );
  const versions = await listMigrationVersions(directory);
  assert.ok(versions.length > 0);

  for (const version of versions) {
    const sql = await readFile(path.join(directory, `${version}.sql`), "utf8");
    const escapedVersion = version.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
    assert.match(
      sql,
      new RegExp(
        `INSERT\\s+INTO\\s+schema_migrations\\s*\\(\\s*version\\s*\\)\\s*VALUES\\s*\\(\\s*'${escapedVersion}'\\s*\\)`,
        "iu",
      ),
      `${version} must self-register its exact version`,
    );
  }
});

test("migration plan is ordered and ignores non-migration files", async () => {
  await withMigrations({
    "010_last.sql": registered("010_last"),
    "002_first.sql": registered("002_first"),
    "README.md": "not executable",
  }, async (directory) => {
    assert.deepEqual(await listMigrationVersions(directory), ["002_first", "010_last"]);
  });
});

test("runner locks once, skips applied versions and commits each pending file", async () => {
  await withMigrations({
    "001_initial.sql": registered("001_initial", "SELECT 'initial';"),
    "002_next.sql": registered("002_next", "SELECT 'next';"),
  }, async (directory) => {
    const client = new FakeMigrationClient();
    client.applied = ["001_initial"];
    const result = await runPostgresMigrations({ pool: fakePool(client), migrationDirectory: directory });
    assert.deepEqual(result.alreadyApplied, ["001_initial"]);
    assert.deepEqual(result.executed, ["002_next"]);
    assert.equal(client.queries.some((entry) => entry.text.includes("SELECT 'initial'")), false);
    assert.equal(client.queries.some((entry) => entry.text.includes("SELECT 'next'")), true);
    assert.equal(client.queries.filter((entry) => entry.text === "BEGIN").length, 1);
    assert.equal(client.queries.filter((entry) => entry.text === "COMMIT").length, 1);
    assert.equal(client.released, true);
  });
});

test("runner fails closed when another migration owner holds the lock", async () => {
  await withMigrations({ "001_initial.sql": registered("001_initial") }, async (directory) => {
    const client = new FakeMigrationClient();
    client.acquired = false;
    await assert.rejects(
      () => runPostgresMigrations({ pool: fakePool(client), migrationDirectory: directory }),
      /postgres_migration_lock_busy/u,
    );
    assert.equal(client.queries.some((entry) => entry.text.includes("to_regclass")), false);
    assert.equal(client.released, true);
  });
});

test("SQL failure rolls back the pending file and releases the advisory lock", async () => {
  await withMigrations({
    "001_initial.sql": registered("001_initial", "SELECT fixture_failure;"),
  }, async (directory) => {
    const client = new FakeMigrationClient();
    client.relationExists = false;
    client.failSql = "fixture_failure";
    await assert.rejects(
      () => runPostgresMigrations({ pool: fakePool(client), migrationDirectory: directory }),
      /fixture_sql_failure/u,
    );
    assert.equal(client.queries.some((entry) => entry.text === "ROLLBACK"), true);
    assert.equal(client.queries.some((entry) => entry.text.includes("pg_advisory_unlock")), true);
    assert.equal(client.released, true);
  });
});

test("unknown applied versions and missing self-registration both fail closed", async () => {
  await withMigrations({ "001_initial.sql": registered("001_initial") }, async (directory) => {
    const unknown = new FakeMigrationClient();
    unknown.applied = ["000_unknown"];
    await assert.rejects(
      () => runPostgresMigrations({ pool: fakePool(unknown), migrationDirectory: directory }),
      /postgres_migration_unknown_applied_version:000_unknown/u,
    );

    const missing = new FakeMigrationClient();
    missing.relationExists = false;
    missing.registrationCount = 0;
    await assert.rejects(
      () => runPostgresMigrations({ pool: fakePool(missing), migrationDirectory: directory }),
      /postgres_migration_registration_missing:001_initial/u,
    );
    assert.equal(missing.queries.some((entry) => entry.text === "ROLLBACK"), true);
  });
});
