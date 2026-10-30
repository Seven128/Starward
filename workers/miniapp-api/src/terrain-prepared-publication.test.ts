import assert from "node:assert/strict";
import { mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { DISPLAY_RASTER_GRID, displayRasterWindowBounds } from "@starward/coordinate-system";
import { publishFixedTerrain } from "../../../data-pipelines/terrain/publish_fixed_terrain.mts";
import { mapStaticHash, mapStaticSourceId, type MapStaticManifest } from "./map-static-manifest.ts";
import { TerrainService } from "./terrain-service.ts";
import { createTerrainViewportRenderer } from "./terrain-viewport-renderer.ts";
import { continuousTerrainTestSource } from "./test-fixtures/continuous-terrain-source.ts";
import type { TerrainFixedInventory } from "./terrain-fixed-publication.ts";
import { terrainRequestKey, terrainWindowViewport } from "./terrain-request.ts";

let root: string, legacy: { directory: string; inventory: TerrainFixedInventory };
let prepared: { directory: string; publicationHash: string }, manifest: MapStaticManifest;
let partitioned: { directory: string; publicationHash: string };
let input: Parameters<TerrainService["getPublication"]>[0], currentFile: string, parentFile: string;
const services: TerrainService[] = [];
const fresh = (publication = prepared) => {
  const service = new TerrainService({ directory: path.join(root, "unused-cache"), publishedDirectory: legacy.directory,
    mapStaticPublication: publication, renderer: async () => { throw new Error("prepared_hit_must_not_derive"); } });
  services.push(service); return service;
};

test.before(async () => {
  root = await mkdtemp(path.join(tmpdir(), "starward-terrain-prepared-"));
  // The existing producer and sealed exporter own all fixture contracts.
  const [{ terrainFixture, shardedNightLightFixture }, { prepareMapStaticBundle }] = await Promise.all([
    import(new URL("../../../tools/deployment/map-static-test-support.mjs", import.meta.url).href),
    import(new URL("../../../tools/deployment/map-static-bundle.mjs", import.meta.url).href),
  ]);
  legacy = await terrainFixture(root, 0);
  const current = await terrainFixture(root, 400);
  const bounds = current.inventory.targets[0].boundsGcj02;
  input = { purpose: "MAP", center: { system: "GCJ02", latitude: (bounds.north + bounds.south) / 2,
    longitude: (bounds.east + bounds.west) / 2 }, viewportBounds: bounds };
  const b = displayRasterWindowBounds({ grid: DISPLAY_RASTER_GRID, tilePixels: 256, zoom: 11, x: 1672, y: 850, columns: 2, rows: 1 });
  const dx = b.east - b.west, dy = b.north - b.south;
  const parentTarget = { name: "complete coarse prepared parent", boundsGcj02: {
    west: b.west + dx * .1, east: b.east - dx * .1, south: b.south + dy * .1, north: b.north - dy * .1 } };
  const renderer = createTerrainViewportRenderer(continuousTerrainTestSource().transport);
  const producer = new TerrainService({ directory: path.join(root, "terrain-cache-400"), renderer: renderer.render });
  try { await producer.getPublication({ purpose: "MAP", center: { system: "GCJ02", latitude: (b.north + b.south) / 2,
    longitude: (b.east + b.west) / 2 }, viewportBounds: parentTarget.boundsGcj02 }); }
  finally { producer.close(); renderer.close(); }
  const directory = path.join(root, "current-with-parent");
  const inventory = await publishFixedTerrain({ output: directory, cache: path.join(root, "terrain-cache-400"),
    targets: [...current.inventory.targets, parentTarget] });
  currentFile = inventory.assets.find(entry => entry.key === terrainRequestKey(terrainWindowViewport(input)))!.file;
  parentFile = inventory.assets.find(entry => entry.key === "terrarium-cn-v2-fixed-11-1672-850-1")!.file;
  const bundle = await prepareMapStaticBundle({ publications: [{ family: "terrain", directory }], outputDirectory: path.join(root, "sealed-map") });
  prepared = { directory: bundle.directory, publicationHash: bundle.publicationHash };
  manifest = JSON.parse(await readFile(path.join(prepared.directory, "index.json"), "utf8"));
  const sharded = await shardedNightLightFixture(root);
  const mixed = await prepareMapStaticBundle({ publications: [sharded], previousDirectories: [bundle.directory], outputDirectory: path.join(root, "partitioned-map") });
  partitioned = { directory: mixed.directory, publicationHash: mixed.publicationHash };
  // A request for terrain must not read the unrelated EOG metadata catalogue.
  const mixedIndex = JSON.parse(await readFile(path.join(mixed.directory, "index.json"), "utf8"));
  for (const page of mixedIndex.sources.find((source: { family: string }) => source.family === "night-light").metadataPages) {
    await writeFile(path.join(mixed.directory, page.file), "unread unrelated catalogue");
  }
});

test.after(async () => {
  services.forEach(service => service.close());
  if (!root) return;
  assert.equal(path.dirname(root), path.resolve(tmpdir()));
  assert.ok(path.basename(root).startsWith("starward-terrain-prepared-"));
  await rm(root, { recursive: true, force: true });
});

for (const layout of ["flat", "partitioned"]) test(`${layout}: pinned current terrain supplies exact metadata, a complete parent and original PNGs without source or cache writes`, async t => {
  const selectedBundle = layout === "flat" ? prepared : partitioned;
  const source = manifest.sources.find(item => item.family === "terrain")!;
  const directory = path.join(prepared.directory, "publications", mapStaticSourceId(source));
  const before = await readdir(root);
  const fetch = t.mock.method(globalThis, "fetch", async () => { throw new Error("prepared_hit_must_not_fetch"); });
  const terrain = fresh(selectedBundle), publication = await terrain.getPublication(input);
  assert.equal(publication?.image.file, currentFile);
  assert.notEqual(publication?.image.file, legacy.inventory.assets.find(entry => entry.key === terrainRequestKey(terrainWindowViewport(input)))!.file);
  assert.deepEqual((await terrain.getAsset(currentFile)).bytes, await readFile(path.join(directory, currentFile)));
  assert.deepEqual((await fresh(selectedBundle).getAsset(currentFile)).bytes, await readFile(path.join(directory, currentFile)), "prepared immutable URLs also resolve before metadata is warm");
  const preview = await terrain.getPreviewPublication(input);
  assert.equal(preview?.publication.image.file, parentFile);
  assert.deepEqual([preview?.requestedZoom, preview?.imageZoom], [12, 11]);
  assert.deepEqual((await terrain.getAsset(parentFile)).bytes, await readFile(path.join(directory, parentFile)));
  const oldFile = legacy.inventory.assets[0].file;
  assert.deepEqual((await fresh().getAsset(oldFile)).bytes, await readFile(path.join(legacy.directory, oldFile)), "old immutable URLs remain independently available");
  const outside = { purpose: "MAP" as const, center: { ...input.center, longitude: input.center.longitude + .5 }, viewportBounds: {
    ...input.viewportBounds!, west: input.viewportBounds!.west + .5, east: input.viewportBounds!.east + .5 } };
  assert.equal(await terrain.getPreviewPublication(outside), null, "a nearby parent cannot stretch to an uncovered snapped window");
  assert.equal(fetch.mock.callCount(), 0);
  assert.deepEqual(await readdir(root), before);
});

test("a changed pin or damaged sealed proof cannot silently select the old source revision; repaired metadata can retry", async () => {
  const wrong = fresh({ ...prepared, publicationHash: "0".repeat(64) });
  await assert.rejects(wrong.getPublication(input), /terrain_prepared_publication_mismatch/);
  await assert.rejects(wrong.getPreviewPublication(input), /terrain_prepared_publication_mismatch/);
  const oldFile = legacy.inventory.assets[0].file;
  assert.deepEqual((await wrong.getAsset(oldFile)).bytes, await readFile(path.join(legacy.directory, oldFile)));
  const source = manifest.sources.find(item => item.family === "terrain")!;
  const directory = path.join(prepared.directory, "publications", mapStaticSourceId(source));
  const proofFile = path.join(directory, currentFile + ".json"), original = await readFile(proofFile);
  const terrain = fresh();
  try {
    await writeFile(proofFile, Buffer.alloc(original.length, 32));
    await assert.rejects(terrain.getPublication(input), /terrain_prepared_file_identity_invalid/);
  } finally { await writeFile(proofFile, original); }
  assert.equal((await terrain.getPublication(input))?.image.file, currentFile);
  const inventoryFile = path.join(directory, "inventory.json"), inventory = await readFile(inventoryFile);
  const retried = fresh();
  try {
    await writeFile(inventoryFile, Buffer.alloc(inventory.length, 32));
    await assert.rejects(retried.getPublication(input), /terrain_prepared_file_identity_invalid/);
  } finally { await writeFile(inventoryFile, inventory); }
  assert.equal((await retried.getPublication(input))?.image.file, currentFile);
});

test("multiple terrain selections fail explicitly and cancellation or close never returns a late prepared result", async () => {
  const index = path.join(prepared.directory, "index.json"), original = await readFile(index);
  const changed = structuredClone(manifest);
  changed.sources.push({ ...changed.sources[0], publicationVersion: `terrain-fixed:${"1".repeat(64)}` });
  changed.publicationHash = mapStaticHash(JSON.stringify({ sources: changed.sources, records: changed.records }));
  try {
    await writeFile(index, JSON.stringify(changed));
    await assert.rejects(fresh({ ...prepared, publicationHash: changed.publicationHash }).getPreviewPublication(input), /terrain_prepared_selection_ambiguous/);
  } finally { await writeFile(index, original); }
  const terrain = fresh(), controller = new AbortController();
  const pending = terrain.getPreviewPublication(input, controller.signal);
  controller.abort(new Error("superseded"));
  await assert.rejects(pending, /superseded/);
  const closing = fresh(), late = closing.getPreviewPublication(input);
  closing.close();
  await assert.rejects(late, /terrain_service_closed/);
});
