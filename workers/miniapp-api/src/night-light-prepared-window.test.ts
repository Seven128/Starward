import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, readFile, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { tmpdir } from "node:os";
import { PNG } from "pngjs";
import { displayRasterWindowBounds, type DisplayRasterWindow } from "@starward/coordinate-system";
import { NightLightService } from "./night-light-service.ts";
import { PreparedNightLightWindows, type PreparedNightLightPublication } from "./night-light-prepared-window.ts";
import { readFixedNightLightInventory, readFixedNightLightProof, type FixedNightLightDataset, type FixedNightLightRaster } from "./night-light-publication.ts";
import { mapStaticHash, mapStaticSourceId, type MapStaticManifest } from "./map-static-manifest.ts";
import { createTestMiniappService } from "./test-fixtures/create-test-service.ts";
import { InMemoryTestRepository } from "./test-fixtures/in-memory-repository.ts";
import { createTestRuntimeConfig } from "./runtime-config.ts";

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
async function fixture(run: (input: Input) => Promise<void>) {
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
    outputDirectory: path.join(root, "sealed-map") });
    const record = publication.publishedRecord.record as FixedNightLightDataset;
    const inventory = await readFixedNightLightInventory(publication.directory, record), proofs = [];
    for (const entry of inventory.assets) proofs.push(await readFixedNightLightProof(publication.directory, record, entry));
    const prepared = { directory: bundle.directory, publicationHash: bundle.publicationHash };
    const manifest = JSON.parse(await readFile(path.join(prepared.directory, "index.json"), "utf8")) as MapStaticManifest;
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

test("sealed prepared window and fixed URLs serve exactly the original published metadata/PNG without calling the live producer", async t => fixture(async input => {
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
