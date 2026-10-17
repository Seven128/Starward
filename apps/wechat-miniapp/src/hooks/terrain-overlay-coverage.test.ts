import assert from "node:assert/strict";
import test from "node:test";
import { DISPLAY_RASTER_GRID, displayRasterWindowBounds } from "@starward/coordinate-system";
import type { TerrainBounds, TerrainOverlayRequest } from "@starward/miniapp-contracts";
import { terrainCoverageForRequest, terrainRequestForCoverage } from "./terrain-overlay-coverage.ts";

const bounds = displayRasterWindowBounds({ grid: DISPLAY_RASTER_GRID, zoom: 10, x: 836, y: 425,
  columns: 3, rows: 3, tilePixels: 256 });
const inset = (fraction: number, xShift = 0): TerrainBounds => {
  const width = bounds.east - bounds.west, height = bounds.north - bounds.south;
  return { west: bounds.west + width * (fraction + xShift), east: bounds.east - width * (fraction - xShift),
    south: bounds.south + height * fraction, north: bounds.north - height * fraction };
};
const request = (viewportBounds: TerrainBounds): TerrainOverlayRequest => ({ purpose: "MAP", viewportBounds,
  center: { system: "GCJ02", latitude: (viewportBounds.north + viewportBounds.south) / 2,
    longitude: (viewportBounds.east + viewportBounds.west) / 2 } });
const first = request(inset(0.2));
const available = { purpose: "MAP" as const, state: "AVAILABLE" as const,
  imageUrl: "/v2/terrain/assets/current.png", imageBoundsGcj02: bounds };

test("moving inside successful coverage retains the exact issued request, while an uncovered edge requests new data", () => {
  const coverage = terrainCoverageForRequest(first, available)!;
  assert.ok(coverage);
  assert.equal(terrainRequestForCoverage(request(inset(0.2, 0.1)), coverage), coverage.request);
  assert.deepEqual(coverage.request, first, "cached metadata retains the request it actually describes");
  const outside = request(inset(0.2, 0.3));
  assert.equal(terrainRequestForCoverage(outside, coverage), outside);
});

test("finer zoom requests finer detail even within old coverage; zooming out can reuse an adequately detailed covering image", () => {
  const coverage = terrainCoverageForRequest(first, available)!;
  const fine = request(inset(0.35));
  assert.equal(terrainRequestForCoverage(fine, coverage), fine);
  assert.equal(terrainRequestForCoverage(request(inset(0.15)), coverage), coverage.request);
});

test("failure, missing and malformed coverage cannot suppress recovery; a valid partial image keeps its original coverage", () => {
  for (const data of [undefined, { ...available, state: "UNAVAILABLE" as const },
    { ...available, failureCode: "TERRAIN_READ_FAILED" as const }, { ...available, imageUrl: null },
    { ...available, imageBoundsGcj02: inset(0.3) },
    { ...available, imageBoundsGcj02: { ...bounds, east: Number.NaN } }]) {
    assert.equal(terrainCoverageForRequest(first, data), null);
  }
  const partial = terrainCoverageForRequest(first, { ...available, state: "PARTIAL" });
  assert.ok(partial); assert.deepEqual(partial.bounds, bounds);
});

test("selected Spot identities and radius never inherit the Map's retained request", () => {
  const coverage = terrainCoverageForRequest(first, available)!;
  const spot: TerrainOverlayRequest = { purpose: "SPOT", center: { ...first.center }, radiusKm: 5 };
  assert.equal(terrainRequestForCoverage(spot, coverage), spot);
  assert.equal(terrainCoverageForRequest(spot, { ...available, purpose: "SPOT" }), null);
});
