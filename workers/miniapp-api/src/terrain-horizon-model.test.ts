import assert from "node:assert/strict";
import test from "node:test";
import { computeTerrainHorizon, readTerrainHorizonModel, terrainElevationAngle } from "./terrain-horizon-model.ts";
import { copernicusTestSource } from "./test-fixtures/copernicus-test-source.ts";

const observer = { system: "WGS84" as const, lat: 22.6, lon: 114.05 };
const signal = () => new AbortController().signal;
type Window = Parameters<typeof computeTerrainHorizon>[0][number] & { values: Float32Array };
function grid(size = 201, spacing = 1 / 3600): Window {
  const half = (size - 1) / 2;
  return { selection: "NATIVE", values: new Float32Array(size * size).fill(100), left: 0, top: 0,
    width: size, height: size, pixelX: spacing, pixelY: -spacing, noData: -32767, pixelIsArea: false,
    origin: [observer.lon - half * spacing, observer.lat + half * spacing, 0],
    nativeResolution: [spacing, -spacing, 0], west: observer.lon - half * spacing,
    north: observer.lat + half * spacing, source: { tileId: "synthetic", url: "https://example.invalid/synthetic",
      sha256: "a".repeat(64), byteSize: 1, etag: '"fixture"', hashScope: "RETRIEVED_RANGES", ranges: [] } };
}

test("Point and Area grids with the same physical samples retain station and true-north directions", async () => {
  const point = grid();
  point.values[100 * 201 + 160] = 600;
  const area = { ...point, pixelIsArea: true, origin: [point.origin[0] - point.pixelX / 2, point.origin[1] - point.pixelY / 2, 0] };
  const a = await computeTerrainHorizon([point], observer, 2000, 2, signal());
  const b = await computeTerrainHorizon([area], observer, 2000, 2, signal());
  assert.equal(a.status, "COMPLETE");
  assert.equal(a.observerElevationM, 100);
  assert.ok(a.sectors[90].elevationDegrees! > 10);
  assert.ok(a.sectors[270].elevationDegrees! < 0);
  assert.deepEqual(a.sectors.map(sector => sector.sampleCount), b.sectors.map(sector => sector.sampleCount));
  for (let i = 0; i < 360; i++) assert.ok(Math.abs(a.sectors[i].elevationDegrees! - b.sectors[i].elevationDegrees!) < 1e-8);
});

test("nodata marks its affected direction unknown while retaining independent valid sectors", async () => {
  const window = grid(); window.values[100 * 201 + 130] = -32767;
  const result = await computeTerrainHorizon([window], observer, 2000, 2, signal());
  assert.equal(result.status, "PARTIAL");
  assert.equal(result.sectors[90].elevationDegrees, null);
  assert.ok(result.sectors[270].elevationDegrees! < 0);
  assert.ok(result.knownSectors > 300);
  window.values[100 * 201 + 100] = -32767;
  const missingStation = await computeTerrainHorizon([window], observer, 2000, 2, signal());
  assert.equal(missingStation.status, "UNAVAILABLE");
  assert.equal(missingStation.observerElevationM, null);
  assert.ok(missingStation.sectors.every(sector => sector.elevationDegrees === null));
});

test("absent western source coverage cannot be filled by valid eastern terrain", async () => {
  const whole = grid(), values = new Float32Array(101 * 201).fill(100);
  const east = { ...whole, left: 100, width: 101, values };
  const result = await computeTerrainHorizon([east], observer, 2000, 2, signal());
  assert.equal(result.status, "PARTIAL");
  assert.equal(result.sectors[270].elevationDegrees, null);
  assert.ok(result.sectors[90].elevationDegrees! < 0);
});

test("missing bbox corners outside the analysis circle do not invalidate its real coverage", async () => {
  const whole = grid(), baseline = await computeTerrainHorizon([whole], observer, 2000, 2, signal());
  const left = { ...whole, width: 154, values: new Float32Array(154 * 201).fill(100) };
  const bottomRight = { ...whole, left: 154, top: 47, width: 47, height: 154, values: new Float32Array(47 * 154).fill(100) };
  const result = await computeTerrainHorizon([left, bottomRight], observer, 2000, 2, signal());
  assert.equal(result.status, "COMPLETE");
  assert.deepEqual(result.sectors, baseline.sectors);
});

test("a partially missing corner affects only its intersection with the analysis circle", async () => {
  const whole = grid();
  const left = { ...whole, width: 130, values: new Float32Array(130 * 201).fill(100) };
  const bottomRight = { ...whole, left: 130, top: 70, width: 71, height: 131, values: new Float32Array(71 * 131).fill(100) };
  const result = await computeTerrainHorizon([left, bottomRight], observer, 2000, 2, signal());
  assert.equal(result.status, "PARTIAL");
  assert.equal(result.sectors[45].elevationDegrees, null);
  assert.ok(result.sectors[24].elevationDegrees! < 0);
  assert.ok(result.sectors[64].elevationDegrees! < 0);
  assert.ok(result.sectors[270].elevationDegrees! < 0);
});

test("a single distant grid peak contributes even between integer-degree rays", async () => {
  const window = grid(601, 0.001);
  window.values[247 * 601 + 460] = 6100;
  const result = await computeTerrainHorizon([window], observer, 20_000, 2, signal());
  assert.equal(result.status, "COMPLETE");
  const peak = result.sectors.reduce((a, b) => a.elevationDegrees! > b.elevationDegrees! ? a : b);
  assert.equal(peak.bearingDegrees, 70);
  assert.ok(peak.elevationDegrees! > 15);
});

test("spherical tangent curvature keeps equal-height terrain below the observer's horizon", () => {
  const distanceM = 20_000;
  assert.ok(Math.abs(terrainElevationAngle(0, 0, 0, distanceM) + distanceM / (2 * 6_371_008.8) * 180 / Math.PI) < 1e-8);
});

test("kernel yields so cancellation retires an active calculation", async () => {
  const controller = new AbortController();
  const result = computeTerrainHorizon([grid()], observer, 2000, 2, controller.signal);
  controller.abort(new Error("horizon_test_cancelled"));
  await assert.rejects(result, /horizon_test_cancelled/u);
});

test("fixed numerical source path preserves failed source coverage and real source provenance", async () => {
  const fixture = copernicusTestSource();
  const result = await readTerrainHorizonModel({ system: "GCJ02", latitude: 22.6, longitude: 114.35 }, signal(), fixture.transport);
  assert.ok(result);
  assert.equal(result.radiusM, 20_000);
  assert.equal(result.observerHeightM, 2);
  assert.equal(result.sources.length, 1);
  assert.equal(result.sources[0].etag, '"synthetic-cog"');
  assert.equal(result.sourceIssues.length, 0);
  assert.ok(result.sourceBytes > 0);
  const noSource = await readTerrainHorizonModel({ system: "GCJ02", latitude: 22.6, longitude: 114.35 }, signal(),
    (async () => new Response(null, { status: 404 })) as typeof fetch);
  assert.ok(noSource);
  assert.equal(noSource.status, "UNAVAILABLE");
  assert.equal(noSource.knownSectors, 0);
  assert.equal(noSource.sourceIssues[0].reason, "NOT_FOUND");
});
