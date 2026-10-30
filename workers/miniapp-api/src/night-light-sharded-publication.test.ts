import assert from "node:assert/strict";
import test from "node:test";
import { createHash } from "node:crypto";
import { mkdir, mkdtemp, readFile, writeFile, rm } from "node:fs/promises";
import path from "node:path";
import { tmpdir } from "node:os";
import { PNG } from "pngjs";
import { DISPLAY_RASTER_GRID, displayRasterWindowBounds, displayRasterWindowKey, WEB_MERCATOR_CIRCUMFERENCE_M,
  type DisplayRasterWindow } from "@starward/coordinate-system";
import { NIGHT_LIGHT_CONTRAST_DISPLAY, NIGHT_LIGHT_FIXED_SCALE as policy, type SourceSummary } from "@starward/miniapp-contracts";
import { projectNightLightDisplay } from "./night-light-display-image.ts";
import { ShardedNightLightPublication } from "./night-light-sharded-publication.ts";
import { fixedNightLightDataset, shardedNightLightDataset, type FixedNightLightRaster,
  type ShardedNightLightDataset } from "./night-light-publication.ts";
import { NightLightService } from "./night-light-service.ts";

const hash = (value: Buffer | string) => createHash("sha256").update(value).digest("hex");
const canonical = (value: any): string => Array.isArray(value) ? `[${value.map(canonical).join(",")}]`
  : value !== null && typeof value === "object" ? `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonical(value[key])}`).join(",")}}`
    : JSON.stringify(value);
const descriptor = (file: string, raw: Buffer | string) => ({ file, bytes: Buffer.byteLength(raw), sha256: hash(raw) });
const window: DisplayRasterWindow = { grid: DISPLAY_RASTER_GRID, tilePixels: 256, zoom: 9, x: 418, y: 222, columns: 1, rows: 1 };
const key = displayRasterWindowKey(window), shardKey = "9/26/13", version = "eog-sharded-reader-fixture-v1";

function preparedProduct(window: DisplayRasterWindow, source: SourceSummary) {
  const width = window.columns * 256, height = window.rows * 256, pixelCount = width * height;
  const png = new PNG({ width, height }), rgba = [1, 3, 5].map(i => Number.parseInt(policy.bands[0]!.color.slice(i, i + 2), 16)).concat(policy.alpha);
  for (let p = 0; p < pixelCount; p++) png.data.set(rgba, p * 4);
  const bytes = PNG.sync.write(png), imageHash = hash(bytes), numericHash = "d".repeat(64), part = "f".repeat(64);
  const sourceSet = { datasetVersion: version, radianceSha256: "a".repeat(64), coverageSha256: "b".repeat(64),
    policySha256: "c".repeat(64), geometrySha256: hash(JSON.stringify(window)) };
  const identity = hash(canonical(sourceSet)), file = `nightlight-v2-${hash(`${identity}:${imageHash}:${numericHash}`)}.png`;
  const step = WEB_MERCATOR_CIRCUMFERENCE_M / (256 * 2 ** window.zoom);
  const proof: FixedNightLightRaster = { schemaVersion: "starward-fixed-nightlight-raster-v2", releaseState: "PREPARED", datasetVersion: version,
    publicationId: `nightlight:${identity}:${imageHash}:${numericHash}`, source, sourceSet, methodVersion: policy.methodVersion, styleVersion: policy.styleVersion, policy,
    derivation: window.columns * window.rows > 1 ? "NUMERIC_FIXED_CELL_COMPOSITION" : "GDAL_PHYSICAL_AREA_SUM",
    cells: window.columns * window.rows > 1 ? Array.from({ length: window.columns * window.rows }, (_, i) => ({
      x: window.x + i % window.columns, y: window.y + Math.floor(i / window.columns),
      file: "synthetic-cell.png", publicationId: "synthetic-cell", numericSha256: numericHash,
    })) : [], image: { file, bytes: bytes.length, sha256: imageHash, width, height },
    numeric: { file: file + ".numbers.tif", bytes: 100, sha256: numericHash, format: "GEOTIFF_FLOAT64_DEFLATE_V1",
      bands: ["radianceMean", "validAreaFraction", "sourceMissingAreaFraction", "insufficientCoverageAreaFraction", "publishedAreaFraction", "qualityMask"],
      coordinates: "derived-GCJ-Mercator-metres", pixelInterpretation: "AREA" }, unit: policy.unit, statistic: policy.statistics.map,
    grid: { grid: DISPLAY_RASTER_GRID, window, width, height, boundsGcj02: displayRasterWindowBounds(window),
      affine: [step, 0, (window.x / 2 ** window.zoom - .5) * WEB_MERCATOR_CIRCUMFERENCE_M, 0, -step, (.5 - window.y / 2 ** window.zoom) * WEB_MERCATOR_CIRCUMFERENCE_M] },
    quality: { policyVersion: policy.qualityPolicy.version, minimumCloudFreeObservations: 3, validPixelCount: pixelCount, validZeroPixelCount: pixelCount,
      pixelCount, maximumAreaExcessFraction: 0, qualityMaskCounts: { "1": pixelCount, "2": 0, "3": 0, "4": 0, "5": 0, "6": 0 } } };
  const display = projectNightLightDisplay({ proof, bytes }, part, NIGHT_LIGHT_CONTRAST_DISPLAY.styleVersion, new AbortController().signal);
  const prefix = `parts/${part}/`, proofRaw = JSON.stringify(proof), displayRaw = JSON.stringify(display.proof);
  const entry = { part, publicationId: proof.publicationId, window, boundsGcj02: proof.grid.boundsGcj02, quality: proof.quality,
    proof: descriptor(prefix + file + ".json", proofRaw), image: { ...proof.image, file: prefix + file },
    numeric: { ...proof.numeric, file: prefix + proof.numeric.file },
    display: { styleVersion: display.proof.styleVersion, publicationId: display.proof.publicationId,
      image: { ...display.proof.image, file: prefix + "display/" + display.proof.image.file },
      proof: descriptor(prefix + "display/" + display.proof.image.file + ".json", displayRaw) } };
  return { entry, proof, display, proofRaw, displayRaw };
}

async function fixture(run: (f: { root: string; serviceRoot: string; index: any; shard: any; proof: FixedNightLightRaster; display: any;
  reader: () => ShardedNightLightPublication; seal: () => Promise<void>; write: (file: string, raw: Buffer | string) => Promise<void> }) => Promise<void>,
  windows: DisplayRasterWindow[] = [window]) {
  const serviceRoot = await mkdtemp(path.join(tmpdir(), "starward-nightlight-sharded-")), root = path.join(serviceRoot, version);
  await mkdir(root);
  const write = async (file: string, raw: Buffer | string) => { await mkdir(path.dirname(path.join(root, file)), { recursive: true }); await writeFile(path.join(root, file), raw); };
  const source: SourceSummary = { id: `eog-vnl:${version}`, kind: "TEST_FIXTURE", provider: "test", title: "Synthetic discovery boundary",
    sourceUrl: "https://example.test/source", license: "test", licenseUrl: "https://example.test/license", publishedAt: null, retrievedAt: null,
    validFrom: "2025-01-01T00:00:00.000Z", validTo: "2025-12-31T23:59:59.999Z", state: "FRESH", confidence: null, precision: "Metadata fixture only", limitations: [] };
  const products = windows.map(window => preparedProduct(window, source));
  const { proof, display, entry } = products[0]!, { part } = entry, prefix = `parts/${part}/`, { sourceSet } = proof;
  const shards: Record<string, any> = {};
  for (const product of products) {
    const window = product.proof.grid.window, coordinate = `${window.zoom}/${Math.floor(window.x / 16)}/${Math.floor(window.y / 16)}`;
    const shard = shards[coordinate] ??= { schemaVersion: "starward-sharded-nightlight-assets-v1", datasetVersion: version,
      shardKey: coordinate, assets: {} };
    shard.assets[displayRasterWindowKey(window)] = product.entry;
  }
  const shard = Object.values(shards)[0]!;
  const aoi = { west: 113.68, south: 22.68, east: 114.32, north: 23.32 };
  const index: any = { schemaVersion: "starward-sharded-nightlight-index-v1", releaseState: "SEALED", datasetVersion: version,
    methodVersion: policy.methodVersion, styleVersion: policy.styleVersion, policySha256: sourceSet.policySha256,
    radianceSha256: sourceSet.radianceSha256, coverageSha256: sourceSet.coverageSha256, minimumCloudFreeObservations: 3, source,
    grid: DISPLAY_RASTER_GRID, tilePixels: 256, shardTileSpan: 16, coverage: "DECLARED_SOURCE_AOIS_WITH_PER_PIXEL_QUALITY",
    parts: { [part]: { publicationVersion: "nightlight-fixed:" + "e".repeat(64), sourceManifestSha256: "e".repeat(64),
      inventory: { file: prefix + "inventory.json", bytes: 100, sha256: part },
      displayInventory: { file: prefix + "display/display-inventory.json", bytes: 100, sha256: "e".repeat(64) },
      aoiWgs84: aoi, requestedAoiWgs84: aoi, assetCount: products.length + 1 } },
    // The unrequested shard, inventories, source PNG and numeric TIFF deliberately
    // do not exist. Exact discovery must not open any of those files.
    shards: { "9/0/0": { file: "shards/9/0/0.json", bytes: 100, sha256: "a".repeat(64), assetCount: 1 } },
    availableZooms: [...new Set([9, ...windows.map(window => window.zoom)])].sort((a, b) => a - b),
    totals: { assets: products.length + 1, numericBytes: products.reduce((sum, p) => sum + p.proof.numeric.bytes, proof.numeric.bytes),
      legacyPngBytes: products.reduce((sum, p) => sum + p.proof.image.bytes, proof.image.bytes),
      displayPngBytes: products.reduce((sum, p) => sum + p.display.bytes.length, display.bytes.length),
      proofBytes: products.reduce((sum, p) => sum + Buffer.byteLength(p.proofRaw + p.displayRaw), Buffer.byteLength(products[0]!.proofRaw + products[0]!.displayRaw)) } };
  let pin: ReturnType<typeof descriptor>;
  const readers: ShardedNightLightPublication[] = [];
  const seal = async () => {
    for (const [coordinate, shard] of Object.entries(shards)) {
      const shardRaw = canonical(shard) + "\n";
      index.shards[coordinate] = { ...descriptor(`shards/${coordinate}.json`, shardRaw), assetCount: Object.keys(shard.assets).length };
      await write(`shards/${coordinate}.json`, shardRaw);
    }
    const { indexVersion: _, ...core } = index;
    index.indexVersion = "nightlight-sharded:" + hash(canonical(core));
    const raw = canonical(index) + "\n"; pin = descriptor("index.json", raw); await write("index.json", raw);
  };
  for (const { entry, proofRaw, displayRaw, display } of products) {
    await write(entry.proof.file, proofRaw); await write(entry.display.proof.file, displayRaw); await write(entry.display.image.file, display.bytes);
  }
  await seal();
  try { await run({ root, serviceRoot, index, shard, proof, display, write, seal, reader: () => { const r = new ShardedNightLightPublication(root, pin); readers.push(r); return r; } }); }
  finally {
    for (const reader of readers) reader.close();
    assert.equal(path.dirname(serviceRoot), tmpdir()); assert.ok(path.basename(serviceRoot).startsWith("starward-nightlight-sharded-"));
    await rm(serviceRoot, { recursive: true, force: true });
  }
}

test("pinned window reads only its coordinate shard and selected proofs, without inventories or any other products", async () => fixture(async f => {
  const reader = f.reader(), found = await reader.window(key); assert.ok(found);
  assert.equal(found.authority, "PREPARED_ONLY"); assert.deepEqual(found.proof, f.proof); assert.deepEqual(found.displayProof, f.display.proof);
  assert.equal(found.proof.numeric.bands.length, 6); assert.equal(found.proof.quality.validZeroPixelCount, 65536);
  const meta = await reader.metadata(); meta.source.id = "caller-edited"; meta.availableZooms.push(12);
  assert.equal((await reader.window(key))?.proof.source.id, f.proof.source.id, "returned metadata cannot mutate retained admission state");
}));

test("the original Python canonical protocol preserves a valid 113.0 numeric token and string content", async () => fixture(async f => {
  // Written by eog_raster.canonical_json, the same formatter as prepare_index.
  // No source TIFF, numeric preparation, database or public publication ran.
  const raw = await readFile(new URL("./test-fixtures/eog-sharded-python-canonical-root.json", import.meta.url));
  assert.ok(raw.includes(Buffer.from('"west":113.0')));
  assert.equal(hash(raw), "58b4f2ac967b734ba1442f99699d8836a23fc5273589dcfaf7cb28d68ad406fc");
  await f.write("index.json", raw);
  const reader = new ShardedNightLightPublication(f.root, descriptor("index.json", raw));
  try {
    const metadata = await reader.metadata();
    assert.equal(metadata.datasetVersion, "eog-sharded-canonical-fixture-v1");
    assert.equal(metadata.authority, "PREPARED_ONLY");
    assert.ok(metadata.source.title.includes('"indexVersion":113.0, commas, braces {}'));
    const versionMember = `"indexVersion":${JSON.stringify(JSON.parse(raw.toString("utf8")).indexVersion)}`;
    const duplicate = raw.toString("utf8").replace(versionMember, `${versionMember},${versionMember}`);
    assert.notEqual(duplicate, raw.toString("utf8")); await f.write("index.json", duplicate);
    const invalid = new ShardedNightLightPublication(f.root, descriptor("index.json", duplicate));
    try { await assert.rejects(invalid.metadata(), /nightlight_sharded_duplicate_member/u); } finally { invalid.close(); }
  } finally { reader.close(); }
}));

test("missing coverage stays absent; a declared missing or corrupted shard fails, then the same pinned bytes recover", async () => fixture(async f => {
  const reader = f.reader();
  assert.equal(await reader.window("9-32-32-1-1"), null);
  assert.equal(await reader.window("9-419-222-1-1"), null);
  await assert.rejects(reader.window("9-0-0-1-1"), /nightlight_sharded_declared_file_missing/u);
  const file = `shards/${shardKey}.json`, raw = await readFile(path.join(f.root, file));
  const corrupt = Buffer.from(raw); corrupt[1] = corrupt[1]! ^ 1; await f.write(file, corrupt);
  await assert.rejects(reader.window(key), /nightlight_sharded_file_hash_invalid/u);
  await f.write(file, raw); assert.ok(await reader.window(key));
}));

test("rehashed shard metadata cannot impersonate the selected part, numeric file or final display proof", async () => fixture(async f => {
  const entry = f.shard.assets[key], before = structuredClone(entry);
  for (const mutate of [
    () => { entry.part = "0".repeat(64); },
    () => { entry.numeric.file = entry.proof.file; },
    () => { entry.display.publicationId = "nightlight-display:" + "0".repeat(64); },
  ]) {
    mutate(); await f.seal(); await assert.rejects(f.reader().window(key), /nightlight_sharded_(entry_invalid|entry_paths_invalid|display_proof_mismatch)/u);
    Object.assign(entry, structuredClone(before));
  }
  await f.write(entry.proof.file, "null");
  entry.proof.bytes = 4; entry.proof.sha256 = hash("null"); await f.seal();
  await assert.rejects(f.reader().window(key), /nightlight_proof_identity_invalid/u);
}));

test("prepared display returns unchanged verified PNG bytes and does no live display projection", async () => fixture(async f => {
  const reader = f.reader(), found = await reader.display(key); assert.ok(found);
  assert.deepEqual(found.bytes, f.display.bytes); assert.deepEqual(found.prepared.displayProof, f.display.proof);
  const image = f.shard.assets[key].display.image, changed = Buffer.from(f.display.bytes); changed[changed.length - 1] = changed[changed.length - 1]! ^ 1;
  await f.write(image.file, changed); await assert.rejects(reader.display(key), /nightlight_sharded_file_hash_invalid/u);
}));

test("a missing exact request reuses a complete normal cover with its own identity and unchanged PNG", async () => {
  const cover = { ...window, zoom: 12, x: 3344, y: 1782, columns: 3, rows: 3 };
  await fixture(async f => {
    const reader = f.reader(), requested = "12-3344-1782-3-2";
    assert.equal(await reader.window(requested), null); assert.equal(await reader.display(requested), null);
    const found = await reader.coveringDisplay(requested); assert.ok(found);
    assert.equal(found.prepared.key, displayRasterWindowKey(cover));
    assert.deepEqual(found.prepared.proof, f.proof); assert.deepEqual(found.prepared.displayProof, f.display.proof);
    assert.deepEqual(found.bytes, f.display.bytes); assert.equal(found.prepared.authority, "PREPARED_ONLY");
    assert.equal(found.prepared.proof.quality.pixelCount, 768 * 768);
    const image = f.shard.assets[displayRasterWindowKey(cover)].display.image, changed = Buffer.from(f.display.bytes);
    changed[changed.length - 1] = changed[changed.length - 1]! ^ 1; await f.write(image.file, changed);
    await assert.rejects(reader.coveringDisplay(requested), /nightlight_sharded_file_hash_invalid/u);
  }, [cover]);
});

test("cover selection prefers same zoom, smaller area and deterministic origin over a smaller coarse product", async () => {
  const large = { ...window, columns: 3, rows: 3 }, horizontal = { ...window, x: 417, columns: 2 };
  const vertical = { ...window, y: 221, rows: 2 }, coarse = { ...window, zoom: 8, x: 209, y: 111 };
  // Deliberately reverse preferred order in the index, so declaration order
  // cannot choose the output. All products are independent prepared identities.
  await fixture(async f => {
    const reader = f.reader();
    assert.equal((await reader.coveringWindow(key))?.key, displayRasterWindowKey(vertical));
    assert.equal((await reader.coveringWindow("9-419-222-1-1"))?.key, displayRasterWindowKey(large));
  }, [large, horizontal, vertical, coarse]);
});

test("cover discovery crosses only the neighboring shard origins and clips the world edge", async () => {
  for (const [cover, requested] of [
    [{ ...window, x: 431, y: 223, columns: 2, rows: 2 }, "9-432-224-1-1"],
    [{ ...window, x: 510, y: 510, columns: 2, rows: 2 }, "9-511-511-1-1"],
  ] as const) await fixture(async f => {
    const found = await f.reader().coveringWindow(requested); assert.ok(found);
    assert.equal(found.key, displayRasterWindowKey(cover));
    assert.deepEqual(found.proof.grid.window, cover);
    // The unrelated declared-but-missing 9/0/0 shard, part inventories,
    // numerical TIFF and source PNG remain absent and were not consulted.
  }, [cover]);
});

test("coarse fallback covers the whole requested extent and preserves the pinned source and actual LOD", async () => {
  const coarse = { ...window, zoom: 8, x: 209, y: 111, columns: 2, rows: 2 };
  await fixture(async f => {
    const reader = f.reader(), found = await reader.coveringWindow("12-3344-1782-3-2"); assert.ok(found);
    assert.equal(found.key, displayRasterWindowKey(coarse)); assert.equal(found.proof.grid.window.zoom, 8);
    assert.deepEqual(found.proof.source, f.index.source); assert.deepEqual(found.proof.sourceSet, f.proof.sourceSet);
    assert.equal(found.indexVersion, (await reader.metadata()).indexVersion);
    assert.equal(await reader.coveringWindow("9-421-223-2-1"), null, "a partly intersecting coarse product is not coverage");
    assert.equal(await reader.coveringWindow("7-104-55-1-1"), null, "finer products cannot stand in for a coarse requested extent");
  }, [coarse]);
});

test("cover absence differs from declared damage, which cannot fall through to a coarse product", async () => {
  const cover = { ...window, columns: 3, rows: 3 }, coarse = { ...window, zoom: 8, x: 209, y: 111 };
  await fixture(async f => {
    const reader = f.reader();
    assert.equal(await reader.coveringWindow("9-32-32-1-1"), null);
    await assert.rejects(reader.coveringWindow("9-0-0-1-1"), /nightlight_sharded_declared_file_missing/u);
    const entry = f.shard.assets[displayRasterWindowKey(cover)];
    await f.write(entry.proof.file, "null");
    await assert.rejects(reader.coveringWindow(key), /nightlight_sharded_file_size_invalid/u);
    entry.proof.bytes = 4; entry.proof.sha256 = hash("null"); await f.seal();
    await assert.rejects(f.reader().coveringWindow(key), /nightlight_proof_identity_invalid/u);
  }, [cover, coarse]);
});

test("invalid identity/path/keys, cancellation and close cannot trigger alternate reads or revive an owner", async () => fixture(async f => {
  const reader = f.reader(), aborted = new AbortController(); aborted.abort(new Error("test_cancelled"));
  await assert.rejects(reader.window(key, aborted.signal), /test_cancelled/u);
  assert.ok(await reader.window(key), "one cancelled consumer does not cancel the immutable root owner");
  for (const value of ["09-418-222-1-1", "13-418-222-1-1", "9-512-222-1-1", "../9-418-222-1-1", "9-418-222-5-5"]) {
    await assert.rejects(reader.window(value), /nightlight_sharded_window_invalid/u);
    await assert.rejects(reader.coveringWindow(value), /nightlight_sharded_window_invalid/u);
  }
  await assert.rejects(reader.coveringDisplay(key, aborted.signal), /test_cancelled/u);
  const pendingCancellation = new AbortController(), pending = reader.coveringWindow(key, pendingCancellation.signal);
  pendingCancellation.abort(new Error("pending_cover_cancelled"));
  await assert.rejects(pending, /pending_cover_cancelled/u);
  assert.ok(await reader.coveringWindow(key), "one cancelled discovery does not poison subsequent calls");
  assert.throws(() => new ShardedNightLightPublication(f.root, { file: "../index.json", bytes: 1, sha256: "a".repeat(64) }), /nightlight_sharded_descriptor_invalid/u);
  assert.throws(() => new ShardedNightLightPublication(f.root, { file: "metadata.json", bytes: 1, sha256: "a".repeat(64) }), /nightlight_sharded_root_descriptor_invalid/u);
  const raw = await readFile(path.join(f.root, "index.json"));
  const wrong = new ShardedNightLightPublication(f.root, { file: "index.json", bytes: raw.length, sha256: "0".repeat(64) });
  try { await assert.rejects(wrong.metadata(), /nightlight_sharded_file_hash_invalid/u); } finally { wrong.close(); }
  await assert.rejects(reader.pixel({ system: "GCJ02", longitude: 114, latitude: 90,
    derivedFrom: "WGS84", transformVersion: "test-fixture" }), /nightlight_sharded_point_invalid/u);
  const pendingDisplay = reader.coveringDisplay(key); reader.close();
  await assert.rejects(pendingDisplay, /nightlight_sharded_closed/u);
  await assert.rejects(reader.window(key), /nightlight_sharded_closed/u);
  await assert.rejects(reader.display(key), /nightlight_sharded_closed/u);
  await assert.rejects(reader.coveringWindow(key), /nightlight_sharded_closed/u);
  await assert.rejects(reader.pixel({ system: "GCJ02", longitude: 114, latitude: 23,
    derivedFrom: "WGS84", transformVersion: "test-fixture" }), /nightlight_sharded_closed/u);
}));

async function databaseRecord(f: { root: string; index: any }): Promise<ShardedNightLightDataset> {
  const raw = await readFile(path.join(f.root, "index.json"));
  return { datasetVersion: version, radianceSha256: f.index.radianceSha256, coverageSha256: f.index.coverageSha256,
    source: structuredClone(f.index.source), payload: { schemaVersion: 3, datasetVersion: version,
      productName: f.index.source.title, dataYear: 2025, source: structuredClone(f.index.source),
      methodVersion: policy.methodVersion, styleVersion: policy.styleVersion, policy, policySha256: f.index.policySha256,
      minimumCloudFreeObservations: f.index.minimumCloudFreeObservations,
      shardedIndex: { ...descriptor("index.json", raw), file: "index.json", indexVersion: f.index.indexVersion },
      coverage: "DECLARED_SOURCE_AOIS_WITH_PER_PIXEL_QUALITY", radianceUnit: "nW/cm²/sr", calibratedSkyClass: false } };
}

test("schema 3 has an explicit pinned-root parser and cannot be consumed as a legacy flat inventory", async () => fixture(async f => {
  const record = await databaseRecord(f);
  assert.equal(shardedNightLightDataset(record), record);
  assert.throws(() => fixedNightLightDataset(record), /nightlight_dataset_schema_unsupported/u);
  for (const file of ["../index.json", "parts/index.json", "E:/uncontrolled/index.json", "metadata.json"]) {
    const invalid = structuredClone(record); Object.assign(invalid.payload.shardedIndex, { file });
    assert.throws(() => shardedNightLightDataset(invalid), /nightlight_sharded_dataset_invalid/u);
  }
  const extra = structuredClone(record); Object.assign(extra.payload, { root: "E:/uncontrolled" });
  assert.throws(() => shardedNightLightDataset(extra), /nightlight_sharded_dataset_invalid/u);
}));

test("DB authority selects one prepared root, detects cached-record drift and keeps public static delivery unavailable", async () => fixture(async f => {
  let record: ShardedNightLightDataset | null = null;
  const service = new NightLightService({ async getPublishedDarkSkyDataset(v) { return v === version ? record : null; } }, f.serviceRoot);
  try {
    assert.equal(await service.preparedWindow(version, key), null, "sealed local bytes alone cannot activate a dataset");
    const valid = await databaseRecord(f); record = structuredClone(valid);
    const prepared = await service.preparedWindow(version, key); assert.ok(prepared);
    assert.equal(prepared.authority, "PREPARED_ONLY"); assert.deepEqual(prepared.proof, f.proof);
    assert.equal("bytes" in prepared, false); assert.equal("imageUrl" in prepared, false);
    await assert.rejects(service.layer(version, displayRasterWindowBounds(window)), /nightlight_sharded_static_delivery_capability_not_ready/u);
    await assert.rejects(service.asset(version, f.display.proof.image.file), /nightlight_sharded_static_delivery_capability_not_ready/u);
    await assert.rejects(service.asset(version, f.proof.image.file), /nightlight_sharded_static_delivery_capability_not_ready/u);
    const drift = [
      (r: ShardedNightLightDataset) => { r.radianceSha256 = "0".repeat(64); },
      (r: ShardedNightLightDataset) => { r.coverageSha256 = "0".repeat(64); },
      (r: ShardedNightLightDataset) => { r.payload.policySha256 = "0".repeat(64); },
      (r: ShardedNightLightDataset) => { r.payload.minimumCloudFreeObservations++; },
      (r: ShardedNightLightDataset) => { r.source.title = "Changed DB source"; r.payload.source = structuredClone(r.source); r.payload.productName = r.source.title; },
    ];
    for (const mutate of drift) {
      record = structuredClone(valid); mutate(record);
      await assert.rejects(service.preparedWindow(version, key), /nightlight_sharded_database_root_mismatch/u,
        "an existing root cache cannot hide a changed DB publication identity");
    }
    record = structuredClone(valid); assert.ok(await service.preparedWindow(version, key));
    const aborted = new AbortController(); aborted.abort(new Error("service_consumer_cancelled"));
    await assert.rejects(service.preparedWindow(version, key, aborted.signal), /service_consumer_cancelled/u);
  } finally { service.close(); }
  await assert.rejects(service.preparedWindow(version, key), /nightlight_service_closed/u);
}));

test("covering discovery uses the existing Service DB pin, read lifetime and public readiness boundary", async () => {
  const cover = { ...window, zoom: 12, x: 3344, y: 1782, columns: 3, rows: 3 };
  await fixture(async f => {
    let record: ShardedNightLightDataset | null = null;
    const service = new NightLightService({ async getPublishedDarkSkyDataset(v) { return v === version ? record : null; } }, f.serviceRoot);
    const requested = "12-3344-1782-3-2";
    try {
      assert.equal(await service.preparedCoveringWindow(version, requested), null);
      const valid = await databaseRecord(f); record = structuredClone(valid);
      assert.equal(await service.preparedWindow(version, requested), null, "exact discovery is unchanged");
      const found = await service.preparedCoveringWindow(version, requested); assert.ok(found);
      assert.equal(found.key, displayRasterWindowKey(cover)); assert.deepEqual(found.proof, f.proof);
      assert.equal(found.authority, "PREPARED_ONLY"); assert.equal("imageUrl" in found, false); assert.equal("bytes" in found, false);
      await assert.rejects(service.layer(version, displayRasterWindowBounds(cover)), /nightlight_sharded_static_delivery_capability_not_ready/u);
      await assert.rejects(service.asset(version, f.display.proof.image.file), /nightlight_sharded_static_delivery_capability_not_ready/u);
      record.radianceSha256 = "0".repeat(64);
      await assert.rejects(service.preparedCoveringWindow(version, requested), /nightlight_sharded_database_root_mismatch/u);
      record = structuredClone(valid);
      const aborted = new AbortController(); aborted.abort(new Error("service_cover_cancelled"));
      await assert.rejects(service.preparedCoveringWindow(version, requested, aborted.signal), /service_cover_cancelled/u);
    } finally { service.close(); }
    await assert.rejects(service.preparedCoveringWindow(version, requested), /nightlight_service_closed/u);
  }, [cover]);
});
