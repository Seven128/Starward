import "reflect-metadata";
import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, readFile, rename, rm, writeFile } from "node:fs/promises";
import fs from "node:fs/promises";
import { syncBuiltinESMExports } from "node:module";
import path from "node:path";
import { tmpdir } from "node:os";
import { PNG } from "pngjs";
import { Module } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { FastifyAdapter } from "@nestjs/platform-fastify";
import { displayRasterWindowBounds, type DisplayRasterWindow } from "@starward/coordinate-system";
import { NIGHT_LIGHT_CONTRAST_DISPLAY } from "@starward/miniapp-contracts";
import { NightLightService } from "./night-light-service.ts";
import { PreparedNightLightWindows, type PreparedNightLightPublication } from "./night-light-prepared-window.ts";
import { readFixedNightLightInventory, readFixedNightLightProof, type FixedNightLightDataset, type FixedNightLightRaster } from "./night-light-publication.ts";
import { mapStaticHash, mapStaticSourceId, type MapStaticManifest } from "./map-static-manifest.ts";
import { createTestMiniappService } from "./test-fixtures/create-test-service.ts";
import { InMemoryTestRepository } from "./test-fixtures/in-memory-repository.ts";
import { createTestRuntimeConfig } from "./runtime-config.ts";
import { MiniappController } from "./controller.ts";
import { MiniappService } from "./miniapp-service.ts";
import { fastifyDeploymentOptions } from "./release-metadata.ts";

const w: DisplayRasterWindow = { grid: "gcj02-mercator-pixel-centres-v1", tilePixels: 256, zoom: 11, x: 1672, y: 890, columns: 2, rows: 1 };
const view = (window: DisplayRasterWindow) => {
  const b = displayRasterWindowBounds(window), dx = (b.east - b.west) / window.columns, dy = b.north - b.south;
  return { west: b.west + dx * .2, east: b.east - dx * .2, south: b.south + dy * .3, north: b.north - dy * .3 };
};
type Input = {
  root: string; directory: string; record: FixedNightLightDataset; proofs: FixedNightLightRaster[];
  prepared: PreparedNightLightPublication; manifest: MapStaticManifest; proofPath: string; imagePath: string;
  fresh: (record?: FixedNightLightDataset, prepared?: PreparedNightLightPublication | null) => NightLightService;
};
async function fixture(run: (input: Input) => Promise<void>, partitioned = false) {
  const root = await mkdtemp(path.join(tmpdir(), "starward-nightlight-prepared-"));
  const services: NightLightService[] = [];
  try {
    // Use the real existing operator and its shared public synthetic source
    // fixture. The test supplies no copied manifest or second producer.
    const [{ nightLightFixture }, { prepareMapStaticBundle }] = await Promise.all([
      import(new URL("../../../tools/deployment/map-static-test-support.mjs", import.meta.url).href),
      import(new URL("../../../tools/deployment/map-static-bundle.mjs", import.meta.url).href),
    ]);
    const publication = await nightLightFixture(root, { columns: 3 });
    const bundle = await prepareMapStaticBundle({ publications: [{ ...publication,
      displayWindowTargets: [{ name: "existing public fixture cross-cell viewport", boundsGcj02: view(w) }] }],
    outputDirectory: path.join(root, "sealed-map"), ...(partitioned ? { indexLayout: "partitioned" } : {}) });
    const record = publication.publishedRecord.record as FixedNightLightDataset;
    const inventory = await readFixedNightLightInventory(publication.directory, record), proofs = [];
    for (const entry of inventory.assets) proofs.push(await readFixedNightLightProof(publication.directory, record, entry));
    const prepared = { directory: bundle.directory, publicationHash: bundle.publicationHash };
    const manifest = (partitioned ? bundle : JSON.parse(await readFile(path.join(prepared.directory, "index.json"), "utf8"))) as MapStaticManifest;
    const source = manifest.sources.find(source => source.family === "night-light")!;
    const windowEntry = source.metadata.find(entry => entry.file.startsWith("nightlight-v2-window-"))!;
    const proofPath = path.join(prepared.directory, "publications", mapStaticSourceId(source), windowEntry.file);
    const fresh = (selected = record, preparedPublication: PreparedNightLightPublication | null = prepared) => {
      const service = new NightLightService({ async getPublishedDarkSkyDataset(version) { return version === selected.datasetVersion ? selected : null; } },
        root, preparedPublication);
      services.push(service); return service;
    };
    await run({ root, directory: publication.directory, record, proofs, prepared, manifest, proofPath,
      imagePath: proofPath.slice(0, -5), fresh });
  } finally {
    services.forEach(service => service.close());
    assert.equal(path.dirname(root), path.resolve(tmpdir()));
    assert.ok(path.basename(root).startsWith("starward-nightlight-prepared-"));
    await rm(root, { recursive: true, force: true });
  }
}
const filename = (layer: Awaited<ReturnType<NightLightService["layer"]>>) => path.basename(layer!.raster!.imageUrl);

for (const partitioned of [false, true]) test(`${partitioned ? "partitioned" : "flat"}: sealed prepared window and fixed URLs serve exactly the original published metadata/PNG without calling the live producer`, async t => fixture(async input => {
  const { record, proofs, fresh, directory } = input, original = fresh(record, null);
  const expected = await original.layer(record.datasetVersion, view(w)); assert.ok(expected?.raster);
  const expectedAsset = await original.asset(record.datasetVersion, filename(expected)); assert.ok(expectedAsset);
  const fixed = await original.asset(record.datasetVersion, proofs[0].image.file); assert.ok(fixed);
  for (const proof of proofs) await rename(path.join(directory, proof.image.file), path.join(directory, proof.image.file + ".source-disabled"));
  const encode = t.mock.method(PNG.sync, "write", () => { throw new Error("live_nightlight_composition_forbidden"); });
  const service = fresh(), actual = await service.layer(record.datasetVersion, view(w));
  assert.deepEqual(actual, expected);
  assert.deepEqual(await service.asset(record.datasetVersion, filename(expected)), expectedAsset);
  assert.deepEqual(await fresh().asset(record.datasetVersion, filename(expected)), expectedAsset, "old immutable composed URL works without a warm metadata cache");
  assert.deepEqual(await service.asset(record.datasetVersion, proofs[0].image.file), fixed, "existing fixed URL is unchanged");
  assert.equal(encode.mock.callCount(), 0);
  assert.equal(await service.asset(record.datasetVersion, filename(expected).replace(/-[a-f0-9]{64}\.png$/u, `-${"0".repeat(64)}.png`)), null);
}, partitioned));

test("contrast display consumes the verified prepared image without changing the prepared publication or its V1 URL", async () => fixture(async ({ record, proofs, fresh, directory, imagePath }) => {
  const service = fresh(), original = await service.layer(record.datasetVersion, view(w)); assert.ok(original?.raster);
  const sealedBefore = await readFile(imagePath), oldAsset = await service.asset(record.datasetVersion, filename(original)); assert.ok(oldAsset);
  for (const proof of proofs) await rename(path.join(directory, proof.image.file), path.join(directory, proof.image.file + ".source-disabled"));
  const display = await service.layer(record.datasetVersion, view(w), undefined, NIGHT_LIGHT_CONTRAST_DISPLAY.styleVersion); assert.ok(display?.raster);
  const asset = await service.asset(record.datasetVersion, filename(display)); assert.ok(asset);
  assert.notDeepEqual(asset.bytes, oldAsset.bytes);
  assert.equal(display.raster.displaySource?.imageSha256, original.raster.imageSha256);
  assert.deepEqual(display.raster.qualitySummary, original.raster.qualitySummary);
  assert.deepEqual(await readFile(imagePath), sealedBefore);
  assert.deepEqual((await fresh().asset(record.datasetVersion, filename(display)))?.bytes, asset.bytes);
  assert.deepEqual((await service.asset(record.datasetVersion, filename(original)))?.bytes, oldAsset.bytes);
}));

test("the public Map and asset controllers deliver the requested display with its real immutable bytes and retain default V1", async () => fixture(async ({ record, root, prepared }) => {
  const repository = new InMemoryTestRepository();
  Object.defineProperty(repository, "kind", { value: "postgres" });
  Object.defineProperty(repository, "getPublishedDarkSkyDataset", { value: async () => record });
  const service = createTestMiniappService({ repository, config: createTestRuntimeConfig({ storageMode: "POSTGRES",
    darkSkyDatasetVersion: record.datasetVersion, nightLightPublicationRoot: root, mapStaticPublication: prepared }) });
  class TestModule {}
  Module({ controllers: [MiniappController], providers: [{ provide: MiniappService, useValue: service }] })(TestModule);
  const adapter = new FastifyAdapter(fastifyDeploymentOptions({ origins: [], trustedProxyCidrs: [] }));
  const app = await NestFactory.create(TestModule, adapter, { logger: false });
  try {
    await app.init(); await adapter.getInstance().ready();
    const bounds = view(w), query = new URLSearchParams({ centerLat: String((bounds.north + bounds.south) / 2),
      centerLng: String((bounds.east + bounds.west) / 2), zoom: "11",
      viewportBounds: [bounds.west, bounds.south, bounds.east, bounds.north].join(",") });
    const endpoint = `/v2/map/night-light?${query}`, http = adapter.getInstance();
    const originalReply = await http.inject({ method: "GET", url: endpoint }); assert.equal(originalReply.statusCode, 200);
    const original = originalReply.json().data;
    const originalBytes = await http.inject({ method: "GET", url: original.raster.imageUrl }); assert.equal(originalBytes.statusCode, 200);
    const changedReply = await http.inject({ method: "GET", url: `${endpoint}&displayStyle=${NIGHT_LIGHT_CONTRAST_DISPLAY.styleVersion}` });
    assert.equal(changedReply.statusCode, 200);
    const changed = changedReply.json().data;
    assert.equal(changed.raster.styleVersion, NIGHT_LIGHT_CONTRAST_DISPLAY.styleVersion);
    assert.equal(changed.raster.displaySource.imageSha256, original.raster.imageSha256);
    assert.deepEqual(changed.raster.qualitySummary, original.raster.qualitySummary);
    const actual = await http.inject({ method: "GET", url: changed.raster.imageUrl }); assert.equal(actual.statusCode, 200);
    assert.match(String(actual.headers["content-type"]), /^image\/png/u);
    assert.match(String(actual.headers["cache-control"]), /immutable/u);
    assert.equal(mapStaticHash(actual.rawPayload), changed.raster.imageSha256);
    assert.equal(actual.rawPayload.length, changed.raster.imageBytes);
    assert.notDeepEqual(actual.rawPayload, originalBytes.rawPayload);
    assert.deepEqual((await http.inject({ method: "GET", url: endpoint })).json().data, original);
    assert.deepEqual((await http.inject({ method: "GET", url: original.raster.imageUrl })).rawPayload, originalBytes.rawPayload);
  } finally { await app.close(); }
}));

test("an undeclared window keeps bounded original composition and its immutable URL after cache loss", async t => fixture(async ({ record, fresh }) => {
  const bounds = view({ ...w, x: w.x + 1 }), original = fresh(record, null);
  const expected = await original.layer(record.datasetVersion, bounds); assert.ok(expected?.raster);
  const expectedAsset = await original.asset(record.datasetVersion, filename(expected)); assert.ok(expectedAsset);
  const write = PNG.sync.write, encode = t.mock.method(PNG.sync, "write", (...args: Parameters<typeof write>) => write(...args));
  const service = fresh(), actual = await service.layer(record.datasetVersion, bounds);
  assert.deepEqual(actual, expected); assert.equal(encode.mock.callCount(), 1);
  assert.deepEqual(await fresh().asset(record.datasetVersion, filename(expected)), expectedAsset);
  assert.equal(encode.mock.callCount(), 2);
}));

test("MiniappService wires the selected sealed publication through its existing public Map and asset consumers", async t => fixture(async ({ record, fresh, root, directory, proofs, prepared }) => {
  const original = fresh(record, null), bounds = view(w), expected = await original.layer(record.datasetVersion, bounds);
  assert.ok(expected?.raster);
  const expectedAsset = await original.asset(record.datasetVersion, filename(expected)); assert.ok(expectedAsset);
  for (const proof of proofs) await rename(path.join(directory, proof.image.file), path.join(directory, proof.image.file + ".disabled"));
  const encode = t.mock.method(PNG.sync, "write", () => { throw new Error("live_nightlight_composition_forbidden"); });
  const repository = new InMemoryTestRepository();
  Object.defineProperty(repository, "kind", { value: "postgres" });
  Object.defineProperty(repository, "getPublishedDarkSkyDataset", { value: async () => record });
  let weatherCalls = 0;
  const service = createTestMiniappService({ repository, config: createTestRuntimeConfig({ storageMode: "POSTGRES",
    darkSkyDatasetVersion: record.datasetVersion, nightLightPublicationRoot: root, mapStaticPublication: prepared }),
  weather: { key: "prepared-static-does-not-read-weather", async getHourly() { weatherCalls++; throw new Error("unexpected_weather_read"); } } });
  try {
    const layer = await service.getMapNightLight({ viewport: { bounds, zoom: 11,
      center: { latitude: (bounds.north + bounds.south) / 2, longitude: (bounds.east + bounds.west) / 2 } } });
    assert.deepEqual(layer.data, expected);
    assert.deepEqual(await service.getNightLightAsset(record.datasetVersion, filename(expected)), expectedAsset);
    assert.equal(weatherCalls, 0); assert.equal(encode.mock.callCount(), 0);
  } finally { await service.onModuleDestroy(); }
}));

test("missing or corrupt declared prepared bytes fail instead of silently recomposing, then recover on the same service", async t => fixture(async ({ record, fresh, imagePath }) => {
  const bytes = await readFile(imagePath), changed = Buffer.from(bytes); changed[changed.length - 1] ^= 1;
  const encode = t.mock.method(PNG.sync, "write", () => { throw new Error("unexpected_live_composition"); });
  const service = fresh(); await writeFile(imagePath, changed);
  await assert.rejects(service.layer(record.datasetVersion, view(w)), /nightlight_prepared_file_identity_invalid/u);
  await writeFile(imagePath, bytes);
  const layer = await service.layer(record.datasetVersion, view(w)); assert.ok(layer?.raster);
  assert.deepEqual((await service.asset(record.datasetVersion, filename(layer)))?.bytes, bytes);
  const missing = fresh(); await rename(imagePath, imagePath + ".missing");
  await assert.rejects(missing.layer(record.datasetVersion, view(w)), /ENOENT/u);
  await rename(imagePath + ".missing", imagePath);
  assert.deepEqual((await missing.asset(record.datasetVersion, filename(layer)))?.bytes, bytes);
  assert.equal(encode.mock.callCount(), 0);
}));

test("the DB inventory remains authoritative even for a same-version sealed window", async t => fixture(async ({ record, fresh, directory, proofPath }) => {
  const inventoryPath = path.join(directory, "inventory.json"), inventory = JSON.parse(await readFile(inventoryPath, "utf8"));
  inventory.createdAt = "2026-10-18T00:00:00Z";
  const raw = JSON.stringify(inventory); await writeFile(inventoryPath, raw);
  const changed = { ...record, payload: { ...record.payload, rasterInventory: { ...record.payload.rasterInventory, sha256: mapStaticHash(raw) } } };
  await assert.rejects(fresh(record, null).layer(record.datasetVersion, view(w)), /nightlight_file_hash_invalid/u);
  const encode = t.mock.method(PNG.sync, "write", () => { throw new Error("unprepared_new_inventory_composition"); });
  await assert.rejects(fresh(changed).layer(changed.datasetVersion, view(w)), /unprepared_new_inventory_composition/u);
  assert.equal(encode.mock.callCount(), 1, "a mismatched sealed inventory cannot supply even identical-looking prepared pixels");
  const oldFilename = JSON.parse(await readFile(proofPath, "utf8")).image.file;
  assert.equal(await fresh(changed).asset(record.datasetVersion, oldFilename), null, "the old window URL cannot switch to a different DB inventory");
}));

test("configured seal rejects a self-rehashed index, and original-cell metadata rejects altered quality even under a selected seal", async () => fixture(async ({ record, fresh, prepared, manifest, proofPath }) => {
  const changed = structuredClone(manifest), source = changed.sources.find(source => source.family === "night-light")!;
  const entry = source.metadata.find(entry => entry.file.startsWith("nightlight-v2-window-"))!;
  const proof = JSON.parse(await readFile(proofPath, "utf8")); proof.quality.validZeroPixelCount = 1;
  const raw = JSON.stringify(proof); await writeFile(proofPath, raw);
  entry.bytes = Buffer.byteLength(raw); entry.sha256 = mapStaticHash(raw);
  changed.publicationHash = mapStaticHash(JSON.stringify({ sources: changed.sources, records: changed.records }));
  await writeFile(path.join(prepared.directory, "index.json"), JSON.stringify(changed));
  await assert.rejects(fresh().layer(record.datasetVersion, view(w)), /nightlight_prepared_publication_mismatch/u);
  await assert.rejects(fresh(record, { ...prepared, publicationHash: changed.publicationHash }).layer(record.datasetVersion, view(w)), /nightlight_prepared_proof_mismatch/u);
}));

test("cancellation after actual prepared read cannot install a completed window", async t => fixture(async ({ record, fresh, imagePath }) => {
  let readDone!: () => void, resume!: () => void;
  const observed = new Promise<void>(resolve => { readDone = resolve; }), gate = new Promise<void>(resolve => { resume = resolve; });
  const read = PreparedNightLightWindows.prototype.read;
  const intercepted = t.mock.method(PreparedNightLightWindows.prototype, "read", async function (this: PreparedNightLightWindows, ...args: Parameters<typeof read>) {
    const result = await read.apply(this, args); readDone(); await gate; return result;
  });
  const service = fresh(), controller = new AbortController();
  const cancelled = service.layer(record.datasetVersion, view(w), controller.signal);
  await observed; controller.abort(new Error("consumer_cancelled_after_prepared_read"));
  await assert.rejects(cancelled, /consumer_cancelled_after_prepared_read/u);
  intercepted.mock.restore();
  const bytes = await readFile(imagePath), changed = Buffer.from(bytes); changed[changed.length - 1] ^= 1;
  await writeFile(imagePath, changed); resume();
  await assert.rejects(service.layer(record.datasetVersion, view(w)), /nightlight_prepared_file_identity_invalid/u,
    "the cancelled success must not be served from the completed window cache");
  await writeFile(imagePath, bytes);
  assert.ok((await service.layer(record.datasetVersion, view(w)))?.raster);
}));

test("release proof reads overlap at most two, fail atomically, drain and recover for all consumers", { timeout: 10_000 }, async t => fixture(async ({ record, fresh, directory, proofs }) => {
  const expected = await fresh().layer(record.datasetVersion, view(w)); assert.ok(expected?.raster);
  const files = new Set(proofs.map(proof => path.join(directory, proof.image.file + ".json")));
  let openFirst!: () => void, openSecond!: () => void, twoStarted!: () => void, peerCancelled!: () => void;
  const first = new Promise<void>(resolve => { openFirst = resolve; }), second = new Promise<void>(resolve => { openSecond = resolve; });
  const started = new Promise<void>(resolve => { twoStarted = resolve; });
  const cancelled = new Promise<void>(resolve => { peerCancelled = resolve; });
  const originalRead = fs.readFile;
  let reads = 0, active = 0, peak = 0, settled = false;
  const intercepted = t.mock.method(fs, "readFile", async (...args: Parameters<typeof readFile>) => {
    if (!files.has(String(args[0]))) return originalRead(...args);
    const index = reads++; active++; peak = Math.max(peak, active);
    if (reads === 2) twoStarted();
    try {
      const raw = await originalRead(...args);
      if (index === 0) {
        await first;
        const damaged = Buffer.from(raw); damaged[damaged.length - 1] ^= 1;
        return damaged;
      }
      // Deliberately hold an already-read peer after cancellation: failure must
      // not expose a release or permit a retry while this reader is still live.
      if (index === 1) {
        const signal = (args[1] as { signal?: AbortSignal } | undefined)?.signal;
        if (signal?.aborted) peerCancelled();
        else signal?.addEventListener("abort", peerCancelled, { once: true });
        await second;
      }
      return raw;
    } finally { active--; }
  });
  syncBuiltinESMExports();
  const service = fresh();
  const pending = Promise.allSettled(Array.from({ length: 4 }, () => service.layer(record.datasetVersion, view(w))))
    .then(result => { settled = true; return result; });
  try {
    await started; assert.equal(active, 2); assert.equal(peak, 2);
    openFirst(); await cancelled;
    assert.equal(settled, false, "the failed release waits for its in-flight peer to retire");
    assert.equal(reads, 2, "a failed proof must not start the remaining inventory entries");
    openSecond();
    const failed = await pending;
    assert.ok(failed.every(result => result.status === "rejected" && /nightlight_file_hash_invalid/u.test(String(result.reason))));
    assert.equal(active, 0); assert.equal(peak, 2); assert.equal(reads, 2);
  } finally {
    openFirst(); openSecond(); await pending;
    intercepted.mock.restore(); syncBuiltinESMExports();
  }
  const recovered = await service.layer(record.datasetVersion, view(w));
  assert.deepEqual(recovered, expected, "the same service retries the complete original inventory after a failed release");
}));
