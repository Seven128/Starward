import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { EventEmitter } from "node:events";
import https from "node:https";
import { cpSync, writeFileSync } from "node:fs";
import { mkdir, mkdtemp, readFile, readdir, realpath, rm, stat, symlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { skyStaticDeliveryFragment, skyStaticHash, writeSkyStaticBundle } from "./sky-static-bundle.mjs";
import { inspectSkyStaticRetention, loadSkyStaticDelivery, prepareSkyStaticDelivery, restoreManagedSkyStaticBackup, verifySkyStaticDelivery } from "./sky-static-release.mjs";
import { readSkyStaticBackup, restoreSkyStaticBackup } from "./sky-static-backup.mjs";
import { decryptBackup, executeVerifiedBackup } from "./verified-backup.mjs";
import { maintainTrialBackups } from "./backup-maintenance.mjs";

const headers = { "content-type": "image/jpeg", "cache-control": "public, max-age=31536000, immutable", "x-content-type-options": "nosniff" };
const route = (v) => `/v2/sky/moon/${v.repeat(64)}/texture.jpg`;
function mountedRuntime(directory, mutate) {
  let inspections = 0;
  const id = "a".repeat(64);
  return ({ args }) => {
    assert.equal(args[0], "container");
    if (args[1] === "ls") return { stdout: Buffer.from(id + "\n") };
    assert.equal(args[1], "inspect");
    const mounts = [{ Type: "bind", RW: false, Source: directory, Destination: "/srv/sky-public" },
      { Type: "bind", RW: false, Source: path.join(directory, "delivery.caddy"), Destination: "/etc/caddy/sky-static-delivery.caddy" }];
    mutate?.(mounts, inspections++);
    return { stdout: Buffer.from(JSON.stringify({ id, running: true, mounts })) };
  };
}
function staticReceipt(delivery, preview = false) {
  const identity = delivery.identity;
  return { schemaVersion: preview ? "starward-operator-preview-operation-v2" : "starward-release-receipt-v2",
    status: "succeeded", environment: "staging", revision: identity.revision, imageDigest: identity.imageDigest,
    ...(preview ? { operation: "deploy", productionQualified: false } : {}), skyStaticDelivery: identity,
    steps: ["sky-static-preparation", "sky-static-compose-config", "sky-static-verification"].map(name => ({ name, status: "passed",
      ...(name === "sky-static-verification" ? { result: { status: "passed", identity, checkedFiles: identity.files,
        checkedBytes: identity.bytes, ...(preview ? { unauthorizedStatus: 404 } : {}) } } : {}) })) };
}

async function receiptFixture() {
  const root = await mkdtemp(path.join(os.tmpdir(), "starward-sky-receipt-retention-"));
  const old = await fixtureImage(root, "1"), next = await fixtureImage(root, "2"), store = path.join(root, "store");
  const first = await prepareSkyStaticDelivery(input(store, old)); await first.dispose();
  const latest = await prepareSkyStaticDelivery(input(store, next)); await latest.dispose();
  const receipts = path.join(root, "receipts"); await mkdir(receipts);
  const selected = input(store, next); selected.deploy.COMPOSE_PROJECT_NAME = "starward-staging";
  selected.validation.environment = "staging"; selected.validation.operations.receiptDirectory = receipts;
  const oldFile = "staging-old.release.json", previewFile = `operator-preview-${randomUUID()}.json`;
  await writeFile(path.join(receipts, oldFile), JSON.stringify(staticReceipt(first)));
  await writeFile(path.join(receipts, previewFile), JSON.stringify(staticReceipt(latest, true)));
  const pointer = { revision: latest.identity.revision, imageDigest: latest.identity.imageDigest, receiptPath: path.join(receipts, previewFile),
    skyStaticDelivery: latest.identity, skyStaticOverlayPaths: latest.overlayPaths };
  await writeFile(path.join(receipts, "operator-preview-current.json"), JSON.stringify(pointer));
  return { root, store, selected, receipts, first, latest, oldFile, previewFile, pointer };
}

async function selectCurrentReceipt(f, delivery) {
  const file = `operator-preview-${randomUUID()}.json`;
  await writeFile(path.join(f.receipts, file), JSON.stringify(staticReceipt(delivery, true)));
  const pointer = { revision: delivery.identity.revision, imageDigest: delivery.identity.imageDigest,
    receiptPath: path.join(f.receipts, file), skyStaticDelivery: delivery.identity, skyStaticOverlayPaths: delivery.overlayPaths };
  await writeFile(path.join(f.receipts, "operator-preview-current.json"), JSON.stringify(pointer));
  return { file, pointer, selected: { validation: { ...f.selected.validation, revision: delivery.identity.revision, imageDigest: delivery.identity.imageDigest },
    deploy: { ...f.selected.deploy, STARWARD_IMAGE_REF: `fixture@${delivery.identity.imageDigest}` } } };
}

test("non-deploy selects the actual current older generation despite newer prepared history, retaining lease and recorded runtime", async () => {
  const f = await receiptFixture(), current = await selectCurrentReceipt(f, f.first);
  // Unrelated historical corruption belongs to the retention inventory, not
  // this current-service operation's dependencies.
  await writeFile(path.join(f.receipts, f.oldFile), "invalid unrelated history");
  const before = await readFile(path.join(f.store, "prepared-inventory.json"));
  const loaded = await loadSkyStaticDelivery({ ...current.selected, execute: mountedRuntime(f.first.directory) });
  assert.equal(loaded.directory, f.first.directory); assert.equal(loaded.identity.files, 1);
  assert.deepEqual(loaded.overlayPaths, f.first.overlayPaths);
  assert.equal(loaded.observation.basis, "CURRENT_RECEIPT_AND_RUNNING_MOUNT");
  assert.equal(loaded.observation.preparedGenerationMatches, false);
  assert.equal(loaded.observation.runtime.generation, loaded.observation.currentPointer.generation);
  await assert.rejects(prepareSkyStaticDelivery(f.selected), /store_locked/);
  assert.ok((await readFile(path.join(f.store, "prepared-inventory.json"))).equals(before));
  await loaded.dispose(); await assert.rejects(stat(path.join(f.store, "preparation.lock")), { code: "ENOENT" });
});

test("non-deploy runtime absence is explicit for stopped-edge maintenance, while check, mismatch and legacy current cannot borrow prepared", async () => {
  const f = await receiptFixture(), current = await selectCurrentReceipt(f, f.first);
  const absent = () => ({ stdout: Buffer.alloc(0) });
  await assert.rejects(loadSkyStaticDelivery({ ...current.selected, execute: absent }), /load_runtime_not_observed/);
  await assert.rejects(loadSkyStaticDelivery({ ...current.selected, execute: mountedRuntime(f.latest.directory) }), /load_current_runtime_mismatch/);
  await assert.rejects(loadSkyStaticDelivery({ ...f.selected, execute: mountedRuntime(f.first.directory) }), /delivery_identity_invalid/);
  for (const operation of ["stop", "backup", "inspect-backups", "maintain-backups"]) {
    const loaded = await loadSkyStaticDelivery({ ...current.selected, operation, execute: absent });
    assert.equal(loaded.directory, f.first.directory);
    assert.equal(loaded.observation.basis, "CURRENT_RECEIPT_WITHOUT_RUNNING_CADDY");
    assert.equal(loaded.observation.runtime.status, "NO_RUNNING_CADDY_OBSERVED");
    await loaded.dispose();
  }
  const filename = path.join(f.receipts, current.file), receipt = JSON.parse(await readFile(filename));
  await writeFile(filename, JSON.stringify({ ...receipt, status: "failed" }));
  await assert.rejects(loadSkyStaticDelivery({ ...current.selected, execute: absent, operation: "backup" }), /current_pointer_invalid/);
  receipt.schemaVersion = "starward-operator-preview-operation-v1"; delete receipt.skyStaticDelivery;
  await writeFile(filename, JSON.stringify(receipt));
  const legacy = { ...current.pointer }; delete legacy.skyStaticDelivery; delete legacy.skyStaticOverlayPaths;
  await writeFile(path.join(f.receipts, "operator-preview-current.json"), JSON.stringify(legacy));
  await assert.rejects(loadSkyStaticDelivery({ ...current.selected, execute: absent, operation: "stop" }), /load_current_binding_missing/);
  await assert.rejects(stat(path.join(f.store, "preparation.lock")), { code: "ENOENT" });
});

test("non-deploy changing runtime or current receipt during resolution fails before returning an overlay", async () => {
  const f = await receiptFixture(), current = await selectCurrentReceipt(f, f.first);
  await assert.rejects(loadSkyStaticDelivery({ ...current.selected, execute: mountedRuntime(f.first.directory, (mounts, count) => {
    if (count) { mounts[0].Source = f.latest.directory; mounts[1].Source = path.join(f.latest.directory, "delivery.caddy"); }
  }) }), /load_changed_during_inspection/);
  const file = path.join(f.receipts, current.file), bytes = await readFile(file);
  await assert.rejects(loadSkyStaticDelivery({ ...current.selected, execute: mountedRuntime(f.first.directory, (_mounts, count) => {
    if (count) writeFileSync(file, Buffer.concat([bytes, Buffer.from("\n")]));
  }) }), /receipts_changed_during_inspection/);
  await assert.rejects(stat(path.join(f.store, "preparation.lock")), { code: "ENOENT" });
});

test("receipt files/current pointer bind actual historical source and generation without replacing the observed older mount", async () => {
  const f = await receiptFixture();
  const failed = { ...staticReceipt(f.first), status: "failed", steps: [] };
  await writeFile(path.join(f.receipts, "staging-failed.release.json"), JSON.stringify(failed));
  const legacy = { ...staticReceipt(f.first), schemaVersion: "starward-release-receipt-v1" }; delete legacy.skyStaticDelivery;
  await writeFile(path.join(f.receipts, "staging-legacy.release.json"), JSON.stringify(legacy));
  await writeFile(path.join(f.receipts, "staging-early.release.json"), JSON.stringify({ ...failed, skyStaticDelivery: null }));
  const report = await inspectSkyStaticRetention({ ...f.selected, observeRuntime: true, observeReceipts: true, execute: mountedRuntime(f.first.directory) });
  const oldGeneration = path.basename(path.dirname(f.first.directory)), currentGeneration = path.basename(path.dirname(f.latest.directory));
  assert.equal(report.runtime.generation, oldGeneration);
  assert.equal(report.receiptEvidence.currentPointer.generation, currentGeneration);
  assert.equal(report.runtimeMatchesCurrentPointer, false);
  assert.ok(report.entries.find(e => e.name === oldGeneration).reasons.includes("BOUND_RELEASE_RECEIPT_REFERENCE"));
  assert.ok(report.entries.find(e => e.name === currentGeneration).reasons.includes("BOUND_CURRENT_POINTER_REFERENCE"));
  assert.equal(report.receiptEvidence.records.find(r => r.file === "staging-failed.release.json").binding, "BOUND_UNSUCCESSFUL_REFERENCE");
  assert.equal(report.receiptEvidence.records.find(r => r.file === "staging-early.release.json").binding, "NO_SKY_DELIVERY_BINDING");
  assert.equal(report.receiptEvidence.records.find(r => r.file === "staging-legacy.release.json").binding, "LEGACY_WITHOUT_SKY_BINDING");
  assert.equal(report.referenceCompleteness, "UNVERIFIED"); assert.equal(report.deletableBytes, null);
  assert.ok(report.entries.every(e => e.disposition.startsWith("RETAIN")));
});

test("receipt tampering, foreign environment/links/current identity and lost successful delivery reject rather than disappearing", async () => {
  const f = await receiptFixture(), filename = path.join(f.receipts, f.oldFile), original = await readFile(filename);
  for (const change of [r => { r.environment = "production"; }, r => { r.skyStaticDelivery = null; },
    r => { r.steps = []; }, r => { r.skyStaticDelivery.deliveryPublicationHash = "9".repeat(64); }]) {
    const r = JSON.parse(original); change(r); await writeFile(filename, JSON.stringify(r));
    await assert.rejects(inspectSkyStaticRetention({ ...f.selected, observeReceipts: true }), /retention_receipt/);
  }
  await writeFile(filename, original);
  const current = path.join(f.receipts, "operator-preview-current.json");
  await writeFile(current, JSON.stringify({ ...f.pointer, revision: "9".repeat(40) }));
  await assert.rejects(inspectSkyStaticRetention({ ...f.selected, observeReceipts: true }), /current_pointer_invalid/);
  await writeFile(current, JSON.stringify(f.pointer));
  const linked = `operator-preview-${randomUUID()}.json`, outside = path.join(f.root, "outside.json");
  await writeFile(outside, original); await symlink(outside, path.join(f.receipts, linked), "file");
  await assert.rejects(inspectSkyStaticRetention({ ...f.selected, observeReceipts: true }), /file_type_invalid/);
  await assert.rejects(stat(path.join(f.store, "preparation.lock")), { code: "ENOENT" });
});

test("receipt byte changes during live-mount recheck invalidate the whole retained-reference observation", async () => {
  const f = await receiptFixture(), file = path.join(f.receipts, f.oldFile), original = await readFile(file);
  await assert.rejects(inspectSkyStaticRetention({ ...f.selected, observeReceipts: true, observeRuntime: true,
    execute: mountedRuntime(f.first.directory, (_mounts, count) => { if (count) writeFileSync(file, Buffer.concat([original, Buffer.from("\n")])); }) }), /receipts_changed_during_inspection/);
  await assert.rejects(stat(path.join(f.store, "preparation.lock")), { code: "ENOENT" });
});
async function fixtureImage(root, version, text = version, revision = version.repeat(40)) {
  const result = await writeSkyStaticBundle(path.join(root, `image-${version}-${text}`), (async function* () { yield { route: route(version), headers, bytes: Buffer.from(text) }; })());
  await writeFile(path.join(result.output, "image-artifact.json"), JSON.stringify({ schemaVersion: "starward-sky-static-image-artifact-v1", revision, publicationHash: result.publicationHash,
    indexSha256: skyStaticHash(await readFile(path.join(result.output, "index.json"))), fragmentSha256: skyStaticHash(await readFile(path.join(result.output, "delivery.caddy"))) }));
  return { ...result, revision, digest: `sha256:${version.repeat(64)}` };
}

test("runtime retention preserves the actually mounted older generation when prepared pointer has advanced", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "starward-sky-runtime-retention-"));
  const old = await fixtureImage(root, "1"), next = await fixtureImage(root, "2"), store = path.join(root, "store");
  const first = await prepareSkyStaticDelivery(input(store, old)); await first.dispose();
  const latest = await prepareSkyStaticDelivery(input(store, next)); await latest.dispose();
  const selected = input(store, next); selected.deploy.COMPOSE_PROJECT_NAME = "starward-staging";
  const execute = mountedRuntime(first.directory);
  const pointer = await readFile(path.join(store, "prepared-inventory.json"));
  const report = await inspectSkyStaticRetention({ ...selected, execute, observeRuntime: true });
  assert.equal(report.runtime.status, "OBSERVED_RUNNING_MOUNT");
  assert.equal(report.runtime.generation, path.basename(path.dirname(first.directory)));
  assert.equal(report.runtime.preparedGenerationMatches, false);
  assert.deepEqual(report.entries.find(e => e.name === report.runtime.generation).reasons, ["OBSERVED_RUNNING_MOUNT"]);
  assert.equal(report.entries.find(e => e.name === report.inventory.generation).disposition, "RETAIN");
  assert.equal(report.referenceCompleteness, "UNVERIFIED"); assert.equal(report.deletableBytes, null);
  assert.ok((await readFile(path.join(store, "prepared-inventory.json"))).equals(pointer));
  for (const mutate of [m => { m[0].RW = true; }, m => { m[0].Source = root; }, m => { m[1].Source = path.join(root, "foreign.caddy"); }])
    await assert.rejects(inspectSkyStaticRetention({ ...selected, observeRuntime: true, execute: mountedRuntime(first.directory, mutate) }), /retention_runtime_mount/);
  await assert.rejects(inspectSkyStaticRetention({ ...selected, observeRuntime: true, execute: mountedRuntime(first.directory, (m, count) => { if (count) m[0].RW = true; }) }), /retention_runtime/);
  await assert.rejects(stat(path.join(store, "preparation.lock")), { code: "ENOENT" });
});

test("runtime absence is scoped observation, and malformed/ambiguous observations never become empty references", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "starward-sky-runtime-boundary-"));
  const image = await fixtureImage(root, "1"), store = path.join(root, "store");
  const delivery = await prepareSkyStaticDelivery(input(store, image)); await delivery.dispose();
  const selected = input(store, image); selected.deploy.COMPOSE_PROJECT_NAME = "starward-staging";
  const empty = await inspectSkyStaticRetention({ ...selected, observeRuntime: true, execute: () => ({ stdout: Buffer.alloc(0) }) });
  assert.equal(empty.runtime.status, "NO_RUNNING_CADDY_OBSERVED");
  assert.equal(empty.referenceCompleteness, "UNVERIFIED");
  for (const output of ["a".repeat(64) + "\n" + "b".repeat(64), "invalid-id"])
    await assert.rejects(inspectSkyStaticRetention({ ...selected, observeRuntime: true, execute: () => ({ stdout: Buffer.from(output) }) }), /container_ambiguous/);
  await assert.rejects(inspectSkyStaticRetention({ ...selected, observeRuntime: true, execute: () => { throw Error("daemon unavailable"); } }), /daemon unavailable/);
  await assert.rejects(stat(path.join(store, "preparation.lock")), { code: "ENOENT" });
});
function input(store, image, options = {}) {
  const calls = [];
  let containerExists = false;
  return { calls, validation: { revision: image.revision, imageDigest: image.digest, domain: "api-staging.starward.test", operations: { skyStaticDirectory: store } },
    deploy: { STARWARD_SKY_STATIC_DIRECTORY: store, STARWARD_IMAGE_REF: `fixture/image@${image.digest}`, ...options },
    execute({ args, step }) {
      calls.push({ args, step });
      if (args[0] === "image") return { stdout: Buffer.from(image.revision + "\n"), stderr: Buffer.alloc(0) };
      if (args[0] === "create") containerExists = true;
      if (args[0] === "container") return { stdout: Buffer.from(containerExists ? "a".repeat(12) + "\n" : ""), stderr: Buffer.alloc(0) };
      if (args[0] === "rm") containerExists = false;
      if (args[0] === "cp") cpSync(image.output, args[2], { recursive: true });
      return { stdout: Buffer.from("fixture-container-id\n"), stderr: Buffer.alloc(0) };
    } };
}

async function skyBackupFixture(t) {
  const root = await mkdtemp(path.join(os.tmpdir(), "starward-sky-backup-"));
  t.after(async () => {
    const resolved = await realpath(root), temporary = await realpath(os.tmpdir());
    assert.equal(path.dirname(resolved).toLowerCase(), temporary.toLowerCase());
    assert.ok(path.basename(resolved).startsWith("starward-sky-backup-"));
    await rm(resolved, { recursive: true, force: true });
  });
  const old = await fixtureImage(root, "1"), next = await fixtureImage(root, "2"), store = path.join(root, "store");
  const backupDirectory = path.join(root, "backups");
  const selected = image => {
    const value = input(store, image, { COMPOSE_PROJECT_NAME: "starward-staging" });
    Object.assign(value.validation, { environment: "staging", schemaVersion: "starward-operator-preview-validation-v1" });
    Object.assign(value.validation.operations, { backupDirectory, maxBackupBytes: 1024 * 1024 });
    return value;
  };
  const postgres = { POSTGRES_DB: "starward", POSTGRES_USER: "starward" };
  const save = (selection, delivery, date = "2026-10-01T00:00:00.000Z", byte = 1, calls = []) => executeVerifiedBackup({
    ...selection, delivery, postgres, key: Buffer.alloc(32, 4), now: () => new Date(date), random: length => Buffer.alloc(length, byte),
    run: ({ step }) => { calls.push(step); return { stdout: Buffer.from(step.endsWith("-schema-relation") ? "t" : step === "backup-dump" ? "PGDMP".repeat(200) : "006_verified_fixture") }; },
  });
  return { root, old, next, store, backupDirectory, postgres, selected, save };
}

test("configured Sky backup archives exact original source metadata and restores offline without claiming new OCI or current", async t => {
  const f = await skyBackupFixture(t), firstSelection = f.selected(f.old), nextSelection = f.selected(f.next);
  const first = await prepareSkyStaticDelivery(firstSelection); await first.dispose();
  const delivery = await prepareSkyStaticDelivery(nextSelection);
  const backup = await f.save(nextSelection, delivery); await delivery.dispose();
  const record = backup.manifest.skyStaticBackup;
  assert.equal(record.schemaVersion, "starward-sky-static-backup-v2");
  const encrypted = await readFile(backup.encryptedPath);
  assert.equal(decryptBackup(encrypted, Buffer.alloc(32, 4), record).toString("utf8"), "PGDMP".repeat(200));
  assert.throws(() => decryptBackup(encrypted, Buffer.alloc(32, 4)), /backup_sky_binding_invalid/u);
  const snapshot = await readSkyStaticBackup({ backupDirectory: f.backupDirectory, record });
  assert.equal(snapshot.sourceMetadata.length, 2);
  const restored = await restoreManagedSkyStaticBackup({ ...nextSelection, record, outputDirectory: path.join(f.root, "offline-restored-store"),
    confirmPublicationHash: record.publicationHash, execute() { throw new Error("fixture_original_images_unavailable"); } });
  assert.equal(restored.sourceAdmission, "VERIFIED_BACKUP_RESTORED_ORIGINAL_METADATA");
  assert.equal(restored.runtimeApplied, false); assert.equal(restored.sources, 2);
  const pointer = JSON.parse(await readFile(path.join(restored.storeDirectory, "prepared-inventory.json"), "utf8"));
  for (let i = 0; i < pointer.sources.length; i++) for (const [file, bytes] of [["index.json", snapshot.sourceMetadata[i].indexBytes],
    ["delivery.caddy", snapshot.sourceMetadata[i].fragmentBytes], ["image-artifact.json", snapshot.sourceMetadata[i].artifactBytes]])
    assert.ok((await readFile(path.join(restored.storeDirectory, pointer.sources[i].directory, "publication", file))).equals(bytes));
  assert.equal((await readdir(restored.storeDirectory)).includes("preparation.lock"), false);
  const before = await stat(path.join(snapshot.bundle.directory, "index.json"));
  const recaptured = await f.save(nextSelection, undefined, "2026-10-02T00:00:00.000Z", 2);
  assert.deepEqual(recaptured.manifest.skyStaticBackup, record);
  assert.equal((await stat(path.join(snapshot.bundle.directory, "index.json"))).mtimeMs, before.mtimeMs);
  assert.equal((await readdir(f.backupDirectory)).filter(name => name.startsWith("sky-public-")).length, 1);
});

test("source archives preserve noncanonical original JSON bytes without forging a replacement image artifact", async t => {
  const f = await skyBackupFixture(t), selected = f.selected(f.old);
  const index = JSON.parse(await readFile(path.join(f.old.output, "index.json"), "utf8"));
  const indexBytes = Buffer.from(JSON.stringify(index) + "\n\n");
  await writeFile(path.join(f.old.output, "index.json"), indexBytes);
  const artifact = JSON.parse(await readFile(path.join(f.old.output, "image-artifact.json"), "utf8"));
  artifact.indexSha256 = skyStaticHash(indexBytes);
  const artifactBytes = Buffer.from(JSON.stringify(artifact) + "\n");
  await writeFile(path.join(f.old.output, "image-artifact.json"), artifactBytes);
  const delivery = await prepareSkyStaticDelivery(selected), backup = await f.save(selected, delivery); await delivery.dispose();
  const record = backup.manifest.skyStaticBackup;
  const restored = await restoreManagedSkyStaticBackup({ ...selected, record, outputDirectory: path.join(f.root, "exact-json-store"),
    confirmPublicationHash: record.publicationHash, execute() { throw new Error("fixture_images_unavailable"); } });
  const pointer = JSON.parse(await readFile(path.join(restored.storeDirectory, "prepared-inventory.json"), "utf8"));
  const directory = path.join(restored.storeDirectory, pointer.sources[0].directory, "publication");
  assert.ok((await readFile(path.join(directory, "index.json"))).equals(indexBytes));
  assert.ok((await readFile(path.join(directory, "image-artifact.json"))).equals(artifactBytes));
  assert.equal(restored.sourceAdmission, "VERIFIED_BACKUP_RESTORED_ORIGINAL_METADATA");
});

test("Sky backup borrows the held preview lease, preserves old URLs, and reuses identical payloads", async t => {
  const f = await skyBackupFixture(t), firstSelection = f.selected(f.old), nextSelection = f.selected(f.next);
  const first = await prepareSkyStaticDelivery(firstSelection);
  const oldBackup = await f.save(firstSelection, first);
  assert.equal(oldBackup.manifest.schemaVersion, "starward-verified-backup-v2");
  await first.dispose();
  const next = await prepareSkyStaticDelivery(nextSelection);
  const pointer = await readFile(path.join(f.store, "prepared-inventory.json"));
  const backup = await f.save(nextSelection, next, "2026-10-02T00:00:00.000Z", 2);
  const record = backup.manifest.skyStaticBackup, snapshot = await readSkyStaticBackup({ backupDirectory: f.backupDirectory, record });
  assert.deepEqual(snapshot.bundle.records.map(r => r.route), [route("1"), route("2")]);
  assert.ok((await readFile(path.join(snapshot.bundle.directory, "files", route("1")))).equals(Buffer.from("1")));
  assert.ok((await readFile(path.join(snapshot.bundle.directory, "files", route("2")))).equals(Buffer.from("2")));
  const before = await stat(path.join(snapshot.bundle.directory, "index.json"));
  const reused = await f.save(nextSelection, next, "2026-10-03T00:00:00.000Z", 3);
  assert.deepEqual(reused.manifest.skyStaticBackup, record);
  assert.equal((await stat(path.join(snapshot.bundle.directory, "index.json"))).mtimeMs, before.mtimeMs);
  assert.equal((await readdir(f.backupDirectory)).filter(name => name.startsWith("sky-public-")).length, 2);
  assert.ok((await readFile(path.join(f.store, "prepared-inventory.json"))).equals(pointer));
  const restored = await restoreSkyStaticBackup({ backupDirectory: f.backupDirectory, record,
    outputDirectory: path.join(f.root, "isolated-restore"), confirmPublicationHash: record.publicationHash });
  assert.equal(restored.runtimeApplied, false);
  const restoredIndex = JSON.parse(await readFile(path.join(restored.directory, "index.json"), "utf8"));
  assert.deepEqual(restoredIndex.records, snapshot.bundle.records);
  for (const r of snapshot.bundle.records) assert.ok((await readFile(path.join(restored.directory, "files", r.route)))
    .equals(await readFile(path.join(snapshot.bundle.directory, "files", r.route))));
  await next.dispose();
  const calls = [];
  await assert.rejects(f.save(nextSelection, next, "2026-10-04T00:00:00.000Z", 4, calls), /backup_delivery_lease_invalid/);
  assert.deepEqual(calls, []);
});

test("retention binds actual older Sky backups and keeps DB v1 and reference completeness explicit", async t => {
  const f = await skyBackupFixture(t), firstSelection = f.selected(f.old), nextSelection = f.selected(f.next);
  const first = await prepareSkyStaticDelivery(firstSelection);
  const backup = await f.save(firstSelection, first); await first.dispose();
  const latest = await prepareSkyStaticDelivery(nextSelection); await latest.dispose();
  await executeVerifiedBackup({ validation: { ...firstSelection.validation, operations: { backupDirectory: f.backupDirectory, maxBackupBytes: 1024 * 1024 } },
    deploy: { COMPOSE_PROJECT_NAME: "starward-staging" }, postgres: f.postgres, key: Buffer.alloc(32, 4),
    now: () => new Date("2026-10-02T00:00:00.000Z"), random: length => Buffer.alloc(length, 9),
    run: ({ step }) => ({ stdout: Buffer.from(step.endsWith("-schema-relation") ? "t" : step === "backup-dump" ? "PGDMP".repeat(200) : "006_verified_fixture") }) });
  const report = await inspectSkyStaticRetention({ ...nextSelection, observeBackups: true });
  assert.deepEqual(report.backupEvidence.records.map(r => r.binding).sort(),
    ["BOUND_RECORDED_BACKUP_REFERENCE", "LEGACY_DB_ONLY_WITHOUT_SKY_BINDING"]);
  assert.ok(report.entries.find(r => r.name === path.basename(path.dirname(first.directory))).reasons.includes("BOUND_BACKUP_REFERENCE"));
  assert.equal(report.referenceCompleteness, "UNVERIFIED"); assert.equal(report.deletableBytes, null);
  const component = backup.manifest.skyStaticBackup;
  const snapshot = await readSkyStaticBackup({ backupDirectory: f.backupDirectory, record: component });
  await writeFile(path.join(snapshot.bundle.directory, "files", route("1")), "corrupt");
  await assert.rejects(inspectSkyStaticRetention({ ...nextSelection, observeBackups: true }), /file_identity_mismatch/);
  await assert.rejects(stat(path.join(f.store, "preparation.lock")), { code: "ENOENT" });
  // A corrupt older backup does not corrupt a different retained union. Bind
  // the new union's snapshot before checking its own reuse failure.
  const current = await f.save(nextSelection, undefined, "2026-10-03T00:00:00.000Z", 3);
  const currentSnapshot = await readSkyStaticBackup({ backupDirectory: f.backupDirectory, record: current.manifest.skyStaticBackup });
  await writeFile(path.join(currentSnapshot.bundle.directory, "files", route("1")), "corrupt-current");
  const calls = [];
  await assert.rejects(f.save(nextSelection, undefined, "2026-10-04T00:00:00.000Z", 4, calls), /file_identity_mismatch/);
  assert.deepEqual(calls, []);
});

test("v2 DB expiry retains public snapshots, and isolated Sky restore rejects overwrite, wrong confirmation and path escape", async t => {
  const f = await skyBackupFixture(t), selected = f.selected(f.old), delivery = await prepareSkyStaticDelivery(selected);
  const backup = await f.save(selected, delivery); await delivery.dispose();
  const record = backup.manifest.skyStaticBackup;
  const maintenance = await maintainTrialBackups({ ...selected, postgres: f.postgres, apply: true, now: new Date("2026-10-09T00:00:00.000Z") });
  assert.equal(maintenance.removed, 1);
  await assert.rejects(stat(backup.encryptedPath), { code: "ENOENT" });
  await readSkyStaticBackup({ backupDirectory: f.backupDirectory, record });
  const base = { backupDirectory: f.backupDirectory, record, outputDirectory: path.join(f.root, "restore"), confirmPublicationHash: record.publicationHash };
  await assert.rejects(restoreSkyStaticBackup({ ...base, confirmPublicationHash: "0".repeat(64) }), /publication_confirmation_required/);
  await assert.rejects(restoreSkyStaticBackup({ ...base, record: { ...record, directory: "../outside" } }), /record_invalid/);
  await assert.rejects(restoreSkyStaticBackup({ ...base, outputDirectory: path.join(f.backupDirectory, "unsafe") }), /restore_directory_invalid/);
  const restored = await restoreSkyStaticBackup(base);
  const bytes = await readFile(path.join(restored.directory, "index.json"));
  await assert.rejects(restoreSkyStaticBackup(base), { code: "EEXIST" });
  assert.ok((await readFile(path.join(restored.directory, "index.json"))).equals(bytes));
});

test("retention verifies each declared snapshot identity when two manifests share the same payload", async t => {
  const f = await skyBackupFixture(t), selected = f.selected(f.old), delivery = await prepareSkyStaticDelivery(selected);
  await f.save(selected, delivery);
  const second = await f.save(selected, delivery, "2026-10-02T00:00:00.000Z", 2); await delivery.dispose();
  const altered = JSON.parse(await readFile(second.manifestPath, "utf8")); altered.skyStaticBackup.bytes++;
  await writeFile(second.manifestPath, JSON.stringify(altered));
  await assert.rejects(inspectSkyStaticRetention({ ...selected, observeBackups: true }), /publication_identity_mismatch/);
  await assert.rejects(stat(path.join(f.store, "preparation.lock")), { code: "ENOENT" });
});

test("unconfigured preparation and resolution do no filesystem or Docker work", async () => {
  const execute = () => { throw new Error("must not run"); };
  assert.equal(await prepareSkyStaticDelivery({ validation: {}, deploy: {}, execute }), null);
  assert.equal(await loadSkyStaticDelivery({ validation: {}, deploy: {} }), null);
  assert.equal(await inspectSkyStaticRetention({ validation: {}, deploy: {} }), null);
});

test("retention dry-run accounts real repeated generations and failures, preserving every old URL and explicit mount/rollback reference", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "starward-sky-retention-"));
  const old = await fixtureImage(root, "1"), next = await fixtureImage(root, "2"), store = path.join(root, "store");
  const first = await prepareSkyStaticDelivery(input(store, old));
  await assert.rejects(inspectSkyStaticRetention(input(store, old)), /store_locked/);
  await first.dispose();
  const oldGeneration = path.basename(path.dirname(first.directory));
  const latest = await prepareSkyStaticDelivery(input(store, next)); await latest.dispose();
  const currentGeneration = path.basename(path.dirname(latest.directory));
  // Real rejected image leaves its source intact and never rewrites the pointer.
  const conflicting = await fixtureImage(root, "1", "different", "3".repeat(40)); conflicting.digest = `sha256:${"3".repeat(64)}`;
  await assert.rejects(prepareSkyStaticDelivery(input(store, conflicting)), /history_conflict/);
  const failedGeneration = `generation-${randomUUID()}`;
  await assert.rejects(writeSkyStaticBundle(path.join(store, failedGeneration), (async function* () {
    yield { route: route("3"), headers, bytes: Buffer.from("partial") };
    yield { route: route("3"), headers, bytes: Buffer.from("duplicate") };
  })()), /route_duplicate/);
  const pointerStage = `.inventory-${randomUUID()}.tmp`;
  await writeFile(path.join(store, pointerStage), "incomplete pointer");
  await writeFile(path.join(store, "operator-note.txt"), "unknown");
  const pointer = await readFile(path.join(store, "prepared-inventory.json"));
  const names = (await readdir(store)).sort();
  const declared = [{ kind: "RUNNING", directory: oldGeneration }, { kind: "ROLLBACK", directory: oldGeneration }];
  const report = await inspectSkyStaticRetention({ ...input(store, next), references: declared });
  assert.equal(report.mode, "DRY_RUN"); assert.equal(report.inventory.generation, currentGeneration);
  assert.equal(report.inventory.publishedPayloadBytes, 2); assert.equal(report.inventory.publishedFiles, 2);
  assert.ok(report.logicalBytes > report.inventory.publishedPayloadBytes);
  assert.equal(report.logicalBytes, report.entries.reduce((sum, entry) => sum + entry.logicalBytes, 0));
  assert.equal(report.files, report.entries.reduce((sum, entry) => sum + entry.files, 0));
  assert.equal(report.physicalAllocatedBytes, null); assert.equal(report.deletableBytes, null);
  assert.equal(report.referenceCompleteness, "UNVERIFIED");
  assert.deepEqual(report.entries.find(entry => entry.name === oldGeneration).reasons,
    ["DECLARED_ROLLBACK_REFERENCE", "DECLARED_RUNNING_REFERENCE"]);
  assert.equal(report.entries.find(entry => entry.name === currentGeneration).disposition, "RETAIN");
  assert.equal(report.entries.filter(entry => entry.reasons.includes("CURRENT_INVENTORY_SOURCE")).length, 2);
  const partial = report.entries.find(entry => entry.name === failedGeneration);
  assert.equal(partial.logicalBytes, 7); assert.equal(partial.stages.length, 1);
  assert.equal(partial.disposition, "RETAIN_PENDING_REFERENCE_REVIEW");
  assert.equal(report.entries.find(entry => entry.name === pointerStage).kind, "POINTER_STAGE");
  assert.equal(report.entries.find(entry => entry.name === "operator-note.txt").kind, "UNCLASSIFIED");
  assert.ok(report.entries.every(entry => entry.disposition.startsWith("RETAIN")));
  assert.deepEqual((await readdir(store)).sort(), names);
  assert.ok((await readFile(path.join(store, "prepared-inventory.json"))).equals(pointer));
  assert.equal((await readFile(path.join(latest.directory, "files", route("1")))).toString(), "1");
  assert.equal((await readFile(path.join(latest.directory, "files", route("2")))).toString(), "2");
  const withoutRefs = await inspectSkyStaticRetention(input(store, old));
  assert.equal(withoutRefs.entries.find(entry => entry.name === oldGeneration).disposition, "RETAIN_PENDING_REFERENCE_REVIEW");
  assert.equal(withoutRefs.deletableBytes, null);
  await assert.rejects(inspectSkyStaticRetention({ ...input(store, old), references: [{ kind: "BACKUP", directory: "../outside" }] }), /reference_invalid/);
  await assert.rejects(inspectSkyStaticRetention({ ...input(store, old), references: [{ kind: "RELEASE", directory: `generation-${randomUUID()}` }] }), /reference_missing/);
  await assert.rejects(stat(path.join(store, "preparation.lock")), { code: "ENOENT" });
});

test("retention refuses junctions and malformed current inventory instead of scanning or reclaiming outside the store", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "starward-sky-retention-boundary-"));
  const image = await fixtureImage(root, "1"), store = path.join(root, "store"), selected = input(store, image);
  const delivery = await prepareSkyStaticDelivery(selected); await delivery.dispose();
  const pointerPath = path.join(store, "prepared-inventory.json");
  const pointer = await readFile(pointerPath); await writeFile(pointerPath, "{}");
  await assert.rejects(inspectSkyStaticRetention(selected), /inventory_invalid/);
  await assert.rejects(stat(path.join(store, "preparation.lock")), { code: "ENOENT" });
  await writeFile(pointerPath, pointer);
  const outside = path.join(root, "outside"); await mkdir(outside); await writeFile(path.join(outside, "sentinel"), "untouched");
  await symlink(outside, path.join(store, "unclassified-link"), process.platform === "win32" ? "junction" : "dir");
  await assert.rejects(inspectSkyStaticRetention(selected), /retention_file_type_invalid/);
  assert.equal((await readFile(path.join(outside, "sentinel"))).toString(), "untouched");
  await assert.rejects(stat(path.join(store, "preparation.lock")), { code: "ENOENT" });
});

test("real store retains newer URLs across API rollback but prepared state alone cannot supply a non-deploy check", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "starward-sky-release-"));
  const old = await fixtureImage(root, "1"), next = await fixtureImage(root, "2"), store = path.join(root, "store");
  const oldInput = input(store, old);
  let delivery = await prepareSkyStaticDelivery(oldInput);
  assert.equal(delivery.identity.files, 1);
  await assert.rejects(loadSkyStaticDelivery(oldInput), /store_locked/);
  await delivery.dispose(); await delivery.dispose();
  delivery = await prepareSkyStaticDelivery(input(store, next));
  assert.equal(delivery.identity.files, 2); const merged = delivery.identity.deliveryPublicationHash;
  await delivery.dispose();
  const rollback = await prepareSkyStaticDelivery(oldInput);
  assert.equal(rollback.identity.imagePublicationHash, old.publicationHash);
  assert.equal(rollback.identity.deliveryPublicationHash, merged);
  assert.deepEqual(rollback.records.map((entry) => entry.route), [route("1"), route("2")]);
  assert.equal((await readFile(path.join(rollback.directory, "files", route("2")))).toString(), "2");
  await rollback.dispose();
  assert.equal(oldInput.calls.filter(call => call.args[0] === "create").length, 1);
  assert.equal((await readdir(store)).filter(entry => entry.startsWith("source-")).length, 2);
  const callsBefore = oldInput.calls.length;
  await assert.rejects(loadSkyStaticDelivery(oldInput), /retention_receipt_source_invalid/);
  assert.equal(oldInput.calls.length, callsBefore);
  await assert.rejects(stat(path.join(store, "preparation.lock")), { code: "ENOENT" });
});

test("revision/seal/collision failures preserve prepared pointer and release lock before any consumer convergence", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "starward-sky-reject-"));
  const image = await fixtureImage(root, "1"), store = path.join(root, "store");
  const initial = await prepareSkyStaticDelivery(input(store, image)); await initial.dispose();
  const before = await readFile(path.join(store, "prepared-inventory.json"));
  const changed = await fixtureImage(root, "1", "wrong", "2".repeat(40));
  changed.digest = `sha256:${"2".repeat(64)}`;
  const attempt = input(store, changed);
  await assert.rejects(prepareSkyStaticDelivery(attempt), /history_conflict/);
  assert.ok((await readFile(path.join(store, "prepared-inventory.json"))).equals(before));
  assert.equal(attempt.calls.at(-1).args[0], "rm");
  const mismatch = input(store, image); mismatch.validation.revision = "3".repeat(40);
  await assert.rejects(prepareSkyStaticDelivery(mismatch), /image_revision_mismatch/);
  assert.equal(mismatch.calls.length, 1);
  const broken = await fixtureImage(root, "3"); await writeFile(path.join(broken.output, "image-artifact.json"), "{}");
  await assert.rejects(prepareSkyStaticDelivery(input(store, broken)), /image_artifact_mismatch/);
  assert.ok((await readFile(path.join(store, "prepared-inventory.json"))).equals(before));
  await assert.rejects(stat(path.join(store, "preparation.lock")), { code: "ENOENT" });
  assert.ok((await readdir(store)).some((entry) => entry.startsWith("source-")));
});

test("HTTP byte equality alone cannot certify static service; preview denial and exact source headers are required", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "starward-sky-verify-"));
  const image = await fixtureImage(root, "1"); const selected = input(path.join(root, "store"), image, { STARWARD_OPERATOR_PREVIEW_TOKEN: "fixture-token" });
  const delivery = await prepareSkyStaticDelivery(selected);
  const fetch = (mode) => async (_url, options) => {
    if (!options.headers["X-Starward-Operator-Preview"]) return new Response(null, { status: mode === "unguarded" ? 200 : 404 });
    const responseHeaders = { ...headers, ...(mode === "api" ? {} : { "x-starward-sky-delivery": "static" }) };
    if (mode === "wrong-header" || (mode === "wrong-head-header" && options.method === "HEAD")) responseHeaders["cache-control"] = "no-cache";
    return new Response(options.method === "HEAD" ? null : mode === "corrupt" ? "X" : "1", { headers: responseHeaders });
  };
  try {
    await assert.rejects(verifySkyStaticDelivery({ ...selected, delivery, fetchImpl: fetch("api") }), /http_identity_mismatch/);
    await assert.rejects(verifySkyStaticDelivery({ ...selected, delivery, fetchImpl: fetch("unguarded") }), /preview_static_not_guarded/);
    await assert.rejects(verifySkyStaticDelivery({ ...selected, delivery, fetchImpl: fetch("corrupt") }), /http_identity_mismatch/);
    await assert.rejects(verifySkyStaticDelivery({ ...selected, delivery, fetchImpl: fetch("wrong-header") }), /http_header_mismatch/);
    await assert.rejects(verifySkyStaticDelivery({ ...selected, delivery, fetchImpl: fetch("wrong-head-header") }), /http_head_header_mismatch/);
    const actual = await verifySkyStaticDelivery({ ...selected, delivery, fetchImpl: fetch("valid") });
    assert.equal(actual.checkedFiles, 1); assert.equal(actual.checkedBytes, 1); assert.equal(actual.unauthorizedStatus, 404);
  } finally { await delivery.dispose(); }
});

test("native HTTPS verification bounds a periodically active body and retires its deadline on retry success", async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), "starward-sky-http-deadline-"));
  const body = Buffer.from("periodic-body");
  const image = await fixtureImage(root, "1", body.toString());
  const store = path.join(root, "store"), selected = input(store, image);
  const delivery = await prepareSkyStaticDelivery(selected);
  const pointer = await readFile(path.join(store, "prepared-inventory.json"));
  const started = Promise.withResolvers(), destroyed = [];
  let slow = true, requests = 0;
  // Keep the real requestBytes path and its byte/header checks. The transport
  // supplies activity at 0/5/10/16 seconds, never a 15-second idle interval.
  // A socket timeout therefore cannot impose the required total deadline.
  t.mock.method(https, "request", (_url, options, receive) => {
    assert.equal(options.timeout, 15_000);
    const request = new EventEmitter(), response = new EventEmitter();
    let retired = false;
    response.statusCode = 200;
    response.headers = { ...headers, "x-starward-sky-delivery": "static" };
    request.destroy = (error) => {
      retired = true; destroyed.push(error); request.emit("error", error); return request;
    };
    request.end = () => {
      requests++;
      receive(response);
      if (slow && options.method !== "HEAD") {
        response.emit("data", body.subarray(0, 3));
        setTimeout(() => { if (!retired) response.emit("data", body.subarray(3, 6)); }, 5_000);
        setTimeout(() => { if (!retired) response.emit("data", body.subarray(6, 9)); }, 10_000);
        setTimeout(() => {
          if (!retired) { response.emit("data", body.subarray(9)); response.emit("end"); }
        }, 16_000);
        started.resolve();
      } else {
        if (options.method !== "HEAD") response.emit("data", body);
        response.emit("end");
      }
    };
    return request;
  });
  t.mock.timers.enable({ apis: ["setTimeout"] });
  try {
    const checking = verifySkyStaticDelivery({ ...selected, delivery }).then(value => ({ value }), error => ({ error }));
    await started.promise;
    t.mock.timers.tick(14_999);
    assert.equal(destroyed.length, 0);
    t.mock.timers.tick(1);
    const destroyedAtDeadline = destroyed.length;
    // Settle the old implementation's last chunk too, so the before-fix case
    // fails with a completed result rather than leaving an unobserved promise.
    t.mock.timers.tick(1_000);
    const outcome = await checking;
    assert.equal(outcome.error?.message, "sky_static_http_timeout", "periodic progress must not keep the verifier and its lease live beyond 15 seconds");
    assert.equal(destroyedAtDeadline, 1);
    assert.equal(requests, 1, "a timed-out GET must not advance to HEAD");
    assert.ok((await readFile(path.join(store, "prepared-inventory.json"))).equals(pointer));
  } finally {
    t.mock.timers.reset();
    await delivery.dispose();
  }
  await assert.rejects(stat(path.join(store, "preparation.lock")), { code: "ENOENT" });

  // A fresh operation reuses the same sealed bytes, succeeds, and must not be
  // destroyed later by the completed GET/HEAD deadlines.
  const retry = await prepareSkyStaticDelivery(selected);
  slow = false;
  t.mock.timers.enable({ apis: ["setTimeout"] });
  try {
    const result = await verifySkyStaticDelivery({ ...selected, delivery: retry });
    assert.equal(result.checkedFiles, 1); assert.equal(result.checkedBytes, body.length);
    assert.equal(requests, 3);
    t.mock.timers.tick(30_000);
    assert.equal(destroyed.length, 1, "completed requests must retire their deadline timers");
    assert.ok((await readFile(path.join(store, "prepared-inventory.json"))).equals(pointer));
  } finally {
    t.mock.timers.reset();
    await retry.dispose();
  }
  await assert.rejects(stat(path.join(store, "preparation.lock")), { code: "ENOENT" });
});

test("self-consistent inventory cannot introduce a URL absent from every retained image publication", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "starward-sky-admission-"));
  const image = await fixtureImage(root, "1"), store = path.join(root, "store"), selected = input(store, image);
  const delivery = await prepareSkyStaticDelivery(selected); await delivery.dispose();
  const pointerPath = path.join(store, "prepared-inventory.json");
  const pointer = JSON.parse(await readFile(pointerPath, "utf8"));
  const indexPath = path.join(delivery.directory, "index.json");
  const index = JSON.parse(await readFile(indexPath, "utf8"));
  const beforeSource = await readFile(path.join(store, pointer.sources[0].directory, "publication", "index.json"));
  // Use an already-created file path with another canonical filename: the
  // payload/hash/Caddy fragment all agree, but no admitted image offers it.
  const extra = { ...index.records[0], route: index.records[0].route.replace("texture.jpg", "unapproved.jpg") };
  await writeFile(path.join(delivery.directory, "files", extra.route), "1");
  index.records.push(extra); index.publicationHash = skyStaticHash(JSON.stringify(index.records));
  await writeFile(indexPath, JSON.stringify(index));
  await writeFile(path.join(delivery.directory, "delivery.caddy"), skyStaticDeliveryFragment(index.records));
  pointer.publicationHash = index.publicationHash; await writeFile(pointerPath, JSON.stringify(pointer));
  await assert.rejects(loadSkyStaticDelivery(selected), /inventory_source_mismatch/);
  assert.ok((await readFile(path.join(store, pointer.sources[0].directory, "publication", "index.json"))).equals(beforeSource));
  await assert.rejects(stat(path.join(store, "preparation.lock")), { code: "ENOENT" });
});

test("a lost create result still retires only its owned container; uncertain discovery remains an explicit failure", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "starward-sky-create-loss-"));
  const image = await fixtureImage(root, "1"), store = path.join(root, "store"), selected = input(store, image);
  const original = selected.execute;
  selected.execute = (command) => {
    const result = original(command);
    if (command.args[0] === "create") throw new Error("lost_create_result");
    return result;
  };
  await assert.rejects(prepareSkyStaticDelivery(selected), /lost_create_result/);
  assert.equal(selected.calls.at(-1).args[0], "rm"); assert.equal(selected.calls.at(-1).args[1], "a".repeat(12));
  const discovery = selected.calls.find((call) => call.args[0] === "container").args;
  assert.ok(discovery.some((arg) => arg.startsWith("name=^/starward-sky-artifact-")));
  assert.ok(discovery.some((arg) => arg.startsWith("label=starward.sky-artifact-owner=")));
  await assert.rejects(stat(path.join(store, "prepared-inventory.json")), { code: "ENOENT" });
  await assert.rejects(stat(path.join(store, "preparation.lock")), { code: "ENOENT" });
  const uncertain = input(path.join(root, "uncertain"), image), run = uncertain.execute;
  uncertain.execute = (command) => {
    if (command.args[0] === "container") throw new Error("daemon_disconnected");
    const result = run(command);
    if (command.args[0] === "create") throw new Error("lost_create_result");
    return result;
  };
  await assert.rejects(prepareSkyStaticDelivery(uncertain), /artifact_cleanup_unverified/);
  await assert.rejects(stat(path.join(root, "uncertain", "prepared-inventory.json")), { code: "ENOENT" });
});
