import "reflect-metadata";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { Module } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { FastifyAdapter } from "@nestjs/platform-fastify";
import { DISPLAY_RASTER_GRID, displayRasterBounds } from "@starward/coordinate-system";
import type { TerrainOverlayRequest } from "@starward/miniapp-contracts";
import { MiniappController } from "./controller.ts";
import { MiniappService } from "./miniapp-service.ts";
import { TerrainService } from "./terrain-service.ts";
import { createTerrainViewportRenderer } from "./terrain-viewport-renderer.ts";
import { renderTerrainWindow } from "./terrain-window-renderer.ts";
import { terrainFixedRequest, terrainWindowRequest, terrainWindowViewport, terrainRequestKey, type RenderedTerrain } from "./terrain-request.ts";
import { terrainInventoryVersion, type TerrainFixedInventory } from "./terrain-fixed-publication.ts";
import { createTestMiniappService } from "./test-fixtures/create-test-service.ts";
import { continuousTerrainTestSource } from "./test-fixtures/continuous-terrain-source.ts";
import { fastifyDeploymentOptions } from "./release-metadata.ts";

const sha256 = (value: string | Buffer) => createHash("sha256").update(value).digest("hex");
const region = { grid: DISPLAY_RASTER_GRID, tilePixels: 256 as const, zoom: 12, x: 3344, y: 1700, span: 2 as const };
const bounds = displayRasterBounds(region);
const input: TerrainOverlayRequest = { purpose: "MAP", center: { system: "GCJ02",
  latitude: (bounds.south + bounds.north) / 2, longitude: (bounds.west + bounds.east) / 2 }, viewportBounds: bounds };
let parent: RenderedTerrain, coarse: RenderedTerrain, fine: RenderedTerrain;

test.before(async () => {
  const renderer = createTerrainViewportRenderer(continuousTerrainTestSource().transport);
  const signal = new AbortController().signal;
  try {
    parent = (await renderTerrainWindow(terrainWindowRequest({ grid: DISPLAY_RASTER_GRID, tilePixels: 256, zoom: 11,
      x: 1672, y: 850, columns: 1, rows: 1 }), signal, renderer.render))!;
    coarse = (await renderer.render(terrainFixedRequest({ ...region, zoom: 10, x: 836, y: 425, span: 1 }), signal))!;
    fine = (await renderer.render(terrainFixedRequest(region), signal))!;
    assert.ok(parent && coarse && fine);
  } finally { renderer.close(); }
});

async function prepare(directory: string, current: RenderedTerrain[], retained: RenderedTerrain[] = []) {
  const entry = async (result: RenderedTerrain) => {
    const publication = result.publication;
    const proof = JSON.stringify(publication);
    await writeFile(path.join(directory, publication.image.file), result.bytes);
    await writeFile(path.join(directory, publication.image.file + ".json"), proof);
    const request = publication.fixedWindow ? terrainWindowRequest(publication.fixedWindow) : terrainFixedRequest(publication.fixedRaster!);
    return { key: terrainRequestKey(request), file: publication.image.file, publicationSha256: sha256(proof) };
  };
  const inventory: TerrainFixedInventory = { schemaVersion: "starward-fixed-terrain-inventory-v1", createdAt: new Date().toISOString(),
    publicationVersion: "", targets: [{ name: "controlled preview", boundsGcj02: bounds }],
    assets: await Promise.all(current.map(entry)), ...(retained.length ? { retainedAssets: await Promise.all(retained.map(entry)) } : {}) };
  inventory.publicationVersion = terrainInventoryVersion(inventory);
  await writeFile(path.join(directory, "inventory.json"), JSON.stringify(inventory));
}

async function withDirectory(run: (directory: string) => Promise<void>) {
  const directory = await mkdtemp(path.join(tmpdir(), "starward-terrain-preview-"));
  try { await run(directory); }
  finally {
    assert.equal(path.dirname(directory), path.resolve(tmpdir()));
    await rm(directory, { recursive: true, force: true });
  }
}

test("a ready parent is the nearest current coarser publication, with no source reads or cache writes", async t => withDirectory(async directory => {
  await prepare(directory, [coarse, fine, parent]);
  const before = await readdir(directory);
  const source = t.mock.method(globalThis, "fetch", async () => { throw new Error("preview_must_not_fetch"); });
  let derived = 0;
  const terrain = new TerrainService({ publishedDirectory: directory, directory: path.join(directory, "unused-cache"),
    renderer: async () => { derived++; throw new Error("preview_must_not_derive"); } });
  try {
    const result = await terrain.getPreviewPublication(input);
    assert.equal(result?.publication.image.file, parent.publication.image.file);
    assert.deepEqual([result?.requestedZoom, result?.imageZoom], [12, 11]);
    assert.deepEqual(result?.publication.boundsGcj02, parent.publication.boundsGcj02);
    assert.deepEqual((await terrain.getAsset(result!.publication.image.file)).bytes, parent.bytes);
    // Nearby identities that normalize to the same fine window cannot install
    // a different or incomplete coverage solely because the centre changed.
    const shifted = { ...input, center: { ...input.center, longitude: input.center.longitude + 0.00001 } };
    assert.equal(terrainRequestKey(terrainWindowViewport(shifted)), terrainRequestKey(terrainWindowViewport(input)));
    assert.equal((await terrain.getPreviewPublication(shifted))?.publication.image.file, result?.publication.image.file);
    assert.equal(source.mock.callCount(), 0);
    assert.equal(derived, 0);
    assert.deepEqual(await readdir(directory), before);
  } finally { terrain.close(); }
}));

test("preview admission rejects incomplete quality, equal LOD, retired coverage and uncovered requests", async () => withDirectory(async directory => {
  const partial = { ...parent, publication: structuredClone(parent.publication) };
  partial.publication.validPixelCount = partial.publication.validPixelCount! - 1;
  partial.publication.validPixelPercent = Math.round(partial.publication.validPixelCount! / (partial.publication.image.width * partial.publication.image.height) * 10000) / 100;
  await prepare(directory, [partial, fine], [coarse]);
  let derived = 0;
  const terrain = new TerrainService({ publishedDirectory: directory, renderer: async () => { derived++; throw new Error("unexpected_source_read"); } });
  try {
    assert.equal(await terrain.getPreviewPublication(input), null, "rounded 100% must not admit even one missing pixel");
    const moved = terrainFixedRequest({ ...region, x: region.x + 2 });
    assert.equal(await terrain.getPreviewPublication(moved), null, "parent cannot stretch across a missing edge");
    assert.equal(await terrain.getPreviewPublication({ purpose: "MAP", center: { system: "GCJ02", latitude: 0, longitude: 0 },
      viewportBounds: { west: -1, south: -1, east: 1, north: 1 } }), null, "out-of-scope view cannot borrow a domestic parent");
    await assert.rejects(terrain.getPreviewPublication({ purpose: "SPOT", center: input.center, radiusKm: 5 }), /preview_request_invalid/);
    await assert.rejects(terrain.getPreviewPublication({ purpose: "MAP", center: input.center, radiusKm: 5 }), /preview_request_invalid/);
    await assert.rejects(terrain.getPreviewPublication({ ...input, center: { ...input.center, latitude: NaN } }), /request_invalid/);
    assert.equal(derived, 0);
  } finally { terrain.close(); }
}));

test("damaged parent bytes stay a separate failure and cancellation/close cannot publish a preview", async () => withDirectory(async directory => {
  await prepare(directory, [parent]);
  let derived = 0;
  const terrain = new TerrainService({ publishedDirectory: directory, renderer: async () => { derived++; throw new Error("unexpected_source_read"); } });
  try {
    const cancelled = new AbortController();
    const pending = terrain.getPreviewPublication(input, cancelled.signal);
    cancelled.abort(new Error("superseded"));
    await assert.rejects(pending, /superseded/);
    await writeFile(path.join(directory, parent.publication.image.file), Buffer.alloc(parent.bytes.length));
    await assert.rejects(terrain.getPreviewPublication(input), /terrain_asset_hash_mismatch/);
    assert.equal(derived, 0);
    terrain.close();
    await assert.rejects(terrain.getPreviewPublication(input), /terrain_service_closed/);
  } finally { terrain.close(); }
}));

test("HTTP preview and immutable asset keep provenance while the original fine operation still reaches its renderer", async () => withDirectory(async directory => {
  await prepare(directory, [parent]);
  let derived = 0;
  const terrain = new TerrainService({ publishedDirectory: directory, directory: path.join(directory, "unused-cache"),
    renderer: async () => { derived++; throw new Error("controlled_fine_read_failure"); } });
  const service = createTestMiniappService({ terrain });
  class TestModule {}
  Module({ controllers: [MiniappController], providers: [{ provide: MiniappService, useValue: service }] })(TestModule);
  const app = await NestFactory.create(TestModule, new FastifyAdapter(fastifyDeploymentOptions({ origins: [], trustedProxyCidrs: [] })), { logger: false });
  try {
    await app.listen(0, "127.0.0.1");
    const base = await app.getUrl();
    const query = new URLSearchParams({ purpose: "MAP", centerLat: String(input.center.latitude), centerLng: String(input.center.longitude),
      viewportBounds: [bounds.west, bounds.south, bounds.east, bounds.north].join(",") });
    for (const suffix of ["purpose=SPOT&centerLat=30&centerLng=120&radiusKm=5",
      "purpose=MAP&centerLat=bad&centerLng=120&viewportBounds=119,29,121,31",
      `${query}&radiusKm=5`]) assert.equal((await fetch(`${base}/v2/terrain/overlay/preview?${suffix}`)).status, 400);
    const response = await fetch(`${base}/v2/terrain/overlay/preview?${query}`);
    assert.equal(response.status, 200);
    const preview = (await response.json()).data;
    assert.deepEqual(preview.preview, { requestedZoom: 12, imageZoom: 11 });
    assert.equal(preview.state, "AVAILABLE"); assert.equal(preview.failureCode, undefined);
    assert.equal(preview.imageSha256, parent.publication.image.sha256);
    assert.deepEqual(preview.imageBoundsGcj02, parent.publication.boundsGcj02);
    assert.equal(preview.coordinateTransformVersion, parent.publication.transformVersion);
    assert.ok(preview.source.attribution.statements.length >= 3);
    const asset = await fetch(`${base}${preview.imageUrl}`);
    assert.equal(asset.status, 200);
    assert.equal(sha256(Buffer.from(await asset.arrayBuffer())), preview.imageSha256);
    assert.equal(derived, 0);
    const missing = (await (await fetch(`${base}/v2/terrain/overlay/preview?purpose=MAP&centerLat=30&centerLng=120&viewportBounds=119.9,29.9,120.1,30.1`)).json()).data;
    assert.equal(missing.imageUrl, null); assert.equal(missing.preview, undefined); assert.equal(missing.failureCode, undefined);
    const normal = (await (await fetch(`${base}/v2/terrain/overlay?${query}`)).json()).data;
    assert.equal(normal.preview, undefined);
    assert.equal(normal.failureCode, "TERRAIN_READ_FAILED");
    assert.ok(derived > 0, "the available parent must not complete or suppress the fine source request");
    await writeFile(path.join(directory, parent.publication.image.file + ".json"), "{}");
    const damaged = (await (await fetch(`${base}/v2/terrain/overlay/preview?${query}`)).json()).data;
    assert.equal(damaged.preview, undefined); assert.equal(damaged.imageUrl, null);
    assert.equal(damaged.failureCode, "TERRAIN_READ_FAILED");
  } finally { await app.close(); }
}));
