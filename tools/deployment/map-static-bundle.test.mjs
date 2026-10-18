import assert from "node:assert/strict";
import test from "node:test";
import { cp, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { tmpdir } from "node:os";
import { terrainFixture, nightLightFixture } from "./map-static-test-support.mjs";
import { prepareMapStaticBundle, validateMapStaticBundle, restoreMapStaticBundle, discoverMapStaticBundle, validMapStaticRoute } from "./map-static-bundle.mjs";
import { skyStaticHash } from "./sky-static-bundle.mjs";
import { tsImport } from "tsx/esm/api";

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
