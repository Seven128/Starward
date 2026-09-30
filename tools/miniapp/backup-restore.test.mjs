import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import pg from "pg";
import { restoreBackup } from "./backup-restore.mjs";
import { databaseUrlFor, readInfrastructureRuntime } from "./infrastructure-runtime.mjs";

test("restore failure removes its new target and refuses to overwrite an existing database", {
  skip: process.env.MINIAPP_BACKUP_RECOVERY_TEST !== "1",
}, async () => {
  const runtime = readInfrastructureRuntime();
  const suffix = randomUUID().replaceAll("-", "");
  const existing = `starward_restore_existing_${suffix}`;
  const failed = `starward_restore_failed_${suffix}`;
  const directory = await mkdtemp(path.join(tmpdir(), "starward-restore-recovery-"));
  const dumpPath = path.join(directory, "invalid.dump");
  // Matching transport integrity is insufficient: pg_restore must also accept
  // the archive, and a failed restore must not leave a usable-looking database.
  const bytes = Buffer.alloc(1024, 0x61);
  await writeFile(dumpPath, bytes);
  await writeFile(`${dumpPath}.manifest.json`, JSON.stringify({
    sha256: createHash("sha256").update(bytes).digest("hex"), byte_length: bytes.length, fingerprint: {},
  }));
  const admin = new pg.Client({ connectionString: runtime.adminUrl });
  let existingCreated = false;
  try {
    await admin.connect();
    await admin.query(`CREATE DATABASE "${existing}"`);
    existingCreated = true;
    const preserved = new pg.Client({ connectionString: databaseUrlFor(runtime, existing) });
    try {
      await preserved.connect();
      await preserved.query("CREATE TABLE restore_sentinel(value text NOT NULL)");
      await preserved.query("INSERT INTO restore_sentinel VALUES ('keep this existing database')");
      await assert.rejects(restoreBackup({ inputPath: dumpPath, targetDatabase: existing }), /restore_target_already_exists/);
      assert.deepEqual((await preserved.query("SELECT value FROM restore_sentinel")).rows,
        [{ value: "keep this existing database" }]);
      assert.equal((await admin.query("SELECT 1 FROM pg_database WHERE datname=$1", [failed])).rowCount, 0);
      await assert.rejects(restoreBackup({ inputPath: dumpPath, targetDatabase: failed }), /backup_postgres_command_failed/);
      assert.equal((await admin.query("SELECT 1 FROM pg_database WHERE datname=$1", [failed])).rowCount, 0,
        "a newly created failed restore target must be reclaimed");
      assert.deepEqual((await preserved.query("SELECT value FROM restore_sentinel")).rows,
        [{ value: "keep this existing database" }]);
    } finally { await preserved.end(); }
  } finally {
    try {
      if (existingCreated) await admin.query(`DROP DATABASE "${existing}"`);
    } finally {
      try { await admin.end(); }
      finally { await rm(directory, { recursive: true, force: true }); }
    }
  }
});
