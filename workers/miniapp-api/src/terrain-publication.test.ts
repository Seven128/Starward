import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import { TEST_PUBLISHED_SPOT } from "@starward/miniapp-contracts/test-fixtures";
import { createTestMiniappService } from "./test-fixtures/create-test-service.ts";
import { InMemoryTestRepository } from "./test-fixtures/in-memory-repository.ts";
import { terrainPublication, terrainPublicationSource, validateTerrainAsset, validateTerrainPublication } from "./terrain-publication.ts";
import type { DarkSkyGridCellRecord } from "./ports.ts";

const independentLightCell: DarkSkyGridCellRecord = {
  cellId: "test-light-outside-terrain", datasetVersion: "test-dark-sky", productBand: "LOW", label: "测试夜光网格",
  radiance: { median: 0, p10: 0, p90: 0, unit: "nW/cm²/sr" }, minimumCloudFreeObservations: 8,
  boundsWgs84: { west: 119.99, south: 29.99, east: 120.01, north: 30.01 }, state: "ESTIMATED",
  source: { id: "test-light-source", kind: "OFFICIAL_REFERENCE", provider: "测试夜光数据", title: "测试年度夜光",
    sourceUrl: "https://example.org/test-light", license: "自有测试数据", licenseUrl: "https://example.org/test-license", publishedAt: null,
    retrievedAt: "2026-09-15T00:00:00Z", validFrom: null, validTo: null, state: "FRESH", confidence: null, precision: "测试网格", limitations: [] },
};

function repositoryWithLight(read: () => Promise<DarkSkyGridCellRecord[]>) {
  const repository = new InMemoryTestRepository();
  // Controlled PostgreSQL read boundary; this test does not establish real EOG publication.
  Object.defineProperty(repository, "kind", { value: "postgres" });
  Object.defineProperty(repository, "listDarkSkyGridCells", { value: read });
  return repository;
}

test("terrain outside coverage preserves independently available annual light cells, including zero radiance", async () => {
  const service = createTestMiniappService({ repository: repositoryWithLight(async () => [independentLightCell]) });
  try {
    const result = await service.getTerrainOverlay({ purpose: "SPOT", center: { system: "GCJ02", latitude: 30, longitude: 120 }, radiusKm: 5 });
    assert.equal(result.data.state, "UNAVAILABLE");
    assert.equal(result.data.imageUrl, null);
    assert.equal(result.data.lightPollution.cells[0]?.id, independentLightCell.cellId);
    assert.equal(result.data.lightPollution.cells[0]?.radiance, 0);
    assert.equal(result.data.lightPollution.source?.id, independentLightCell.source.id);
    assert.equal(result.dataState, "PARTIAL");
  } finally { await service.onModuleDestroy(); }
});

test("light read failure preserves published terrain and distinguishes failed light from uncovered light", async () => {
  const service = createTestMiniappService({ repository: repositoryWithLight(async () => { throw new Error("database_read_failed"); }) });
  try {
    const result = await service.getTerrainOverlay({ purpose: "SPOT", center: { system: "GCJ02", latitude: TEST_PUBLISHED_SPOT.gcj02.latitude, longitude: TEST_PUBLISHED_SPOT.gcj02.longitude }, radiusKm: 5 });
    assert.notEqual(result.data.state, "UNAVAILABLE");
    assert.ok(result.data.imageUrl);
    assert.ok(result.data.elevationColorEncoding, "a light-layer failure must preserve terrain colour meaning");
    assert.equal(result.data.lightPollution.failureCode, "LIGHT_READ_FAILED");
    assert.equal(result.dataState, "PARTIAL");
  } finally { await service.onModuleDestroy(); }
});

test("terrain colour encoding is optional for legacy publications and rejects unbound or misleading metadata", async () => {
  const publication = await terrainPublication();
  const legacy = structuredClone(publication);
  delete legacy.elevationColorEncoding;
  assert.equal(validateTerrainPublication(legacy), legacy);
  assert.ok(!terrainPublicationSource(legacy).limitations.some(limit => limit.includes("高程色带")));

  const malformed: Record<string, unknown>[] = [
    { format: "unknown" },
    { imageSha256: "0".repeat(64) },
    { minimumM: Number.NaN },
    { maximumM: publication.elevationColorEncoding!.minimumM },
    { minimumM: -Number.MAX_VALUE, maximumM: Number.MAX_VALUE },
    { lowRgb: [215, 224] },
    { highRgb: [112, 139, 256] },
    { lowRgb: [215, 224, 207.5] },
    { alpha: 0 },
    { clipping: "NONE" },
    { shading: "FIELD_LIGHT" },
  ];
  for (const mutation of malformed) {
    const candidate = { ...publication, elevationColorEncoding: { ...publication.elevationColorEncoding!, ...mutation } };
    assert.throws(() => validateTerrainPublication(candidate as typeof publication), /terrain_elevation_color_encoding_invalid/u,
      `invalid colour metadata ${Object.keys(mutation).join(",")} must not be published`);
  }
});

test("published GLO-30 terrain is hash-bound, GCJ-02 registered and range gated", async () => {
  const service = createTestMiniappService({ repository: new InMemoryTestRepository([TEST_PUBLISHED_SPOT]) });
  try {
    const publication = await terrainPublication();
    const covered = await service.getTerrainOverlay({
      purpose: "SPOT",
      center: { system: "GCJ02", latitude: TEST_PUBLISHED_SPOT.gcj02.latitude, longitude: TEST_PUBLISHED_SPOT.gcj02.longitude },
      radiusKm: 50,
    });
    assert.notEqual(covered.data.state, "UNAVAILABLE");
    assert.equal(covered.data.coordinateTransformVersion, "starward-wgs84-gcj02-grid-v1");
    assert.equal(covered.data.source?.licenseUrl, publication.licenseUrl);
    assert.ok(covered.data.source?.limitations.includes(publication.attributionNotice));
    assert.ok(covered.data.source?.limitations.includes(publication.modifiedProductNotice));
    assert.ok(covered.sources.some(source => source.id === covered.data.source?.id));
    assert.ok(covered.data.elevationColorEncoding, "the raster's elevation colour must have a published meaning");
    assert.equal(covered.data.elevationColorEncoding.format, "starward-terrain-elevation-color-v1");
    assert.equal(covered.data.elevationColorEncoding.imageSha256, publication.image.sha256);
    assert.equal(covered.data.elevationColorEncoding.minimumM, -20);
    assert.equal(covered.data.elevationColorEncoding.maximumM, 880);
    assert.deepEqual(covered.data.elevationColorEncoding.lowRgb, [215, 224, 207]);
    assert.deepEqual(covered.data.elevationColorEncoding.highRgb, [112, 139, 104]);
    assert.equal(covered.data.elevationColorEncoding.alpha, 224);
    assert.equal(covered.data.elevationColorEncoding.clipping, "CLAMP");
    assert.equal(covered.data.elevationColorEncoding.shading, "SYNTHETIC_HILLSHADE");
    assert.match(covered.data.source!.limitations.join(" "), /合成阴影.*精确海拔/);
    assert.match(covered.data.imageUrl ?? "", /^\/v2\/terrain\/assets\/.+\.png$/u);
    assert.equal(covered.data.lightPollution.state, "UNAVAILABLE", "synthetic point estimates must not become a raster");
    const file = (covered.data.imageUrl ?? "").split("/").at(-1)!;
    const asset = await service.getTerrainAsset(file);
    assert.equal(asset.bytes.byteLength, publication.image.byteSize);
    assert.equal(createHash("sha256").update(asset.bytes).digest("hex"), publication.image.sha256);
    assert.equal(validateTerrainAsset(asset.bytes, publication), asset.bytes);
    const altered = Buffer.from(asset.bytes);
    altered[altered.byteLength - 1] ^= 0xff;
    assert.throws(() => validateTerrainAsset(altered, publication), /terrain_asset_hash_mismatch/u);

    const wrongDimensions = { ...publication, image: { ...publication.image, width: publication.image.width + 1, sha256: createHash("sha256").update(asset.bytes).digest("hex") } };
    assert.throws(() => validateTerrainAsset(asset.bytes, wrongDimensions), /terrain_asset_dimensions_mismatch/u);

    const outside = await service.getTerrainOverlay({ purpose: "MAP", center: { system: "GCJ02", latitude: 30, longitude: 120 }, radiusKm: 5 });
    assert.equal(outside.data.state, "UNAVAILABLE");
    assert.equal(outside.data.imageUrl, null);
    assert.equal(outside.data.elevationColorEncoding, null);
  } finally {
    await service.onModuleDestroy();
  }
});
