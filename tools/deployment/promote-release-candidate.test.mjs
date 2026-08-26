import assert from "node:assert/strict";
import { rm, writeFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { promoteReleaseCandidate } from "./promote-release-candidate.mjs";
import {
  createReleaseEnvironmentFixture,
  releaseImageDigest,
  releaseRevision,
} from "./test-support.mjs";

const releasedAt = "2026-08-26T10:00:00.000Z";

async function withFixture(overrides, assertion) {
  const fixture = await createReleaseEnvironmentFixture(overrides);
  try {
    await assertion(fixture);
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
}

function stagingSteps() {
  return [
    "backup-verification",
    "compose-version",
    "compose-config",
    "image-pull",
    "migration",
    "converge",
    "worker-readiness",
    "public-readiness",
  ].map((name) => ({ name, status: "passed" }));
}

async function stagingReceipt(fixture, overrides = {}) {
  const receiptPath = path.join(fixture.root, "staging.release.json");
  await writeFile(receiptPath, `${JSON.stringify({
    schemaVersion: "starward-release-receipt-v1",
    status: "succeeded",
    environment: "staging",
    revision: releaseRevision,
    imageDigest: releaseImageDigest,
    steps: stagingSteps(),
    ...overrides,
  })}\n`);
  return receiptPath;
}

function selected(fixture, overrides = {}) {
  const calls = [];
  return {
    input: {
      baseDeployEnvPath: fixture.baseDeployPath,
      candidateOutputPath: path.join(fixture.root, "candidate", "deploy.env"),
      imageReference: `registry.example/starward@${releaseImageDigest}`,
      revision: releaseRevision,
      releasedAt,
      operator: "ci:release",
      async backup({ deployEnvPath }) {
        calls.push(["backup", deployEnvPath]);
        return { manifestPath: path.join(fixture.root, "backup.manifest.json") };
      },
      async release(args) {
        calls.push(["release", args]);
        return {
          receiptPath: path.join(fixture.root, "release.receipt.json"),
          receipt: { status: "succeeded" },
        };
      },
      ...overrides,
    },
    calls,
  };
}

test("staging promotion uses one prepared candidate for backup and release", async () => {
  await withFixture({}, async (fixture) => {
    const { input, calls } = selected(fixture);
    const result = await promoteReleaseCandidate(input);
    assert.equal(result.environment, "staging");
    assert.equal(result.imageDigest, releaseImageDigest);
    assert.deepEqual(calls.map(([name]) => name), ["backup", "release"]);
    assert.equal(calls[0][1], result.candidatePath);
    assert.equal(calls[1][1].deployEnvPath, result.candidatePath);
    assert.equal(calls[1][1].backupManifestPath, result.backupManifestPath);
  });
});

test("production stops before backup without exact digest confirmation", async () => {
  await withFixture({ environment: "production" }, async (fixture) => {
    const { input, calls } = selected(fixture);
    await assert.rejects(
      () => promoteReleaseCandidate(input),
      /release_production_digest_confirmation_required/u,
    );
    assert.equal(calls.length, 0);
  });
});

test("production requires the same candidate to have passed every staging step", async () => {
  await withFixture({ environment: "production" }, async (fixture) => {
    const receiptPath = await stagingReceipt(fixture);
    const { input, calls } = selected(fixture, {
      stagingReceiptPath: receiptPath,
      confirmProductionDigest: releaseImageDigest,
    });
    const result = await promoteReleaseCandidate(input);
    assert.equal(result.environment, "production");
    assert.equal(result.stagingReceiptPath, receiptPath);
    assert.deepEqual(calls.map(([name]) => name), ["backup", "release"]);
  });
});

test("production rejects a staging receipt for another digest", async () => {
  await withFixture({ environment: "production" }, async (fixture) => {
    const receiptPath = await stagingReceipt(fixture, { imageDigest: `sha256:${"c".repeat(64)}` });
    const { input, calls } = selected(fixture, {
      stagingReceiptPath: receiptPath,
      confirmProductionDigest: releaseImageDigest,
    });
    await assert.rejects(
      () => promoteReleaseCandidate(input),
      /release_promotion_staging_digest_mismatch/u,
    );
    assert.equal(calls.length, 0);
  });
});

test("production rejects an incomplete staging qualification", async () => {
  await withFixture({ environment: "production" }, async (fixture) => {
    const receiptPath = await stagingReceipt(fixture, { steps: stagingSteps().slice(0, -1) });
    const { input, calls } = selected(fixture, {
      stagingReceiptPath: receiptPath,
      confirmProductionDigest: releaseImageDigest,
    });
    await assert.rejects(
      () => promoteReleaseCandidate(input),
      /release_promotion_staging_step_missing:public-readiness/u,
    );
    assert.equal(calls.length, 0);
  });
});
