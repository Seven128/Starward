import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { PNG } from "pngjs";
import type { TerrainOverlayRequest } from "@starward/miniapp-contracts";
import { terrainPublication } from "./terrain-publication.ts";
import { terrainBounds, terrainRequestKey, TERRAIN_LEGACY_MAP_RENDER_VERSION, type TerrainRenderer, type TerrainRenderRequest } from "./terrain-renderer.ts";
import { TerrainService } from "./terrain-service.ts";
import { createTestMiniappService } from "./test-fixtures/create-test-service.ts";

const input: TerrainOverlayRequest = { purpose: "MAP", center: { system: "GCJ02", latitude: 30.27, longitude: 120.15 }, radiusKm: 5 };
const sha256 = (bytes: Buffer | string) => createHash("sha256").update(bytes).digest("hex");

test("cancelling one viewport reader preserves another reader of the same source", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "starward-terrain-shared-abort-"));
  let entered!: () => void, release!: () => void, sourceSignal!: AbortSignal, calls = 0;
  const started = new Promise<void>(resolve => { entered = resolve; });
  const gate = new Promise<void>(resolve => { release = resolve; });
  const renderer = controlledRenderer();
  const terrain = new TerrainService({ directory, renderer: async (request, signal) => {
    calls++; sourceSignal = signal; entered();
    await Promise.race([gate, new Promise<never>((_, reject) => signal.addEventListener("abort", () => reject(signal.reason), { once: true }))]);
    return renderer(request, signal);
  } });
  const first = new AbortController(), second = new AbortController();
  try {
    const cancelled = assert.rejects(terrain.getPublication(input, first.signal), /superseded/);
    const retained = terrain.getPublication(input, second.signal);
    await started;
    first.abort(new Error("superseded"));
    await cancelled;
    assert.equal(sourceSignal.aborted, false, "another phone still owns this same computation");
    release();
    assert.ok(await retained);
    assert.equal(calls, 1);
  } finally { release(); terrain.close(); await rm(directory, { recursive: true, force: true }); }
});

test("abandoned viewports release both existing source slots for the latest zoom", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "starward-terrain-zoom-abort-"));
  let entered!: () => void, active = 0, peak = 0;
  const started = new Promise<void>(resolve => { entered = resolve; });
  const signals: AbortSignal[] = [], renderer = controlledRenderer();
  const terrain = new TerrainService({ directory, renderer: async (request, signal) => {
    active++; peak = Math.max(peak, active);
    try {
      if (request.radiusKm < 8) {
        signals.push(signal); if (signals.length === 2) entered();
        await new Promise<never>((_, reject) => signal.addEventListener("abort", () => reject(signal.reason), { once: true }));
      }
      return await renderer(request, signal);
    } finally { active--; }
  } });
  const first = new AbortController(), second = new AbortController();
  try {
    const abandoned = [assert.rejects(terrain.getPublication({ ...input, radiusKm: 6 }, first.signal), /superseded/),
      assert.rejects(terrain.getPublication({ ...input, radiusKm: 7 }, second.signal), /superseded/)];
    await started;
    await assert.rejects(terrain.getPublication({ ...input, radiusKm: 9 }), /terrain_busy_retry/);
    first.abort(new Error("superseded")); second.abort(new Error("superseded"));
    await Promise.all(abandoned);
    await new Promise<void>(resolve => setImmediate(resolve));
    assert.equal(signals.every(signal => signal.aborted), true);
    assert.equal((await terrain.getPublication({ ...input, radiusKm: 8 }))?.maximumRadiusKm, 8);
    assert.equal(peak, 2, "cancellation must not increase the source concurrency budget");
  } finally { first.abort(); second.abort(); terrain.close(); await rm(directory, { recursive: true, force: true }); }
});

function controlledRenderer(): TerrainRenderer {
  return async request => {
    const { elevationColorEncoding, ...base } = await terrainPublication();
    const png = new PNG({ width: 2, height: 2 });
    const map = request.purpose === "MAP";
    png.data.set(map ? [112,139,104,0, 112,139,104,30, 112,139,104,80, 112,139,104,130]
      : [215,224,207,224, 180,200,175,224, 140,170,130,224, 112,139,104,224]);
    const bytes = PNG.sync.write(png), imageHash = sha256(bytes);
    const ranges = [{ offset: 0, byteSize: 4, sha256: sha256("test") }];
    return { bytes, publication: { ...base, schemaVersion: "starward-terrain-publication-v2",
      publicationId: `terrain:test:${imageHash}`, centerGcj02: request.center, maximumRadiusKm: request.radiusKm,
      boundsGcj02: terrainBounds(request), derivation: "Controlled renderer fixture; not geographic coverage evidence.",
      validPixelPercent: 100, unavailableSourceTiles: [],
      image: { file: `${terrainRequestKey(request)}-${imageHash}.png`, sha256: imageHash, byteSize: bytes.length, width: 2, height: 2 },
      imageStyle: map ? "RELIEF_OVERLAY" : "ELEVATION_COLOR",
      ...(map ? {} : { elevationColorEncoding: { ...elevationColorEncoding!, imageSha256: imageHash } }),
      sources: [{ tileId: "controlled-test", url: "https://example.org/controlled-test", sha256: sha256(JSON.stringify(ranges)),
        byteSize: 4, etag: "test-etag", hashScope: "RETRIEVED_RANGES", ranges }],
    } };
  };
}

test("cancelling an evicted asset reconstruction releases its source before the same viewport retries", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "starward-terrain-asset-abort-"));
  const renderer = controlledRenderer();
  const previous = await renderer(input, new AbortController().signal);
  assert.ok(previous);
  let entered!: () => void, sourceSignal!: AbortSignal, calls = 0, active = false;
  const started = new Promise<void>(resolve => { entered = resolve; });
  const terrain = new TerrainService({ directory, renderer: async (request, signal) => {
    calls++;
    if (calls === 1) {
      sourceSignal = signal; active = true; entered();
      try { await new Promise<never>((_, reject) => signal.addEventListener("abort", () => reject(signal.reason), { once: true })); }
      finally { active = false; }
    }
    return renderer(request, signal);
  } });
  const controller = new AbortController();
  try {
    const cancelled = assert.rejects(terrain.getAsset(previous.publication.image.file, controller.signal), /superseded/);
    await started;
    controller.abort(new Error("superseded"));
    await cancelled;
    const recovered = await terrain.getPublication(input);
    assert.equal(sourceSignal.aborted, true);
    assert.equal(active, false);
    assert.equal(calls, 2);
    assert.equal(recovered?.image.file, previous.publication.image.file);
  } finally { controller.abort(); terrain.close(); await rm(directory, { recursive: true, force: true }); }
});

test("Map and Spot share the source owner while returning their own compositable image products", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "starward-terrain-owner-test-"));
  const terrain = new TerrainService({ directory, renderer: controlledRenderer() });
  const service = createTestMiniappService({ terrain });
  try {
    const map = await service.getTerrainOverlay(input);
    const spot = await service.getTerrainOverlay({ ...input, purpose: "SPOT" });
    assert.equal(map.data.state, "AVAILABLE");
    assert.notEqual(spot.data.imageUrl, map.data.imageUrl);
    assert.equal(map.data.imageStyle, "RELIEF_OVERLAY");
    assert.equal(map.data.elevationColorEncoding, null);
    assert.equal(spot.data.imageStyle, "ELEVATION_COLOR");
    assert.deepEqual(map.data.source?.attribution, spot.data.source?.attribution);
    assert.deepEqual(map.data.imageBoundsGcj02, terrainBounds(input));
    const image = await service.getTerrainAsset(map.data.imageUrl!.split("/").at(-1)!);
    assert.equal(PNG.sync.read(image.bytes).data[15], 130, "the actual Map bytes must contain the controlled slope shadow");
    const spotImage = await service.getTerrainAsset(spot.data.imageUrl!.split("/").at(-1)!);
    assert.equal(PNG.sync.read(spotImage.bytes).data[3], 224);
    assert.equal(sha256(spotImage.bytes), spot.data.elevationColorEncoding?.imageSha256);
  } finally { await service.onModuleDestroy(); await rm(directory, { recursive: true, force: true }); }
});

test("a bundled-region Map request reaches the relief renderer rather than stretching the 85 km elevation image", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "starward-terrain-map-purpose-"));
  const bundled = await terrainPublication(), calls: string[] = [];
  const renderer = controlledRenderer();
  const terrain = new TerrainService({ directory, renderer: async (request, signal) => {
    calls.push(request.purpose); return renderer(request, signal);
  } });
  const request = { ...input, center: { system: "GCJ02" as const, ...bundled.centerGcj02 } };
  try {
    const map = await terrain.getPublication(request);
    assert.equal(map?.imageStyle, "RELIEF_OVERLAY");
    assert.equal(map?.maximumRadiusKm, 5);
    assert.equal((await terrain.getPublication({ ...request, purpose: "SPOT" }))?.publicationId, bundled.publicationId);
    assert.deepEqual(calls, ["MAP"]);
  } finally { terrain.close(); await rm(directory, { recursive: true, force: true }); }
});

test("a legacy v1 dynamic asset inside the bundled region stays readable without switching to a different publication", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "starward-terrain-legacy-url-"));
  const bundled = await terrainPublication();
  const request = { ...input, purpose: "SPOT" as const, center: { system: "GCJ02" as const, ...bundled.centerGcj02 } };
  const legacy = await controlledRenderer()(request, new AbortController().signal);
  assert.ok(legacy);
  await writeFile(path.join(directory, legacy.publication.image.file), legacy.bytes);
  await writeFile(path.join(directory, `${terrainRequestKey(request)}.json`), JSON.stringify(legacy.publication));
  const terrain = new TerrainService({ directory, renderer: async () => { throw new Error("legacy_asset_must_not_be_regenerated"); } });
  try {
    const asset = await terrain.getAsset(legacy.publication.image.file);
    assert.equal(sha256(asset.bytes), legacy.publication.image.sha256);
  } finally { terrain.close(); await rm(directory, { recursive: true, force: true }); }
});

test("previous v2 Map URLs keep their own cache and hash after the contrast version changes", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "starward-terrain-v2-map-url-"));
  const request: TerrainRenderRequest = { ...input, renderVersion: TERRAIN_LEGACY_MAP_RENDER_VERSION };
  const legacy = await controlledRenderer()(request, new AbortController().signal);
  assert.ok(legacy);
  await writeFile(path.join(directory, legacy.publication.image.file), legacy.bytes);
  await writeFile(path.join(directory, `${terrainRequestKey(request)}.json`), JSON.stringify(legacy.publication));
  const terrain = new TerrainService({ directory, renderer: async () => { throw new Error("legacy_map_must_not_be_regenerated"); } });
  try {
    assert.match(terrainRequestKey(input), /^glo30-cn-v3-map-/);
    assert.notEqual(terrainRequestKey(request), terrainRequestKey(input));
    assert.equal(sha256((await terrain.getAsset(legacy.publication.image.file)).bytes), legacy.publication.image.sha256);
  } finally { terrain.close(); await rm(directory, { recursive: true, force: true }); }
});

test("a precise request's published image remains hash-bound and readable by a new owner without another source fetch", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "starward-terrain-reload-test-"));
  const first = new TerrainService({ directory, renderer: controlledRenderer() });
  const restored = new TerrainService({ directory, renderer: async () => { throw new Error("unexpected_repeat_source_fetch"); } });
  try {
    const publication = await first.getPublication({ ...input, center: { system: "GCJ02", latitude: 30.271234567, longitude: 120.151234567 }, radiusKm: 5.00134 });
    assert.ok(publication);
    first.close();
    const asset = await restored.getAsset(publication.image.file);
    assert.equal(sha256(asset.bytes), publication.image.sha256);
    assert.equal(asset.publicationId, publication.publicationId);
  } finally { first.close(); restored.close(); await rm(directory, { recursive: true, force: true }); }
});
