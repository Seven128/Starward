import assert from "node:assert/strict";
import test from "node:test";
import { mapStaticHash, type MapStaticManifest, type MapStaticRecord } from "./map-static-manifest.ts";
import { MAP_STATIC_PAGE_BYTES, assertMapStaticIndex, expandMapStaticIndex,
  MapStaticPublicationIndex, partitionMapStaticManifest, type MapStaticDirectory, type MapStaticIndexRead } from "./map-static-index.ts";

const hash = "a".repeat(64), signal = new AbortController().signal;
async function fixture() {
  // More than one metadata/record page. This is an index-contract fixture,
  // not a numerical/scientific publication or a throughput benchmark.
  const records: MapStaticRecord[] = Array.from({ length: 14000 }, (_, i) => ({
    route: `/v2/terrain/assets/terrarium-cn-v2-fixed-11-${i}-850-1-${hash}.png`, bytes: 12, sha256: hash,
    headers: { "content-type": "image/png", "cache-control": "public, max-age=604800, immutable",
      "x-content-type-options": "nosniff", "x-starward-terrain-publication": `terrain:terrarium-cn-v2-fixed-11-${i}-850-1:${hash}:${hash}` },
  })).sort((a, b) => a.route < b.route ? -1 : a.route > b.route ? 1 : 0);
  const metadata = records.map(record => ({ file: record.route.split("/").at(-1)! + ".json", bytes: 12, sha256: hash }));
  const sources = [{ family: "terrain" as const, publicationVersion: `terrain-fixed:${hash}`, metadata }];
  const flat: MapStaticManifest = { schemaVersion: "starward-map-static-export-v1",
    publicationHash: mapStaticHash(JSON.stringify({ sources, records })), sources, records };
  const files = new Map<string, Buffer>();
  const index = await partitionMapStaticManifest(flat, async (file, bytes) => { files.set(file, bytes); });
  files.set("index.json", Buffer.from(JSON.stringify(index)));
  const calls: string[] = [];
  const read: MapStaticIndexRead = async (file, maximum, readSignal) => {
    calls.push(file); readSignal.throwIfAborted();
    const bytes = files.get(file); assert.ok(bytes, file); assert.ok(bytes.length <= maximum, file); return bytes;
  };
  const reader = new MapStaticPublicationIndex(read, index.publicationHash);
  return { files, index, flat, read, reader, calls };
}

test("a large sealed directory reads just the selected proof and asset pages, with legacy roundtrip intact", async () => {
  const { files, index, flat, read, reader, calls } = await fixture();
  try {
    assert.ok(index.recordPages.length > 1); assert.ok(index.sources[0]!.metadataPages.length > 1);
    assert.ok([...files.values()].every(bytes => bytes.length <= MAP_STATIC_PAGE_BYTES));
    const selected = flat.records.at(-1)!, file = selected.route.split("/").at(-1)! + ".json";
    const source = (await reader.root()).sources[0]!;
    assert.deepEqual(await reader.metadata(source, file, signal), flat.sources[0]!.metadata.filter(entry => entry.file === file));
    assert.deepEqual(await reader.record(selected.route, signal), selected);
    assert.equal(calls.length, 3, "root plus one proof directory page and one route page; no nationwide scan");
    calls.length = 0;
    assert.deepEqual(await reader.metadata(source, "no-such-proof", signal), []);
    assert.equal(calls.length, 0, "a directory miss never scans data pages");
    assert.deepEqual(await expandMapStaticIndex(index, read, signal), flat);
    files.set("index.json", Buffer.from(JSON.stringify(flat)));
    const legacy = new MapStaticPublicationIndex(read, flat.publicationHash);
    try { assert.deepEqual(await legacy.record(selected.route, signal), selected); }
    finally { legacy.close(new Error("closed")); }
  } finally { reader.close(new Error("closed")); }
});

test("page corruption, false ranges and changed pins fail; repaired pages retry without cached bad data", async () => {
  const { files, index, flat, read, reader } = await fixture();
  try {
    const page = index.recordPages[0]!, original = files.get(page.file)!;
    files.set(page.file, Buffer.alloc(original.length, 32));
    await assert.rejects(reader.record(flat.records[0]!.route, signal), /page_identity_invalid/);
    files.set(page.file, original);
    assert.deepEqual(await reader.record(flat.records[0]!.route, signal), flat.records[0]);
    const invalid = structuredClone(index);
    invalid.recordPages[0]!.last = invalid.recordPages[1]!.first;
    invalid.publicationHash = mapStaticHash(JSON.stringify({ sources: invalid.sources, recordPages: invalid.recordPages }));
    assert.throws(() => assertMapStaticIndex(invalid), /pages_invalid/);
    const badRange: MapStaticDirectory = structuredClone(index);
    badRange.recordPages[0]!.count++;
    badRange.publicationHash = mapStaticHash(JSON.stringify({ sources: badRange.sources, recordPages: badRange.recordPages }));
    await assert.rejects(expandMapStaticIndex(badRange, read, signal), /page_range_invalid/);
    const wrong = new MapStaticPublicationIndex(read, "0".repeat(64));
    try { await assert.rejects(wrong.root(), /publication_mismatch/); }
    finally { wrong.close(new Error("closed")); }
  } finally { reader.close(new Error("closed")); }
});

test("cancelled readers and a closed index cannot publish late lookup results", async () => {
  const { index, flat, read } = await fixture();
  let release: (() => void) | undefined;
  const reader = new MapStaticPublicationIndex(async (...args) => {
    const bytes = await read(...args);
    if (args[0].startsWith("records/")) await new Promise<void>(resolve => { release = resolve; });
    return bytes;
  }, index.publicationHash);
  const controller = new AbortController(); controller.abort(new Error("superseded"));
  await assert.rejects(reader.record(flat.records[0]!.route, controller.signal), /superseded/);
  const pending = reader.record(flat.records[0]!.route, signal);
  while (!release) await new Promise(resolve => setImmediate(resolve));
  reader.close(new Error("closed")); release();
  await assert.rejects(pending, /closed/);
  assert.throws(() => reader.root(), /closed/);
});
