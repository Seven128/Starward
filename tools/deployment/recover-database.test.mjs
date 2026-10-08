import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { cpSync, readFileSync, writeFileSync } from "node:fs";
import { mkdir, mkdtemp, readFile, readdir, realpath, rm, stat, symlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { executeDatabaseRecovery, recoverDatabase } from "./recover-database.mjs";
import { decodeBackupKey, encryptBackup, executeVerifiedBackup } from "./verified-backup.mjs";
import { createSkyStaticBackup, readSkyStaticBackup } from "./sky-static-backup.mjs";
import { skyStaticHash, validateSkyStaticBundle, writeSkyStaticBundle } from "./sky-static-bundle.mjs";
import { loadSkyStaticDelivery, prepareSkyStaticDelivery } from "./sky-static-release.mjs";
import { createReleaseEnvironmentFixture } from "./test-support.mjs";

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
    if (input.step.endsWith("-schema-relation")) return {stdout: Buffer.from("t"), stderr: Buffer.alloc(0)};
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
    const resolved = await realpath(fixture.root), temporary = await realpath(os.tmpdir());
    assert.equal(path.dirname(resolved).toLowerCase(), temporary.toLowerCase());
    assert.ok(path.basename(resolved).startsWith("starward-recovery-"));
    await rm(fixture.root, { recursive: true, force: true });
  }
}

async function addSkyRecoverySnapshot({ input, root }) {
  const route = `/v2/sky/galactic/${"1".repeat(64)}/texture.jpg`, bytes = Buffer.from("public-observation-fixture");
  const source = await writeSkyStaticBundle(path.join(root, "source-image"), [{ route, bytes,
    headers: { "content-type": "image/jpeg", "cache-control": "public, max-age=31536000, immutable", "x-content-type-options": "nosniff" } }]);
  input.validation.operations.backupDirectory = path.join(root, "backups");
  const { record } = await createSkyStaticBackup({ bundleDirectory: source.output, backupDirectory: input.validation.operations.backupDirectory,
    inventoryBytes: Buffer.from(JSON.stringify({ schemaVersion: "starward-sky-static-prepared-inventory-v1",
      generation: "generation-00000000-0000-0000-0000-000000000001", publicationHash: source.publicationHash,
      sources: [{ directory: "source-00000000-0000-0000-0000-000000000001", revision: "1".repeat(40), imageDigest: `sha256:${"1".repeat(64)}`,
        imagePublicationHash: source.publicationHash }] })) });
  input.manifest.schemaVersion = "starward-verified-backup-v2"; input.manifest.skyStaticBackup = record;
  return { record, route, bytes };
}

async function cachedSkyRecovery(f, fault) {
  const original = path.resolve("output/sky-static-owner-independent-1002-r4/normal-store");
  const inventoryBytes = await readFile(path.join(original, "prepared-inventory.json"));
  const inventory = JSON.parse(inventoryBytes.toString("utf8"));
  f.input.validation.operations.backupDirectory = path.join(f.root, "backups");
  f.input.validation.operations.receiptDirectory = path.join(f.root, "receipts");
  const { record } = await createSkyStaticBackup({ bundleDirectory: path.join(original, inventory.generation, "publication"),
    inventoryBytes, backupDirectory: f.input.validation.operations.backupDirectory });
  f.input.manifest.schemaVersion = "starward-verified-backup-v2"; f.input.manifest.skyStaticBackup = record;
  f.input.validation.imageRepository = "ghcr.io/fixture/starward";
  f.input.skyManagedRestoreDirectory = path.join(f.root, "restored-managed-sky");
  f.input.confirmSkyPublicationHash = record.publicationHash;
  const calls = [], sequence = [], run = f.input.run; let source, created = false;
  f.input.run = call => { sequence.push(`db:${call.step}`); return run(call); };
  f.input.execute = call => {
    calls.push(call.step); sequence.push(`oci:${call.step}`); let stdout = Buffer.alloc(0);
    assert.equal(call.command, "docker");
    if (call.step === "sky-static-image-revision") {
      const digest = call.args[2].split("@")[1]; source = inventory.sources.find(s => s.imageDigest === digest);
      assert.ok(source);
      if (fault === "missing") throw new Error("fixture_original_cached_image_missing");
      stdout = Buffer.from(fault === "revision" ? "0".repeat(40) : source.revision);
    }
    if (call.step === "sky-static-artifact-container") created = true;
    if (call.step === "sky-static-artifact-copy") {
      const copiedSource = fault === "publication" ? inventory.sources.find(s => s !== source) : source;
      cpSync(path.join(original, copiedSource.directory, "publication"), call.args[2], { recursive: true });
      if (fault === "publication") {
        const artifactPath = path.join(call.args[2], "image-artifact.json");
        writeFileSync(artifactPath, JSON.stringify({ schemaVersion: "starward-sky-static-image-artifact-v1", revision: source.revision,
          publicationHash: copiedSource.imagePublicationHash,
          indexSha256: skyStaticHash(readFileSync(path.join(call.args[2], "index.json"))), fragmentSha256: skyStaticHash(readFileSync(path.join(call.args[2], "delivery.caddy"))) }));
      }
    }
    if (call.step === "sky-static-artifact-container-discovery") stdout = Buffer.from(created ? "a".repeat(12) : "");
    if (call.step === "sky-static-artifact-container-cleanup") created = false;
    return { stdout, stderr: Buffer.alloc(0) };
  };
  return { record, inventory, calls, sequence, original };
}

async function archivedSkyRecovery(f) {
  const selected = await cachedSkyRecovery(f), store = path.join(f.root, "admitted-copy-store");
  cpSync(selected.original, store, { recursive: true });
  f.input.validation.operations.skyStaticDirectory = store;
  f.input.deploy.STARWARD_SKY_STATIC_DIRECTORY = store;
  const backup = await executeVerifiedBackup({ validation: f.input.validation, deploy: f.input.deploy, postgres: f.input.postgres,
    key: f.input.key, now: () => new Date("2026-08-25T12:00:00.000Z"), random: length => Buffer.alloc(length, 9),
    run: ({ step }) => ({ stdout: Buffer.from(step.endsWith("-schema-relation") ? "t" : step === "backup-dump" ? "PGDMP".repeat(200) : schemaMigration), stderr: Buffer.alloc(0) }) });
  const record = backup.manifest.skyStaticBackup;
  assert.equal(record.schemaVersion, "starward-sky-static-backup-v2");
  f.input.manifest = { ...backup.manifest, encrypted: { ...backup.manifest.encrypted } };
  f.input.envelope = await readFile(backup.encryptedPath);
  f.input.confirmBackupSha256 = f.input.manifest.encrypted.sha256;
  delete f.input.validation.imageRepository;
  const imageCalls = [];
  f.input.execute = call => { imageCalls.push(call.step); throw new Error("fixture_original_images_unavailable"); };
  return { ...selected, record, imageCalls };
}

test("authenticated archived Sky recovery restores real PNG sources with zero original-image actions before DB recovery", async () => {
  await withRecovery({}, async f => {
    const selected = await archivedSkyRecovery(f);
    f.input.manifest.skyStaticBackup = Object.fromEntries(Object.entries(selected.record).reverse());
    const result = await executeDatabaseRecovery(f.input);
    assert.equal(result.receipt.skyRestore.sourceAdmission, "VERIFIED_BACKUP_RESTORED_ORIGINAL_METADATA");
    assert.equal(result.receipt.skyRestore.runtimeApplied, false);
    assert.equal(result.receipt.steps[0].name, "sky-managed-prepared-restore");
    assert.equal(result.receipt.skyRestore.files, 2); assert.equal(result.receipt.skyRestore.bytes, 6838);
    assert.deepEqual(selected.imageCalls, []);
    const snapshot = await readSkyStaticBackup({ backupDirectory: f.input.validation.operations.backupDirectory, record: selected.record });
    const restored = await validateSkyStaticBundle(result.receipt.skyRestore.directory);
    assert.deepEqual(restored.records, snapshot.bundle.records);
    const pointer = JSON.parse(await readFile(path.join(result.receipt.skyRestore.storeDirectory, "prepared-inventory.json"), "utf8"));
    for (let i = 0; i < pointer.sources.length; i++) for (const [file, bytes] of [["index.json", snapshot.sourceMetadata[i].indexBytes],
      ["delivery.caddy", snapshot.sourceMetadata[i].fragmentBytes], ["image-artifact.json", snapshot.sourceMetadata[i].artifactBytes]])
      assert.ok((await readFile(path.join(result.receipt.skyRestore.storeDirectory, pointer.sources[i].directory, "publication", file))).equals(bytes));
    assert.equal((await readdir(f.input.validation.operations.receiptDirectory)).includes("operator-preview-current.json"), false);
    await assert.rejects(stat(path.join(result.receipt.skyRestore.storeDirectory, "preparation.lock")), { code: "ENOENT" });
  });
});

test("new source-capable Sky backups require authenticated identity, not rehashed or downgraded source claims", async () => {
  for (const fault of ["unbound", "changed-source", "downgraded"]) await withRecovery({}, async f => {
    const selected = await archivedSkyRecovery(f), backupDirectory = f.input.validation.operations.backupDirectory;
    if (fault === "unbound") f.input.envelope = Buffer.from(envelope);
    if (fault === "changed-source") {
      const snapshot = await readSkyStaticBackup({ backupDirectory, record: selected.record });
      snapshot.inventory.sources[0].imageDigest = `sha256:${"0".repeat(64)}`;
      const inventoryBytes = Buffer.from(JSON.stringify(snapshot.inventory)), inventorySha256 = skyStaticHash(inventoryBytes);
      const archive = JSON.parse(await readFile(path.join(backupDirectory, selected.record.directory, `sources-${selected.record.sourceMetadataSha256}.json`), "utf8"));
      archive.inventorySha256 = inventorySha256;
      const metadataBytes = Buffer.from(JSON.stringify(archive)), sourceMetadataSha256 = skyStaticHash(metadataBytes);
      await writeFile(path.join(backupDirectory, selected.record.directory, `inventory-${inventorySha256}.json`), inventoryBytes, { flag: "wx" });
      await writeFile(path.join(backupDirectory, selected.record.directory, `sources-${sourceMetadataSha256}.json`), metadataBytes, { flag: "wx" });
      f.input.manifest.skyStaticBackup = { ...selected.record, inventorySha256, sourceMetadataSha256 };
      assert.equal((await readSkyStaticBackup({ backupDirectory, record: f.input.manifest.skyStaticBackup })).sourceMetadata.length, 2);
    }
    if (fault === "downgraded") {
      f.input.manifest.skyStaticBackup = { ...selected.record, schemaVersion: "starward-sky-static-backup-v1" };
      delete f.input.manifest.skyStaticBackup.sourceMetadataSha256;
    }
    Object.assign(f.input.manifest.encrypted, { byteLength: f.input.envelope.length, sha256: skyStaticHash(f.input.envelope) });
    f.input.confirmBackupSha256 = f.input.manifest.encrypted.sha256;
    await assert.rejects(executeDatabaseRecovery(f.input), /backup_sky_binding_invalid/u);
    assert.equal(f.calls.length, 0); assert.deepEqual(selected.imageCalls, []);
    await assert.rejects(stat(f.input.skyManagedRestoreDirectory), { code: "ENOENT" });
  });
});

test("missing or intrinsically invalid source archives fail before any restored directory or DB action", async () => {
  for (const fault of ["missing", "digest", "artifact", "membership"]) await withRecovery({}, async f => {
    const selected = await archivedSkyRecovery(f), backupDirectory = f.input.validation.operations.backupDirectory;
    const file = path.join(backupDirectory, selected.record.directory, `sources-${selected.record.sourceMetadataSha256}.json`);
    if (fault === "missing") f.input.manifest.skyStaticBackup = { ...selected.record, sourceMetadataSha256: "0".repeat(64) };
    else if (fault === "digest") await writeFile(file, "damaged-fixture-archive");
    else {
      const archive = JSON.parse(await readFile(file, "utf8"));
      if (fault === "artifact") { const artifact = JSON.parse(Buffer.from(archive.sources[0].artifactBase64, "base64").toString("utf8"));
        artifact.revision = "0".repeat(40); archive.sources[0].artifactBase64 = Buffer.from(JSON.stringify(artifact)).toString("base64"); }
      else archive.sources.reverse();
      const bytes = Buffer.from(JSON.stringify(archive)), sourceMetadataSha256 = skyStaticHash(bytes);
      await writeFile(path.join(backupDirectory, selected.record.directory, `sources-${sourceMetadataSha256}.json`), bytes, { flag: "wx" });
      f.input.manifest.skyStaticBackup = { ...selected.record, sourceMetadataSha256 };
    }
    await assert.rejects(executeDatabaseRecovery(f.input), /ENOENT|source_metadata_identity_mismatch|image_artifact_mismatch|source_metadata_invalid/u);
    assert.equal(f.calls.length, 0); assert.deepEqual(selected.imageCalls, []);
    await assert.rejects(stat(f.input.skyManagedRestoreDirectory), { code: "ENOENT" });
  });
});

test("managed Sky recovery admits original cached sources and restores every old URL before DB work without current cutover", async () => {
  await withRecovery({}, async f => {
    const selected = await cachedSkyRecovery(f);
    const result = await executeDatabaseRecovery(f.input);
    assert.equal(result.receipt.skyRestore.status, "RESTORED_MANAGED_PREPARED_STORE");
    assert.equal(result.receipt.skyRestore.runtimeApplied, false);
    assert.equal(result.receipt.skyRestore.sources, selected.inventory.sources.length);
    assert.equal(result.receipt.steps[0].name, "sky-managed-prepared-restore");
    const restored = await validateSkyStaticBundle(result.receipt.skyRestore.directory);
    assert.equal(restored.files, 2); assert.equal(restored.bytes, 6838);
    assert.equal(restored.publicationHash, selected.record.publicationHash);
    const pointer = JSON.parse(await readFile(path.join(f.input.skyManagedRestoreDirectory, "prepared-inventory.json"), "utf8"));
    assert.deepEqual(pointer.sources.map(({ revision, imageDigest, imagePublicationHash }) => ({ revision, imageDigest, imagePublicationHash })),
      selected.inventory.sources.map(({ revision, imageDigest, imagePublicationHash }) => ({ revision, imageDigest, imagePublicationHash })));
    assert.equal((await readdir(f.input.skyManagedRestoreDirectory)).includes("preparation.lock"), false);
    assert.equal((await readdir(f.input.validation.operations.receiptDirectory)).includes("operator-preview-current.json"), false);
    const firstDb = selected.sequence.findIndex(s => s.startsWith("db:"));
    assert.ok(firstDb > 0); assert.ok(selected.sequence.slice(0, firstDb).every(s => s.startsWith("oci:")));
    assert.equal(selected.calls.filter(s => s === "sky-static-artifact-copy").length, 2);
    assert.equal(selected.calls.some(s => /pull|converge|start/u.test(s)), false);
    const originalSource = selected.inventory.sources[0];
    const validation = { ...f.input.validation, revision: originalSource.revision, imageDigest: originalSource.imageDigest,
      operations: { ...f.input.validation.operations, skyStaticDirectory: f.input.skyManagedRestoreDirectory } };
    const deploy = { ...f.input.deploy, STARWARD_SKY_STATIC_DIRECTORY: f.input.skyManagedRestoreDirectory,
      STARWARD_IMAGE_REF: `${validation.imageRepository}@${originalSource.imageDigest}` };
    const delivery = await prepareSkyStaticDelivery({ validation, deploy, execute: f.input.execute });
    try { assert.equal(delivery.identity.deliveryPublicationHash, selected.record.publicationHash); }
    finally { await delivery.dispose(); }
    assert.equal(selected.calls.filter(s => s === "sky-static-artifact-copy").length, 2);
    await assert.rejects(loadSkyStaticDelivery({ validation, deploy, operation: "check", execute: f.input.execute }), /load_current_pointer_missing/u);
    await assert.rejects(stat(path.join(f.input.skyManagedRestoreDirectory, "preparation.lock")), { code: "ENOENT" });
  });
});

test("managed restore rejects unavailable, wrong revision or wrong publication originals before DB effects and retires its lease", async () => {
  for (const fault of ["missing", "revision", "publication"]) await withRecovery({}, async f => {
    await cachedSkyRecovery(f, fault);
    const expected = { missing: /fixture_original_cached_image_missing/u, revision: /image_revision_mismatch/u, publication: /restore_original_source_mismatch/u };
    await assert.rejects(executeDatabaseRecovery(f.input), expected[fault]);
    assert.equal(f.calls.length, 0);
    await assert.rejects(stat(path.join(f.input.skyManagedRestoreDirectory, "preparation.lock")), { code: "ENOENT" });
    await assert.rejects(stat(path.join(f.input.skyManagedRestoreDirectory, "prepared-inventory.json")), { code: "ENOENT" });
  });
});

test("managed restore preserves occupied paths and refuses bad confirmation, conflicting modes and store/backup/link overlap", async () => {
  for (const fault of ["occupied", "confirmation", "exclusive", "store", "backup", "link"]) await withRecovery({}, async f => {
    const selected = await cachedSkyRecovery(f);
    if (fault === "occupied") { await mkdir(f.input.skyManagedRestoreDirectory); await writeFile(path.join(f.input.skyManagedRestoreDirectory, "keep.txt"), "keep"); }
    if (fault === "confirmation") f.input.confirmSkyPublicationHash = "0".repeat(64);
    if (fault === "exclusive") f.input.skyRestoreDirectory = path.join(f.root, "other-output");
    if (fault === "store") f.input.validation.operations.skyStaticDirectory = f.input.skyManagedRestoreDirectory;
    if (fault === "backup") f.input.skyManagedRestoreDirectory = path.join(f.input.validation.operations.backupDirectory, "nested-store");
    if (fault === "link") { const linked = path.join(f.root, "linked-parent"); await symlink(f.root, linked, "junction"); f.input.skyManagedRestoreDirectory = path.join(linked, "store"); }
    await assert.rejects(executeDatabaseRecovery(f.input), /restore_directory_exists|confirmation_required|modes_exclusive|overlaps_store|restore_directory_invalid/u);
    assert.equal(f.calls.length, 0); assert.equal(selected.calls.length, 0);
    if (fault === "occupied") assert.equal(await readFile(path.join(f.input.skyManagedRestoreDirectory, "keep.txt"), "utf8"), "keep");
  });
});

test("a failed database restore keeps the valid fresh Sky preparation and never marks it runtime-applied", async () => {
  await withRecovery({ restoredSchema: "005_wrong_schema" }, async f => {
    const selected = await cachedSkyRecovery(f);
    await assert.rejects(executeDatabaseRecovery(f.input), /recovery_schema_mismatch/u);
    assert.equal(f.calls.some(s => s.step === "recovery-stop-edge"), false);
    assert.ok(f.calls.some(s => s.step === "recovery-restore-cleanup"));
    const file = (await readdir(f.input.validation.operations.receiptDirectory)).find(name => name.endsWith(".recovery.json"));
    const receipt = JSON.parse(await readFile(path.join(f.input.validation.operations.receiptDirectory, file), "utf8"));
    assert.equal(receipt.status, "failed"); assert.equal(receipt.skyRestore.status, "RESTORED_MANAGED_PREPARED_STORE");
    assert.equal(receipt.skyRestore.runtimeApplied, false);
    assert.equal((await validateSkyStaticBundle(receipt.skyRestore.directory)).publicationHash, selected.record.publicationHash);
    await assert.rejects(stat(path.join(f.input.skyManagedRestoreDirectory, "preparation.lock")), { code: "ENOENT" });
  });
});

test("backup drift while original OCI sources resolve cannot publish a managed inventory or begin DB restore", async () => {
  await withRecovery({}, async f => {
    const selected = await cachedSkyRecovery(f), execute = f.input.execute;
    f.input.execute = call => {
      const result = execute(call);
      if (call.step === "sky-static-artifact-copy") writeFileSync(path.join(f.input.validation.operations.backupDirectory,
        selected.record.directory, `inventory-${selected.record.inventorySha256}.json`), "damaged-fixture-metadata");
      return result;
    };
    await assert.rejects(executeDatabaseRecovery(f.input), /metadata_identity_mismatch/u);
    assert.equal(f.calls.length, 0);
    await assert.rejects(stat(path.join(f.input.skyManagedRestoreDirectory, "prepared-inventory.json")), { code: "ENOENT" });
    await assert.rejects(stat(path.join(f.input.skyManagedRestoreDirectory, "preparation.lock")), { code: "ENOENT" });
  });
});

test("actual recovery facade forwards the managed option and validated repository to original admission before any DB process", async () => {
  const fixture = await createReleaseEnvironmentFixture();
  try {
    const f = { root: fixture.root, input: { validation: { operations: {} }, manifest: {}, run() { throw new Error("fixture_db_not_expected"); } } };
    const selected = await cachedSkyRecovery(f, "missing");
    const fixtureKey = decodeBackupKey("1".repeat(64));
    const encrypted = encryptBackup(dump, fixtureKey, Buffer.alloc(12, 8)); fixtureKey.fill(0);
    const digest = skyStaticHash(encrypted), fileName = "staging-managed-facade.pgdump.enc";
    const manifest = { schemaVersion: "starward-verified-backup-v2", status: "verified", environment: fixture.environment,
      composeProject: fixture.project, sourceDatabase: "starward", releaseRevision: revision, releaseImageDigest: imageDigest,
      schemaMigration, createdAt: "2026-08-25T12:00:00.000Z", verifiedAt: "2026-08-25T12:00:01.000Z",
      encrypted: { algorithm: "aes-256-gcm", fileName, byteLength: encrypted.length, sha256: digest },
      restore: { status: "restored_and_verified", temporaryDatabaseDropped: true }, skyStaticBackup: selected.record };
    const manifestPath = path.join(fixture.backupDirectory, `${fileName}.manifest.json`);
    await writeFile(path.join(fixture.backupDirectory, fileName), encrypted, { flag: "wx", mode: 0o600 });
    await writeFile(manifestPath, JSON.stringify(manifest), { flag: "wx", mode: 0o600 });
    await assert.rejects(recoverDatabase({ deployEnvPath: fixture.deployPath, manifestPath, confirmEnvironment: fixture.environment,
      confirmBackupSha256: digest, confirmTargetDatabase: "starward", skyManagedRestoreDirectory: f.input.skyManagedRestoreDirectory,
      confirmSkyPublicationHash: selected.record.publicationHash, operator: "fixture:managed-recovery", execute: f.input.execute }), /fixture_original_cached_image_missing/u);
    assert.deepEqual(selected.calls, ["sky-static-image-revision"]);
    await assert.rejects(stat(path.join(f.input.skyManagedRestoreDirectory, "preparation.lock")), { code: "ENOENT" });
    assert.equal((await readFile(path.join(fixture.backupDirectory, fileName))).equals(encrypted), true);
  } finally {
    const resolved = await realpath(fixture.root), temporary = await realpath(os.tmpdir());
    assert.equal(path.dirname(resolved).toLowerCase(), temporary.toLowerCase()); assert.ok(path.basename(resolved).startsWith("starward-release-env-"));
    await rm(resolved, { recursive: true, force: true });
  }
});

test("v2 recovery verifies Sky and explicitly restores isolated public URLs without claiming runtime cutover", async () => {
  await withRecovery({}, async f => {
    const { record, route, bytes } = await addSkyRecoverySnapshot(f);
    f.input.skyRestoreDirectory = path.join(f.root, "isolated-sky"); f.input.confirmSkyPublicationHash = record.publicationHash;
    const result = await executeDatabaseRecovery(f.input);
    assert.equal(result.receipt.schemaVersion, "starward-database-recovery-receipt-v2");
    assert.equal(result.receipt.skyRestore.status, "RESTORED_ISOLATED_PUBLIC_URLS");
    assert.equal(result.receipt.skyRestore.runtimeApplied, false);
    assert.equal(result.receipt.steps[0].name, "sky-public-isolated-restore");
    assert.ok((await readFile(path.join(result.receipt.skyRestore.directory, "files", route))).equals(bytes));
    assert.equal(result.receipt.backup.skyStaticBackup.publicationHash, record.publicationHash);
    assert.ok(f.calls.some(call => call.step === "recovery-rename-original"));
  });
});

test("v2 recovery rejects damaged Sky or a wrong explicit publication before database effects", async () => {
  for (const fault of ["damaged", "confirmation"]) await withRecovery({}, async f => {
    const { record, route } = await addSkyRecoverySnapshot(f);
    if (fault === "damaged") await writeFile(path.join(f.input.validation.operations.backupDirectory, record.directory, "publication/files", route), "broken");
    else { f.input.skyRestoreDirectory = path.join(f.root, "isolated-sky"); f.input.confirmSkyPublicationHash = "0".repeat(64); }
    await assert.rejects(executeDatabaseRecovery(f.input), fault === "damaged" ? /file_identity_mismatch/u : /publication_confirmation_required/u);
    assert.equal(f.calls.length, 0);
  });
});

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
      "recovery-restored-schema-relation",
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
      "recovery-restored-schema-relation",
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
      if (invocation.step.endsWith("-schema-relation")) return {stdout: Buffer.from("t"), stderr: Buffer.alloc(0)};
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
