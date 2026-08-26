import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { executeDatabaseRecovery } from "./recover-database.mjs";
import { decodeBackupKey, encryptBackup } from "./verified-backup.mjs";

const revision = "a".repeat(40);
const imageDigest = `sha256:${"b".repeat(64)}`;
const schemaMigration = "006_contribution_intake";
const key = decodeBackupKey("44".repeat(32));
const dump = Buffer.from("PGDMP".repeat(200));
const envelope = encryptBackup(dump, key, Buffer.alloc(12, 8));
const encryptedSha256 = createHash("sha256").update(envelope).digest("hex");

const securityHeaders = Object.freeze({
  "strict-transport-security": "max-age=31536000; includeSubDomains",
  "x-content-type-options": "nosniff",
  "referrer-policy": "no-referrer",
  "permissions-policy": "camera=(), microphone=(), geolocation=()",
  "content-security-policy": "default-src 'none'; frame-ancestors 'none'",
});

const tlsEvidence = Object.freeze({
  protocol: "TLSv1.3",
  certificateValidTo: "2026-10-01T00:00:00.000Z",
  certificateFingerprint256: "AA:".repeat(31) + "AA",
  remoteAddress: "203.0.113.10",
});

function clock() {
  let tick = 0;
  return () => new Date(Date.parse("2026-08-26T14:00:00.000Z") + tick++ * 1_000);
}

function readyResponse(release = { environment: "production", revision, imageDigest }) {
  const response = new Response(JSON.stringify({ status: "ready", release }), {
    status: 200,
    headers: { "content-type": "application/json", ...securityHeaders },
  });
  Object.defineProperty(response, "url", { value: "https://api.starward.test/health/ready" });
  return response;
}

async function recoveryFixture(overrides = {}) {
  const root = await mkdtemp(path.join(os.tmpdir(), "starward-recovery-"));
  const calls = [];
  const validation = {
    environment: "production",
    domain: "api.starward.test",
    revision,
    imageDigest,
    operations: { receiptDirectory: root, maxBackupBytes: 1024 * 1024 },
  };
  const manifest = {
    schemaVersion: "starward-verified-backup-v1",
    status: "verified",
    environment: "production",
    composeProject: "starward-production",
    sourceDatabase: "starward",
    releaseRevision: "c".repeat(40),
    releaseImageDigest: `sha256:${"d".repeat(64)}`,
    schemaMigration,
    createdAt: "2026-08-25T12:00:00.000Z",
    verifiedAt: "2026-08-25T12:00:01.000Z",
    encrypted: {
      algorithm: "aes-256-gcm",
      fileName: "production-backup.pgdump.enc",
      byteLength: envelope.length,
      sha256: encryptedSha256,
    },
    restore: { status: "restored_and_verified", temporaryDatabaseDropped: true },
    ...(overrides.manifest ?? {}),
  };
  const run = (input) => {
    calls.push(input);
    if (input.step === "recovery-restored-schema")
      return { stdout: Buffer.from(`${overrides.restoredSchema ?? schemaMigration}\n`), stderr: Buffer.alloc(0) };
    return { stdout: Buffer.alloc(0), stderr: Buffer.alloc(0) };
  };
  return {
    root,
    calls,
    input: {
      validation,
      deploy: { COMPOSE_PROJECT_NAME: "starward-production" },
      postgres: { POSTGRES_DB: "starward", POSTGRES_USER: "starward" },
      manifest,
      envelope: Buffer.from(overrides.envelope ?? envelope),
      key: Buffer.from(key),
      confirmEnvironment: "production",
      confirmBackupSha256: encryptedSha256,
      confirmTargetDatabase: "starward",
      operator: "operator:recovery",
      run,
      fetchImpl: async () => readyResponse(),
      inspectTls: async () => tlsEvidence,
      delay: async () => {},
      now: clock(),
      random: (length) => Buffer.alloc(length, 5),
      ...(overrides.input ?? {}),
    },
  };
}

async function withRecovery(overrides, assertion) {
  const fixture = await recoveryFixture(overrides);
  try {
    await assertion(fixture);
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
}

test("recovery requires exact environment, database and backup digest before any process", async () => {
  await withRecovery({ input: { confirmBackupSha256: "0".repeat(64) } }, async ({ input, calls }) => {
    await assert.rejects(
      () => executeDatabaseRecovery(input),
      /recovery_backup_digest_confirmation_required/u,
    );
    assert.equal(calls.length, 0);
  });
});

test("verified backup restores in isolation then atomically retains and replaces the database", async () => {
  await withRecovery({}, async ({ input, calls }) => {
    const result = await executeDatabaseRecovery(input);
    assert.equal(result.receipt.status, "succeeded");
    assert.equal(result.receipt.targetDatabase, "starward");
    assert.match(result.receipt.retainedDatabase, /^starward_recovery_old_/u);
    assert.deepEqual(calls.map((call) => call.step), [
      "recovery-restore-create",
      "recovery-restore-load",
      "recovery-restored-schema",
      "recovery-stop-edge",
      "recovery-stop-writers",
      "recovery-terminate-target-connections",
      "recovery-rename-original",
      "recovery-rename-restored",
      "recovery-start-services",
      "recovery-worker-readiness",
    ]);
    assert.deepEqual(result.receipt.steps.map((step) => step.name), [
      "isolated-restore",
      "schema-verification",
      "edge-stop",
      "writer-stop",
      "connection-drain",
      "original-retained",
      "database-cutover",
      "service-start",
      "worker-readiness",
      "public-readiness",
    ]);
    assert.deepEqual(result.receipt.steps.at(-1).tls, tlsEvidence);
    const persisted = await readFile(result.receiptPath, "utf8");
    assert.doesNotMatch(persisted, /PGDMP|44444444/u);
  });
});

test("schema mismatch drops only the isolated restore and never stops service", async () => {
  await withRecovery({ restoredSchema: "005_decision_snapshot_separation" }, async ({ input, calls, root }) => {
    await assert.rejects(() => executeDatabaseRecovery(input), /recovery_schema_mismatch/u);
    assert.deepEqual(calls.map((call) => call.step), [
      "recovery-restore-create",
      "recovery-restore-load",
      "recovery-restored-schema",
      "recovery-restore-cleanup",
    ]);
    const receiptName = (await readdir(root)).find((name) => name.endsWith(".recovery.json"));
    const receipt = JSON.parse(await readFile(path.join(root, receiptName), "utf8"));
    assert.equal(receipt.status, "failed");
    assert.equal(receipt.rollback.status, "not_required");
  });
});

test("failed new-database readiness switches back to the retained original", async () => {
  await withRecovery({}, async ({ input, calls, root }) => {
    let healthAttempt = 0;
    input.fetchImpl = async () => {
      healthAttempt += 1;
      return healthAttempt === 1
        ? readyResponse({ environment: "production", revision: "f".repeat(40), imageDigest })
        : readyResponse();
    };
    await assert.rejects(() => executeDatabaseRecovery(input), /release_health_identity_mismatch/u);
    assert.deepEqual(calls.map((call) => call.step).slice(-7), [
      "recovery-rollback-stop-edge",
      "recovery-rollback-stop-writers",
      "recovery-rollback-terminate-connections",
      "recovery-rollback-retain-restored",
      "recovery-rollback-restore-original",
      "recovery-rollback-start-services",
      "recovery-rollback-worker-readiness",
    ]);
    const receiptName = (await readdir(root)).find((name) => name.endsWith(".recovery.json"));
    const receipt = JSON.parse(await readFile(path.join(root, receiptName), "utf8"));
    assert.equal(receipt.status, "failed");
    assert.equal(receipt.rollback.status, "original_restored");
    assert.match(receipt.restoredDatabase, /^starward_recovery_new_/u);
  });
});

test("failure between database renames restores the original name and removes the isolated database", async () => {
  await withRecovery({}, async ({ input, calls, root }) => {
    input.run = (invocation) => {
      calls.push(invocation);
      if (invocation.step === "recovery-restored-schema")
        return { stdout: Buffer.from(`${schemaMigration}\n`), stderr: Buffer.alloc(0) };
      if (invocation.step === "recovery-rename-restored")
        throw new Error("deployment_process_failed:recovery-rename-restored:9");
      return { stdout: Buffer.alloc(0), stderr: Buffer.alloc(0) };
    };
    await assert.rejects(
      () => executeDatabaseRecovery(input),
      /deployment_process_failed:recovery-rename-restored:9/u,
    );
    assert.deepEqual(calls.map((call) => call.step).slice(-4), [
      "recovery-rollback-restore-original",
      "recovery-rollback-start-services",
      "recovery-rollback-worker-readiness",
      "recovery-restore-cleanup",
    ]);
    const receiptName = (await readdir(root)).find((name) => name.endsWith(".recovery.json"));
    const receipt = JSON.parse(await readFile(path.join(root, receiptName), "utf8"));
    assert.equal(receipt.rollback.status, "original_restored");
    assert.equal(receipt.restoredDatabase, null);
  });
});

test("tampered encrypted bytes fail before database creation", async () => {
  const tampered = Buffer.from(envelope);
  tampered[tampered.length - 1] ^= 1;
  await withRecovery({ envelope: tampered }, async ({ input, calls }) => {
    await assert.rejects(() => executeDatabaseRecovery(input), /recovery_backup_digest_mismatch/u);
    assert.equal(calls.length, 0);
  });
});
