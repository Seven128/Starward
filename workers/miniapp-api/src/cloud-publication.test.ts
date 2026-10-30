import assert from "node:assert/strict";
import { writeFile, readFile } from "node:fs/promises";
import fsp from "node:fs/promises";
import { syncBuiltinESMExports } from "node:module";
import path from "node:path";
import test from "node:test";
import { CloudNumericPublication, CloudNumericReadStore, assertCloudBatch } from "./cloud-publication.ts";
import { createCloudPublicationFixture as fixture } from "./test-fixtures/cloud-publication-fixture.ts";

test("pinned publication samples an exact requested instant and exposes the actual run/brackets", async () => {
  const input = await fixture();
  try {
    const publication = await CloudNumericPublication.open(input.directory, input.manifestSha256);
    assert.equal(publication.supports240Hours(Date.parse("2026-10-27T19:00:00Z")), true);
    assert.equal(publication.supports240Hours(Date.parse("2026-10-28T00:00:01Z")), false);
    const selected = await publication.sample(22.95, 113.05, "2026-10-27T01:30:00Z");
    assert.equal(selected?.cloudPercent, 50);
    assert.equal(selected?.lowerAt, "2026-10-27T00:00:00Z");
    assert.equal(selected?.upperAt, "2026-10-27T03:00:00Z");
    assert.equal(selected?.publicationId, input.manifest.publicationId);
    assert.equal((await publication.sample(23, 113, "2026-10-27T00:00:00Z"))?.cloudPercent, 0);
    assert.equal(await publication.sample(25, 113, "2026-10-27T00:00:00Z"), null);
    assert.equal(await publication.sample(23, 113, "2026-11-07T00:00:01Z"), null);
    publication.close();
    await assert.rejects(publication.frame(0), /reader_unavailable/u);
  } finally { await input.dispose(); }
});

test("an intact manifest cannot silently admit tampered numerical bytes or an incorrect pin", async () => {
  const input = await fixture();
  try {
    await assert.rejects(CloudNumericPublication.open(input.directory, "0".repeat(64)), /integrity/u);
    const publication = await CloudNumericPublication.open(input.directory, input.manifestSha256);
    const file = path.join(input.directory, input.manifest.frames[0]!.values.file), bytes = await readFile(file);
    bytes.writeFloatLE(0.5, 0); await writeFile(file, bytes);
    await assert.rejects(publication.frame(0), /integrity/u);
    publication.close();
  } finally { await input.dispose(); }
});

test("missing native times, source mismatch and unsafe filenames fail publication admission", async () => {
  const input = await fixture();
  try {
    const missing = structuredClone(input.manifest); missing.frames.splice(2, 1);
    assert.throws(() => assertCloudBatch(missing), /frame_invalid/u);
    const otherSource = structuredClone(input.manifest); otherSource.frames[0]!.source.metadata.stream = "enfo";
    assert.throws(() => assertCloudBatch(otherSource), /origin_invalid/u);
    const unsafe = structuredClone(input.manifest); unsafe.frames[0]!.values.file = "../outside.f32";
    assert.throws(() => assertCloudBatch(unsafe), /file_invalid/u);
    const short = structuredClone(input.manifest); short.coverage.supports240HoursUntil = "2026-10-29T00:00:00Z";
    assert.throws(() => assertCloudBatch(short), /coverage_invalid/u);
  } finally { await input.dispose(); }
});

test("a failed frame retains its read slot until the other file has drained", async () => {
  const input = await fixture(), publication = await CloudNumericPublication.open(input.directory, input.manifestSha256);
  const originalRead = fsp.readFile, target = path.join(input.directory, input.manifest.frames[0]!.values.file);
  const maskFile = path.join(input.directory, input.manifest.frames[0]!.mask.file);
  let release!: () => void, markEntered!: () => void, pending = 0, secondSettled = false;
  const delayed = new Promise<void>(resolve => { release = resolve; });
  const entered = new Promise<void>(resolve => { markEntered = resolve; });
  let second: Promise<void> | undefined;
  fsp.readFile = (async (...args: Parameters<typeof fsp.readFile>) => {
    if (args[0] === maskFile) {
      await entered;
      throw Object.assign(new Error("ENOENT controlled mask read failure"), { code: "ENOENT" });
    }
    if (args[0] !== target) return originalRead(...args);
    pending++; markEntered();
    try { await delayed; return await originalRead(...args); }
    finally { pending--; }
  }) as typeof fsp.readFile;
  syncBuiltinESMExports();
  try {
    await assert.rejects(publication.frame(0), /ENOENT/u);
    assert.equal(pending, 1);
    second = publication.frame(0).then(() => { secondSettled = true; }, () => { secondSettled = true; });
    // The controlled slow sibling is still pending, independently of filesystem
    // speed. A retry may neither release that slot nor start an orphaned read.
    await new Promise(resolve => setTimeout(resolve, 20));
    assert.equal(pending, 1);
    assert.equal(secondSettled, false);
  } finally {
    publication.close(); release(); await second;
    fsp.readFile = originalRead; syncBuiltinESMExports();
    await input.dispose();
  }
  assert.equal(pending, 0);
});

test("closing one injected publication retires only its readers, preserving a shared read and cache", async () => {
  const input = await fixture(), store = new CloudNumericReadStore();
  const first = await CloudNumericPublication.open(input.directory, input.manifestSha256, undefined, store);
  const second = await CloudNumericPublication.open(input.directory, input.manifestSha256, undefined, store);
  const originalRead = fsp.readFile, target = path.join(input.directory, input.manifest.frames[0]!.values.file);
  let release!: () => void, markEntered!: () => void, calls = 0;
  const gate = new Promise<void>(resolve => { release = resolve; }), entered = new Promise<void>(resolve => { markEntered = resolve; });
  fsp.readFile = (async (...args: Parameters<typeof fsp.readFile>) => {
    if (args[0] === target) { calls++; markEntered(); await gate; }
    return originalRead(...args);
  }) as typeof fsp.readFile;
  syncBuiltinESMExports();
  const left = first.frame(0), survivor = second.frame(0);
  try {
    await entered;
    await first.close();
    await assert.rejects(left, /cloud_publication_closed/u);
    release();
    const value = await survivor;
    assert.equal(value.values[0], 0);
    assert.equal(await second.frame(0), value);
    assert.equal(calls, 1);
    await assert.rejects(first.frame(0), /reader_unavailable/u);
    await second.close();
    const later = await CloudNumericPublication.open(input.directory, input.manifestSha256, undefined, store);
    try { assert.equal(await later.frame(0), value); assert.equal(calls, 1); }
    finally { await later.close(); }
  } finally {
    release(); await Promise.allSettled([left, survivor]);
    await Promise.all([first.close(), second.close()]); await store.close();
    fsp.readFile = originalRead; syncBuiltinESMExports(); await input.dispose();
  }
});

test("different real publication handles share the two-frame admission limit", async () => {
  const inputs = [await fixture(), await fixture({ runAt: "2026-10-27T12:00:00Z" })], store = new CloudNumericReadStore();
  const publications = await Promise.all(inputs.map(input => CloudNumericPublication.open(input.directory, input.manifestSha256, undefined, store)));
  const originalRead = fsp.readFile, starts: string[] = [], gates = new Map<string, { release: () => void; promise: Promise<void>; entered: Promise<void>; markEntered: () => void }>();
  const targets = [path.join(inputs[0]!.directory, inputs[0]!.manifest.frames[0]!.values.file),
    path.join(inputs[1]!.directory, inputs[1]!.manifest.frames[0]!.values.file),
    path.join(inputs[0]!.directory, inputs[0]!.manifest.frames[1]!.values.file)];
  for (const target of targets) {
    let release!: () => void, markEntered!: () => void;
    const promise = new Promise<void>(resolve => { release = resolve; }), entered = new Promise<void>(resolve => { markEntered = resolve; });
    gates.set(target, { release, promise, entered, markEntered });
  }
  let active = 0, peak = 0;
  fsp.readFile = (async (...args: Parameters<typeof fsp.readFile>) => {
    const gate = typeof args[0] === "string" ? gates.get(args[0]) : undefined;
    if (!gate) return originalRead(...args);
    active++; peak = Math.max(peak, active); starts.push(args[0] as string); gate.markEntered();
    try { await gate.promise; return await originalRead(...args); }
    finally { active--; }
  }) as typeof fsp.readFile;
  syncBuiltinESMExports();
  const pending = [publications[0]!.frame(0), publications[1]!.frame(0), publications[0]!.frame(1)];
  try {
    await Promise.all(targets.slice(0, 2).map(target => gates.get(target)!.entered));
    assert.equal(starts.length, 2);
    gates.get(targets[0]!)!.release();
    await gates.get(targets[2]!)!.entered;
    assert.equal(peak, 2);
    assert.equal(starts[2], targets[2]);
    gates.forEach(gate => gate.release());
    const results = await Promise.all(pending);
    assert.notEqual(results[0], results[1], "same grid/time index from different manifests must not alias cached frames");
    assert.deepEqual(results.map(result => result.values[0]), [0, 0, 1]);
  } finally {
    gates.forEach(gate => gate.release()); await Promise.allSettled(pending);
    await Promise.all(publications.map(publication => publication.close())); await store.close();
    fsp.readFile = originalRead; syncBuiltinESMExports(); await Promise.all(inputs.map(input => input.dispose()));
  }
});
