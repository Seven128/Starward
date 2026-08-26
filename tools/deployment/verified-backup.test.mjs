import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { decodeBackupKey, decryptBackup, encryptBackup, executeVerifiedBackup } from "./verified-backup.mjs";

const revision = "a".repeat(40);
const imageDigest = `sha256:${"b".repeat(64)}`;

test("encrypted dump round-trips and rejects tampering", () => {
  const key = decodeBackupKey("11".repeat(32));
  const plaintext = Buffer.from("PGDMP".repeat(200));
  const envelope = encryptBackup(plaintext, key, Buffer.alloc(12, 7));
  assert.deepEqual(decryptBackup(envelope, key), plaintext);
  const tampered = Buffer.from(envelope);
  tampered[tampered.length - 1] ^= 1;
  assert.throws(() => decryptBackup(tampered, key));
});

test("backup restores into an isolated database before publishing encrypted bytes", async () => {
  const backupDirectory = await mkdtemp(path.join(os.tmpdir(), "starward-verified-backup-"));
  const calls = [];
  const run = (input) => {
    calls.push(input);
    if (input.step === "backup-source-schema" || input.step === "backup-restored-schema")
      return { stdout: Buffer.from("006_contribution_intake\n"), stderr: Buffer.alloc(0) };
    if (input.step === "backup-dump")
      return { stdout: Buffer.from("PGDMP".repeat(200)), stderr: Buffer.alloc(0) };
    return { stdout: Buffer.alloc(0), stderr: Buffer.alloc(0) };
  };
  try {
    const result = await executeVerifiedBackup({
      validation: {
        environment: "staging",
        revision,
        imageDigest,
        operations: { backupDirectory, maxBackupBytes: 1024 * 1024 },
      },
      deploy: { COMPOSE_PROJECT_NAME: "starward-staging" },
      postgres: { POSTGRES_DB: "starward", POSTGRES_USER: "starward" },
      key: decodeBackupKey("22".repeat(32)),
      run,
      now: () => new Date("2026-08-26T12:00:00.000Z"),
      random: (length) => Buffer.alloc(length, 3),
    });
    assert.equal(result.manifest.status, "verified");
    assert.equal(result.manifest.restore.temporaryDatabaseDropped, true);
    assert.deepEqual(calls.map((entry) => entry.step), [
      "backup-source-schema",
      "backup-dump",
      "backup-restore-create",
      "backup-restore-load",
      "backup-restored-schema",
      "backup-restore-cleanup",
    ]);
    const encrypted = await readFile(result.encryptedPath);
    assert.equal(decryptBackup(encrypted, decodeBackupKey("22".repeat(32))).toString(), "PGDMP".repeat(200));
  } finally {
    await rm(backupDirectory, { recursive: true, force: true });
  }
});

test("restore mismatch fails and still drops the temporary database", async () => {
  const backupDirectory = await mkdtemp(path.join(os.tmpdir(), "starward-verified-backup-fail-"));
  const calls = [];
  try {
    await assert.rejects(() => executeVerifiedBackup({
      validation: {
        environment: "production",
        revision,
        imageDigest,
        operations: { backupDirectory, maxBackupBytes: 1024 * 1024 },
      },
      deploy: { COMPOSE_PROJECT_NAME: "starward-production" },
      postgres: { POSTGRES_DB: "starward", POSTGRES_USER: "starward" },
      key: decodeBackupKey("33".repeat(32)),
      run(input) {
        calls.push(input.step);
        if (input.step === "backup-source-schema")
          return { stdout: Buffer.from("006_contribution_intake\n"), stderr: Buffer.alloc(0) };
        if (input.step === "backup-restored-schema")
          return { stdout: Buffer.from("005_decision_snapshot_separation\n"), stderr: Buffer.alloc(0) };
        if (input.step === "backup-dump")
          return { stdout: Buffer.from("PGDMP".repeat(200)), stderr: Buffer.alloc(0) };
        return { stdout: Buffer.alloc(0), stderr: Buffer.alloc(0) };
      },
      now: () => new Date("2026-08-26T12:00:00.000Z"),
      random: (length) => Buffer.alloc(length, 4),
    }), /backup_restore_schema_mismatch/u);
    assert.equal(calls.at(-1), "backup-restore-cleanup");
  } finally {
    await rm(backupDirectory, { recursive: true, force: true });
  }
});
