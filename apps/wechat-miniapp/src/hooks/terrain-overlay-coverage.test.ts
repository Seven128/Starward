import assert from "node:assert/strict";
import test from "node:test";
import { DISPLAY_RASTER_GRID, displayRasterWindowBounds } from "@starward/coordinate-system";
import { MAP_TERRAIN_SUPPORTED_BOUNDS, type TerrainBounds, type TerrainOverlayRequest } from "@starward/miniapp-contracts";
import { terrainCoverageForRequest, terrainPreviewForRequest, terrainRequestForCoverage } from "./terrain-overlay-coverage.ts";
import { terrainOverlayRequestWindow } from "../services/terrain-overlay-request.ts";

const bounds = displayRasterWindowBounds({ grid: DISPLAY_RASTER_GRID, zoom: 10, x: 836, y: 425,
  columns: 3, rows: 3, tilePixels: 256 });
const inset = (fraction: number, xShift = 0): TerrainBounds => {
  const width = bounds.east - bounds.west, height = bounds.north - bounds.south;
  return { west: bounds.west + width * (fraction + xShift), east: bounds.east - width * (fraction - xShift),
    south: bounds.south + height * fraction, north: bounds.north - height * fraction };
};
const request = (viewportBounds: TerrainBounds): Extract<TerrainOverlayRequest, { viewportBounds: TerrainBounds }> => ({ purpose: "MAP", viewportBounds,
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

test("leaving supported terrain does not inherit a supported request through transparent fixed-window edges", () => {
  const edge = MAP_TERRAIN_SUPPORTED_BOUNDS.east;
  const supported = request({ west: edge - .001, east: edge + .002, south: 22.61, north: 22.63 });
  const actualBounds = { west: edge - .01, east: edge + .01, south: 22.60, north: 22.64 };
  const coverage = terrainCoverageForRequest(supported, { ...available, state: "PARTIAL", imageBoundsGcj02: actualBounds });
  assert.ok(coverage);
  const outside = request({ west: edge + .001, east: edge + .003, south: 22.61, north: 22.63 });
  assert.equal(terrainRequestForCoverage(outside, coverage), outside);
});

test("invalid centre/bounds cannot inherit an older successful request or enter the coverage cache", () => {
  const coverage = terrainCoverageForRequest(first, available)!;
  const outsideCenter = { ...first, center: { ...first.center, longitude: first.viewportBounds!.east + .1 } };
  const invalidBounds = { ...first, viewportBounds: { ...first.viewportBounds!, west: Number.NaN } };
  for (const invalid of [outsideCenter, invalidBounds]) {
    assert.equal(terrainRequestForCoverage(invalid, coverage), invalid);
    assert.equal(terrainCoverageForRequest(invalid, available), null);
  }
});

test("a parent covers the complete requested fixed window but never satisfies its fine coverage", () => {
  const fine = terrainOverlayRequestWindow(first)!;
  const parent = { ...available, preview: { requestedZoom: fine.zoom, imageZoom: fine.zoom - 1 } };
  assert.ok(terrainPreviewForRequest(first, parent as any));
  assert.equal(terrainCoverageForRequest(first, parent), null, "temporary detail cannot suppress the fine request");
  for (const invalid of [
    { ...parent, preview: undefined },
    { ...parent, preview: { requestedZoom: fine.zoom + 1, imageZoom: fine.zoom - 1 } },
    { ...parent, preview: { requestedZoom: fine.zoom, imageZoom: fine.zoom } },
    { ...parent, imageBoundsGcj02: first.viewportBounds },
    { ...parent, failureCode: "TERRAIN_READ_FAILED" },
  ]) assert.equal(terrainPreviewForRequest(first, invalid as any), null);
});
