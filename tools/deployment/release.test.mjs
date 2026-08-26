import assert from "node:assert/strict";
import { readFile, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { executeRelease } from "./release.mjs";
import {
  createReleaseEnvironmentFixture,
  createVerifiedBackupFixture,
  releaseImageDigest,
  releaseRevision,
} from "./test-support.mjs";

function releaseClock(start = "2026-08-26T12:00:00.000Z") {
  let tick = 0;
  const base = Date.parse(start);
  return () => new Date(base + tick++ * 1_000);
}

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

function readyResponse({
  domain,
  environment,
  release = {
    environment,
    revision: releaseRevision,
    imageDigest: releaseImageDigest,
  },
  headers = {},
  body = { status: "ready", release },
  status = 200,
  url = `https://${domain}/health/ready`,
} = {}) {
  const response = new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      ...securityHeaders,
      ...headers,
    },
  });
  Object.defineProperty(response, "url", { value: url });
  return response;
}

async function withFixture(overrides, assertion) {
  const fixture = await createReleaseEnvironmentFixture(overrides);
  try {
    await assertion(fixture);
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
}

test("staging release promotes one immutable candidate through the fixed sequence", async () => {
  await withFixture({}, async (fixture) => {
    const backup = await createVerifiedBackupFixture({ fixture });
    const calls = [];
    const result = await executeRelease({
      deployEnvPath: fixture.deployPath,
      backupManifestPath: backup.manifestPath,
      operator: "ci:staging",
      execute(invocation) {
        calls.push(invocation);
        return { stdout: Buffer.alloc(0), stderr: Buffer.alloc(0) };
      },
      fetchImpl: async () => readyResponse({ domain: fixture.domain, environment: "staging" }),
      inspectTls: async () => tlsEvidence,
      delay: async () => {},
      now: releaseClock(),
    });

    assert.equal(result.receipt.status, "succeeded");
    assert.equal(result.receipt.imageDigest, releaseImageDigest);
    assert.deepEqual(calls.map((call) => call.step), [
      "release-compose-version",
      "release-compose-config",
      "release-image-pull",
      "release-migration",
      "release-converge",
      "release-worker-readiness",
    ]);
    assert.deepEqual(calls.map((call) => call.args.slice(-1)[0]), [
      "version",
      "--quiet",
      "pull",
      "migrate",
      "--remove-orphans",
      "workers/miniapp-api/dist/worker-healthcheck.js",
    ]);
    assert.deepEqual(result.receipt.steps.map((step) => step.name), [
      "backup-verification",
      "compose-version",
      "compose-config",
      "image-pull",
      "migration",
      "converge",
      "worker-readiness",
      "public-readiness",
    ]);
    const publicStep = result.receipt.steps.at(-1);
    assert.deepEqual(publicStep.http, {
      url: `https://${fixture.domain}/health/ready`,
      securityHeaders: "passed",
    });
    assert.deepEqual(publicStep.tls, tlsEvidence);
    const persisted = await readFile(result.receiptPath, "utf8");
    assert.doesNotMatch(persisted, /wechat-app-secret|database-password|session-secret/u);
  });
});

test("production cannot begin without an exact typed digest confirmation", async () => {
  await withFixture({ environment: "production" }, async (fixture) => {
    let processStarted = false;
    await assert.rejects(
      () => executeRelease({
        deployEnvPath: fixture.deployPath,
        backupManifestPath: path.join(fixture.root, "unused.json"),
        operator: "operator:production",
        confirmProductionDigest: `sha256:${"c".repeat(64)}`,
        execute() {
          processStarted = true;
        },
      }),
      /release_production_digest_confirmation_required/u,
    );
    assert.equal(processStarted, false);
  });
});

test("tampered backup fails before Compose and writes a redacted failed receipt", async () => {
  await withFixture({}, async (fixture) => {
    const backup = await createVerifiedBackupFixture({ fixture });
    await writeFile(path.join(fixture.backupDirectory, backup.encryptedFileName), "tampered");
    let processStarted = false;
    await assert.rejects(
      () => executeRelease({
        deployEnvPath: fixture.deployPath,
        backupManifestPath: backup.manifestPath,
        operator: "operator:staging",
        execute() {
          processStarted = true;
        },
        now: releaseClock(),
      }),
      /release_backup_file_size_mismatch/u,
    );
    assert.equal(processStarted, false);
    const receiptFiles = await readdir(fixture.receiptDirectory);
    assert.equal(receiptFiles.length, 1);
    const receipt = JSON.parse(await readFile(path.join(fixture.receiptDirectory, receiptFiles[0]), "utf8"));
    assert.equal(receipt.status, "failed");
    assert.equal(receipt.backup, null);
    assert.equal(receipt.errorCode, "release_backup_file_size_mismatch");
  });
});

test("a verified backup older than the release window fails closed", async () => {
  await withFixture({}, async (fixture) => {
    const backup = await createVerifiedBackupFixture({ fixture });
    let processStarted = false;
    await assert.rejects(
      () => executeRelease({
        deployEnvPath: fixture.deployPath,
        backupManifestPath: backup.manifestPath,
        operator: "operator:staging",
        execute() {
          processStarted = true;
        },
        now: releaseClock("2026-08-26T18:00:01.000Z"),
      }),
      /release_backup_manifest_stale/u,
    );
    assert.equal(processStarted, false);
  });
});

test("a command failure stops the sequence and preserves an attributable receipt", async () => {
  await withFixture({}, async (fixture) => {
    const backup = await createVerifiedBackupFixture({ fixture });
    const calls = [];
    await assert.rejects(
      () => executeRelease({
        deployEnvPath: fixture.deployPath,
        backupManifestPath: backup.manifestPath,
        operator: "operator:staging",
        execute(invocation) {
          calls.push(invocation.step);
          if (invocation.step === "release-image-pull")
            throw new Error("deployment_process_failed:release-image-pull:17");
          return { stdout: Buffer.alloc(0), stderr: Buffer.alloc(0) };
        },
        now: releaseClock(),
      }),
      /deployment_process_failed:release-image-pull:17/u,
    );
    assert.deepEqual(calls, ["release-compose-version", "release-compose-config", "release-image-pull"]);
    const receiptFiles = await readdir(fixture.receiptDirectory);
    const receipt = JSON.parse(await readFile(path.join(fixture.receiptDirectory, receiptFiles[0]), "utf8"));
    assert.equal(receipt.status, "failed");
    assert.equal(receipt.errorCode, "deployment_process_failed:release-image-pull:17");
    assert.deepEqual(receipt.steps.map((step) => step.name), [
      "backup-verification",
      "compose-version",
      "compose-config",
      "release",
    ]);
  });
});
