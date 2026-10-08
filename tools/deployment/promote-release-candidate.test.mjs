import assert from "node:assert/strict";
import { appendFile, readFile, realpath, readdir, rm, stat, writeFile } from "node:fs/promises";
import { cpSync, existsSync, realpathSync, renameSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { promoteReleaseCandidate } from "./promote-release-candidate.mjs";
import { executeRelease } from "./release.mjs";
import { readSkyStaticBackup } from "./sky-static-backup.mjs";
import { skyStaticHash, writeSkyStaticBundle } from "./sky-static-bundle.mjs";
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
    const resolved = await realpath(fixture.root), temporary = await realpath(os.tmpdir());
    assert.equal(path.dirname(resolved).toLowerCase(), temporary.toLowerCase());
    assert.ok(path.basename(resolved).startsWith("starward-release-env-"));
    await rm(fixture.root, { recursive: true, force: true });
  }
}

test("first Sky promotion prepares once before backup and passes its lease to backup and release", async () => {
  await withFixture({}, async fixture => {
    await appendFile(fixture.baseDeployPath, `STARWARD_SKY_STATIC_DIRECTORY=${path.join(fixture.root, "sky-store")}\n`);
    const order = [], delivery = { identity: { schemaVersion: "starward-sky-static-delivery-v1", revision: releaseRevision,
      imageDigest: releaseImageDigest, imagePublicationHash: "1".repeat(64), deliveryPublicationHash: "1".repeat(64), files: 1, bytes: 10 },
      async dispose() { order.push("dispose"); } };
    const { input } = selected(fixture, {
      async prepareStaticRelease() { order.push("prepare"); return delivery; },
      async backup(args) { assert.equal(args.delivery, delivery); order.push("backup"); return { manifestPath: path.join(fixture.root, "backup.json") }; },
      async release(args) { assert.equal(args.preparedStaticDelivery, delivery); order.push("release");
        return { receiptPath: path.join(fixture.root, "release.json"), receipt: { status: "succeeded", skyStaticDelivery: delivery.identity } }; },
    });
    const result = await promoteReleaseCandidate(input);
    assert.equal(result.schemaVersion, "starward-release-promotion-v2");
    assert.deepEqual(order, ["prepare", "backup", "release", "dispose"]);
  });
});

async function realSkyPromotionFixture(fixture, failStep) {
  const store = path.join(fixture.root, "sky-store");
  await appendFile(fixture.baseDeployPath, `STARWARD_SKY_STATIC_DIRECTORY=${store}\n`);
  const old = JSON.parse(await readFile("output/sky-static-owner-independent-1002-r4/normal-store/prepared-inventory.json", "utf8"));
  const oldDirectory = path.resolve("output/sky-static-owner-independent-1002-r4/normal-store", old.generation, "publication");
  const index = JSON.parse(await readFile(path.join(oldDirectory, "index.json"), "utf8"));
  const producer = await writeSkyStaticBundle(path.join(fixture.root, "candidate-producer"), (async function* () {
    for (const record of index.records) yield { route: record.route, headers: record.headers,
      bytes: await readFile(path.join(oldDirectory, `files${record.route}`)) };
  })());
  await writeFile(path.join(producer.output, "image-artifact.json"), JSON.stringify({ schemaVersion: "starward-sky-static-image-artifact-v1",
    revision: releaseRevision, publicationHash: producer.publicationHash, indexSha256: skyStaticHash(await readFile(path.join(producer.output, "index.json"))),
    fragmentSha256: skyStaticHash(await readFile(path.join(producer.output, "delivery.caddy"))) }));
  const calls = []; let containerExists = false, leaseObservedDuringBackup = false;
  const execute = call => {
    calls.push(call.step);
    if (call.step === failStep) throw new Error(`fixture_failure:${failStep}`);
    let stdout = Buffer.alloc(0);
    if (call.step.endsWith("-schema-relation")) stdout = Buffer.from("t");
    if (call.step === "sky-static-image-revision") stdout = Buffer.from(releaseRevision);
    if (call.step === "sky-static-artifact-container") containerExists = true;
    if (call.step === "sky-static-artifact-copy") cpSync(producer.output, call.args[2], { recursive: true });
    if (call.step === "sky-static-artifact-cleanup-discovery") stdout = Buffer.from(containerExists ? "a".repeat(12) : "");
    if (call.step === "sky-static-artifact-container-retire") containerExists = false;
    if (["backup-source-schema", "backup-restored-schema"].includes(call.step)) {
      leaseObservedDuringBackup = existsSync(path.join(store, "preparation.lock")); stdout = Buffer.from("006_verified_fixture");
    }
    if (call.step === "backup-dump") stdout = Buffer.from("PGDMP".repeat(200));
    return { stdout, stderr: Buffer.alloc(0) };
  };
  const { input } = selected(fixture, {
    // Use the real default backup and release consumers; only process/network observations are fixtures.
    backup: undefined, release: undefined, execute,
  });
  delete input.backup; delete input.release;
  input.release = args => executeRelease({ ...args, inspectTls: async () => ({ protocol: "TLSv1.3" }), delay: async () => {},
    fetchImpl: async () => {
      const response = new Response(JSON.stringify({ status: "ready", release: { environment: fixture.environment,
        revision: releaseRevision, imageDigest: releaseImageDigest } }), { headers: { "content-type": "application/json; charset=utf-8",
        "strict-transport-security": "max-age=31536000; includeSubDomains", "x-content-type-options": "nosniff", "referrer-policy": "no-referrer",
        "permissions-policy": "camera=(), microphone=(), geolocation=()", "content-security-policy": "default-src 'none'; frame-ancestors 'none'" } });
      Object.defineProperty(response, "url", { value: `https://${fixture.domain}/health/ready` }); return response;
    },
    verifyStatic: async ({ delivery }) => ({ status: "passed", identity: delivery.identity,
      checkedFiles: delivery.identity.files, checkedBytes: delivery.identity.bytes }),
  });
  return { input, store, producer, calls, leaseDuringBackup: () => leaseObservedDuringBackup };
}

test("actual first Sky promotion from an absent store uses sealed PNGs, one preflight and verified backup before migration", async () => {
  await withFixture({}, async fixture => {
    const f = await realSkyPromotionFixture(fixture); await assert.rejects(stat(f.store), { code: "ENOENT" });
    const result = await promoteReleaseCandidate(f.input);
    assert.equal(result.status, "succeeded"); assert.equal(f.leaseDuringBackup(), true);
    assert.equal(f.calls.filter(s => s === "release-image-pull").length, 1);
    assert.equal(f.calls.filter(s => s === "sky-static-artifact-copy").length, 1);
    assert.ok(f.calls.indexOf("backup-restore-cleanup") < f.calls.indexOf("release-migration"));
    const manifest = JSON.parse(await readFile(result.backupManifestPath, "utf8"));
    assert.equal(manifest.schemaVersion, "starward-verified-backup-v2");
    const snapshot = await readSkyStaticBackup({ backupDirectory: fixture.backupDirectory, record: manifest.skyStaticBackup });
    assert.equal(snapshot.bundle.files, 2); assert.equal(snapshot.bundle.bytes, 6838);
    const receipt = JSON.parse(await readFile(result.receiptPath, "utf8"));
    for (const name of ["compose-version", "compose-config", "image-pull", "sky-static-preparation"])
      assert.equal(receipt.steps.find(s => s.name === name).executionPhase, "BEFORE_VERIFIED_BACKUP");
    assert.equal(receipt.steps.find(s => s.name === "backup-verification").status, "passed");
    await assert.rejects(stat(path.join(f.store, "preparation.lock")), { code: "ENOENT" });
    await assert.rejects(stat(path.join(fixture.receiptDirectory, "operator-preview-current.json")), { code: "ENOENT" });
    // Another authorized promotion reuses the same source/payload pool while
    // receiving its own candidate path, backup and in-process preparation.
    f.input.candidateOutputPath = path.join(fixture.root, "second-candidate", "deploy.env");
    const second = await promoteReleaseCandidate(f.input);
    assert.equal(second.status, "succeeded");
    assert.equal(f.calls.filter(s => s === "sky-static-artifact-copy").length, 1);
    assert.equal((await readdir(fixture.backupDirectory)).filter(name => name.startsWith("sky-public-")).length, 1);
    await assert.rejects(stat(path.join(f.store, "preparation.lock")), { code: "ENOENT" });
  });
});

test("first Sky pull, backup and migration failures release leases and never fabricate current", async () => {
  for (const step of ["release-image-pull", "backup-source-schema", "release-migration"]) await withFixture({}, async fixture => {
    const f = await realSkyPromotionFixture(fixture, step);
    await assert.rejects(promoteReleaseCandidate(f.input), /fixture_failure/u);
    assert.equal(f.calls.includes("release-converge"), false);
    if (step === "release-image-pull") {
      assert.equal(f.calls.includes("backup-source-schema"), false); await assert.rejects(stat(f.store), { code: "ENOENT" });
    } else {
      assert.ok((await readdir(f.store)).some(name => name.startsWith("generation-")));
      await assert.rejects(stat(path.join(f.store, "preparation.lock")), { code: "ENOENT" });
    }
    await assert.rejects(stat(path.join(fixture.receiptDirectory, "operator-preview-current.json")), { code: "ENOENT" });
  });
});

test("serialized Sky preparation cannot suppress the release preflight or hold its lease", async () => {
  await withFixture({}, async fixture => {
    const f = await realSkyPromotionFixture(fixture), originalRelease = f.input.release;
    f.input.release = args => originalRelease({ ...args, preparedStaticDelivery: { ...args.preparedStaticDelivery } });
    await assert.rejects(promoteReleaseCandidate(f.input), /release_preparation_invalid/u);
    assert.equal(f.calls.includes("release-migration"), false);
    await assert.rejects(stat(path.join(f.store, "preparation.lock")), { code: "ENOENT" });
  });
});

test("prepared file damage during backup is rejected on handoff before any migration", async () => {
  await withFixture({}, async fixture => {
    const f = await realSkyPromotionFixture(fixture), originalRelease = f.input.release;
    f.input.release = async args => {
      const row = args.preparedStaticDelivery.records[0];
      await writeFile(path.join(args.preparedStaticDelivery.directory, `files${row.route}`), "damaged-after-backup");
      return originalRelease(args);
    };
    await assert.rejects(promoteReleaseCandidate(f.input), /file_identity_mismatch/u);
    assert.equal(f.calls.includes("release-migration"), false);
    await assert.rejects(stat(path.join(f.store, "preparation.lock")), { code: "ENOENT" });
    const manifests = (await readdir(fixture.backupDirectory)).filter(name => name.endsWith(".pgdump.enc.manifest.json"));
    assert.equal(manifests.length, 1);
    const manifest = JSON.parse(await readFile(path.join(fixture.backupDirectory, manifests[0]), "utf8"));
    await readSkyStaticBackup({ backupDirectory: fixture.backupDirectory, record: manifest.skyStaticBackup });
  });
});

test("descriptor drift after backup cannot borrow a prior compose preflight", async () => {
  await withFixture({}, async fixture => {
    const f = await realSkyPromotionFixture(fixture), originalRelease = f.input.release;
    f.input.release = async args => { await appendFile(args.deployEnvPath, "# changed after backup\n"); return originalRelease(args); };
    await assert.rejects(promoteReleaseCandidate(f.input), /release_preparation_changed/u);
    assert.equal(f.calls.includes("release-migration"), false);
    await assert.rejects(stat(path.join(f.store, "preparation.lock")), { code: "ENOENT" });
  });
});

test("descriptor loss at the end of preparation retires the newly acquired lease", async () => {
  await withFixture({}, async fixture => {
    const f = await realSkyPromotionFixture(fixture), execute = f.input.execute;
    f.input.execute = call => {
      const result = execute(call);
      if (call.step === "sky-static-artifact-copy") {
        const source = realpathSync(f.input.candidateOutputPath), target = path.resolve(source + ".held-fixture");
        const relative = path.relative(realpathSync(fixture.root), source);
        assert.ok(relative && !relative.startsWith("..") && !path.isAbsolute(relative));
        assert.equal(path.dirname(source), path.dirname(target));
        renameSync(source, target);
      }
      return result;
    };
    await assert.rejects(promoteReleaseCandidate(f.input), { code: "ENOENT" });
    assert.equal(f.calls.includes("backup-source-schema"), false);
    await assert.rejects(stat(path.join(f.store, "preparation.lock")), { code: "ENOENT" });
  });
});

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
