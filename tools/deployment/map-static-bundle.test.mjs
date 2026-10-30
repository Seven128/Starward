import assert from "node:assert/strict";
import test from "node:test";
import { cp, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { tmpdir } from "node:os";
import { terrainFixture, nightLightFixture, cloudFixture, shardedNightLightFixture } from "./map-static-test-support.mjs";
import { prepareMapStaticBundle, validateMapStaticBundle, restoreMapStaticBundle, discoverMapStaticBundle, validMapStaticRoute } from "./map-static-bundle.mjs";
import { skyStaticHash } from "./sky-static-bundle.mjs";
import { tsImport } from "tsx/esm/api";
import { PNG } from "pngjs";
import { readMapPublication } from "./map-publication-inputs.mjs";

test("sharded EOG seals existing contrast pixels and nested controls, preserving old delivery and isolated recovery", async t => {
  const root = await mkdtemp(path.join(tmpdir(), "starward-map-eog-static-test-"));
  t.after(async () => { assert.equal(path.dirname(root), path.resolve(tmpdir())); await rm(root, { recursive: true, force: true }); });
  const light = await nightLightFixture(root), sharded = await shardedNightLightFixture(root);
  const sourceBefore = await readFile(path.join(sharded.directory, sharded.entry.image.file));
  const first = await prepareMapStaticBundle({ publications: [light], outputDirectory: path.join(root, "legacy") });
  const fragment = await readFile(path.join(first.directory, "delivery.caddy"));
  const bundle = await prepareMapStaticBundle({ publications: [sharded], previousDirectories: [first.directory], outputDirectory: path.join(root, "eog") });
  const source = bundle.sources.find(item => item.publicationVersion.startsWith("nightlight-sharded:"));
  assert.equal(source.admission, "DEVELOPMENT_ONLY"); assert.equal(bundle.files, first.files + 1);
  assert.deepEqual(await readFile(path.join(bundle.directory, "delivery.caddy")), fragment);
  for (const record of first.records) assert.deepEqual(bundle.records.find(item => item.route === record.route), record);
  const final = bundle.records.find(record => record.route.includes("nightlight-contrast-v1-window-"));
  assert.match(final.headers["x-starward-night-light-publication"], /^nightlight-display:[a-f0-9]{64}$/u);
  assert.deepEqual(await readFile(path.join(bundle.directory, `files${final.route}`)), await readFile(path.join(sharded.directory, sharded.entry.display.image.file)));
  assert.ok(source.metadata.some(entry => entry.file === sharded.entry.image.file));
  assert.ok(source.metadata.every(entry => !entry.file.endsWith(".tif") && entry.file !== "published-record.json"));
  const restored = await restoreMapStaticBundle({ bundleDirectory: bundle.directory, outputDirectory: path.join(root, "restored"), publicationHash: bundle.publicationHash });
  assert.equal(restored.publicationHash, bundle.publicationHash); assert.equal(restored.databaseRestored, false);
  const oldPrepared = await prepareMapStaticBundle({ publications: [sharded], indexLayout: "flat", outputDirectory: path.join(root, "old-prepared-v1") });
  const restoredOld = await restoreMapStaticBundle({ bundleDirectory: oldPrepared.directory, outputDirectory: path.join(root, "restored-old-v1"), publicationHash: oldPrepared.publicationHash });
  assert.equal(restoredOld.publicationHash, oldPrepared.publicationHash);
  assert.equal(restoredOld.schemaVersion, "starward-map-static-export-v1", "exact recovery must not silently upgrade old prepared seals");
  const upgraded = await prepareMapStaticBundle({ publications: [], previousDirectories: [oldPrepared.directory], outputDirectory: path.join(root, "upgraded-v1") });
  assert.equal(upgraded.schemaVersion, "starward-map-static-export-v2");
  assert.deepEqual(upgraded.records, oldPrepared.records);
  assert.deepEqual(await readFile(path.join(sharded.directory, sharded.entry.image.file)), sourceBefore);
  await assert.rejects(readMapPublication({ ...sharded, nightLightSharded: { ...sharded.nightLightSharded, sha256: "0".repeat(64) } }), /file_identity_invalid/u);
  await assert.rejects(readMapPublication({ ...sharded, publishedRecord: light.publishedRecord }), /sharded_input_invalid/u);
  await assert.rejects(readMapPublication({ ...sharded, nightLightSharded: Object.assign([], sharded.nightLightSharded) }), /root_pin_required/u);
  const bad = path.join(root, "fake-qualified"); await cp(bundle.directory, bad, { recursive: true });
  const index = JSON.parse(await readFile(path.join(bad, "index.json"), "utf8"));
  index.sources.find(item => item.publicationVersion.startsWith("nightlight-sharded:")).admission = "QUALIFIED";
  index.publicationHash = skyStaticHash(JSON.stringify({ sources: index.sources, recordPages: index.recordPages }));
  await writeFile(path.join(bad, "index.json"), JSON.stringify(index));
  await assert.rejects(validateMapStaticBundle(bad), /source_invalid/u);
});

test("sharded EOG admission rejects self-consistently rehashed wrong RGBA and bad CRC", async t => {
  const root = await mkdtemp(path.join(tmpdir(), "starward-map-eog-pixel-test-"));
  t.after(async () => { assert.equal(path.dirname(root), path.resolve(tmpdir())); await rm(root, { recursive: true, force: true }); });
  for (const displayMutation of ["pixel", "crc"]) {
    const child = path.join(root, displayMutation); await (await import("node:fs/promises")).mkdir(child);
    const sharded = await shardedNightLightFixture(child, { displayMutation });
    await assert.rejects(readMapPublication(sharded), displayMutation === "pixel" ? /nightlight_display_pixel_mismatch/u : /nightlight_display_png_invalid/u);
  }
});

test("sharded EOG static admission rejects a rehashed quality count inconsistent with actual valid PNG support", async t => {
  const root = await mkdtemp(path.join(tmpdir(), "starward-map-eog-quality-test-"));
  t.after(async () => { assert.equal(path.dirname(root), path.resolve(tmpdir())); await rm(root, { recursive: true, force: true }); });
  const sharded = await shardedNightLightFixture(root, { qualityMutation: true });
  await assert.rejects(readMapPublication(sharded), /nightlight_display_quality_invalid/u);
});

test("finite sharded windows compose complete cells across parts, retain pixels and restore the same sealed identity", async t => {
  const root = await mkdtemp(path.join(tmpdir(), "starward-map-eog-cross-part-"));
  t.after(async () => { assert.equal(path.dirname(root), path.resolve(tmpdir())); await rm(root, { recursive: true, force: true }); });
  const sharded = await shardedNightLightFixture(root, { cells: [{ firstColumn: 0, bandIndex: 0 },
    { firstColumn: 1, bandIndex: 4, missingPixels: 13 }] });
  assert.equal(Object.keys(sharded.index.parts).length, 2);
  const coordinates = await tsImport("../../packages/coordinate-system/src/index.ts", import.meta.url);
  const bounds = coordinates.displayRasterWindowBounds({ ...sharded.entry.window, columns: 2 });
  const target = { name: "finite cross-part image", boundsGcj02: { west: bounds.west + .0001, east: bounds.east - .0001,
    south: bounds.south + .0001, north: bounds.north - .0001 } };
  const untouched = new Map();
  for (const file of ["index.json", ...sharded.entries.flatMap(entry => [entry.proof.file, entry.image.file, entry.display.image.file])])
    untouched.set(file, await readFile(path.join(sharded.directory, file)));
  const control = new AbortController();
  const input = await readMapPublication({ ...sharded, displayWindowTargets: [target, target], signal: control.signal });
  assert.equal(input.records.length, 3, "duplicate declarations must not duplicate derived image work");
  assert.equal(input.metadata.filter(entry => entry.file.startsWith("windows/")).length, 4);
  control.abort(new Error("cancelled finite preparation"));
  await assert.rejects(input.metadata.find(entry => entry.file.startsWith("windows/") && entry.file.endsWith(".png")).readBytes(), /cancelled finite preparation/u);
  const bundle = await prepareMapStaticBundle({ publications: [{ ...sharded, displayWindowTargets: [target] }], outputDirectory: path.join(root, "sealed") });
  assert.equal(bundle.schemaVersion, "starward-map-static-export-v2");
  assert.equal(bundle.files, 3); assert.equal(bundle.runtimeActivated, false);
  const source = bundle.sources[0], { mapStaticSourceId } = await tsImport("../../workers/miniapp-api/src/map-static-manifest.ts", import.meta.url);
  assert.equal(source.admission, "DEVELOPMENT_ONLY");
  assert.deepEqual(source.displayWindowTargets, [target]);
  const sourceRoot = path.join(bundle.directory, "publications", mapStaticSourceId(source));
  const composed = bundle.records.find(record => record.route.includes("-11-1672-890-2-1-")); assert.ok(composed);
  const proofFile = source.metadata.find(entry => entry.file.startsWith("windows/nightlight-contrast-") && entry.file.endsWith(".json"));
  const finalProof = JSON.parse(await readFile(path.join(sourceRoot, proofFile.file), "utf8"));
  const legacyFile = source.metadata.find(entry => entry.file.startsWith("windows/nightlight-v2-") && entry.file.endsWith(".png"));
  const legacyProof = JSON.parse(await readFile(path.join(sourceRoot, legacyFile.file + ".json"), "utf8"));
  const legacy = PNG.sync.read(await readFile(path.join(sourceRoot, legacyFile.file)));
  const final = PNG.sync.read(await readFile(path.join(bundle.directory, `files${composed.route}`)));
  assert.equal(final.width, 512); assert.equal(final.height, 256);
  assert.deepEqual(finalProof.grid.boundsGcj02, bounds);
  assert.equal(finalProof.quality.validPixelCount, 131072 - 13);
  assert.equal(finalProof.quality.validZeroPixelCount, 65536);
  assert.equal(finalProof.quality.qualityMaskCounts["5"], 13);
  assert.equal(finalProof.displaySource.imageSha256, legacyFile.sha256);
  assert.equal(legacyProof.numeric, undefined, "a composed image is not another numerical publication");
  assert.ok(finalProof.image.file.includes(sharded.nightLightSharded.sha256));
  for (const [column, entry] of sharded.entries.entries()) {
    const expectedSource = PNG.sync.read(untouched.get(entry.image.file));
    const expectedFinal = PNG.sync.read(untouched.get(entry.display.image.file));
    for (let row = 0; row < 256; row++) {
      const offset = (row * 512 + column * 256) * 4;
      assert.deepEqual(legacy.data.subarray(offset, offset + 1024), expectedSource.data.subarray(row * 1024, (row + 1) * 1024));
      assert.deepEqual(final.data.subarray(offset, offset + 1024), expectedFinal.data.subarray(row * 1024, (row + 1) * 1024));
    }
  }
  assert.equal((await readFile(path.join(bundle.directory, "delivery.caddy"), "utf8")).includes(composed.route), false);
  const restored = await restoreMapStaticBundle({ bundleDirectory: bundle.directory, outputDirectory: path.join(root, "restored"), publicationHash: bundle.publicationHash });
  assert.equal(restored.publicationHash, bundle.publicationHash); assert.equal(restored.files, 3);
  for (const [file, bytes] of untouched) assert.deepEqual(await readFile(path.join(sharded.directory, file)), bytes);
  // Rehashing the outer seal cannot authorize altered derived control pixels.
  const bad = path.join(root, "bad-derived"); await cp(bundle.directory, bad, { recursive: true });
  const altered = PNG.sync.read(await readFile(path.join(bad, "publications", mapStaticSourceId(source), legacyFile.file)));
  altered.data[0] ^= 1; const raw = PNG.sync.write(altered);
  await writeFile(path.join(bad, "publications", mapStaticSourceId(source), legacyFile.file), raw);
  const sources = structuredClone(bundle.sources);
  Object.assign(sources[0].metadata.find(entry => entry.file === legacyFile.file), { bytes: raw.length, sha256: skyStaticHash(raw) });
  const content = { sources, records: bundle.records };
  await writeFile(path.join(bad, "index.json"), JSON.stringify({ schemaVersion: "starward-map-static-export-v1", publicationHash: skyStaticHash(JSON.stringify(content)), ...content }));
  await assert.rejects(validateMapStaticBundle(bad), /source_changed/u);
});

test("finite sharded targets reuse complete products and reject undeclared cells, oversized or invalid coverage and cancellation", async t => {
  const root = await mkdtemp(path.join(tmpdir(), "starward-map-eog-target-boundary-"));
  t.after(async () => { assert.equal(path.dirname(root), path.resolve(tmpdir())); await rm(root, { recursive: true, force: true }); });
  const sharded = await shardedNightLightFixture(root, { cells: [{ firstColumn: 0 }, { firstColumn: 2 }] });
  const coordinates = await tsImport("../../packages/coordinate-system/src/index.ts", import.meta.url);
  const targetFor = (window, inset = .0001) => {
    const b = coordinates.displayRasterWindowBounds(window);
    return { name: "declared target", boundsGcj02: { west: b.west + inset, east: b.east - inset,
      south: b.south + .0001, north: b.north - .0001 } };
  };
  const original = await readMapPublication(sharded), exact = targetFor(sharded.entry.window);
  const reused = await readMapPublication({ ...sharded, displayWindowTargets: [exact] });
  assert.deepEqual(reused.records, original.records);
  assert.equal(reused.metadata.some(entry => entry.file.startsWith("windows/")), false);
  const tileWidth = sharded.entry.boundsGcj02.east - sharded.entry.boundsGcj02.west;
  const gap = targetFor({ ...sharded.entry.window, columns: 3 }, tileWidth * .9);
  await assert.rejects(readMapPublication({ ...sharded, displayWindowTargets: [gap] }), /window_target_unpublished/u);
  const outer = targetFor({ ...sharded.entry.window, x: sharded.entry.window.x - 1, columns: 2 });
  await assert.rejects(readMapPublication({ ...sharded, displayWindowTargets: [outer] }), /window_target_unpublished/u);
  const tooWide = targetFor({ ...sharded.entry.window, columns: 5 });
  await assert.rejects(readMapPublication({ ...sharded, displayWindowTargets: [tooWide] }), /(?:nightlight_window_budget_exceeded|display_raster_window_invalid)/u);
  for (const targets of [[], Array(17).fill(exact), [{ ...exact, boundsGcj02: { ...exact.boundsGcj02, west: NaN } }], [{ ...exact, hidden: true }]])
    await assert.rejects(readMapPublication({ ...sharded, displayWindowTargets: targets }), /window_targets_invalid/u);
  await assert.rejects(readMapPublication({ ...sharded, displayWindowTargets: [exact], signal: AbortSignal.abort(new Error("cancelled before read")) }), /cancelled before read/u);
});

test("Map seals real publication owners and preserves old URLs/proofs across current and isolated recovery", async t => {
  const root = await mkdtemp(path.join(tmpdir(), "starward-map-static-test-"));
  t.after(async () => { assert.equal(path.dirname(root), path.resolve(tmpdir())); await rm(root, { recursive: true, force: true }); });
  const terrain = await terrainFixture(root), light = await nightLightFixture(root);
  const first = await prepareMapStaticBundle({ publications: [terrain, light], outputDirectory: path.join(root, "sealed1") });
  assert.equal(first.files, 3); assert.equal(first.runtimeActivated, false);
  assert.ok(first.records.every(record => validMapStaticRoute(record.route) && !record.route.includes("/sky/")));
  assert.equal(first.sources.length, 2);
  const before = await readFile(path.join(terrain.directory, "inventory.json"));
  const next = await terrainFixture(root, 300, terrain.directory);
  const second = await prepareMapStaticBundle({ publications: [next], previousDirectories: [first.directory], outputDirectory: path.join(root, "sealed2") });
  assert.equal(second.files, 5);
  for (const record of first.records) {
    assert.deepEqual(second.records.find(item => item.route === record.route), record);
    assert.deepEqual(await readFile(path.join(second.directory, `files${record.route}`)), await readFile(path.join(first.directory, `files${record.route}`)));
  }
  assert.deepEqual(await readFile(path.join(terrain.directory, "inventory.json")), before);
  const restored = await restoreMapStaticBundle({ bundleDirectory: second.directory, outputDirectory: path.join(root, "restore"), publicationHash: second.publicationHash });
  assert.equal(restored.publicationHash, second.publicationHash); assert.equal(restored.databaseRestored, false);
  assert.equal(restored.scientificNumericDataRestored, false); assert.equal(restored.runtimeActivated, false);
  await assert.rejects(discoverMapStaticBundle({ directory: restored.directory, publicationHash: "0".repeat(64) }), /publication_mismatch/u);
  await assert.rejects(prepareMapStaticBundle({ publications: [terrain], outputDirectory: path.join(terrain.directory, "bad-child") }), /overlaps_source/u);
  await assert.rejects(prepareMapStaticBundle({ publications: [{ ...light, publishedRecord: { ...light.publishedRecord, state: "DRAFT" } }], outputDirectory: path.join(root, "bad-draft") }), /published_record_required/u);
  await assert.rejects(prepareMapStaticBundle({ publications: [{ ...light, publishedRecord: { ...light.publishedRecord, privateUser: "forbidden" } }], outputDirectory: path.join(root, "bad-private") }), /published_record_invalid/u);
  // Self-consistently rehashing an index cannot authorize a renamed route.
  const bad = path.join(root, "tampered"); await cp(first.directory, bad, { recursive: true });
  const index = JSON.parse(await readFile(path.join(bad, "index.json"), "utf8"));
  index.records[0].sha256 = "f".repeat(64);
  index.publicationHash = skyStaticHash(JSON.stringify({ sources: index.sources, records: index.records }));
  await writeFile(path.join(bad, "index.json"), JSON.stringify(index));
  await assert.rejects(validateMapStaticBundle(bad), /index_source_mismatch/u);
  await writeFile(path.join(first.directory, `files${first.records[0].route}`), Buffer.from("corrupt"));
  await assert.rejects(validateMapStaticBundle(first.directory), /file_identity_mismatch/u);
});

test("finite adopted target bounds prepare the existing composed-light URL without changing numerical publications", async t => {
  const root = await mkdtemp(path.join(tmpdir(), "starward-map-window-test-"));
  t.after(async () => { assert.equal(path.dirname(root), path.resolve(tmpdir())); await rm(root, { recursive: true, force: true }); });
  const light = await nightLightFixture(root, { columns: 2 });
  const coordinates = await tsImport("../../packages/coordinate-system/src/index.ts", import.meta.url);
  const bounds = coordinates.displayRasterWindowBounds({ grid: "gcj02-mercator-pixel-centres-v1", tilePixels: 256, zoom: 11, x: 1672, y: 890, columns: 2, rows: 1 });
  const target = { name: "existing finite target declaration", boundsGcj02: { west: bounds.west + .001, east: bounds.east - .001,
    south: bounds.south + .001, north: bounds.north - .001 } };
  const originalInventory = await readFile(path.join(light.directory, "inventory.json"));
  const first = await prepareMapStaticBundle({ publications: [light], outputDirectory: path.join(root, "plain") });
  const extended = await prepareMapStaticBundle({ publications: [{ ...light, displayWindowTargets: [target] }],
    previousDirectories: [first.directory], outputDirectory: path.join(root, "windows") });
  assert.equal(first.files, 2); assert.equal(extended.files, 3);
  const composed = extended.records.find(record => record.route.includes("nightlight-v2-window-")); assert.ok(composed);
  assert.match(composed.headers["x-starward-night-light-publication"], /^nightlight-window:[a-f0-9]{64}$/u);
  const { NightLightService } = await tsImport("../../workers/miniapp-api/src/night-light-service.ts", import.meta.url);
  const service = new NightLightService({ async getPublishedDarkSkyDataset() { return light.publishedRecord.record; } }, root);
  try {
    const metadata = await service.layer(light.publishedRecord.record.datasetVersion, target.boundsGcj02);
    assert.equal(metadata.raster.imageUrl, composed.route);
    assert.equal(metadata.raster.imageSha256, composed.sha256);
    assert.equal(metadata.raster.imageBytes, composed.bytes);
    assert.equal(metadata.raster.validPixelCount, 131072);
    const asset = await service.asset(light.publishedRecord.record.datasetVersion, composed.route.split("/").at(-1));
    assert.deepEqual(asset.bytes, await readFile(path.join(extended.directory, `files${composed.route}`)));
  } finally { service.close(); }
  assert.deepEqual(await readFile(path.join(light.directory, "inventory.json")), originalInventory);
  const restored = await restoreMapStaticBundle({ bundleDirectory: extended.directory, outputDirectory: path.join(root, "restored"), publicationHash: extended.publicationHash });
  assert.equal(restored.files, 3); assert.equal(restored.publicationHash, extended.publicationHash);
});

test("cloud static preparation retains original bytes and sealed development admission without a business-host route", async t => {
  const root = await mkdtemp(path.join(tmpdir(), "starward-map-cloud-static-test-"));
  t.after(async () => { assert.equal(path.dirname(root), path.resolve(tmpdir())); await rm(root, { recursive: true, force: true }); });
  const cloud = await cloudFixture(root); t.after(() => cloud.dispose());
  const terrain = await terrainFixture(root), light = await nightLightFixture(root);
  const first = await prepareMapStaticBundle({ publications: [terrain, light], outputDirectory: path.join(root, "legacy") });
  const previousFragment = await readFile(path.join(first.directory, "delivery.caddy"));
  const before = await readFile(path.join(cloud.directory, "inventory.json"));
  const bundle = await prepareMapStaticBundle({ publications: [cloud], previousDirectories: [first.directory], outputDirectory: path.join(root, "cloud") });
  assert.equal(bundle.files, first.files + cloud.inventory.records.length);
  const selected = bundle.sources.find(source => source.family === "cloud");
  const rootIndex = JSON.parse(await readFile(path.join(bundle.directory, "index.json"), "utf8"));
  assert.equal(rootIndex.schemaVersion, "starward-map-static-export-v2");
  assert.equal(rootIndex.records, undefined);
  assert.ok(rootIndex.sources.every(source => source.metadata === undefined && source.metadataPages.length));
  assert.equal(selected.admission, "DEVELOPMENT_ONLY");
  assert.equal(selected.sourceManifestSha256, cloud.cloudSource.manifestSha256);
  assert.deepEqual(await readFile(path.join(bundle.directory, "delivery.caddy")), previousFragment);
  assert.ok(bundle.records.filter(record => record.route.startsWith("/v2/cloud/")).every(record =>
    validMapStaticRoute(record.route) && record.route.startsWith(`/v2/cloud/assets/${cloud.cloudSource.manifestSha256}/`) &&
    record.headers["x-starward-cloud-publication"] === `cloud-display:${record.route.split("/").at(-1).slice(6, -4)}`));
  for (const record of first.records) assert.deepEqual(bundle.records.find(item => item.route === record.route), record);
  const sourceRoot = path.join(bundle.directory, "publications/cloud", selected.publicationVersion.split(":")[1]);
  assert.deepEqual(await readFile(path.join(sourceRoot, "source-manifest.json")), await readFile(path.join(cloud.cloudSource.directory, "manifest.json")));
  for (const record of cloud.inventory.records) {
    assert.deepEqual(await readFile(path.join(sourceRoot, record.file)), await readFile(path.join(cloud.directory, record.file)));
    assert.deepEqual(await readFile(path.join(sourceRoot, record.file + ".json")), await readFile(path.join(cloud.directory, record.file + ".json")));
  }
  assert.deepEqual(await readFile(path.join(cloud.directory, "inventory.json")), before);
  const restored = await restoreMapStaticBundle({ bundleDirectory: bundle.directory, outputDirectory: path.join(root, "restore"), publicationHash: bundle.publicationHash });
  assert.equal(restored.publicationHash, bundle.publicationHash); assert.equal(restored.databaseRestored, false);
  const tampered = path.join(root, "fake-qualified"); await cp(bundle.directory, tampered, { recursive: true });
  const index = JSON.parse(await readFile(path.join(tampered, "index.json"), "utf8"));
  index.sources.find(source => source.family === "cloud").admission = "QUALIFIED";
  index.publicationHash = skyStaticHash(JSON.stringify({ sources: index.sources, recordPages: index.recordPages }));
  await writeFile(path.join(tampered, "index.json"), JSON.stringify(index));
  await assert.rejects(validateMapStaticBundle(tampered), /source_invalid/u);
  await assert.rejects(readMapPublication({ ...cloud, cloudSource: { ...cloud.cloudSource, manifestSha256: "0".repeat(64) } }), /source_identity_invalid/u);
  await assert.rejects(readMapPublication({ ...cloud, cloudSource: Object.assign([], cloud.cloudSource) }), /source_invalid/u);
});

test("cloud publication checks PNG CRC and actual alpha even for rehashed local declarations", async t => {
  const root = await mkdtemp(path.join(tmpdir(), "starward-map-cloud-png-test-"));
  t.after(async () => { assert.equal(path.dirname(root), path.resolve(tmpdir())); await rm(root, { recursive: true, force: true }); });
  const cloud = await cloudFixture(root); t.after(() => cloud.dispose());
  const display = await tsImport("../../packages/miniapp-contracts/src/cloud-display.ts", import.meta.url);
  const record = cloud.inventory.records[0], proof = JSON.parse(await readFile(path.join(cloud.directory, record.file + ".json"), "utf8"));
  const original = await readFile(path.join(cloud.directory, record.file));
  const source = { ...cloud.manifest, manifestSha256: cloud.cloudSource.manifestSha256 };
  for (const mode of ["crc", "alpha"]) {
    let bytes;
    if (mode === "crc") { bytes = Buffer.from(original); bytes[29] ^= 1; }
    else { const png = PNG.sync.read(original, { checkCRC: true }); png.data.fill(0); bytes = PNG.sync.write(png); }
    const changed = display.createCloudDisplayProof({ ...proof, imageSha256: skyStaticHash(bytes) }, bytes.length, source);
    const proofRaw = JSON.stringify(changed);
    const changedRecord = { ...record, file: changed.image.file, bytes: bytes.length, proofSha256: skyStaticHash(proofRaw) };
    const inventory = display.createCloudDisplayInventory(source, [changedRecord, ...cloud.inventory.records.slice(1)]);
    await writeFile(path.join(cloud.directory, changed.image.file), bytes);
    await writeFile(path.join(cloud.directory, changed.image.file + ".json"), proofRaw);
    await writeFile(path.join(cloud.directory, "inventory.json"), JSON.stringify(inventory));
    await assert.rejects(readMapPublication(cloud), mode === "crc" ? /image_png_invalid/u : /image_quality_invalid/u);
  }
});
