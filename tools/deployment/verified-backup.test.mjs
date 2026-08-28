import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { decodeBackupKey, decryptBackup, encryptBackup, executeVerifiedBackup } from "./verified-backup.mjs";
import { maintainTrialBackups } from "./backup-maintenance.mjs";
import { dispatchBackupMaintenance } from "./backup-maintenance-cli.mjs";
import { managedCrontab } from "./install-backup-schedule.mjs";

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

test("backup restores before publishing and scopes trial expiry without pruning", async (t) => {
  for (const [environment, preview] of [["staging", false], ["production", false], ["staging", true]]) {
    await t.test(`${environment}/${preview ? "personal-trial" : "formal"}`, async () => {
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
        const legacyPath = path.join(backupDirectory, "legacy-backup.pgdump.enc");
        await writeFile(legacyPath, "untouched-existing-backup");
        const result = await executeVerifiedBackup({
          validation: {
            environment,
            schemaVersion: preview ? "starward-operator-preview-validation-v1" : "starward-release-environment-validation-v1",
            revision,
            imageDigest,
            operations: { backupDirectory, maxBackupBytes: 1024 * 1024 },
          },
          deploy: { COMPOSE_PROJECT_NAME: `starward-${environment}` },
          postgres: { POSTGRES_DB: "starward", POSTGRES_USER: "starward" },
          key: decodeBackupKey("22".repeat(32)),
          run,
          now: () => new Date("2026-08-28T23:30:00.000+08:00"),
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
        const persisted = JSON.parse(await readFile(result.manifestPath, "utf8"));
        assert.deepEqual(persisted, result.manifest);
        if (preview) {
          assert.deepEqual(persisted.retention, {
            policyId: "personal-trial-7d", days: 7,
            expiresAt: "2026-09-04T15:30:00.000Z", cleanupPerformed: false,
          });
          assert.equal(Date.parse(persisted.retention.expiresAt) - Date.parse(persisted.createdAt), 168 * 60 * 60 * 1000);
        } else {
          assert.equal(Object.hasOwn(persisted, "retention"), false);
        }
        assert.equal(await readFile(legacyPath, "utf8"), "untouched-existing-backup");
      } finally {
        await rm(backupDirectory, { recursive: true, force: true });
      }
    });
  }
});

test("trial retention rejects a production identity before database access", async () => {
  await assert.rejects(executeVerifiedBackup({
    validation: { environment: "production", schemaVersion: "starward-operator-preview-validation-v1", operations: {} },
    postgres: { POSTGRES_DB: "starward", POSTGRES_USER: "starward" },
    run: () => assert.fail("must not access database"),
  }), /backup_personal_trial_requires_staging/u);
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

async function maintenanceFixture(t) {
  const backupDirectory = await mkdtemp(path.join(os.tmpdir(), "starward-maintenance-"));
  t.after(() => rm(backupDirectory, { recursive: true, force: true }));
  const validation = { environment: "staging", schemaVersion: "starward-operator-preview-validation-v1",
    revision, imageDigest, operations: { backupDirectory, maxBackupBytes: 1048576 } };
  const deploy = { COMPOSE_PROJECT_NAME: "starward-staging" };
  const postgres = { POSTGRES_DB: "starward", POSTGRES_USER: "starward" };
  return { validation, deploy, postgres, now: new Date("2026-09-05T00:00:00.000Z"),
    make: (date, overrides = {}) => executeVerifiedBackup({ validation, deploy, postgres,
      key: decodeBackupKey("44".repeat(32)), now: () => new Date(date),
      run: ({ step }) => ({ stdout: Buffer.from(step === "backup-dump" ? "PGDMP".repeat(200) : "009_account_erasure_guards"), stderr: Buffer.alloc(0) }),
      ...overrides,
    }),
  };
}

test("maintenance honors exact expiry, dry-run, scope and legacy preservation", async (t) => {
  const f = await maintenanceFixture(t);
  const expired = await f.make("2026-08-29T00:00:00.000Z");
  const justInside = await f.make("2026-08-29T00:00:00.001Z");
  const fresh = await f.make("2026-09-04T12:00:00.000Z");
  const foreign = await f.make("2026-08-01T00:00:00.000Z", { deploy: { COMPOSE_PROJECT_NAME: "another-project" } });
  const legacy = await f.make("2026-08-01T00:00:00.000Z", { validation: { ...f.validation, schemaVersion: "starward-release-environment-validation-v1" } });
  const keyPath = path.join(f.validation.operations.backupDirectory, "backup.key");
  await writeFile(keyPath, "untouched-key");
  const inspected = await maintainTrialBackups(f);
  assert.deepEqual(inspected, { mode: "inspect", eligible: 3, expired: 1, removed: 0, unclassified: 2, backupDue: false });
  await readFile(expired.encryptedPath);
  const applied = await maintainTrialBackups({ ...f, apply: true });
  assert.equal(applied.removed, 1);
  await assert.rejects(readFile(expired.encryptedPath), { code: "ENOENT" });
  await assert.rejects(readFile(expired.manifestPath), { code: "ENOENT" });
  for (const record of [justInside, fresh, foreign, legacy]) await readFile(record.encryptedPath);
  assert.equal(await readFile(keyPath, "utf8"), "untouched-key");
  assert.equal((await maintainTrialBackups({ ...f, apply: true })).removed, 0);
});

test("maintenance preflights integrity and path confinement before deleting any backup", async (t) => {
  for (const mutation of ["ciphertext", "filename", "expiry", "future"]) {
    await t.test(mutation, async (sub) => {
      const f = await maintenanceFixture(sub);
      const old = await f.make("2026-08-01T00:00:00.000Z");
      const bad = await f.make("2026-08-02T00:00:00.000Z");
      const manifest = JSON.parse(await readFile(bad.manifestPath, "utf8"));
      if (mutation === "ciphertext") await writeFile(bad.encryptedPath, "tampered");
      if (mutation === "filename") manifest.encrypted.fileName = "../outside.pgdump.enc";
      if (mutation === "expiry") manifest.retention.expiresAt = "2027-01-01T00:00:00.000Z";
      if (mutation === "future") manifest.createdAt = "2027-01-01T00:00:00.000Z";
      await writeFile(bad.manifestPath, JSON.stringify(manifest));
      await assert.rejects(maintainTrialBackups({ ...f, apply: true }), /backup_maintenance_/u);
      await readFile(old.encryptedPath);
    });
  }
});

test("maintenance requests a daily replacement and rejects non-preview before touching files", async (t) => {
  const f = await maintenanceFixture(t);
  assert.equal((await maintainTrialBackups(f)).backupDue, true);
  await f.make("2026-09-04T00:00:00.000Z");
  assert.equal((await maintainTrialBackups(f)).backupDue, true);
  for (const validation of [{ ...f.validation, environment: "production" }, { ...f.validation, schemaVersion: "starward-release-environment-validation-v1" }]) {
    await assert.rejects(maintainTrialBackups({ ...f, validation, apply: true }), /preview_required/u);
  }
});

test("scheduled dispatch follows only a successful preview pointer and surfaces failures", async (t) => {
  const f = await maintenanceFixture(t);
  const directory = f.validation.operations.backupDirectory;
  const receiptPath = path.join(directory, "deployment.json");
  const pointerPath = path.join(directory, "current.json");
  const receipt = { schemaVersion: "starward-operator-preview-operation-v1", operation: "deploy",
    environment: "staging", productionQualified: false, status: "succeeded", revision, imageDigest };
  const pointer = { receiptPath, sourceRoot: path.resolve("."), deployEnvPath: path.join(directory, "deploy.env"), revision, imageDigest };
  await writeFile(receiptPath, JSON.stringify(receipt));
  await writeFile(pointerPath, JSON.stringify(pointer));
  const execute = (command, args, options) => {
    assert.equal(command, process.execPath);
    assert.deepEqual(args.slice(1), ["--deploy-env", pointer.deployEnvPath, "--operation", "maintain-backups", "--operator", "scheduled-backup"]);
    assert.equal(options.cwd, pointer.sourceRoot);
    return { status: 0, stdout: JSON.stringify({ receiptPath, receipt: { ...receipt,
      operation: "maintain-backups", retention: { unclassified: 0 } } }) };
  };
  assert.equal((await dispatchBackupMaintenance({ pointerPath, execute })).status, "succeeded");
  await assert.rejects(dispatchBackupMaintenance({ pointerPath, execute: () => ({ status: 1, stderr: "private diagnostic" }) }), /operation_failed_check_receipts/u);
  await assert.rejects(dispatchBackupMaintenance({ pointerPath, execute: () => ({ status: 0, stdout: JSON.stringify({ receipt: { ...receipt, operation: "maintain-backups", retention: { unclassified: 1 } } }) }) }), /unclassified_backups_require_inventory/u);
  await writeFile(receiptPath, JSON.stringify({ ...receipt, revision: "c".repeat(40) }));
  await assert.rejects(dispatchBackupMaintenance({ pointerPath, execute: () => assert.fail("must not dispatch") }), /successful_preview_required/u);
});

test("cron installation preserves unrelated tasks and replaces only its own block", () => {
  const options = { nodePath: "/usr/local/bin/node", dispatcherPath: "/private/dispatcher.mjs", pointerPath: "/private/current.json", statusPath: "/private/latest.json", minute: 17 };
  const existing = "MAILTO=\"\"\n0 3 * * * /usr/bin/true\n";
  const first = managedCrontab(existing, options);
  assert.ok(first.startsWith(existing));
  assert.equal(first, managedCrontab(first, options));
  const changed = managedCrontab(first, { ...options, minute: 23 });
  assert.ok(changed.startsWith(existing));
  assert.ok(changed.includes("23 * * * * /usr/local/bin/node"));
  assert.equal(changed.split("# BEGIN STARWARD").length, 2);
  assert.throws(() => managedCrontab(first.replace("# END STARWARD", "# BAD STARWARD"), options), /ambiguous_managed_block/u);
  assert.throws(() => managedCrontab(existing, { ...options, statusPath: "/tmp/a;sh" }), /unsafe_path/u);
  assert.throws(() => managedCrontab(existing, { ...options, minute: 60 }), /minute_invalid/u);
});
