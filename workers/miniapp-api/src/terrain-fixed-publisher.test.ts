import assert from "node:assert/strict";
import test from "node:test";
import { copyFile, mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { PNG } from "pngjs";
import { DISPLAY_RASTER_GRID, displayRasterBounds } from "@starward/coordinate-system";
import { publishFixedTerrain } from "../../../data-pipelines/terrain/publish_fixed_terrain.mts";
import { TerrainService } from "./terrain-service.ts";
import { createTerrainViewportRenderer } from "./terrain-viewport-renderer.ts";

test("a new fixed release selects current spatial pointers and retains previous immutable URLs", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "starward-terrain-release-"));
  const bounds = displayRasterBounds({ grid: DISPLAY_RASTER_GRID, zoom: 12, x: 3344, y: 1700, span: 1, tilePixels: 256 });
  const dx = bounds.east - bounds.west, dy = bounds.north - bounds.south;
  const target = { name: "controlled release", boundsGcj02: { west: bounds.west + dx * 0.2, east: bounds.east - dx * 0.2,
    south: bounds.south + dy * 0.2, north: bounds.north - dy * 0.2 } };
  const request = { purpose: "MAP" as const, center: { system: "GCJ02" as const,
    latitude: (bounds.south + bounds.north) / 2, longitude: (bounds.east + bounds.west) / 2 }, viewportBounds: target.boundsGcj02 };
  const prime = async (directory: string, offset: number) => {
    const transport: typeof fetch = async url => {
      const match = /\/(\d+)\/(\d+)\/(\d+)\.png$/u.exec(String(url))!;
      const png = new PNG({ width: 256, height: 256 });
      for (let row = 0; row < 256; row++) for (let column = 0; column < 256; column++) {
        const h = 32768 + offset + (Number(match[2]) * 256 + column) / 8 - (Number(match[3]) * 256 + row) / 4;
        png.data.set([Math.floor(h / 256), Math.floor(h) % 256, Math.round(h % 1 * 256), 255], (row * 256 + column) * 4);
      }
      return new Response(new Uint8Array(PNG.sync.write(png)), { headers: {
        etag: `"revision-${offset}"`, "x-amz-meta-x-imagery-sources": "srtm/test.tif" } });
    };
    const renderer = createTerrainViewportRenderer(transport);
    const terrain = new TerrainService({ directory, renderer: renderer.render });
    try { const publication = await terrain.getPublication(request); assert.ok(publication); return publication; }
    finally { terrain.close(); renderer.close(); }
  };
  let reader: TerrainService | undefined;
  try {
    const cache1 = path.join(root, "cache1"), cache2 = path.join(root, "cache2");
    const release1 = path.join(root, "release1"), release2 = path.join(root, "release2");
    const first = await prime(cache1, 0);
    const old = await publishFixedTerrain({ cache: cache1, output: release1, targets: [target] });
    const oldInventory = await readFile(path.join(release1, "inventory.json"));
    const second = await prime(cache2, 300);
    assert.notEqual(second.image.file, first.image.file);
    // A normal cache can contain both source revisions' per-image proofs.
    for (const file of (await readdir(cache1)).filter(file => /\.png(?:\.json)?$/u.test(file))) {
      await copyFile(path.join(cache1, file), path.join(cache2, file));
    }
    const current = await publishFixedTerrain({ cache: cache2, output: release2, previous: release1, targets: [target] });
    assert.notEqual(current.publicationVersion, old.publicationVersion);
    assert.equal(current.assets.length, 2);
    assert.equal(current.retainedAssets?.length, 2);
    assert.equal(new Set(current.assets.map(asset => asset.key)).size, 2);
    assert.ok(current.retainedAssets?.some(asset => asset.file === first.image.file));
    reader = new TerrainService({ publishedDirectory: release2, directory: path.join(root, "empty-cache"),
      renderer: async () => { throw new Error("published_release_must_not_read_source"); } });
    assert.equal((await reader.getPublication(request))?.image.file, second.image.file);
    assert.deepEqual((await reader.getAsset(first.image.file)).bytes, await readFile(path.join(release1, first.image.file)));
    const committed = await readFile(path.join(release2, "inventory.json"));
    await publishFixedTerrain({ cache: cache2, output: release2, previous: release1, targets: [target] });
    assert.deepEqual(await readFile(path.join(release2, "inventory.json")), committed);
    assert.deepEqual(await readFile(path.join(release1, "inventory.json")), oldInventory);
  } finally { reader?.close(); await rm(root, { recursive: true, force: true }); }
});
