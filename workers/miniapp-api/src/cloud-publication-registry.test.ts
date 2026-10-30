import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile, rm } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import test from "node:test";
import { CloudPublicationRegistry } from "./cloud-publication-registry.ts";
import { createCloudPublicationFixture } from "./test-fixtures/cloud-publication-fixture.ts";
import { publishCloudBatch } from "../../../data-pipelines/cloud/publish_tcc_batch.mts";

async function newRoot() {
  const root = await mkdtemp(path.join(os.tmpdir(), "starward-cloud-registry-"));
  return { root, async dispose() {
    const target = path.resolve(root);
    assert.equal(path.dirname(target), path.resolve(os.tmpdir()));
    assert(path.basename(target).startsWith("starward-cloud-registry-"));
    await rm(target, { recursive: true, force: true });
  } };
}

test("only an activated ready batch selects a pin; existing Contexts retain their exact run after a switch", async () => {
  const first = await createCloudPublicationFixture(), second = await createCloudPublicationFixture({ runAt: "2026-10-27T12:00:00Z" }), storage = await newRoot();
  let now = Date.parse("2026-10-27T19:00:00Z");
  const registry = new CloudPublicationRegistry(storage.root, () => now);
  try {
    assert.deepEqual(await registry.selectCurrent(), { schemaVersion: "total-cloud-context-v1", policy: "ECMWF_IFS_TCC_V1", state: "UNAVAILABLE", reason: "NOT_READY" });
    await publishCloudBatch({ directory: first.directory, manifestSha256: first.manifestSha256, root: storage.root,
      activate: false, expectedCurrentManifestSha256: null }, () => now);
    assert.equal((await registry.selectCurrent())?.state, "UNAVAILABLE");
    await publishCloudBatch({ directory: first.directory, manifestSha256: first.manifestSha256, root: storage.root,
      activate: true, expectedCurrentManifestSha256: null }, () => now);
    const pin = await registry.selectCurrent();
    assert(pin?.state === "PINNED");
    assert.equal(pin.manifestSha256, first.manifestSha256);
    now = Date.parse("2026-10-28T07:00:00Z");
    await publishCloudBatch({ directory: second.directory, manifestSha256: second.manifestSha256, root: storage.root,
      activate: true, expectedCurrentManifestSha256: first.manifestSha256 }, () => now);
    const current = await registry.selectCurrent();
    assert(current?.state === "PINNED");
    assert.equal(current.runAt, "2026-10-27T12:00:00Z");
    const retained = await registry.read(pin);
    assert.equal(retained.manifestSha256, first.manifestSha256);
    assert.equal((await retained.sample(23, 113, "2026-10-27T00:00:00Z"))?.cloudPercent, 0);
    await retained.close();
    await assert.rejects(publishCloudBatch({ directory: first.directory, manifestSha256: first.manifestSha256, root: storage.root,
      activate: true, expectedCurrentManifestSha256: second.manifestSha256 }, () => now), /coverage_expired/u);
    assert.equal((await registry.selectCurrent())?.state, "PINNED");
    await writeFile(path.join(storage.root, "current.json"), "{broken");
    assert.deepEqual(await registry.restore(pin), pin, "recovery validates retained publication, independent of current");
    await assert.rejects(registry.restore({ ...pin, publicationId: `ecmwf-tcc:${"f".repeat(64)}` }), /pin_mismatch/u);
    const disabled = new CloudPublicationRegistry(null);
    try { await assert.rejects(disabled.restore(pin), /registry_unavailable/u); }
    finally { await disabled.close(); }
  } finally { await registry.close(); await first.dispose(); await second.dispose(); await storage.dispose(); }
});

test("failed qualification and a stale activation CAS preserve previous publication bytes and pointer", async () => {
  const source = await createCloudPublicationFixture(), storage = await newRoot(), now = () => Date.parse("2026-10-27T19:00:00Z");
  const registry = new CloudPublicationRegistry(storage.root, now);
  try {
    const request = { directory: source.directory, manifestSha256: source.manifestSha256, root: storage.root,
      activate: true, expectedCurrentManifestSha256: null };
    await publishCloudBatch(request, now);
    const before = await readFile(path.join(storage.root, "current.json"));
    await assert.rejects(publishCloudBatch(request, now), /activation_conflict/u);
    const original = path.join(source.directory, source.manifest.frames[0]!.values.file);
    const damaged = await readFile(original); damaged[0] = damaged[0]! ^ 1; await writeFile(original, damaged);
    await assert.rejects(publishCloudBatch({ ...request, expectedCurrentManifestSha256: source.manifestSha256 }, now), /integrity/u);
    assert.deepEqual(await readFile(path.join(storage.root, "current.json")), before);
    const pin = await registry.selectCurrent(); assert(pin?.state === "PINNED");
    const stillUsable = await registry.read(pin);
    assert.equal((await stillUsable.sample(23, 113, "2026-10-27T00:00:00Z"))?.cloudPercent, 0);
    await stillUsable.close();
  } finally { await registry.close(); await source.dispose(); await storage.dispose(); }
});

test("disabled is the compatibility absence; configured broken publication remains an explicit failure", async () => {
  const disabled = new CloudPublicationRegistry(null), storage = await newRoot(), enabled = new CloudPublicationRegistry(storage.root);
  try {
    assert.equal(await disabled.selectCurrent(), null);
    await writeFile(path.join(storage.root, "current.json"), "{broken");
    const failed = await enabled.selectCurrent();
    assert.equal(failed?.state, "UNAVAILABLE");
    assert.equal(failed?.state === "UNAVAILABLE" && failed.reason, "READ_FAILED");
  } finally { await disabled.close(); await enabled.close(); await storage.dispose(); }
});
