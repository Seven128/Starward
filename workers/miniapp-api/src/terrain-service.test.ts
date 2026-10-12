import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, rm } from "node:fs/promises";
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
    const base = await terrainPublication();
    const png = new PNG({ width: 2, height: 2 });
    png.data.set([215,224,207,224, 180,200,175,224, 140,170,130,224, 112,139,104,224]);
    const bytes = PNG.sync.write(png), imageHash = sha256(bytes);
    const ranges = [{ offset: 0, byteSize: 4, sha256: sha256("test") }];
    return { bytes, publication: { ...base, schemaVersion: "starward-terrain-publication-v2",
      publicationId: `terrain:test:${imageHash}`, centerGcj02: request.center, maximumRadiusKm: request.radiusKm,
      boundsGcj02: terrainBounds(request), derivation: "Controlled renderer fixture; not geographic coverage evidence.",
      validPixelPercent: 100, unavailableSourceTiles: [],
      image: { file: `${terrainRequestKey(request)}-${imageHash}.png`, sha256: imageHash, byteSize: bytes.length, width: 2, height: 2 },
      elevationColorEncoding: { ...base.elevationColorEncoding!, imageSha256: imageHash },
      sources: [{ tileId: "controlled-test", url: "https://example.org/controlled-test", sha256: sha256(JSON.stringify(ranges)),
        byteSize: 4, etag: "test-etag", hashScope: "RETRIEVED_RANGES", ranges }],
    } };
  };
}

test("Map and Spot return the same actual terrain asset outside the bundled region", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "starward-terrain-owner-test-"));
  const terrain = new TerrainService({ directory, renderer: controlledRenderer() });
  const service = createTestMiniappService({ terrain });
  try {
    const map = await service.getTerrainOverlay(input);
    const spot = await service.getTerrainOverlay({ ...input, purpose: "SPOT" });
    assert.equal(map.data.state, "AVAILABLE");
    assert.equal(spot.data.publicationId, map.data.publicationId);
    assert.equal(spot.data.imageUrl, map.data.imageUrl);
    assert.deepEqual(map.data.imageBoundsGcj02, terrainBounds(input));
    const image = await service.getTerrainAsset(map.data.imageUrl!.split("/").at(-1)!);
    assert.equal(PNG.sync.read(image.bytes).data[3], 224, "nonempty metadata alone must not count as a returned terrain image");
    assert.equal(sha256(image.bytes), map.data.elevationColorEncoding?.imageSha256);
  } finally { await service.onModuleDestroy(); await rm(directory, { recursive: true, force: true }); }
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
