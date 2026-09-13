import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import { TEST_PUBLISHED_SPOT } from "@starward/miniapp-contracts/test-fixtures";
import { createTestMiniappService } from "./test-fixtures/create-test-service.ts";
import { InMemoryTestRepository } from "./test-fixtures/in-memory-repository.ts";
import { terrainPublication } from "./terrain-publication.ts";

test("published GLO-30 terrain is hash-bound, GCJ-02 registered and range gated", async () => {
  const service = createTestMiniappService({ repository: new InMemoryTestRepository([TEST_PUBLISHED_SPOT]) });
  try {
    const covered = await service.getTerrainOverlay({
      purpose: "SPOT",
      center: { system: "GCJ02", latitude: TEST_PUBLISHED_SPOT.gcj02.latitude, longitude: TEST_PUBLISHED_SPOT.gcj02.longitude },
      radiusKm: 50,
    });
    assert.notEqual(covered.data.state, "UNAVAILABLE");
    assert.equal(covered.data.coordinateTransformVersion, "starward-wgs84-gcj02-grid-v1");
    assert.match(covered.data.imageUrl ?? "", /^\/v2\/terrain\/assets\/.+\.png$/u);
    assert.equal(covered.data.lightPollution.state, "UNAVAILABLE", "synthetic point estimates must not become a raster");
    const file = (covered.data.imageUrl ?? "").split("/").at(-1)!;
    const asset = await service.getTerrainAsset(file);
    const publication = await terrainPublication();
    assert.equal(asset.bytes.byteLength, publication.image.byteSize);
    assert.equal(createHash("sha256").update(asset.bytes).digest("hex"), publication.image.sha256);

    const outside = await service.getTerrainOverlay({ purpose: "MAP", center: { system: "GCJ02", latitude: 30, longitude: 120 }, radiusKm: 5 });
    assert.equal(outside.data.state, "UNAVAILABLE");
    assert.equal(outside.data.imageUrl, null);
  } finally {
    await service.onModuleDestroy();
  }
});
