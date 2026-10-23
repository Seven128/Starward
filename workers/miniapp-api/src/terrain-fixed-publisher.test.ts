import assert from "node:assert/strict";
import test from "node:test";
import { copyFile, mkdtemp, readFile, readdir, rm, stat, symlink, utimes } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { PNG } from "pngjs";
import { DISPLAY_RASTER_GRID, displayRasterBounds } from "@starward/coordinate-system";
import { publishFixedTerrain } from "../../../data-pipelines/terrain/publish_fixed_terrain.mts";
import { TerrainService } from "./terrain-service.ts";
import { createTerrainViewportRenderer } from "./terrain-viewport-renderer.ts";
import { terrainRequestKey } from "./terrain-request.ts";

test("a new fixed release selects current spatial pointers and retains previous immutable URLs", async t => {
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
    const forbiddenSource = t.mock.method(globalThis, "fetch", async () => { throw new Error("previous_product_must_not_read_source"); });
    const carried = await publishFixedTerrain({ cache: path.join(root, "fresh-cache"), output: path.join(root, "release3"),
      previous: release2, targets: [target] });
    assert.equal(forbiddenSource.mock.callCount(), 0);
    assert.deepEqual(carried.assets, current.assets);
    assert.deepEqual(carried.retainedAssets, current.retainedAssets);
    assert.equal(carried.publicationVersion, current.publicationVersion);
    // Explicit historical products preserve original proof/PNG bytes without
    // turning an expired cache into fresh runtime metadata.
    const expiredAt = new Date(Date.now() - 48 * 60 * 60_000);
    const historicalFiles = await readdir(cache2);
    for (const file of historicalFiles) await utimes(path.join(cache2, file), expiredAt, expiredAt);
    const beforeHistorical = await Promise.all(historicalFiles.map(async file => ({ file,
      bytes: await readFile(path.join(cache2, file)), info: await stat(path.join(cache2, file)) })));
    const products = new Map(await Promise.all(current.assets.map(async entry => [entry.key, {
      proof: await readFile(path.join(cache2, entry.file + ".json")), bytes: await readFile(path.join(cache2, entry.file)),
    }] as const)));
    const explicitOutput = path.join(root, "explicit-release"), untouchedCache = path.join(root, "untouched-cache");
    let productReads = 0;
    const explicit = await publishFixedTerrain({ cache: untouchedCache, output: explicitOutput, previous: release2, targets: [target],
      preparedProduct: async request => {
        productReads++;
        await assert.rejects(stat(path.join(explicitOutput, "inventory.json")), { code: "ENOENT" });
        const product = products.get(terrainRequestKey(request));
        assert.ok(product, "each requested cell/window must have an explicit product");
        return product;
      } });
    assert.equal(productReads, 2);
    assert.equal(explicit.publicationVersion, current.publicationVersion);
    assert.deepEqual(explicit.assets, current.assets);
    assert.deepEqual(explicit.retainedAssets, current.retainedAssets);
    for (const entry of explicit.assets) {
      const original = products.get(entry.key)!;
      assert.deepEqual(await readFile(path.join(explicitOutput, entry.file)), original.bytes);
      assert.deepEqual(await readFile(path.join(explicitOutput, entry.file + ".json")), original.proof);
    }
    await assert.rejects(stat(untouchedCache), { code: "ENOENT" });
    for (const before of beforeHistorical) {
      const after = await stat(path.join(cache2, before.file));
      assert.equal(after.mtimeMs, before.info.mtimeMs);
      assert.equal(after.ctimeMs, before.info.ctimeMs);
      assert.deepEqual(await readFile(path.join(cache2, before.file)), before.bytes);
    }
    const cellKey = current.assets.find(entry => entry.key.includes("-fixed-"))!.key;
    const windowKey = current.assets.find(entry => entry.key.includes("-window-"))!.key;
    const oldWindow = old.assets.find(entry => entry.key === windowKey)!;
    const mismatchedWindow = { proof: await readFile(path.join(release1, oldWindow.file + ".json")),
      bytes: await readFile(path.join(release1, oldWindow.file)) };
    for (const failure of ["hash", "identity", "cell-snapshot", "missing"] as const) {
      const output = path.join(root, `invalid-prepared-${failure}`);
      await assert.rejects(publishFixedTerrain({ cache: untouchedCache, output, previous: release2, targets: [target],
        preparedProduct: async request => {
          const key = terrainRequestKey(request), product = products.get(key)!;
          if (failure === "missing") throw new Error("prepared_product_missing");
          if (failure === "identity") return products.get(windowKey)!;
          if (failure === "cell-snapshot" && key === windowKey) return mismatchedWindow;
          if (failure === "hash" && key === cellKey) {
            const bytes = Buffer.from(product.bytes); bytes[bytes.length - 1] ^= 1;
            return { ...product, bytes };
          }
          return product;
        } }), failure === "hash" ? /terrain_asset_hash_mismatch/u
          : failure === "missing" ? /prepared_product_missing/u : /terrain_publication_identity_conflict/u);
      await assert.rejects(stat(path.join(output, "inventory.json")), { code: "ENOENT" });
      await assert.rejects(stat(untouchedCache), { code: "ENOENT" });
    }
    assert.equal(forbiddenSource.mock.callCount(), 0);
    await assert.rejects(publishFixedTerrain({ cache: release2, output: path.join(root, "invalid-release"),
      previous: release2, targets: [target] }), /terrain_publication_targets_invalid/u);
    const alias = path.join(root, "previous-alias");
    await symlink(release2, alias, process.platform === "win32" ? "junction" : "dir");
    const previousFiles = (await readdir(release2)).sort();
    for (const paths of [
      { cache: path.join(release2, "future-cache"), output: path.join(root, "invalid-release") },
      { cache: path.join(root, "unused-cache"), output: path.join(release2, "future-output") },
      { cache: path.join(alias, "future-cache"), output: path.join(root, "invalid-release") },
      { cache: path.join(root, "unused-cache"), output: path.join(alias, "future-output") },
      { cache: root, output: path.join(root, "invalid-release") },
    ]) await assert.rejects(publishFixedTerrain({ ...paths, previous: release2, targets: [target] }),
      /terrain_publication_targets_invalid/u);
    assert.deepEqual((await readdir(release2)).sort(), previousFiles, "invalid nested/aliased roots cannot write into the prior publication");
    assert.deepEqual(await readFile(path.join(release2, "inventory.json")), committed);
  } finally { reader?.close(); await rm(root, { recursive: true, force: true }); }
});
