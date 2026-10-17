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

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>(done => { resolve = done; });
  return { promise, resolve };
}

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

test("overlapping fixed cells share actual source fetches and one cancelled cell does not cancel its neighbour", async () => {
  const source = continuousSource(), gate = deferred(), calls: string[] = [];
  const renderer = createTerrainViewportRenderer(async (url, options) => {
    calls.push(String(url)); await gate.promise; options?.signal?.throwIfAborted();
    return source.transport(url, options);
  });
  const cancelled = new AbortController(), survivor = new AbortController();
  const request = (x: number) => terrainFixedRequest({ grid: DISPLAY_RASTER_GRID, zoom: 12, x, y: 1700, span: 1, tilePixels: 256 });
  const first = renderer.render(request(3344), cancelled.signal), second = renderer.render(request(3345), survivor.signal);
  const firstResult = assert.rejects(first, /superseded/u);
  try {
    await new Promise<void>(resolve => setImmediate(resolve));
    assert.ok(calls.length > 0); assert.equal(calls.length, new Set(calls).size, "shared source URLs are fetched only once");
    cancelled.abort(new Error("superseded")); await firstResult;
    gate.resolve();
    const result = await second; assert.ok(result?.publication.validPixelPercent);
    assert.deepEqual(result.publication.sourceIssues, []);
    assert.equal(survivor.signal.aborted, false);
  } finally {
    gate.resolve(); cancelled.abort(new Error("superseded")); survivor.abort(); renderer.close();
    await Promise.allSettled([firstResult, second]);
  }
});

test("a cold window overlaps two cell reads without exceeding the shared source budget", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "starward-window-overlap-"));
  const source = continuousSource(), renderer = createTerrainViewportRenderer(source.transport);
  const ready = deferred(), gate = deferred();
  let active = 0, peak = 0, calls = 0;
  const terrain = new TerrainService({ directory, renderer: async (input, signal) => {
    active++; calls++; peak = Math.max(peak, active);
    if (active === 2) ready.resolve();
    try { await gate.promise; signal.throwIfAborted(); return await renderer.render(input, signal); }
    finally { active--; }
  } });
  const bounds = displayRasterBounds({ grid: DISPLAY_RASTER_GRID, zoom: 12, x: 3344, y: 1700, span: 2, tilePixels: 256 });
  const request = { purpose: "MAP" as const, center: { system: "GCJ02" as const,
    latitude: (bounds.north + bounds.south) / 2, longitude: (bounds.west + bounds.east) / 2 }, viewportBounds: bounds };
  const publication = terrain.getPublication(request);
  let deadline: ReturnType<typeof setTimeout> | undefined;
  try {
    await Promise.race([ready.promise, new Promise<never>((_, reject) => {
      deadline = setTimeout(() => reject(new Error("second cell did not start before first completion")), 2000);
    })]);
    clearTimeout(deadline); assert.equal(calls, 2); assert.equal(peak, 2);
    gate.resolve();
    const result = await publication; assert.ok(result?.fixedWindow);
    assert.equal(result.sourceIssues?.length ?? 0, 0);
    assert.equal(result.fixedWindow.cells.length, result.fixedWindow.columns * result.fixedWindow.rows);
    assert.ok(result.fixedWindow.cells.every(cell => cell.file && cell.publicationId));
    assert.equal(peak, 2, "overlap cannot increase the existing global source limit");
    assert.equal((await terrain.getPublication(request))?.image.sha256, result.image.sha256);
  } finally {
    clearTimeout(deadline); gate.resolve(); terrain.close();
    await publication.catch(() => undefined); renderer.close(); await rm(directory, { recursive: true, force: true });
  }
});

test("two cold windows wait for shared slots without turning capacity into missing terrain", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "starward-window-shared-slots-"));
  const source = continuousSource(), renderer = createTerrainViewportRenderer(source.transport);
  const ready = deferred(), gate = deferred();
  let active = 0, peak = 0;
  const terrain = new TerrainService({ directory, renderer: async (input, signal) => {
    active++; peak = Math.max(peak, active);
    if (active === 2) ready.resolve();
    try { await gate.promise; signal.throwIfAborted(); return await renderer.render(input, signal); }
    finally { active--; }
  } });
  const request = (x: number) => {
    const bounds = displayRasterBounds({ grid: DISPLAY_RASTER_GRID, zoom: 12, x, y: 1700, span: 2, tilePixels: 256 });
    return { purpose: "MAP" as const, center: { system: "GCJ02" as const,
      latitude: (bounds.north + bounds.south) / 2, longitude: (bounds.west + bounds.east) / 2 }, viewportBounds: bounds };
  };
  const pending = Promise.all([terrain.getPublication(request(3344)), terrain.getPublication(request(3345))]);
  let deadline: ReturnType<typeof setTimeout> | undefined;
  try {
    await Promise.race([ready.promise, new Promise<never>((_, reject) => {
      deadline = setTimeout(() => reject(new Error("concurrent source readers did not start")), 2000);
    })]);
    clearTimeout(deadline); gate.resolve();
    const results = await pending;
    assert.equal(peak, 2);
    for (const result of results) {
      assert.ok(result?.fixedWindow); assert.equal(result.sourceIssues?.length ?? 0, 0);
      assert.ok(result.fixedWindow.cells.every(cell => cell.file && cell.publicationId));
      assert.ok((await terrain.getAsset(result.image.file)).bytes.length > 0);
    }
  } finally {
    clearTimeout(deadline); gate.resolve(); terrain.close(); await pending.catch(() => undefined);
    renderer.close(); await rm(directory, { recursive: true, force: true });
  }
});

test("cached cells between new neighbours do not serialize their source reads", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "starward-window-cached-neighbours-"));
  const source = continuousSource(), renderer = createTerrainViewportRenderer(source.transport);
  const gate = deferred(), ready = deferred(); let hold = false, started = 0;
  const terrain = new TerrainService({ directory, renderer: async (input, signal) => {
    if (hold) { if (++started === 2) ready.resolve(); await gate.promise; }
    signal.throwIfAborted(); return renderer.render(input, signal);
  } });
  const cell = { grid: DISPLAY_RASTER_GRID, zoom: 12, x: 3344, y: 1700, span: 1 as const, tilePixels: 256 as const };
  let publication: ReturnType<TerrainService["getPublication"]> | undefined, deadline: ReturnType<typeof setTimeout> | undefined;
  try {
    await terrain.prepareFixedCell(cell); await terrain.prepareFixedCell({ ...cell, y: cell.y + 1 });
    hold = true;
    const bounds = displayRasterBounds({ ...cell, span: 2 });
    publication = terrain.getPublication({ purpose: "MAP", center: { system: "GCJ02", latitude: (bounds.north + bounds.south) / 2,
      longitude: (bounds.west + bounds.east) / 2 }, viewportBounds: bounds });
    await Promise.race([ready.promise, new Promise<never>((_, reject) => {
      deadline = setTimeout(() => reject(new Error("cached middle cell serialized new neighbours")), 2000);
    })]);
    clearTimeout(deadline); gate.resolve();
    const result = await publication;
    assert.equal(started, 2); assert.equal(result?.fixedWindow?.cells.length, 4);
    assert.deepEqual(result?.sourceIssues, []);
  } finally {
    clearTimeout(deadline); gate.resolve(); terrain.close(); await publication?.catch(() => undefined); renderer.close();
    assert.equal(path.dirname(directory), path.resolve(tmpdir())); await rm(directory, { recursive: true, force: true });
  }
});

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
