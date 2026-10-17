import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, rm, writeFile, utimes } from "node:fs/promises";
import { createHash } from "node:crypto";
import { tmpdir } from "node:os";
import path from "node:path";
import { PNG } from "pngjs";
import { DISPLAY_RASTER_GRID, displayRasterBounds, displayRasterWindowForBounds, displayRasterWindowBounds } from "@starward/coordinate-system";
import { TerrainService } from "./terrain-service.ts";
import { terrainFixedRequest, terrainRequestKey } from "./terrain-request.ts";
import { createTerrainViewportRenderer } from "./terrain-viewport-renderer.ts";
import { terrainInventoryVersion, type TerrainFixedInventory } from "./terrain-fixed-publication.ts";

function continuousSource() {
  let reads = 0;
  const transport: typeof fetch = async url => {
    reads++;
    const match = /\/(\d+)\/(\d+)\/(\d+)\.png$/u.exec(String(url))!;
    const x = Number(match[2]), y = Number(match[3]);
    const png = new PNG({ width: 256, height: 256 });
    for (let row = 0; row < 256; row++) for (let column = 0; column < 256; column++) {
      const h = 32768 + (x * 256 + column) / 8 - (y * 256 + row) / 4;
      png.data.set([Math.floor(h / 256), Math.floor(h) % 256, Math.round(h % 1 * 256), 255], (row * 256 + column) * 4);
    }
    return new Response(new Uint8Array(PNG.sync.write(png)), { headers: { etag: '"test"', "x-amz-meta-x-imagery-sources": "srtm/test.tif" } });
  };
  return { transport, reads: () => reads };
}

test("one fixed cell preserves identical pixels through an overlapping metatile boundary using its halo", async () => {
  const source = continuousSource(), renderer = createTerrainViewportRenderer(source.transport);
  const cell = { grid: DISPLAY_RASTER_GRID, zoom: 12, x: 3344, y: 1700, span: 2 as const, tilePixels: 256 as const };
  try {
    const [a, b] = [await renderer.render(terrainFixedRequest(cell), new AbortController().signal),
      await renderer.render(terrainFixedRequest({ ...cell, x: cell.x + 1 }), new AbortController().signal)];
    assert.ok(a && b);
    const left = PNG.sync.read(a.bytes).data, right = PNG.sync.read(b.bytes).data;
    for (let row = 0; row < 512; row++) assert.ok(left.subarray((row * 512 + 256) * 4, (row + 1) * 512 * 4).equals(
      right.subarray(row * 512 * 4, (row * 512 + 256) * 4)), `clamped tile edges would create a visible gradient seam at row ${row}`);
  } finally { renderer.close(); }
});

test("adjacent camera requests reuse actual fixed assets, and a changed window reuses its overlapping cells", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "starward-fixed-reuse-"));
  const source = continuousSource(), derived: string[] = [], renderer = createTerrainViewportRenderer(source.transport);
  const terrain = new TerrainService({ directory, renderer: async (input, signal) => {
    derived.push(terrainRequestKey(input)); return renderer.render(input, signal);
  } });
  const cell = { grid: DISPLAY_RASTER_GRID, zoom: 12, x: 3344, y: 1782, span: 1 as const, tilePixels: 256 as const };
  const b = displayRasterBounds(cell), dx = b.east - b.west, dy = b.north - b.south;
  const input = (shift: number) => ({ purpose: "MAP" as const, center: { system: "GCJ02" as const, latitude: (b.south + b.north) / 2, longitude: b.west + dx * (0.5 + shift) },
    viewportBounds: { west: b.west + dx * (0.1 + shift), east: b.east - dx * (0.1 - shift), south: b.south + dy * 0.1, north: b.north - dy * 0.1 } });
  try {
    const first = await terrain.getPublication(input(0)); assert.ok(first?.fixedWindow);
    const calls = derived.length, reads = source.reads();
    const nearby = await terrain.getPublication(input(0.02));
    assert.equal(nearby?.image.file, first.image.file);
    assert.equal(derived.length, calls); assert.equal(source.reads(), reads);
    const moved = await terrain.getPublication(input(0.3)); assert.ok(moved?.fixedWindow);
    assert.notEqual(moved.image.file, first.image.file);
    assert.equal(derived.length, calls + 1, "only the new cell is derived across the old fixed boundary");
    assert.ok(moved.fixedWindow.cells.some(c => first.fixedWindow!.cells.some(p => c.file === p.file && c.file)));
    assert.deepEqual((await terrain.getAsset(first.image.file)).bytes, (await terrain.getAsset(nearby!.image.file)).bytes);
  } finally { terrain.close(); renderer.close(); await rm(directory, { recursive: true, force: true }); }
});

test("fixed windows cover whole supported viewports at bounded sizes and reject invalid geographic inputs", () => {
  for (const bounds of [{ west: 113.95, south: 22.52, east: 114.2, north: 22.8 },
    { west: 72, south: 1, east: 138, north: 56 }, { west: -180, south: -80, east: 180, north: 80 }]) {
    const window = displayRasterWindowForBounds(bounds), actual = displayRasterWindowBounds(window);
    assert.ok(window.columns <= 5 && window.rows <= 5);
    assert.ok(actual.west <= bounds.west && actual.east >= bounds.east && actual.south <= bounds.south && actual.north >= bounds.north);
  }
  assert.throws(() => displayRasterWindowForBounds({ west: 114, south: 91, east: 115, north: 92 }), /bounds_invalid/);
});

test("a published fixed image survives cache age without source reads, and damaged metadata fails its checksum", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "starward-fixed-publication-"));
  const source = continuousSource(), renderer = createTerrainViewportRenderer(source.transport);
  const region = { grid: DISPLAY_RASTER_GRID, zoom: 12, x: 3344, y: 1700, span: 1 as const, tilePixels: 256 as const };
  const request = terrainFixedRequest(region);
  let calls = 0;
  let terrain: TerrainService | undefined;
  try {
    const result = await renderer.render(request, new AbortController().signal); assert.ok(result);
    const proof = JSON.stringify(result.publication), file = result.publication.image.file;
    await writeFile(path.join(directory, file), result.bytes); await writeFile(path.join(directory, file + ".json"), proof);
    await utimes(path.join(directory, file), new Date(0), new Date(0));
    const inventory: TerrainFixedInventory = { schemaVersion: "starward-fixed-terrain-inventory-v1", publicationVersion: "", createdAt: new Date().toISOString(),
      targets: [{ name: "controlled publication", boundsGcj02: request.viewportBounds! }],
      assets: [{ key: terrainRequestKey(request), file, publicationSha256: createHash("sha256").update(proof).digest("hex") }] };
    inventory.publicationVersion = terrainInventoryVersion(inventory);
    await writeFile(path.join(directory, "inventory.json"), JSON.stringify(inventory));
    terrain = new TerrainService({ publishedDirectory: directory, renderer: async () => { calls++; throw new Error("unexpected_source_read"); } });
    assert.deepEqual((await terrain.getAsset(file)).bytes, result.bytes);
    assert.equal((await terrain.prepareFixedCell(region))?.image.sha256, result.publication.image.sha256);
    assert.equal(calls, 0);
    await writeFile(path.join(directory, file + ".json"), proof + " ");
    await assert.rejects(terrain.getAsset(file), /terrain_publication_hash_mismatch/);
  } finally { terrain?.close(); renderer.close(); await rm(directory, { recursive: true, force: true }); }
});
