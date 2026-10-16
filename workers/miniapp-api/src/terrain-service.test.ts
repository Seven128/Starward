import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { PNG } from "pngjs";
import type { TerrainOverlayRequest } from "@starward/miniapp-contracts";
import { terrainPublication } from "./terrain-publication.ts";
import { terrainBounds, terrainRequestKey, type TerrainRenderer } from "./terrain-renderer.ts";
import { TerrainService } from "./terrain-service.ts";
import { createTestMiniappService } from "./test-fixtures/create-test-service.ts";

const input: TerrainOverlayRequest = { purpose: "MAP", center: { system: "GCJ02", latitude: 30.27, longitude: 120.15 }, radiusKm: 5 };
const sha256 = (bytes: Buffer | string) => createHash("sha256").update(bytes).digest("hex");

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
