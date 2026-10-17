import assert from "node:assert/strict";
import test from "node:test";
import type { TerrainHorizonData, TerrainHorizonRequest } from "@starward/miniapp-contracts";
import { checkedTerrainHorizon } from "../../services/terrain-horizon-response";
import { terrainHorizonChart } from "./terrain-horizon-chart";

const input: TerrainHorizonRequest = { center: { system: "GCJ02", latitude: 22.6, longitude: 114.35 } };
export function horizonData(angles: (number | null)[] = Array.from({ length: 360 }, () => 2)): TerrainHorizonData {
  const knownSectors = angles.filter(value => value !== null).length;
  return { state: knownSectors === 360 ? "AVAILABLE" : knownSectors ? "PARTIAL" : "UNAVAILABLE", centerGcj02: input.center,
    publicationId: "horizon:test", derivedAt: "2026-10-17T00:00:00Z", source: null, sourceProof: [], coverageLabel: "测试高程", limitations: [],
    model: { methodVersion: "test", observerWgs84: { system: "WGS84", lat: 22.6, lon: 114.35 }, observerElevationM: 22,
      observerHeightM: 2, stationSample: { elevationM: 20, latitude: 22.6, longitude: 114.35 }, radiusM: 20_000,
      bearingReference: "TRUE_NORTH_CLOCKWISE", sectorWidthDegrees: 1, earthModel: { radiusM: 6371008.8, refraction: "NONE" }, knownSectors,
      sectors: angles.map((elevationDegrees, bearingDegrees) => ({ bearingDegrees, elevationDegrees, sampleCount: elevationDegrees === null ? 0 : 1 })) } };
}

test("station and angular coverage are checked before a response can enter the chart cache", () => {
  const data = horizonData(); assert.equal(checkedTerrainHorizon(data, input), data);
  for (const corrupt of [
    (value: TerrainHorizonData) => { value.centerGcj02 = { ...input.center, longitude: 114.36 }; },
    (value: TerrainHorizonData) => { value.model!.sectors[30]!.bearingDegrees = 31; },
    (value: TerrainHorizonData) => { value.model!.sectors[0]!.elevationDegrees = Number.NaN; },
    (value: TerrainHorizonData) => { value.model!.sectors[10]!.elevationDegrees = null; },
    (value: TerrainHorizonData) => { value.model!.knownSectors = 359; },
  ]) {
    const changed = horizonData(); corrupt(changed); assert.throws(() => checkedTerrainHorizon(changed, input), /terrain_horizon_/);
  }
  const missing = horizonData(Array.from({ length: 360 }, () => null));
  assert.equal(checkedTerrainHorizon(missing, input), missing, "unavailable coverage is not a successful flat zero profile");
});

test("one-sector peaks retain their true angle and negative values stay below zero", () => {
  const angles = Array.from({ length: 360 }, () => -0.2); angles[77] = 17.4;
  const chart = terrainHorizonChart(horizonData(angles).model!);
  assert.equal(chart.segments.length, 1); assert.equal(chart.segments[0]!.length, 361);
  assert.equal(chart.maximumAngle, 17.4); assert.equal(chart.minimumAngle, -0.2);
  assert.ok(chart.segments[0]![0]!.y > chart.baseline);
  assert.ok(chart.segments[0]![77]!.y < chart.baseline);
  assert.deepEqual(chart.ticks.map(tick => tick.angle), [-10, 0, 10, 20]);
  assert.equal(chart.directions[0]!.x, chart.left); assert.equal(chart.directions[4]!.x, chart.right);
});

test("unknown directions split fill and stroke, including the true-north wrap", () => {
  const angles: (number | null)[] = Array.from({ length: 360 }, () => 4);
  angles[0] = null; angles[89] = null; angles[90] = null; angles[91] = null;
  const data = horizonData(angles); checkedTerrainHorizon(data, input);
  const chart = terrainHorizonChart(data.model!);
  assert.equal(chart.segments.length, 2); assert.equal(chart.missing.length, 3);
  assert.equal(chart.missing[0]!.left, chart.left); assert.equal(chart.missing[2]!.right, chart.right);
  const middleGap = chart.missing[1]!;
  assert.ok(chart.segments[0]!.at(-1)!.x < middleGap.left);
  assert.ok(chart.segments[1]![0]!.x > middleGap.right);
  assert.equal(chart.segments.flat().length, 356, "neither a synthetic zero nor an interpolated point fills an unknown sector");
});
